export interface PaymentCheckoutSessionResult {
  url: string;
  providerTransactionId?: string;
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
  handleWebhook(payload: string | Buffer, signature?: string): Promise<PaymentWebhookEvent>;
  refund(params: RefundParams): Promise<RefundResult>;
}
