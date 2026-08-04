import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ShippingProviderResolver } from './shipping-provider.resolver';

@Injectable()
export class ShippingCostCalculator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ShippingProviderResolver,
  ) {}

  async calculate(subtotal: number): Promise<number> {
    const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    const provider = this.resolver.resolve(config?.shippingProvider);

    return provider.calculate({
      subtotal,
      config: {
        shippingBaseCost: config?.shippingBaseCost ?? 10_000,
        freeShippingThreshold: config?.freeShippingThreshold ?? null,
        shippingDiscountPercentage: config?.shippingDiscountPercentage ?? null,
        shippingDiscountFixedAmount: config?.shippingDiscountFixedAmount ?? null,
      },
    });
  }
}
