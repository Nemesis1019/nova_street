import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { parse } from 'csv-parse/sync';

import { buildAssetUrl } from '../assets/asset-url.util';
import { AuditService } from '../audit/audit.service';
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
    private readonly auditService: AuditService,
  ) {}

  private async invalidateCatalogCache() {
    await this.cacheManager.clear();
  }

  async create(dto: CreateProductDto) {
    if (dto.imageAssetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: dto.imageAssetId },
      });
      if (!asset) {
        throw new NotFoundException('Asset not found');
      }
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
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

      if (dto.imageAssetId) {
        await tx.productImage.create({
          data: {
            productId: created.id,
            assetId: dto.imageAssetId,
            sortOrder: 0,
          },
        });
      }

      return created;
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

  async bulk(action: 'activate' | 'deactivate' | 'delete', ids: string[], adminUserId?: string) {
    const where = { id: { in: ids } };
    if (action === 'activate') {
      await this.prisma.product.updateMany({ where, data: { isActive: true } });
    } else if (action === 'deactivate') {
      await this.prisma.product.updateMany({ where, data: { isActive: false } });
    } else if (action === 'delete') {
      await this.prisma.product.deleteMany({ where });
    }

    await this.auditService.log({
      userId: adminUserId,
      action: `BULK_${action.toUpperCase()}_PRODUCTS`,
      entity: 'Product',
      entityId: ids.join(','),
      after: { ids, action },
    });

    await this.invalidateCatalogCache();
    return { action, count: ids.length };
  }

  async importFromCsv(buffer: Buffer, adminUserId?: string) {
    const content = buffer.toString('utf-8');
    if (!content.trim()) {
      throw new BadRequestException('Empty CSV file');
    }

    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, unknown>>;

    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true },
    });
    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const errors: Array<{ row: number; message: string }> = [];
    let created = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;
      const name = String(row.name ?? '').trim();
      let slug = String(row.slug ?? '').trim().toLowerCase();
      const basePrice = Number(row.basePrice ?? row.base_price ?? row.price ?? '');
      const categoryId = row.categoryId
        ? String(row.categoryId)
        : (categoryByName.get(String(row.categoryName ?? row.category_name ?? '').toLowerCase()) ?? null);
      const isActive = row.isActive !== undefined ? row.isActive === 'true' || row.isActive === true : true;

      if (!name) {
        errors.push({ row: rowNumber, message: 'Missing name' });
        continue;
      }
      if (Number.isNaN(basePrice)) {
        errors.push({ row: rowNumber, message: 'Invalid basePrice' });
        continue;
      }
      if (!categoryId) {
        errors.push({ row: rowNumber, message: 'Missing categoryId or categoryName' });
        continue;
      }
      if (!slug) {
        slug = name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      try {
        await this.prisma.product.create({
          data: {
            name,
            slug,
            description: String(row.description ?? ''),
            metaTitle: String(row.metaTitle ?? row.meta_title ?? ''),
            metaDescription: String(row.metaDescription ?? row.meta_description ?? ''),
            basePrice,
            categoryId,
            isActive,
          },
        });
        created++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ row: rowNumber, message });
      }
    }

    await this.auditService.log({
      userId: adminUserId,
      action: 'IMPORT_PRODUCTS',
      entity: 'Product',
      entityId: 'csv',
      after: { created, errors },
    });

    await this.invalidateCatalogCache();
    return { created, total: rows.length, errors };
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
