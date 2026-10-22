import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateShippingOptionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsInt()
  @IsOptional()
  estimatedDaysMin?: number;

  @IsInt()
  @IsOptional()
  estimatedDaysMax?: number;

  @IsInt()
  @IsOptional()
  freeShippingThreshold?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  coverageZones?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
