import { Injectable } from '@nestjs/common';

import type { ShippingProvider } from './providers/shipping-provider.interface';
import { StoreConfigShippingProvider } from './providers/store-config-shipping.provider';

@Injectable()
export class ShippingProviderResolver {
  private readonly defaultProvider: ShippingProvider;

  constructor(storeConfigProvider: StoreConfigShippingProvider) {
    this.defaultProvider = storeConfigProvider;
  }

  resolve(_providerName?: string | null): ShippingProvider {
    // Currently all configured policies are handled by the same provider.
    // Future implementations (external couriers) can be resolved here by name.
    return this.defaultProvider;
  }
}
