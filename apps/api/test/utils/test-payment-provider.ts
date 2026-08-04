import type {
  PaymentCheckoutSessionResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundParams,
  RefundResult,
} from '../../src/payment/providers/payment-provider.interface';

export class TestPaymentProvider implements PaymentProvider {
  readonly name = 'test';

  async createCheckoutSession(): Promise<PaymentCheckoutSessionResult> {
    return { url: 'https://test-payment.example.com/checkout', providerTransactionId: 'test-tx' };
  }

  async handleWebhook(): Promise<PaymentWebhookEvent> {
    return { type: 'unknown' };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return { success: true, providerTransactionId: `refund-${params.orderId}` };
  }
}
