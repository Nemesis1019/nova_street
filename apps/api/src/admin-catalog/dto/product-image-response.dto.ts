import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetId!: string;

  @ApiPropertyOptional()
  productVariantId?: string;

  @ApiPropertyOptional()
  altText?: string;

  @ApiProperty()
  sortOrder!: number;
}
