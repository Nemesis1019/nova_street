import { Module } from '@nestjs/common';

import { StoreConfigShippingProvider } from './providers/store-config-shipping.provider';
import { ShippingCostCalculator } from './shipping-cost.calculator';
import { ShippingProviderResolver } from './shipping-provider.resolver';

@Module({
  providers: [StoreConfigShippingProvider, ShippingProviderResolver, ShippingCostCalculator],
  exports: [ShippingCostCalculator],
})
export class ShippingModule {}
