import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;

  @ApiProperty()
  isVisible!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: string;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  updatedAt!: string;
}

export class PageListResponseDto {
  @ApiProperty({ type: () => [PageResponseDto] })
  data!: PageResponseDto[];
}
