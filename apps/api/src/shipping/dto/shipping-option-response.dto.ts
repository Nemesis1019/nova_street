import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  price!: number;

  @ApiPropertyOptional()
  estimatedDaysMin?: number | null;

  @ApiPropertyOptional()
  estimatedDaysMax?: number | null;

  @ApiPropertyOptional()
  freeShippingThreshold?: number | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
