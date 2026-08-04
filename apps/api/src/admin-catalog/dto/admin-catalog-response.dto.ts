import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductImageDto } from './product-image.dto';

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  parentId?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CategoryDetailDto extends CategoryResponseDto {
  @ApiProperty({ type: () => [CategoryResponseDto] })
  children!: CategoryResponseDto[];
}

export class ProductVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sku!: string;

  @ApiPropertyOptional()
  size?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  garmentType?: string;

  @ApiProperty()
  stockMode!: string;

  @ApiProperty()
  productionLeadTimeDays!: number;

  @ApiPropertyOptional()
  priceAdjustment?: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProductCategorySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  categoryId?: string;

  @ApiProperty()
  basePrice!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  category?: ProductCategorySummaryDto;

  @ApiProperty({ type: () => [ProductVariantResponseDto] })
  variants!: ProductVariantResponseDto[];
}

export class AdminProductDetailDto extends ProductResponseDto {
  @ApiProperty({ type: () => [ProductImageDto] })
  images!: ProductImageDto[];
}

export class AdminProductListResponseDto {
  @ApiProperty({ type: () => [ProductResponseDto] })
  data!: ProductResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}

export class InventorySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  reservedQuantity!: number;
}

export class InventoryProductSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class InventoryListItemDto extends ProductVariantResponseDto {
  @ApiPropertyOptional({ type: () => InventoryProductSummaryDto })
  product?: InventoryProductSummaryDto;

  @ApiPropertyOptional({ type: () => InventorySummaryDto })
  inventory?: InventorySummaryDto;
}

export class InventoryListResponseDto {
  @ApiProperty({ type: () => [InventoryListItemDto] })
  data!: InventoryListItemDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}
