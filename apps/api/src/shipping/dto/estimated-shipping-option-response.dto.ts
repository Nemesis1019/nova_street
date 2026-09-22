import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EstimatedShippingOptionResponseDto {
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

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  isFree!: boolean;
}
