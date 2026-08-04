import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AdminOrderUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;
}

export class AdminOrderProductDto {
  @ApiProperty()
  name!: string;
}

export class AdminOrderProductVariantDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  product?: AdminOrderProductDto;
}

export class AdminOrderDesignTemplateDto {
  @ApiProperty()
  name!: string;
}

export class AdminOrderCustomDesignDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  designTemplate?: AdminOrderDesignTemplateDto;
}

export class AdminOrderItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  productionStatus!: string;

  @ApiPropertyOptional()
  productVariant?: AdminOrderProductVariantDto;

  @ApiPropertyOptional()
  customDesign?: AdminOrderCustomDesignDto;
}

export class AdminOrderCouponDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  discountType!: string;

  @ApiProperty()
  discountValue!: number;
}

export class AdminOrderPaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: string;
}

export class AdminOrderAddressDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  addressLine1!: string;

  @ApiPropertyOptional()
  addressLine2?: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty()
  country!: string;

  @ApiProperty()
  phone!: string;
}

export class AdminOrderListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  paymentStatus!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  shippingCost!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  createdAt!: string;

  @ApiProperty()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  updatedAt!: string;

  @ApiPropertyOptional()
  trackingNumber?: string;

  @ApiPropertyOptional()
  carrier?: string;

  @ApiPropertyOptional()
  trackingUrl?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  shippedAt?: string;

  @ApiProperty()
  user!: AdminOrderUserDto;

  @ApiProperty()
  items!: AdminOrderItemDto[];
}

export class AdminOrderListResponseDto {
  @ApiProperty({ type: [AdminOrderListItemDto] })
  data!: AdminOrderListItemDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}

export class AdminOrderDetailResponseDto extends AdminOrderListItemDto {
  @ApiPropertyOptional()
  shippingAddress?: AdminOrderAddressDto;

  @ApiPropertyOptional()
  billingAddress?: AdminOrderAddressDto;

  @ApiPropertyOptional()
  coupon?: AdminOrderCouponDto;

  @ApiProperty({ type: [AdminOrderPaymentDto] })
  payments!: AdminOrderPaymentDto[];

  @ApiPropertyOptional()
  assignedTo?: AdminOrderUserDto;

  @ApiPropertyOptional()
  adminNotes?: string;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  cancelledAt?: string;

  @ApiPropertyOptional()
  refundReason?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value))
  refundedAt?: string;
}
