import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WishlistImageDto {
  @ApiProperty()
  url!: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  smallUrl?: string;

  @ApiPropertyOptional()
  mediumUrl?: string;

  @ApiPropertyOptional()
  focalPointX?: number;

  @ApiPropertyOptional()
  focalPointY?: number;

  @ApiPropertyOptional()
  cropZoom?: number;
}

export class WishlistItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productVariantId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSlug!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ type: [WishlistImageDto], description: 'Imágenes del producto en orden de catálogo' })
  images!: WishlistImageDto[];

  @ApiProperty({ description: 'false si el producto/variante está desactivado o sin stock' })
  isAvailable!: boolean;

  @ApiPropertyOptional({
    description: 'Motivo cuando no está disponible',
    enum: ['PRODUCT_INACTIVE', 'VARIANT_INACTIVE', 'OUT_OF_STOCK'],
  })
  unavailableReason?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class WishlistListDto {
  @ApiProperty({ type: [WishlistItemDto] })
  data!: WishlistItemDto[];
}
