import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StockMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DesignTemplateColorDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: '#0d0d0d' })
  @IsString()
  hex!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  priceAdjustment?: number;
}

export class DesignTemplateSizeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  priceAdjustment?: number;
}

export class DesignTemplateZoneDto {
  @ApiProperty({ example: 'front' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'Frente' })
  @IsString()
  label!: string;

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @ApiProperty({ minimum: 0.01, maximum: 1 })
  @IsNumber()
  @Min(0.01)
  @Max(1)
  width!: number;

  @ApiProperty({ minimum: 0.01, maximum: 1 })
  @IsNumber()
  @Min(0.01)
  @Max(1)
  height!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ enum: ['DTG', 'DTF', 'SCREEN', 'EMBROIDERY'], default: 'DTG' })
  @IsIn(['DTG', 'DTF', 'SCREEN', 'EMBROIDERY'])
  @IsOptional()
  printMethod?: 'DTG' | 'DTF' | 'SCREEN' | 'EMBROIDERY';

  @ApiPropertyOptional({ default: 300 })
  @IsInt()
  @Min(72)
  @Max(1200)
  @IsOptional()
  printDpi?: number;

  @ApiPropertyOptional({ default: 2 })
  @IsNumber()
  @Min(0)
  @Max(20)
  @IsOptional()
  bleedMm?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxWidthCm?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxHeightCm?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  allowText?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  allowImage?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  allowClipart?: boolean;
}

export class DesignTemplateQuantityTierDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  minQuantity!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent!: number;
}

export class DesignTemplatePricingDto {
  @ApiPropertyOptional({ default: 2500 })
  @IsInt()
  @IsOptional()
  perElement?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  textPerCharacter?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  setupFee?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ type: [DesignTemplateQuantityTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignTemplateQuantityTierDto)
  @IsOptional()
  quantityTiers?: DesignTemplateQuantityTierDto[];
}

export class CreateDesignTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Remera' })
  @IsString()
  garmentType!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  baseImageUrl!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'GLB/GLTF para la fase 3D' })
  @IsString()
  @IsOptional()
  model3dUrl?: string;

  @ApiPropertyOptional({ default: 180, description: 'Rotación Y del modelo en grados' })
  @IsInt()
  @Min(-360)
  @Max(360)
  @IsOptional()
  model3dRotationY?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  basePrice!: number;

  @ApiProperty({ type: [DesignTemplateColorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignTemplateColorDto)
  colors!: DesignTemplateColorDto[];

  @ApiProperty({ type: [DesignTemplateSizeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignTemplateSizeDto)
  sizes!: DesignTemplateSizeDto[];

  @ApiProperty({ type: [DesignTemplateZoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignTemplateZoneDto)
  zones!: DesignTemplateZoneDto[];

  @ApiPropertyOptional({ type: DesignTemplatePricingDto })
  @ValidateNested()
  @Type(() => DesignTemplatePricingDto)
  @IsOptional()
  pricing?: DesignTemplatePricingDto;

  @ApiPropertyOptional({ enum: StockMode, default: StockMode.MADE_TO_ORDER })
  @IsEnum(StockMode)
  @IsOptional()
  stockMode?: StockMode;

  @ApiPropertyOptional({ default: 7 })
  @IsInt()
  @Min(1)
  @IsOptional()
  productionLeadTimeDays?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateDesignTemplateDto extends PartialType(CreateDesignTemplateDto) {}
