import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutSummaryResponseDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  shippingCost!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  paymentIntent!: {
    provider: string;
    clientSecret: string;
    amount: number;
    currency: string;
  };

  @ApiPropertyOptional()
  guestToken?: string;
}

export class ApplyCouponResponseDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  shippingCost!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  totalAmount!: number;
}

export class ConfirmPaymentResponseDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  paymentStatus!: string;
}
