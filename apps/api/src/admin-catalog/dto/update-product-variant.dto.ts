import { StockMode } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @Matches(/^#[0-9A-Fa-f]{6}$/)
  @IsOptional()
  colorHex?: string | null;

  @IsString()
  @IsOptional()
  garmentType?: string;

  @IsEnum(StockMode)
  @IsOptional()
  stockMode?: StockMode;

  @IsInt()
  @Min(0)
  @IsOptional()
  productionLeadTimeDays?: number;

  @IsInt()
  @IsOptional()
  priceAdjustment?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
