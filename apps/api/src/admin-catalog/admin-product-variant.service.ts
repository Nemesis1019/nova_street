import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class AdminProductVariantService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateCatalogCache() {
    await this.cacheManager.clear();
  }

  async create(productId: string, dto: CreateProductVariantDto) {
    await this.ensureProductExists(productId);

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        size: dto.size,
        color: dto.color,
        garmentType: dto.garmentType,
        stockMode: dto.stockMode ?? 'MADE_TO_ORDER',
        productionLeadTimeDays: dto.productionLeadTimeDays ?? 7,
        priceAdjustment: dto.priceAdjustment,
        isActive: dto.isActive ?? true,
      },
    });
    await this.invalidateCatalogCache();
    return variant;
  }

  async findById(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }

  async update(productId: string, variantId: string, dto: UpdateProductVariantDto) {
    await this.findById(productId, variantId);

    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: dto.sku,
        size: dto.size,
        color: dto.color,
        garmentType: dto.garmentType,
        stockMode: dto.stockMode,
        productionLeadTimeDays: dto.productionLeadTimeDays,
        priceAdjustment: dto.priceAdjustment,
        isActive: dto.isActive,
      },
    });
    await this.invalidateCatalogCache();
    return variant;
  }

  async remove(productId: string, variantId: string) {
    await this.findById(productId, variantId);
    const deleted = await this.prisma.productVariant.delete({ where: { id: variantId } });
    await this.invalidateCatalogCache();
    return deleted;
  }

  private async ensureProductExists(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }
}
