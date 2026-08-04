import { IsUUID } from 'class-validator';

export class CalculateShippingCostDto {
  @IsUUID()
  shippingAddressId!: string;
}
