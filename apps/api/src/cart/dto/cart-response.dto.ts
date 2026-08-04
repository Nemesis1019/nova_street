import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartProductSummaryDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class CartProductVariantSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sku!: string;

  @ApiPropertyOptional()
  size?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiProperty()
  product!: CartProductSummaryDto;
}

export class CartCustomDesignSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  designTemplate!: { name: string };
}

export class CartItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  productVariantId!: string | null;

  @ApiProperty()
  customDesignId!: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  subtotal!: number;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  productVariant?: CartProductVariantSummaryDto;

  @ApiPropertyOptional()
  customDesign?: CartCustomDesignSummaryDto;
}

export class CartResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: () => [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty()
  total!: number;
}
