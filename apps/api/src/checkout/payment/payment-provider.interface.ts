export interface PaymentIntent {
  provider: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(orderId: string, amount: number): Promise<PaymentIntent>;
  verifyWebhook(payload: unknown, signature?: string): Promise<boolean>;
}
