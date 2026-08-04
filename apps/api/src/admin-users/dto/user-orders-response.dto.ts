import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserOrderItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiPropertyOptional()
  name?: string;
}

class UserOrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  paymentStatus!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  trackingNumber?: string;

  @ApiPropertyOptional()
  carrier?: string;

  @ApiProperty({ type: [UserOrderItemDto] })
  items!: UserOrderItemDto[];
}

export class UserOrderListResponseDto {
  @ApiProperty({ type: [UserOrderDto] })
  data!: UserOrderDto[];
}
