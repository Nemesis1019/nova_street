import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductImageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assetId!: string;

  @ApiProperty()
  url!: string;

  @ApiPropertyOptional()
  productVariantId?: string;

  @ApiPropertyOptional()
  altText?: string;

  @ApiProperty()
  sortOrder!: number;
}
