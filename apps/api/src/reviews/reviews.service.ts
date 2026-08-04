import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AssetPurpose } from '@prisma/client';
import { Cache } from 'cache-manager';

import { buildAssetUrl, buildImageVariantUrl } from '../assets/asset-url.util';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const MAX_REVIEW_ASSETS = 4;

function mapReviewAssets(
  assets: Array<{ id: string; sortOrder: number; asset: { bucket: string; objectKey: string; mimeType: string } }>,
) {
  return assets.map((ra) => {
    const url = buildAssetUrl(ra.asset.bucket, ra.asset.objectKey);
    const isImage = ra.asset.mimeType.startsWith('image/');
    return {
      id: ra.id,
      url,
      thumbnailUrl: isImage
        ? buildImageVariantUrl(ra.asset.bucket, ra.asset.objectKey, 300, 'webp')
        : url,
      sortOrder: ra.sortOrder,
    };
  });
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateCatalogCache() {
    await this.cacheManager.clear();
  }

  async findByProduct(productId: string, query: { page: number; limit: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isApproved: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          product: { select: { id: true, name: true } },
          assets: {
            orderBy: { sortOrder: 'asc' },
            include: { asset: { select: { bucket: true, objectKey: true, mimeType: true } } },
          },
        },
      }),
      this.prisma.review.count({ where: { productId, isApproved: true } }),
      this.prisma.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
      }),
    ]);

    return {
      data: data.map((review) => ({
        ...review,
        assets: mapReviewAssets(review.assets),
      })),
      meta: { page, limit, total },
      averageRating: aggregate._avg.rating ?? 0,
    };
  }

  async findAll(query: { page: number; limit: number; isApproved?: boolean; productId?: string; search?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (typeof query.isApproved === 'boolean') {
      where.isApproved = query.isApproved;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.search?.trim()) {
      where.user = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          product: { select: { id: true, name: true } },
          assets: {
            orderBy: { sortOrder: 'asc' },
            include: { asset: { select: { bucket: true, objectKey: true, mimeType: true } } },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: data.map((review) => ({
        ...review,
        assets: mapReviewAssets(review.assets),
      })),
      meta: { page, limit, total },
    };
  }

  async create(
    productId: string,
    userId: string,
    dto: { rating: number; comment?: string; orderId?: string; assetIds?: string[] },
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          userId,
          status: { in: ['PAID', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'] },
          items: { some: { productVariant: { productId } } },
        },
      });

      if (!order) {
        throw new BadRequestException('You can only review products from paid orders');
      }
    }

    const existing = await this.prisma.review.findFirst({
      where: { productId, userId, orderId: dto.orderId ?? null },
    });

    if (existing) {
      throw new BadRequestException('You already reviewed this product');
    }

    const assetIds = dto.assetIds ?? [];
    if (assetIds.length > MAX_REVIEW_ASSETS) {
      throw new BadRequestException(`You can attach up to ${MAX_REVIEW_ASSETS} photos`);
    }

    if (assetIds.length > 0) {
      const assets = await this.prisma.asset.findMany({
        where: {
          id: { in: assetIds },
          ownerId: userId,
          purpose: AssetPurpose.REVIEW_IMAGE,
        },
        include: { reviewAssets: true },
      });

      if (assets.length !== assetIds.length) {
        throw new BadRequestException('One or more images are invalid or do not belong to you');
      }

      const alreadyUsed = assets.some((asset) => asset.reviewAssets.length > 0);
      if (alreadyUsed) {
        throw new BadRequestException('One or more images are already attached to another review');
      }
    }

    const review = await this.prisma.review.create({
      data: {
        productId,
        userId,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        isApproved: false,
        ...(assetIds.length > 0 && {
          assets: {
            create: assetIds.map((assetId, index) => ({
              sortOrder: index,
              asset: { connect: { id: assetId } },
            })),
          },
        }),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true } },
        assets: {
          orderBy: { sortOrder: 'asc' },
          include: { asset: { select: { bucket: true, objectKey: true, mimeType: true } } },
        },
      },
    });

    await this.invalidateCatalogCache();
    return { ...review, assets: mapReviewAssets(review.assets) };
  }

  async updateApproval(id: string, isApproved: boolean, adminUserId?: string) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: { isApproved },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true } },
        assets: {
          orderBy: { sortOrder: 'asc' },
          include: { asset: { select: { bucket: true, objectKey: true, mimeType: true } } },
        },
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: isApproved ? 'APPROVE_REVIEW' : 'REJECT_REVIEW',
      entity: 'Review',
      entityId: id,
      before: { isApproved: existing.isApproved },
      after: { isApproved: updated.isApproved },
    });

    await this.invalidateCatalogCache();
    return { ...updated, assets: mapReviewAssets(updated.assets) };
  }

  async remove(id: string, adminUserId?: string) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.review.delete({ where: { id } });

    await this.auditService.log({
      userId: adminUserId,
      action: 'DELETE_REVIEW',
      entity: 'Review',
      entityId: id,
      before: { id, productId: existing.productId, rating: existing.rating },
    });

    await this.invalidateCatalogCache();
  }
}
