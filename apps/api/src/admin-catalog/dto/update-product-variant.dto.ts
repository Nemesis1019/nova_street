import { StockMode } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
