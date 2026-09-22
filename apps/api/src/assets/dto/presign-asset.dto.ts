import { AssetPurpose } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PresignAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsEnum(AssetPurpose)
  @IsOptional()
  purpose?: AssetPurpose;

  @IsInt()
  @Min(1)
  @IsOptional()
  size?: number;
}
