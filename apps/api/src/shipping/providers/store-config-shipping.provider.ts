import { Injectable } from '@nestjs/common';

import type { ShippingProvider } from './shipping-provider.interface';

@Injectable()
export class StoreConfigShippingProvider implements ShippingProvider {
  readonly name = 'storeConfig';

  calculate(params: Parameters<ShippingProvider['calculate']>[0]): number {
    const { subtotal, config } = params;
    const {
      shippingBaseCost,
      freeShippingThreshold,
      shippingDiscountPercentage,
      shippingDiscountFixedAmount,
    } = config;

    let cost = shippingBaseCost;

    if (freeShippingThreshold !== null && subtotal >= freeShippingThreshold) {
      cost = 0;
    }

    if (shippingDiscountPercentage !== null && shippingDiscountPercentage > 0) {
      cost = Math.floor(cost * (1 - shippingDiscountPercentage / 100));
    }

    if (shippingDiscountFixedAmount !== null && shippingDiscountFixedAmount > 0) {
      cost = Math.max(0, cost - shippingDiscountFixedAmount);
    }

    return Math.max(0, cost);
  }
}
