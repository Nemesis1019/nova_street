import type { StoreConfig } from '@prisma/client';

export interface ShippingProvider {
  readonly name: string;
  calculate(params: {
    subtotal: number;
    config: Pick<
      StoreConfig,
      | 'shippingBaseCost'
      | 'freeShippingThreshold'
      | 'shippingDiscountPercentage'
      | 'shippingDiscountFixedAmount'
    >;
  }): number;
}

export const SHIPPING_PROVIDER = Symbol('SHIPPING_PROVIDER');
