import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CouponCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class CouponProductDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class CouponResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  discountType!: string;

  @ApiProperty()
  discountValue!: number;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  validFrom!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  validUntil?: string;

  @ApiPropertyOptional()
  maxUses?: number;

  @ApiProperty()
  usedCount!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  appliesTo!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  categoryId?: string;

  @ApiPropertyOptional({ type: CouponCategoryDto })
  category?: CouponCategoryDto;

  @ApiPropertyOptional({ format: 'uuid' })
  productId?: string;

  @ApiPropertyOptional({ type: CouponProductDto })
  product?: CouponProductDto;

  @ApiPropertyOptional()
  minOrderAmount?: number;

  @ApiPropertyOptional()
  maxUsesPerUser?: number;

  @ApiProperty()
  isFirstPurchaseOnly!: boolean;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: string;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  updatedAt!: string;
}

export class CouponListResponseDto {
  @ApiProperty({ type: () => [CouponResponseDto] })
  data!: CouponResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}
