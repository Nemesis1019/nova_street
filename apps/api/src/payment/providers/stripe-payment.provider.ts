import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import type {
  PaymentCheckoutSessionResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundParams,
  RefundResult,
} from './payment-provider.interface';

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripePaymentProvider.name);
  private readonly stripe: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2026-06-24.dahlia' });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured. Stripe payments are disabled.');
    }
  }

  isEnabled(): boolean {
    return this.stripe !== null;
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
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const successUrl = this.configService.get<string>('STRIPE_SUCCESS_URL') ?? 'http://localhost:3000/orders?paid=success';
    const cancelUrl = this.configService.get<string>('STRIPE_CANCEL_URL') ?? `http://localhost:3000/checkout?order=${order.id}&canceled=1`;

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

    const session = await this.stripe.checkout.sessions.create({
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
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
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
    if (!this.stripe) {
      this.logger.warn('Stripe is not configured; refund cannot be processed automatically');
      return { success: false, errorMessage: 'Stripe is not configured' };
    }

    if (!params.paymentProviderTransactionId) {
      return { success: false, errorMessage: 'Missing payment provider transaction id' };
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentProviderTransactionId,
        amount: params.amount,
        reason: 'requested_by_customer',
        metadata: { orderId: params.orderId },
      });
      return { success: refund.status === 'succeeded' || refund.status === 'pending', providerTransactionId: refund.id };
    } catch (error) {
      this.logger.error('Stripe refund failed', error);
      return { success: false, errorMessage: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
