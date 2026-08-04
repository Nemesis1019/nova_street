import { IsOptional, IsString, IsUUID } from 'class-validator';

export class InitCheckoutDto {
  @IsUUID()
  shippingAddressId!: string;

  @IsUUID()
  billingAddressId!: string;

  @IsString()
  @IsOptional()
  couponCode?: string;

  @IsString()
  @IsOptional()
  orderNotes?: string;
}
