import { PaymentIntent, PaymentProvider } from './payment-provider.interface';

export class PlaceholderProvider implements PaymentProvider {
  readonly name = 'placeholder';

  async createPaymentIntent(orderId: string, amount: number): Promise<PaymentIntent> {
    return {
      provider: this.name,
      clientSecret: `placeholder_${orderId}_${Date.now()}`,
      amount,
      currency: 'COP',
    };
  }

  async verifyWebhook(): Promise<boolean> {
    return true;
  }
}
