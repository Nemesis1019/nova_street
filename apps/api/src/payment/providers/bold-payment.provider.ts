import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';
import { decryptSecret } from '../../tenant/crypto.util';
import { getTenantStorefrontUrl } from '../../tenant/tenant-url.util';
import type {
  PaymentButtonConfig,
  PaymentCheckoutSessionResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundParams,
  RefundResult,
} from './payment-provider.interface';

/** API de links de pago de Bold (misma llave de identidad que el Botón de pagos). */
const BOLD_API_BASE = 'https://integrations.api.bold.co';

interface BoldConfig {
  apiKey: string | null;
  secretKey: string;
  sandbox: boolean;
}

interface BoldWebhookBody {
  type?: string;
  subject?: string;
  data?: {
    payment_id?: string;
    payer_email?: string;
    amount?: { total?: number; currency?: string };
    metadata?: { reference?: string };
  };
}

interface BoldLinkResponse {
  payload?: { payment_link?: string; url?: string };
  errors?: unknown[];
}

/**
 * Proveedor de pagos Bold (Colombia).
 *
 * - Botón de pagos embebido: el frontend recibe la config + el hash de integridad
 *   SHA256(orderId + amount + currency + secret) generado acá (la llave secreta nunca
 *   sale del servidor).
 * - Link de pago (fallback/redirect): POST /online/link/v1.
 * - Webhook: firma HMAC-SHA256(secret, base64(body)) en el header `x-bold-signature`;
 *   en modo pruebas (sandbox) la firma usa clave vacía.
 */
@Injectable()
export class BoldPaymentProvider implements PaymentProvider {
  readonly name = 'bold';
  private readonly logger = new Logger(BoldPaymentProvider.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** Lee la configuración de Bold desde StoreConfig (con fallback a envs). */
  private async getConfig(): Promise<BoldConfig> {
    const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    const sandbox =
      config?.boldSandbox ?? this.configService.get<string>('BOLD_SANDBOX')?.toLowerCase() === 'true';
    const apiKey = config?.boldApiKey ?? this.configService.get<string>('BOLD_API_KEY') ?? null;
    const storedSecret = config?.boldSecretKey ?? this.configService.get<string>('BOLD_SECRET_KEY');
    const secretKey = sandbox || !storedSecret ? '' : decryptSecret(storedSecret);

    return { apiKey, secretKey, sandbox };
  }

  private getStorefrontUrl(): string {
    return getTenantStorefrontUrl();
  }

  /** Hash de integridad del botón: SHA256(orderId + amount + currency + llave secreta). */
  buildIntegritySignature(orderId: string, amount: number, currency: string, secretKey: string): string {
    return createHash('sha256').update(`${orderId}${amount}${currency}${secretKey}`).digest('hex');
  }

  /** Datos para renderizar el botón de pagos embebido en el storefront. */
  async createButtonCheckout(order: {
    id: string;
    totalAmount: number;
    currency: string;
    userEmail: string;
  }): Promise<PaymentButtonConfig> {
    const config = await this.getConfig();
    if (!config.apiKey) {
      throw new BadRequestException('Bold is not configured');
    }

    const currency = order.currency.toUpperCase();
    const amount = Math.round(order.totalAmount);

    return {
      apiKey: config.apiKey,
      orderId: order.id,
      amount,
      currency,
      integritySignature: this.buildIntegritySignature(order.id, amount, currency, config.secretKey),
      redirectionUrl: `${this.getStorefrontUrl()}/checkout/confirmacion?order=${order.id}`,
      description: `Orden ${order.id.slice(0, 8)}`,
      sandbox: config.sandbox,
    };
  }

  /** Crea un link de pago Bold para redirigir al checkout alojado. */
  async createCheckoutSession(order: {
    id: string;
    totalAmount: number;
    currency: string;
    userEmail: string;
  }): Promise<PaymentCheckoutSessionResult> {
    const config = await this.getConfig();
    if (!config.apiKey) {
      throw new BadRequestException('Bold is not configured');
    }

    const body = {
      amount_type: 'CLOSE',
      amount: {
        currency: order.currency.toUpperCase(),
        total_amount: Math.round(order.totalAmount),
      },
      reference: order.id,
      description: `Orden ${order.id.slice(0, 8)}`,
      callback_url: `${this.getStorefrontUrl()}/checkout/confirmacion?order=${order.id}`,
      payer_email: order.userEmail,
    };

    let payload: BoldLinkResponse | null = null;
    try {
      const response = await fetch(`${BOLD_API_BASE}/online/link/v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `x-api-key ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      payload = (await response.json().catch(() => null)) as BoldLinkResponse | null;

      if (!response.ok || !payload?.payload?.url) {
        this.logger.error(`Bold link creation failed (${response.status})`, payload?.errors);
        throw new BadGatewayException('No se pudo crear el link de pago de Bold');
      }
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error('Bold link creation request failed', error);
      throw new BadGatewayException('No se pudo contactar a la API de Bold');
    }

    return {
      url: payload.payload.url,
      providerTransactionId: payload.payload.payment_link,
    };
  }

  async handleWebhook(payload: string | Buffer, signature?: string): Promise<PaymentWebhookEvent> {
    const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const config = await this.getConfig();

    if (config.secretKey) {
      if (!signature) {
        throw new BadRequestException('Missing x-bold-signature header');
      }
      const encoded = raw.toString('base64');
      const expected = createHmac('sha256', config.secretKey).update(encoded).digest('hex');
      const expectedBuffer = Buffer.from(expected);
      const signatureBuffer = Buffer.from(signature);
      if (
        expectedBuffer.length !== signatureBuffer.length ||
        !timingSafeEqual(expectedBuffer, signatureBuffer)
      ) {
        this.logger.error('Bold webhook signature verification failed');
        throw new BadRequestException('Invalid signature');
      }
    } else {
      this.logger.warn('Bold webhook processed without signature verification (sandbox / no secret)');
    }

    let event: BoldWebhookBody;
    try {
      event = JSON.parse(raw.toString('utf8')) as BoldWebhookBody;
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    const orderId = event.data?.metadata?.reference;
    const providerTransactionId = event.data?.payment_id ?? event.subject;

    switch (event.type) {
      case 'SALE_APPROVED':
        return { type: 'checkout.session.completed', orderId, providerTransactionId };
      case 'SALE_REJECTED':
        return { type: 'payment_failed', orderId, providerTransactionId };
      default:
        return { type: 'unknown' };
    }
  }

  async refund(_params: RefundParams): Promise<RefundResult> {
    return {
      success: false,
      errorMessage:
        'Bold no permite reembolsos por API para el botón de pagos; la anulación se gestiona desde el panel de Bold',
    };
  }
}
