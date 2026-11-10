import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StockMode } from '@prisma/client';

import { buildAssetUrl, buildImageVariantUrl } from '../assets/asset-url.util';
import { PrismaService } from '../prisma/prisma.service';

/** Motivos por los que un favorito puede dejar de estar disponible. */
export type WishlistUnavailableReason = 'PRODUCT_INACTIVE' | 'VARIANT_INACTIVE' | 'OUT_OF_STOCK';

interface VariantAvailabilityInput {
  isActive: boolean;
  stockMode: StockMode;
  inventory: { quantity: number; reservedQuantity: number } | null;
}

interface WishlistAssetRecord {
  id: string;
  bucket: string;
  objectKey: string;
  mimeType: string;
  focalPointX: number;
  focalPointY: number;
  cropZoom: number;
}

interface WishlistImageRecord {
  asset: WishlistAssetRecord | null;
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
    product: {
      id: string;
      name: string;
      slug: string;
      basePrice: number;
      isActive: boolean;
      images: WishlistImageRecord[];
    };
    images: WishlistImageRecord[];
  };
}

const imageAssetSelect = {
  id: true,
  bucket: true,
  objectKey: true,
  mimeType: true,
  focalPointX: true,
  focalPointY: true,
  cropZoom: true,
} as const;

const imageInclude = {
  orderBy: { sortOrder: 'asc' as const },
  include: { asset: { select: imageAssetSelect } },
};

const productSelect = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  isActive: true,
  images: imageInclude,
} as const;

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
            product: { select: productSelect },
            inventory: { select: { quantity: true, reservedQuantity: true } },
            images: imageInclude,
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
        product: { select: productSelect },
        inventory: { select: { quantity: true, reservedQuantity: true } },
        images: imageInclude,
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
            product: { select: productSelect },
            inventory: { select: { quantity: true, reservedQuantity: true } },
            images: imageInclude,
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

  private mapImage(asset: WishlistAssetRecord) {
    const url = buildAssetUrl(asset.bucket, asset.objectKey);
    const isImage = asset.mimeType.startsWith('image/');
    return {
      url,
      thumbnailUrl: isImage
        ? buildImageVariantUrl(asset.bucket, asset.objectKey, 300, 'webp')
        : url,
      smallUrl: isImage
        ? buildImageVariantUrl(asset.bucket, asset.objectKey, 600, 'webp')
        : url,
      mediumUrl: isImage
        ? buildImageVariantUrl(asset.bucket, asset.objectKey, 1200, 'webp')
        : url,
      focalPointX: asset.focalPointX,
      focalPointY: asset.focalPointY,
      cropZoom: asset.cropZoom,
    };
  }

  private mapItem(item: WishlistVariantRecord) {
    const variant = item.productVariant;
    const product = variant.product;
    const { isAvailable, unavailableReason } = this.availability(product, variant);

    // Las fotos suelen estar asociadas al producto; las de variante son opcionales.
    // Combinamos ambas y deduplicamos por asset para que una misma foto no se repita.
    const assets = [...variant.images, ...product.images]
      .map((image) => image.asset)
      .filter((asset): asset is WishlistAssetRecord => asset !== null);
    const images = [...new Map(assets.map((asset) => [asset.id, asset])).values()].map((asset) =>
      this.mapImage(asset),
    );

    return {
      id: item.id,
      productVariantId: item.productVariantId,
      productName: product.name,
      productSlug: product.slug,
      price: product.basePrice + (variant.priceAdjustment ?? 0),
      imageUrl: images[0]?.url,
      images,
      isAvailable,
      unavailableReason,
      createdAt: item.createdAt,
    };
  }
}
