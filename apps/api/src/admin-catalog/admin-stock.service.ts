import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { StockMode } from '@prisma/client';
import { Cache } from 'cache-manager';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminStockService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async invalidateCatalogCache() {
    await this.cacheManager.clear();
  }

  private emitLowStockIfNeeded(
    variant: { id: string; sku: string; lowStockThreshold: number; product: { name: string } | null },
    quantity: number,
  ) {
    if (quantity <= variant.lowStockThreshold) {
      this.notificationsService.emit({
        type: 'stock.low',
        payload: {
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product?.name ?? 'Producto sin nombre',
          quantity,
          threshold: variant.lowStockThreshold,
        },
      });
    }
  }

  async updateStockMode(variantId: string, stockMode: StockMode, adminUserId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const previousMode = variant.stockMode;

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stockMode },
      include: { inventory: true },
    });

    if (stockMode === StockMode.TRACKED) {
      await this.prisma.inventory.upsert({
        where: { productVariantId: variantId },
        update: {},
        create: {
          productVariantId: variantId,
          quantity: 0,
          reservedQuantity: 0,
        },
      });
      updated.inventory =
        updated.inventory ??
        (await this.prisma.inventory.findUnique({ where: { productVariantId: variantId } }));
    }

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_STOCK_MODE',
        entity: 'ProductVariant',
        entityId: variantId,
        before: { stockMode: previousMode },
        after: { stockMode },
      },
    });

    await this.invalidateCatalogCache();
    return updated;
  }

  async updateInventory(variantId: string, quantity: number, adminUserId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true, product: { select: { name: true } } },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const previousQuantity = variant.inventory?.quantity ?? 0;

    const inventory = await this.prisma.inventory.upsert({
      where: { productVariantId: variantId },
      update: { quantity },
      create: {
        productVariantId: variantId,
        quantity,
        reservedQuantity: 0,
      },
    });

    this.emitLowStockIfNeeded(variant, inventory.quantity);

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_INVENTORY',
        entity: 'Inventory',
        entityId: inventory.id,
        before: { quantity: previousQuantity },
        after: { quantity },
      },
    });

    await this.invalidateCatalogCache();
    return inventory;
  }

  async addStock(variantId: string, quantity: number, adminUserId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true, product: { select: { name: true } } },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (variant.stockMode !== StockMode.TRACKED) {
      throw new BadRequestException('Variant is not tracked');
    }

    const previousQuantity = variant.inventory?.quantity ?? 0;

    const inventory = await this.prisma.inventory.upsert({
      where: { productVariantId: variantId },
      update: { quantity: { increment: quantity } },
      create: {
        productVariantId: variantId,
        quantity,
        reservedQuantity: 0,
      },
    });

    this.emitLowStockIfNeeded(variant, inventory.quantity);

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ADD_STOCK',
        entity: 'Inventory',
        entityId: inventory.id,
        before: { quantity: previousQuantity },
        after: { quantity: inventory.quantity },
      },
    });

    await this.invalidateCatalogCache();
    return inventory;
  }

  async findInventory(query: { page: number; limit: number; stockMode?: StockMode }) {
    const { page = 1, limit = 20, stockMode } = query;
    const skip = (page - 1) * limit;

    const where = stockMode ? { stockMode } : {};

    const [data, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          inventory: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }
}
