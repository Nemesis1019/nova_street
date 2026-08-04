import { Module } from '@nestjs/common';

import { AssetsModule } from '../assets/assets.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCategoryController } from './admin-category.controller';
import { AdminCategoryService } from './admin-category.service';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { AdminProductVariantController } from './admin-product-variant.controller';
import { AdminProductVariantService } from './admin-product-variant.service';
import { AdminStockController } from './admin-stock.controller';
import { AdminStockService } from './admin-stock.service';

@Module({
  imports: [PrismaModule, AssetsModule],
  controllers: [
    AdminCategoryController,
    AdminProductController,
    AdminProductVariantController,
    AdminStockController,
  ],
  providers: [
    AdminCategoryService,
    AdminProductService,
    AdminProductVariantService,
    AdminStockService,
  ],
})
export class AdminCatalogModule {}
