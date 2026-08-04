import { BadRequestException, Injectable } from '@nestjs/common';
import { StockMode } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MadeToOrderStockPolicy } from './made-to-order.policy';
import { StockPolicy } from './stock-policy.interface';
import { TrackedStockPolicy } from './tracked.policy';

@Injectable()
export class StockPolicyResolver {
  private readonly madeToOrderPolicy = new MadeToOrderStockPolicy();

  constructor(private readonly prisma: PrismaService) {}

  async resolve(variantId: string): Promise<StockPolicy> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new BadRequestException('Variant not found');
    }

    if (variant.stockMode === StockMode.TRACKED) {
      return new TrackedStockPolicy(this.prisma);
    }

    return this.madeToOrderPolicy;
  }
}
