import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';

export class RefundResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  paymentId?: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: RefundStatus })
  status!: RefundStatus;

  @ApiPropertyOptional()
  providerRefundId?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class RefundListResponseDto {
  @ApiProperty({ type: [RefundResponseDto] })
  data!: RefundResponseDto[];

  @ApiProperty()
  meta!: { page: number; limit: number; total: number };
}
