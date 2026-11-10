import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CustomDesignPrintFileDto {
  @IsString()
  zoneKey!: string;

  @IsString()
  assetUrl!: string;

  @IsInt()
  @Min(72)
  dpi!: number;

  @IsNumber()
  @Min(0.1)
  widthCm!: number;

  @IsNumber()
  @Min(0.1)
  heightCm!: number;

  @IsIn(['DTG', 'DTF', 'SCREEN', 'EMBROIDERY'])
  printMethod!: 'DTG' | 'DTF' | 'SCREEN' | 'EMBROIDERY';

  @IsBoolean()
  @IsOptional()
  mirrored?: boolean;
}
