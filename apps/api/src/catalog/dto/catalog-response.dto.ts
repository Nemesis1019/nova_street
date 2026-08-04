import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  objectKey!: string;
}

export class ProductImageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  smallUrl?: string;

  @ApiPropertyOptional()
  mediumUrl?: string;

  @ApiProperty()
  asset!: AssetDto;
}

export class ProductVariantDto {
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

  @ApiPropertyOptional()
  productionLeadTimeDays?: number;

  @ApiPropertyOptional()
  priceAdjustment?: number;

  @ApiPropertyOptional()
  quantity?: number;

  @ApiPropertyOptional()
  reservedQuantity?: number;

  @ApiPropertyOptional()
  availableQuantity?: number;

  @ApiPropertyOptional()
  inStock?: boolean;
}

export class CategorySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;
}

export class CategoryDto extends CategorySummaryDto {
  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  parentId?: string;
}

export class ProductListItemDto {
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

  @ApiProperty()
  basePrice!: number;

  @ApiProperty()
  displayPrice!: number;

  @ApiPropertyOptional()
  category?: CategorySummaryDto;

  @ApiProperty({ type: () => [ProductVariantDto] })
  variants!: ProductVariantDto[];

  @ApiProperty({ type: () => [ProductImageDto] })
  images!: ProductImageDto[];

  @ApiPropertyOptional()
  averageRating?: number;

  @ApiPropertyOptional()
  reviewCount?: number;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class ProductListResponseDto {
  @ApiProperty({ type: () => [ProductListItemDto] })
  data!: ProductListItemDto[];

  @ApiProperty()
  meta!: PaginationMetaDto;
}

export class ProductDetailDto extends ProductListItemDto {}
