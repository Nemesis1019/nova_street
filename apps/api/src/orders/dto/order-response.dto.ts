import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@prisma/client';

export class ShipmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  carrier!: string;

  @ApiProperty()
  trackingNumber!: string;

  @ApiPropertyOptional()
  trackingUrl?: string;

  @ApiProperty({ enum: ShipmentStatus })
  status!: ShipmentStatus;

  @ApiPropertyOptional()
  shippedAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  notes?: string;
}

export class OrderItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiPropertyOptional()
  productVariantId?: string;

  @ApiPropertyOptional()
  name?: string;
}

export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  shippingCost!: number;

  @ApiProperty()
  discountAmount!: number;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  paymentStatus!: string;

  @ApiPropertyOptional()
  trackingNumber?: string;

  @ApiPropertyOptional()
  carrier?: string;

  @ApiPropertyOptional()
  trackingUrl?: string;

  @ApiPropertyOptional()
  shippedAt?: Date;

  @ApiProperty({ type: () => [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: () => [ShipmentResponseDto] })
  shipments!: ShipmentResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  estimatedDeliveryDate?: string;
}
