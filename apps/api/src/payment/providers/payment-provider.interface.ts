export interface PaymentCheckoutSessionResult {
  url: string;
  providerTransactionId?: string;
}

/** Configuración necesaria para renderizar el botón de pagos embebido (Bold). */
export interface PaymentButtonConfig {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: string;
  integritySignature: string;
  redirectionUrl: string;
  description?: string;
  sandbox: boolean;
}

export type PaymentWebhookEventType =
  | 'checkout.session.completed'
  | 'payment_intent.succeeded'
  | 'payment_failed'
  | 'unknown';

export interface PaymentWebhookEvent {
  type: PaymentWebhookEventType;
  orderId?: string;
  providerTransactionId?: string;
}

export interface RefundParams {
  orderId: string;
  paymentProviderTransactionId?: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  providerTransactionId?: string;
  errorMessage?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(order: {
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
  }): Promise<PaymentCheckoutSessionResult>;
  /** Config del botón de pagos embebido; solo lo implementan los proveedores que lo soportan. */
  createButtonCheckout?(order: {
    id: string;
    totalAmount: number;
    currency: string;
    userEmail: string;
  }): Promise<PaymentButtonConfig>;
  handleWebhook(payload: string | Buffer, signature?: string): Promise<PaymentWebhookEvent>;
  refund(params: RefundParams): Promise<RefundResult>;
}
