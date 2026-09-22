import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateShippingOptionDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsInt()
  @IsOptional()
  estimatedDaysMin?: number;

  @IsInt()
  @IsOptional()
  estimatedDaysMax?: number;

  @IsInt()
  @IsOptional()
  freeShippingThreshold?: number;

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
