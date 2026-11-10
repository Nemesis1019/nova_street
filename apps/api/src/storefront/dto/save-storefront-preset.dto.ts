import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveStorefrontPresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(240)
  description?: string;
}
