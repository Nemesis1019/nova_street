import { forwardRef, Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
import { StockModule } from '../stock/stock.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { GuestCheckoutController } from './guest-checkout.controller';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [PrismaModule, StockModule, EmailModule, ShippingModule, forwardRef(() => OrdersModule)],
  controllers: [CheckoutController, GuestCheckoutController, WebhookController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
