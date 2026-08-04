import { ApiProperty } from '@nestjs/swagger';

export class ShippingCostResponseDto {
  @ApiProperty()
  shippingCost!: number;

  @ApiProperty({ required: false })
  baseCost?: number;

  @ApiProperty({ required: false, nullable: true })
  freeShippingThreshold?: number | null;
}
