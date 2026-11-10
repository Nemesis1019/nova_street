import { CustomDesignElementType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CustomDesignElementDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsEnum(CustomDesignElementType)
  type!: CustomDesignElementType;

  @IsString()
  @IsOptional()
  printAreaKey?: string;

  @IsString()
  @IsOptional()
  assetUrl?: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsString()
  @IsOptional()
  fontFamily?: string;

  @IsInt()
  @IsOptional()
  fontWeight?: number;

  @IsInt()
  @IsOptional()
  fontSize?: number;

  @IsString()
  @IsOptional()
  fill?: string;

  @IsNumber()
  positionX!: number;

  @IsNumber()
  positionY!: number;

  @IsNumber()
  @IsOptional()
  scale?: number;

  @IsNumber()
  @IsOptional()
  rotation?: number;

  @IsNumber()
  @IsOptional()
  zIndex?: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;
}
