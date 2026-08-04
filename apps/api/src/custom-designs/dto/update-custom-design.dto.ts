import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { CustomDesignElementDto } from './custom-design-element.dto';

export class UpdateCustomDesignDto {
  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  previewImageUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  surcharge?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomDesignElementDto)
  @IsOptional()
  elements?: CustomDesignElementDto[];
}
