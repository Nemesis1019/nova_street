import { forwardRef, Module } from '@nestjs/common';

import { CheckoutModule } from '../checkout/checkout.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';
import { StripePaymentProvider } from './providers/stripe-payment.provider';

@Module({
  imports: [forwardRef(() => CheckoutModule), PrismaModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    StripePaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [StripePaymentProvider, PrismaService],
      useFactory: async (
        stripe: StripePaymentProvider,
        prisma: PrismaService,
      ) => {
        const config = await prisma.storeConfig.findFirst({ where: { isActive: true } });
        const providerName = (config?.paymentProvider ?? process.env.PAYMENT_PROVIDER ?? 'stripe').toLowerCase();
        switch (providerName) {
          case 'stripe':
          default:
            return stripe;
        }
      },
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
