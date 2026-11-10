import {
  DEFAULT_CUSTOMIZER_PRICING,
  normalizeColorOptions,
  normalizePricingRules,
  normalizePrintZones,
  normalizeSizeOptions,
} from '@ecommerce/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { CreateDesignTemplateDto, DesignTemplatePricingDto, UpdateDesignTemplateDto } from './dto/design-template.dto';

function pricingJson(pricing?: DesignTemplatePricingDto): Prisma.InputJsonValue {
  return {
    ...DEFAULT_CUSTOMIZER_PRICING,
    ...(pricing ?? {}),
    quantityTiers: pricing?.quantityTiers ?? [],
  } as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class DesignTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const templates = await this.prisma.designTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return templates.map((template) => this.toView(template));
  }

  async findAllAdmin() {
    const templates = await this.prisma.designTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return templates.map((template) => this.toView(template));
  }

  async findOne(id: string, allowInactive = false) {
    const template = await this.prisma.designTemplate.findUnique({ where: { id } });
    if (!template || (!allowInactive && !template.isActive)) {
      throw new NotFoundException('Design template not found');
    }
    return this.toView(template);
  }

  async create(dto: CreateDesignTemplateDto) {
    const template = await this.prisma.designTemplate.create({
      data: {
        name: dto.name.trim(),
        garmentType: dto.garmentType.trim(),
        description: dto.description?.trim() || null,
        baseImageUrl: dto.baseImageUrl.trim(),
        thumbnailUrl: dto.thumbnailUrl?.trim() || null,
        model3dUrl: dto.model3dUrl?.trim() || null,
        model3dRotationY: dto.model3dRotationY ?? 180,
        basePrice: dto.basePrice,
        availableColors: dto.colors.map((color) => color.name),
        availableSizes: dto.sizes.map((size) => size.name),
        colorOptions: dto.colors as unknown as Prisma.InputJsonValue,
        sizeOptions: dto.sizes as unknown as Prisma.InputJsonValue,
        printAreas: { zones: dto.zones } as unknown as Prisma.InputJsonValue,
        pricingRules: pricingJson(dto.pricing),
        stockMode: dto.stockMode,
        productionLeadTimeDays: dto.productionLeadTimeDays ?? 7,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.toView(template);
  }

  async update(id: string, dto: UpdateDesignTemplateDto) {
    const current = await this.prisma.designTemplate.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Design template not found');

    const data: Prisma.DesignTemplateUpdateInput = {
      name: dto.name?.trim() || undefined,
      garmentType: dto.garmentType?.trim() || undefined,
      description: dto.description === undefined ? undefined : dto.description?.trim() || null,
      baseImageUrl: dto.baseImageUrl?.trim() || undefined,
      thumbnailUrl: dto.thumbnailUrl === undefined ? undefined : dto.thumbnailUrl?.trim() || null,
      model3dUrl: dto.model3dUrl === undefined ? undefined : dto.model3dUrl?.trim() || null,
      model3dRotationY: dto.model3dRotationY,
      basePrice: dto.basePrice,
      stockMode: dto.stockMode,
      productionLeadTimeDays: dto.productionLeadTimeDays,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
      pricingRules: dto.pricing ? pricingJson(dto.pricing) : undefined,
    };

    if (dto.colors) {
      data.availableColors = dto.colors.map((color) => color.name);
      data.colorOptions = dto.colors as unknown as Prisma.InputJsonValue;
    }
    if (dto.sizes) {
      data.availableSizes = dto.sizes.map((size) => size.name);
      data.sizeOptions = dto.sizes as unknown as Prisma.InputJsonValue;
    }
    if (dto.zones) {
      data.printAreas = { zones: dto.zones } as unknown as Prisma.InputJsonValue;
    }

    const template = await this.prisma.designTemplate.update({ where: { id }, data });
    return this.toView(template);
  }

  async remove(id: string) {
    const template = await this.prisma.designTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Design template not found');

    const designs = await this.prisma.customDesign.count({ where: { designTemplateId: id } });
    if (designs > 0) {
      const archived = await this.prisma.designTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return { archived: true, template: this.toView(archived) };
    }

    await this.prisma.designTemplate.delete({ where: { id } });
    return { archived: false };
  }

  private toView(template: {
    id: string;
    name: string;
    garmentType: string;
    description: string | null;
    baseImageUrl: string;
    thumbnailUrl: string | null;
    model3dUrl: string | null;
    printAreas: Prisma.JsonValue;
    basePrice: number;
    availableColors: string[];
    availableSizes: string[];
    colorOptions: Prisma.JsonValue | null;
    sizeOptions: Prisma.JsonValue | null;
    pricingRules: Prisma.JsonValue | null;
    stockMode: string;
    productionLeadTimeDays: number;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...template,
      thumbnailUrl: template.thumbnailUrl ?? template.baseImageUrl,
      colors: normalizeColorOptions(template),
      sizes: normalizeSizeOptions(template),
      zones: normalizePrintZones(template.printAreas),
      pricing: normalizePricingRules(template.pricingRules),
    };
  }
}
