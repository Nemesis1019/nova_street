import { ApiProperty } from '@nestjs/swagger';

export class DesignTemplateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  garmentType!: string;

  @ApiProperty()
  baseImageUrl!: string;

  @ApiProperty()
  printAreas!: Record<string, unknown>;

  @ApiProperty()
  basePrice!: number;

  @ApiProperty({ type: [String] })
  availableColors!: string[];

  @ApiProperty({ type: [String] })
  availableSizes!: string[];

  @ApiProperty()
  stockMode!: string;

  @ApiProperty()
  productionLeadTimeDays!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
