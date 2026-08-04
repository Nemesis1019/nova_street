import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

export class CreatePageDto {
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens only',
  })
  slug!: string;

  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @MaxLength(50000)
  content!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  metaTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  metaDescription?: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
