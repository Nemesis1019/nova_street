import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CouponAppliesTo } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class AdminCouponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const code = dto.code.toUpperCase();

    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    await this.validateCouponScope(dto.appliesTo, dto.categoryId, dto.productId);

    return this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        validFrom: new Date(dto.validFrom),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        maxUses: dto.maxUses ?? null,
        usedCount: 0,
        isActive: dto.isActive ?? true,
        appliesTo: dto.appliesTo ?? CouponAppliesTo.ALL,
        categoryId: dto.categoryId ?? null,
        productId: dto.productId ?? null,
        minOrderAmount: dto.minOrderAmount ?? null,
        maxUsesPerUser: dto.maxUsesPerUser ?? null,
        isFirstPurchaseOnly: dto.isFirstPurchaseOnly ?? false,
      },
    });
  }

  async findAll(query: { page: number; limit: number; isActive?: boolean }) {
    const { page = 1, limit = 20, isActive } = query;
    const skip = (page - 1) * limit;

    const where = isActive !== undefined ? { isActive } : {};

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findById(id);

    if (dto.code) {
      const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code.toUpperCase() } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Coupon code already exists');
      }
    }

    await this.validateCouponScope(dto.appliesTo, dto.categoryId, dto.productId);

    return this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code?.toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil === null ? null : dto.validUntil ? new Date(dto.validUntil) : undefined,
        maxUses: dto.maxUses,
        isActive: dto.isActive,
        appliesTo: dto.appliesTo,
        categoryId: dto.categoryId === null ? null : dto.categoryId,
        productId: dto.productId === null ? null : dto.productId,
        minOrderAmount: dto.minOrderAmount === null ? null : dto.minOrderAmount,
        maxUsesPerUser: dto.maxUsesPerUser === null ? null : dto.maxUsesPerUser,
        isFirstPurchaseOnly: dto.isFirstPurchaseOnly,
      },
    });
  }

  async toggleActive(id: string) {
    const coupon = await this.findById(id);

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.coupon.delete({ where: { id } });
  }

  private async validateCouponScope(appliesTo?: CouponAppliesTo, categoryId?: string | null, productId?: string | null) {
    if (appliesTo === CouponAppliesTo.CATEGORY) {
      if (!categoryId) {
        throw new BadRequestException('categoryId is required when appliesTo is CATEGORY');
      }
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    if (appliesTo === CouponAppliesTo.PRODUCT) {
      if (!productId) {
        throw new BadRequestException('productId is required when appliesTo is PRODUCT');
      }
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
    }
  }
}
