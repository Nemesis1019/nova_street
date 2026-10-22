import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';
import { BoldPaymentProvider } from './bold-payment.provider';
import type { PaymentProvider } from './payment-provider.interface';
import { PAYMENT_PROVIDER } from './payment-provider.token';
import { StripePaymentProvider } from './stripe-payment.provider';

/**
 * Resuelve el proveedor de pagos activo en cada operación leyendo StoreConfig,
 * para que cambiar la pasarela desde el admin no requiera reiniciar la API.
 *
 * `PAYMENT_PROVIDER` es el hook de override para tests e2e (el módulo lo registra
 * como `null`; si está presente, tiene prioridad).
 */
@Injectable()
export class PaymentProviderResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripe: StripePaymentProvider,
    private readonly bold: BoldPaymentProvider,
    @Optional() @Inject(PAYMENT_PROVIDER) private readonly overrideProvider?: PaymentProvider | null,
  ) {}

  async resolve(): Promise<PaymentProvider> {
    if (this.overrideProvider) {
      return this.overrideProvider;
    }

    const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    const providerName = (
      config?.paymentProvider ??
      this.configService.get<string>('PAYMENT_PROVIDER') ??
      'stripe'
    ).toLowerCase();

    switch (providerName) {
      case 'bold':
        return this.bold;
      case 'stripe':
      default:
        return this.stripe;
    }
  }
}
