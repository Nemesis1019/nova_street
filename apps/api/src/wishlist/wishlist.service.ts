import { Injectable, NotFoundException } from '@nestjs/common';

import { buildAssetUrl } from '../assets/asset-url.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        productVariant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, basePrice: true },
            },
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

    return items.map((item) => {
      const product = item.productVariant.product;
      const image = item.productVariant.images[0]?.asset;
      return {
        id: item.id,
        productVariantId: item.productVariantId,
        productName: product.name,
        productSlug: product.slug,
        price: product.basePrice + (item.productVariant.priceAdjustment ?? 0),
        imageUrl: image ? buildAssetUrl(image.bucket, image.objectKey) : undefined,
        createdAt: item.createdAt,
      };
    });
  }

  async add(userId: string, productVariantId: string) {
    const variantExists = await this.prisma.productVariant.count({ where: { id: productVariantId } });
    if (variantExists === 0) {
      throw new NotFoundException('Product variant not found');
    }

    const item = await this.prisma.wishlistItem.upsert({
      where: { userId_productVariantId: { userId, productVariantId } },
      update: {},
      create: { userId, productVariantId },
      include: {
        productVariant: {
          include: {
            product: { select: { id: true, name: true, slug: true, basePrice: true } },
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

    return this.mapItem(item);
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

  private mapItem(item: {
    id: string;
    productVariantId: string;
    createdAt: Date;
    productVariant: {
      priceAdjustment: number | null;
      product: { id: string; name: string; slug: string; basePrice: number };
      images: Array<{ asset: { id: string; bucket: string; objectKey: string } | null }>;
    };
  }) {
    const product = item.productVariant.product;
    const image = item.productVariant.images[0]?.asset;
    return {
      id: item.id,
      productVariantId: item.productVariantId,
      productName: product.name,
      productSlug: product.slug,
      price: product.basePrice + (item.productVariant.priceAdjustment ?? 0),
        imageUrl: image ? buildAssetUrl(image.bucket, image.objectKey) : undefined,
      createdAt: item.createdAt,
    };
  }

}
