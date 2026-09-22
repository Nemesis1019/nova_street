import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingOptionDto } from './dto/create-shipping-option.dto';
import { UpdateShippingOptionDto } from './dto/update-shipping-option.dto';
import { ShippingCostCalculator } from './shipping-cost.calculator';

export interface EstimatedShippingOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isDefault: boolean;
  isFree: boolean;
}

@Injectable()
export class ShippingOptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingCalculator: ShippingCostCalculator,
  ) {}

  async findAll(includeInactive = false) {
    return this.prisma.shippingOption.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.shippingOption.findUnique({ where: { id } });
  }

  async findOneOrThrow(id: string) {
    const option = await this.prisma.shippingOption.findUnique({ where: { id } });
    if (!option) {
      throw new NotFoundException('Shipping option not found');
    }
    return option;
  }

  async findDefault() {
    return this.prisma.shippingOption.findFirst({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateShippingOptionDto) {
    if (dto.isDefault) {
      await this.clearDefaultFlag();
    }
    return this.prisma.shippingOption.create({ data: dto });
  }

  async update(id: string, dto: UpdateShippingOptionDto) {
    const existing = await this.prisma.shippingOption.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Shipping option not found');
    }
    if (dto.isDefault) {
      await this.clearDefaultFlag(id);
    }
    return this.prisma.shippingOption.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.shippingOption.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Shipping option not found');
    }
    const ordersUsing = await this.prisma.order.count({ where: { shippingOptionId: id } });
    if (ordersUsing > 0) {
      throw new BadRequestException('Cannot delete shipping option used by orders');
    }
    return this.prisma.shippingOption.delete({ where: { id } });
  }

  async calculateEstimatedOptions(subtotal: number): Promise<EstimatedShippingOption[]> {
    const options = await this.findAll(false);
    if (options.length === 0) {
      const fallbackCost = await this.shippingCalculator.calculate(subtotal);
      return [{
        id: 'fallback',
        name: 'Envío estándar',
        description: null,
        price: fallbackCost,
        estimatedDaysMin: null,
        estimatedDaysMax: null,
        isDefault: true,
        isFree: fallbackCost === 0,
      }];
    }
    return options.map((option) => {
      const isFree = option.freeShippingThreshold !== null && subtotal >= option.freeShippingThreshold;
      return {
        id: option.id,
        name: option.name,
        description: option.description,
        price: isFree ? 0 : option.price,
        estimatedDaysMin: option.estimatedDaysMin,
        estimatedDaysMax: option.estimatedDaysMax,
        isDefault: option.isDefault,
        isFree,
      };
    });
  }

  async calculateDefaultCost(subtotal: number): Promise<number> {
    const options = await this.calculateEstimatedOptions(subtotal);
    return options.find((o) => o.isDefault)?.price ?? options[0]?.price ?? 0;
  }

  private async clearDefaultFlag(excludeId?: string) {
    await this.prisma.shippingOption.updateMany({
      where: excludeId ? { isDefault: true, id: { not: excludeId } } : { isDefault: true },
      data: { isDefault: false },
    });
  }
}
