import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StockMode } from '@prisma/client';

import { buildAssetUrl } from '../assets/asset-url.util';
import { PrismaService } from '../prisma/prisma.service';

/** Motivos por los que un favorito puede dejar de estar disponible. */
export type WishlistUnavailableReason = 'PRODUCT_INACTIVE' | 'VARIANT_INACTIVE' | 'OUT_OF_STOCK';

interface VariantAvailabilityInput {
  isActive: boolean;
  stockMode: StockMode;
  inventory: { quantity: number; reservedQuantity: number } | null;
}

interface WishlistVariantRecord {
  id: string;
  productVariantId: string;
  createdAt: Date;
  productVariant: {
    priceAdjustment: number | null;
    isActive: boolean;
    stockMode: StockMode;
    inventory: { quantity: number; reservedQuantity: number } | null;
    product: { id: string; name: string; slug: string; basePrice: number; isActive: boolean };
    images: Array<{ asset: { id: string; bucket: string; objectKey: string } | null }>;
  };
}

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private availability(
    product: { isActive: boolean },
    variant: VariantAvailabilityInput,
  ): { isAvailable: boolean; unavailableReason?: WishlistUnavailableReason } {
    if (!product.isActive) {
      return { isAvailable: false, unavailableReason: 'PRODUCT_INACTIVE' };
    }
    if (!variant.isActive) {
      return { isAvailable: false, unavailableReason: 'VARIANT_INACTIVE' };
    }
    if (variant.stockMode === StockMode.TRACKED) {
      const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0);
      if (available <= 0) {
        return { isAvailable: false, unavailableReason: 'OUT_OF_STOCK' };
      }
    }
    return { isAvailable: true };
  }

  async findAll(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        productVariant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, basePrice: true, isActive: true },
            },
            inventory: { select: { quantity: true, reservedQuantity: true } },
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              include: {
                asset: { select: { id: true, bucket: true, objectKey: true } },
              },
            },
          },
        },
      },
    });

    return items.map((item) => this.mapItem(item as WishlistVariantRecord));
  }

  async add(userId: string, productVariantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: {
        product: { select: { id: true, name: true, slug: true, basePrice: true, isActive: true } },
        inventory: { select: { quantity: true, reservedQuantity: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          include: {
            asset: { select: { id: true, bucket: true, objectKey: true } },
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const { isAvailable } = this.availability(variant.product, variant);
    if (!isAvailable) {
      throw new BadRequestException('El producto no está disponible');
    }

    const item = await this.prisma.wishlistItem.upsert({
      where: { userId_productVariantId: { userId, productVariantId } },
      update: {},
      create: { userId, productVariantId },
      include: {
        productVariant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, basePrice: true, isActive: true },
            },
            inventory: { select: { quantity: true, reservedQuantity: true } },
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              include: {
                asset: { select: { id: true, bucket: true, objectKey: true } },
              },
            },
          },
        },
      },
    });

    return this.mapItem(item as WishlistVariantRecord);
  }

  async remove(userId: string, productVariantId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_productVariantId: { userId, productVariantId } },
    });
    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }
    await this.prisma.wishlistItem.delete({
      where: { userId_productVariantId: { userId, productVariantId } },
    });
  }

  private mapItem(item: WishlistVariantRecord) {
    const variant = item.productVariant;
    const product = variant.product;
    const image = variant.images[0]?.asset;
    const { isAvailable, unavailableReason } = this.availability(product, variant);

    return {
      id: item.id,
      productVariantId: item.productVariantId,
      productName: product.name,
      productSlug: product.slug,
      price: product.basePrice + (variant.priceAdjustment ?? 0),
      imageUrl: image ? buildAssetUrl(image.bucket, image.objectKey) : undefined,
      isAvailable,
      unavailableReason,
      createdAt: item.createdAt,
    };
  }
}
