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
  assetUrl?: string;

  @IsString()
  @IsOptional()
  textContent?: string;

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
}
