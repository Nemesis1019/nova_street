import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { StockMode } from '@prisma/client';
import { Cache } from 'cache-manager';

import { buildAssetUrl, buildImageVariantUrl } from '../assets/asset-url.util';
import { PrismaService } from '../prisma/prisma.service';
import { ListProductsQueryDto, ProductSort } from './dto/list-products-query.dto';

function buildVariantDto(variant: {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  garmentType: string | null;
  stockMode: StockMode;
  productionLeadTimeDays?: number | null;
  priceAdjustment: number | null;
  inventory: { quantity: number; reservedQuantity: number } | null;
}) {
  const quantity = variant.inventory?.quantity ?? 0;
  const reservedQuantity = variant.inventory?.reservedQuantity ?? 0;
  const availableQuantity = quantity - reservedQuantity;
  const inStock = variant.stockMode === StockMode.MADE_TO_ORDER || availableQuantity > 0;

  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size ?? undefined,
    color: variant.color ?? undefined,
    garmentType: variant.garmentType ?? undefined,
    stockMode: variant.stockMode,
    productionLeadTimeDays: variant.productionLeadTimeDays ?? undefined,
    priceAdjustment: variant.priceAdjustment ?? undefined,
    quantity: variant.stockMode === StockMode.TRACKED ? quantity : undefined,
    reservedQuantity: variant.stockMode === StockMode.TRACKED ? reservedQuantity : undefined,
    availableQuantity: variant.stockMode === StockMode.TRACKED ? availableQuantity : undefined,
    inStock,
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private cacheKey(prefix: string, suffix: string): string {
    return `${prefix}:${suffix}`;
  }

  private async getCached<T>(key: string, factory: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached) {
      return cached;
    }
    const value = await factory();
    await this.cacheManager.set(key, value, ttlSeconds * 1000);
    return value;
  }

  async findActiveCategories() {
    return this.getCached(
      this.cacheKey('catalog', 'categories'),
      async () =>
        this.prisma.category.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            metaTitle: true,
            metaDescription: true,
            parentId: true,
          },
        }),
      300,
    );
  }

  async findCategoryBySlug(slug: string) {
    const cacheKey = this.cacheKey('catalog', `category:${slug}`);
    const cached = await this.cacheManager.get<unknown>(cacheKey);
    if (cached) {
      return cached;
    }
    const category = await this.prisma.category.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        metaTitle: true,
        metaDescription: true,
        parentId: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.cacheManager.set(cacheKey, category, 300_000);
    return category;
  }

  async findProducts(query: ListProductsQueryDto) {
    const cacheKey = this.cacheKey('catalog', `products:${JSON.stringify(query)}`);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    const result = await this.findProductsUncached(query);
    await this.cacheManager.set(cacheKey, result, 300_000);
    return result;
  }

  private async findProductsUncached(query: ListProductsQueryDto) {
    const {
      page = 1,
      limit = 20,
      categorySlug,
      size,
      sizes,
      color,
      colors,
      garmentType,
      minPrice,
      maxPrice,
      inStock,
      search,
      sort = ProductSort.NEWEST,
    } = query;
    const skip = (page - 1) * limit;

    const category = categorySlug
      ? await this.prisma.category.findUnique({ where: { slug: categorySlug } })
      : null;

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (category?.id) {
      where.categoryId = category.id;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) (where.basePrice as Record<string, unknown>).gte = minPrice;
      if (maxPrice !== undefined) (where.basePrice as Record<string, unknown>).lte = maxPrice;
    }

    const variantsWhere: Record<string, unknown> = { isActive: true };

    const variantSizes = sizes && sizes.length > 0 ? sizes : size ? [size] : [];
    if (variantSizes.length > 0) {
      variantsWhere.size = { in: variantSizes };
    }

    const variantColors = colors && colors.length > 0 ? colors : color ? [color] : [];
    if (variantColors.length > 0) {
      variantsWhere.color = { in: variantColors };
    }

    if (garmentType) {
      variantsWhere.garmentType = garmentType;
    }

    if (inStock) {
      variantsWhere.OR = [
        { stockMode: 'MADE_TO_ORDER' },
        {
          stockMode: 'TRACKED',
          inventory: { quantity: { gt: 0 } },
        },
      ];
    }

    if (Object.keys(variantsWhere).length > 1 || variantSizes.length > 0 || variantColors.length > 0 || garmentType || inStock) {
      where.variants = { some: variantsWhere };
    }

    const orderBy = this.buildOrderBy(sort);

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              garmentType: true,
              stockMode: true,
              productionLeadTimeDays: true,
              priceAdjustment: true,
              inventory: { select: { quantity: true, reservedQuantity: true } },
            },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            include: {
              asset: {
                select: { id: true, bucket: true, objectKey: true, mimeType: true },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const reviewStats = await this.reviewStatsForProducts(data.map((p) => p.id));

    return {
      data: data.map((product) => ({
        ...product,
        variants: product.variants.map(buildVariantDto),
        displayPrice: this.computeDisplayPrice(product.basePrice, product.variants),
        images: product.images.map((image) => this.mapImage(image)),
        averageRating: reviewStats[product.id]?.averageRating,
        reviewCount: reviewStats[product.id]?.reviewCount,
      })),
      meta: { page, limit, total },
    };
  }

  async searchSuggestions(q: string, limit: number) {
    const normalized = q.trim();
    if (normalized.length < 2) {
      return { data: [] };
    }

    const cacheKey = this.cacheKey('catalog', `search:${normalized}:${limit}`);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: normalized, mode: 'insensitive' } },
          { slug: { contains: normalized, mode: 'insensitive' } },
          { description: { contains: normalized, mode: 'insensitive' } },
        ],
        variants: { some: { isActive: true } },
      },
      take: Math.min(limit, 10),
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          include: {
            asset: { select: { bucket: true, objectKey: true } },
          },
        },
      },
    });

    const result = {
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.basePrice,
        imageUrl: p.images[0]?.asset
          ? buildAssetUrl(p.images[0].asset.bucket, p.images[0].asset.objectKey)
          : undefined,
      })),
    };
    await this.cacheManager.set(cacheKey, result, 60_000);
    return result;
  }

  async findProductBySlug(slug: string) {
    const cacheKey = this.cacheKey('catalog', `product:${slug}`);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        category: {
          select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            garmentType: true,
            stockMode: true,
            productionLeadTimeDays: true,
            priceAdjustment: true,
            inventory: { select: { quantity: true, reservedQuantity: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          include: {
            asset: {
              select: { id: true, bucket: true, objectKey: true, mimeType: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const reviewStats = await this.reviewStatsForProducts([product.id]);

    const result = {
      ...product,
      variants: product.variants.map(buildVariantDto),
      displayPrice: this.computeDisplayPrice(product.basePrice, product.variants),
      images: product.images.map((image) => this.mapImage(image)),
      averageRating: reviewStats[product.id]?.averageRating,
      reviewCount: reviewStats[product.id]?.reviewCount,
    };
    await this.cacheManager.set(cacheKey, result, 300_000);
    return result;
  }

  private async reviewStatsForProducts(productIds: string[]) {
    if (productIds.length === 0) return {};

    const aggregates = await this.prisma.review.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        isApproved: true,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return aggregates.reduce<Record<string, { averageRating: number; reviewCount: number }>>(
      (acc, item) => {
        acc[item.productId] = {
          averageRating: Number((item._avg.rating ?? 0).toFixed(1)),
          reviewCount: item._count._all,
        };
        return acc;
      },
      {},
    );
  }

  private buildOrderBy(sort: ProductSort) {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return { basePrice: 'asc' as const };
      case ProductSort.PRICE_DESC:
        return { basePrice: 'desc' as const };
      case ProductSort.NAME_ASC:
        return { name: 'asc' as const };
      case ProductSort.NEWEST:
      default:
        return { createdAt: 'desc' as const };
    }
  }

  private computeDisplayPrice(
    basePrice: number,
    variants: { priceAdjustment: number | null }[],
  ): number {
    if (variants.length === 0) return basePrice;
    const adjustments = variants
      .map((v) => v.priceAdjustment ?? 0)
      .filter((a) => a !== 0);
    if (adjustments.length === 0) return basePrice;
    return basePrice + Math.min(...adjustments);
  }

  private mapImage(image: {
    id: string;
    sortOrder: number;
    asset: { id: string; bucket: string; objectKey: string; mimeType?: string | null };
  }) {
    const url = buildAssetUrl(image.asset.bucket, image.asset.objectKey);
    const isImage = image.asset.mimeType?.startsWith('image/') ?? true;
    return {
      ...image,
      url,
      thumbnailUrl: isImage ? buildImageVariantUrl(image.asset.bucket, image.asset.objectKey, 300, 'webp') : url,
      smallUrl: isImage ? buildImageVariantUrl(image.asset.bucket, image.asset.objectKey, 600, 'webp') : url,
      mediumUrl: isImage ? buildImageVariantUrl(image.asset.bucket, image.asset.objectKey, 1200, 'webp') : url,
    };
  }
}
