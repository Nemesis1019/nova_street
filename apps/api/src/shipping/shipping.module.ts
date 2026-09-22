import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { StoreConfigShippingProvider } from './providers/store-config-shipping.provider';
import { ShippingCostCalculator } from './shipping-cost.calculator';
import { ShippingOptionsController } from './shipping-options.controller';
import { ShippingOptionsService } from './shipping-options.service';
import { ShippingProviderResolver } from './shipping-provider.resolver';

@Module({
  imports: [AuditModule],
  controllers: [ShippingOptionsController],
  providers: [StoreConfigShippingProvider, ShippingProviderResolver, ShippingCostCalculator, ShippingOptionsService],
  exports: [ShippingCostCalculator, ShippingOptionsService],
})
export class ShippingModule {}
