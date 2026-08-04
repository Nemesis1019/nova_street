import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartItemType, OrderItemProductionStatus } from '@prisma/client';

export class ProductionItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: CartItemType })
  type!: CartItemType;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty({ enum: OrderItemProductionStatus })
  productionStatus!: OrderItemProductionStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  assignedToId?: string;

  @ApiPropertyOptional()
  assignedTo?: { id: string; name: string; email: string };

  @ApiPropertyOptional({ format: 'uuid' })
  productVariantId?: string;

  @ApiPropertyOptional()
  productName?: string;

  @ApiPropertyOptional()
  variantLabel?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  customDesignId?: string;

  @ApiPropertyOptional()
  designTemplateName?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProductionItemListResponseDto {
  @ApiProperty({ type: [ProductionItemResponseDto] })
  data!: ProductionItemResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}
