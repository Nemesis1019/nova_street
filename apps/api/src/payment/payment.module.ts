import { forwardRef, Module } from '@nestjs/common';

import { CheckoutModule } from '../checkout/checkout.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { BoldPaymentProvider } from './providers/bold-payment.provider';
import { PaymentProviderResolver } from './providers/payment-provider.resolver';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';
import { StripePaymentProvider } from './providers/stripe-payment.provider';

@Module({
  imports: [forwardRef(() => CheckoutModule), PrismaModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    StripePaymentProvider,
    BoldPaymentProvider,
    PaymentProviderResolver,
    // Hook de override para tests e2e; en runtime el resolver decide por StoreConfig.
    { provide: PAYMENT_PROVIDER, useValue: null },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
