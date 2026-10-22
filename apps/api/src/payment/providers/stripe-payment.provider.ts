import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { PrismaService } from '../../prisma/prisma.service';
import { decryptSecret } from '../../tenant/crypto.util';
import { getTenantStorefrontUrl } from '../../tenant/tenant-url.util';
import type {
  PaymentCheckoutSessionResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundParams,
  RefundResult,
} from './payment-provider.interface';

interface StripeConfig {
  secretKey: string | null;
  webhookSecret: string | null;
}

/**
 * Proveedor Stripe.
 *
 * Las credenciales se leen de `StoreConfig` en cada operación (con fallback a
 * las envs `STRIPE_*`), así cada cliente puede usar su propia cuenta y los
 * cambios del admin aplican sin reiniciar la API. Los clientes de Stripe se
 * cachean por secret key.
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripePaymentProvider.name);
  private readonly clients = new Map<string, Stripe>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private async getConfig(): Promise<StripeConfig> {
    const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    const storedSecret =
      config?.stripeSecretKey ?? this.configService.get<string>('STRIPE_SECRET_KEY') ?? null;
    const storedWebhook =
      config?.stripeWebhookSecret ??
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ??
      null;

    return {
      secretKey: storedSecret ? decryptSecret(storedSecret) : null,
      webhookSecret: storedWebhook ? decryptSecret(storedWebhook) : null,
    };
  }

  private getClient(secretKey: string): Stripe {
    const cached = this.clients.get(secretKey);
    if (cached) return cached;

    const client = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' });
    this.clients.set(secretKey, client);
    return client;
  }

  async isEnabled(): Promise<boolean> {
    return Boolean((await this.getConfig()).secretKey);
  }

  async createCheckoutSession(order: {
    id: string;
    totalAmount: number;
    currency: string;
    userEmail: string;
    items: {
      unitPrice: number;
      quantity: number;
      productName: string;
      variantLabel?: string;
    }[];
  }): Promise<PaymentCheckoutSessionResult> {
    const config = await this.getConfig();
    if (!config.secretKey) {
      throw new BadRequestException('Stripe is not configured');
    }

    const base = getTenantStorefrontUrl();
    const successUrl =
      this.configService.get<string>('STRIPE_SUCCESS_URL') ?? `${base}/orders?paid=success`;
    const cancelUrl =
      this.configService.get<string>('STRIPE_CANCEL_URL') ??
      `${base}/checkout?order=${order.id}&canceled=1`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      price_data: {
        currency: order.currency,
        unit_amount: item.unitPrice,
        product_data: {
          name: item.variantLabel ? `${item.productName} — ${item.variantLabel}` : item.productName,
        },
      },
      quantity: item.quantity,
    }));

    const session = await this.getClient(config.secretKey).checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orderId: order.id },
      customer_email: order.userEmail,
    });

    return { url: session.url ?? '', providerTransactionId: session.id };
  }

  async handleWebhook(payload: string | Buffer, signature?: string): Promise<PaymentWebhookEvent> {
    const config = await this.getConfig();
    if (!config.secretKey) {
      throw new BadRequestException('Stripe is not configured');
    }

    const stripe = this.getClient(config.secretKey);
    let event: Stripe.Event;

    if (config.webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);
      } catch (error) {
        this.logger.error('Stripe webhook signature verification failed', error);
        throw new BadRequestException('Invalid signature');
      }
    } else {
      event = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());
      this.logger.warn('Stripe webhook processed without signature verification');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: 'checkout.session.completed',
        orderId: session.metadata?.orderId,
        providerTransactionId: session.id,
      };
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: 'payment_failed',
        orderId: session.metadata?.orderId,
        providerTransactionId: session.id,
      };
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        type: 'payment_failed',
        orderId: paymentIntent.metadata?.orderId,
        providerTransactionId: paymentIntent.id,
      };
    }

    return { type: 'unknown' };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const config = await this.getConfig();
    if (!config.secretKey) {
      this.logger.warn('Stripe is not configured; refund cannot be processed automatically');
      return { success: false, errorMessage: 'Stripe is not configured' };
    }

    if (!params.paymentProviderTransactionId) {
      return { success: false, errorMessage: 'Missing payment provider transaction id' };
    }

    try {
      const refund = await this.getClient(config.secretKey).refunds.create({
        payment_intent: params.paymentProviderTransactionId,
        amount: params.amount,
        reason: 'requested_by_customer',
        metadata: { orderId: params.orderId },
      });
      return {
        success: refund.status === 'succeeded' || refund.status === 'pending',
        providerTransactionId: refund.id,
      };
    } catch (error) {
      this.logger.error('Stripe refund failed', error);
      return { success: false, errorMessage: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
