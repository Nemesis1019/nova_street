import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddProductImageDto {
  @IsUUID()
  assetId!: string;

  @IsUUID()
  @IsOptional()
  productVariantId?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsOptional()
  sortOrder?: number;
}
