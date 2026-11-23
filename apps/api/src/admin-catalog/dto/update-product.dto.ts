import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be a valid URL slug',
  })
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  videoUrls?: string[];

  @IsArray()
  @IsOptional()
  variantVideos?: Array<{ url: string; productVariantId: string }>;

  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaDescription?: string;
}
