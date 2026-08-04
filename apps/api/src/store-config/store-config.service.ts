import { DEFAULT_CURRENCY_CODE } from '@ecommerce/shared';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';

@Injectable()
export class StoreConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    return this.prisma.storeConfig.findFirst({ where: { isActive: true } });
  }

  async findOrCreateDefault() {
    const existing = await this.findActive();
    if (existing) return existing;

    return this.prisma.storeConfig.create({
      data: {
        name: 'Mi Tienda',
        description: 'Bienvenidos a nuestra tienda',
        primaryColor: '#228be6',
        secondaryColor: '#15aabf',
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        currencyCode: DEFAULT_CURRENCY_CODE,
        appearanceMode: 'LIGHT',
        surfaceColor: '#ffffff',
        surfaceMutedColor: '#f6f3f2',
        borderColor: '#0d0d0d',
        errorColor: '#e03131',
        successColor: '#2f9e44',
        warningColor: '#f76707',
        darkBackgroundColor: '#0d0d0d',
        darkTextColor: '#f5f5f5',
        maintenanceMode: false,
        enableCustomDesigns: true,
        enableNewsletter: true,
        enableCatalogFilters: true,
        template: 'storefront',
        templateConfig: {},
        storefrontConfig: {},
        emailProvider: 'smtp',
        paymentProvider: 'stripe',
        shippingProvider: 'flatRate',
        shippingBaseCost: 10_000,
      },
    });
  }

  async update(dto: UpdateStoreConfigDto, updatedById?: string) {
    const config = await this.findOrCreateDefault();

    return this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        backgroundColor: dto.backgroundColor,
        textColor: dto.textColor,
        heroImageUrl: dto.heroImageUrl,
        heroTitle: dto.heroTitle,
        heroSubtitle: dto.heroSubtitle,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        socialLinks: dto.socialLinks ? JSON.parse(dto.socialLinks) : undefined,
        currencyCode: dto.currencyCode,
        appearanceMode: dto.appearanceMode as 'LIGHT' | 'DARK' | 'SYSTEM' | undefined,
        surfaceColor: dto.surfaceColor,
        surfaceMutedColor: dto.surfaceMutedColor,
        borderColor: dto.borderColor,
        errorColor: dto.errorColor,
        successColor: dto.successColor,
        warningColor: dto.warningColor,
        darkBackgroundColor: dto.darkBackgroundColor,
        darkTextColor: dto.darkTextColor,
        isActive: dto.isActive,
        maintenanceMode: dto.maintenanceMode,
        maintenanceMessage: dto.maintenanceMessage,
        enableCustomDesigns: dto.enableCustomDesigns,
        enableNewsletter: dto.enableNewsletter,
        enableCatalogFilters: dto.enableCatalogFilters,
        template: dto.template,
        templateConfig: dto.templateConfig ? JSON.parse(dto.templateConfig) : undefined,
        storefrontConfig: dto.storefrontConfig ? JSON.parse(dto.storefrontConfig) : undefined,
        emailProvider: dto.emailProvider,
        paymentProvider: dto.paymentProvider,
        shippingProvider: dto.shippingProvider,
        shippingBaseCost: dto.shippingBaseCost,
        freeShippingThreshold: dto.freeShippingThreshold,
        shippingDiscountPercentage: dto.shippingDiscountPercentage,
        shippingDiscountFixedAmount: dto.shippingDiscountFixedAmount,
        updatedById,
      },
    });
  }
}
