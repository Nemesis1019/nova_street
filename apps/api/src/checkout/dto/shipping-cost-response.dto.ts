import { ApiProperty } from '@nestjs/swagger';

import { EstimatedShippingOptionResponseDto } from '../../shipping/dto/estimated-shipping-option-response.dto';

export class ShippingCostResponseDto {
  @ApiProperty()
  shippingCost!: number;

  @ApiProperty({ required: false })
  baseCost?: number;

  @ApiProperty({ required: false, nullable: true })
  freeShippingThreshold?: number | null;

  @ApiProperty({ type: [EstimatedShippingOptionResponseDto], required: false })
  options?: EstimatedShippingOptionResponseDto[];
}
