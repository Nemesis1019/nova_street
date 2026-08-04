import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { buildAssetUrl } from '../assets/asset-url.util';
import { PrismaService } from '../prisma/prisma.service';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ReorderProductImagesDto } from './dto/reorder-product-images.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class AdminProductService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateCatalogCache() {
    await this.cacheManager.clear();
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        categoryId: dto.categoryId,
        basePrice: dto.basePrice,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true } },
        variants: true,
      },
    });
    await this.invalidateCatalogCache();
    return product;
  }

  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { category: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true } },
          variants: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true } },
        variants: true,
        images: { orderBy: { sortOrder: 'asc' }, include: { asset: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      ...product,
      images: product.images.map((image) => ({
        ...image,
        url: buildAssetUrl(image.asset.bucket, image.asset.objectKey),
      })),
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        categoryId: dto.categoryId,
        basePrice: dto.basePrice,
        isActive: dto.isActive,
      },
      include: {
        category: { select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true } },
        variants: true,
      },
    });
    await this.invalidateCatalogCache();
    return product;
  }

  async toggleActive(id: string) {
    const product = await this.findById(id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
      include: {
        category: { select: { id: true, name: true, slug: true, metaTitle: true, metaDescription: true } },
        variants: true,
      },
    });
    await this.invalidateCatalogCache();
    return updated;
  }

  async remove(id: string) {
    await this.findById(id);
    const deleted = await this.prisma.product.delete({ where: { id } });
    await this.invalidateCatalogCache();
    return deleted;
  }

  async addImage(id: string, dto: AddProductImageDto) {
    await this.findById(id);

    const count = await this.prisma.productImage.count({
      where: { productId: id },
    });

    const image = await this.prisma.productImage.create({
      data: {
        productId: id,
        assetId: dto.assetId,
        productVariantId: dto.productVariantId ?? null,
        sortOrder: dto.sortOrder ?? count,
      },
      include: { asset: true },
    });
    await this.invalidateCatalogCache();
    return image;
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const deleted = await this.prisma.productImage.delete({
      where: { id: imageId },
      include: { asset: true },
    });
    await this.invalidateCatalogCache();
    return deleted;
  }

  async reorderImages(productId: string, dto: ReorderProductImagesDto) {
    await this.findById(productId);

    const existingIds = await this.prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    });

    const existingSet = new Set(existingIds.map((i) => i.id));
    if (dto.imageIds.some((id) => !existingSet.has(id))) {
      throw new NotFoundException('One or more image ids do not belong to this product');
    }

    await this.prisma.$transaction(
      dto.imageIds.map((id, index) =>
        this.prisma.productImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.invalidateCatalogCache();
    return this.findById(productId);
  }
}
