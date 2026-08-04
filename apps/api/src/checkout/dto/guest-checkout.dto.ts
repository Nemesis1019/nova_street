import { IsEmail, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class GuestCheckoutAddressDto {
  @IsString()
  label!: string;

  @IsString()
  line1!: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  country!: string;

  @IsString()
  zipCode!: string;
}

export class GuestCheckoutItemDto {
  @IsUUID()
  productVariantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class GuestCheckoutDto {
  @IsEmail()
  email!: string;

  @ValidateNested({ each: true })
  items!: GuestCheckoutItemDto[];

  shippingAddress!: GuestCheckoutAddressDto;

  billingAddress!: GuestCheckoutAddressDto;

  @IsString()
  @IsOptional()
  couponCode?: string;
}
