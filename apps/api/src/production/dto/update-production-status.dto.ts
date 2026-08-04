import { OrderItemProductionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateProductionStatusDto {
  @IsEnum(OrderItemProductionStatus)
  status!: OrderItemProductionStatus;
}
