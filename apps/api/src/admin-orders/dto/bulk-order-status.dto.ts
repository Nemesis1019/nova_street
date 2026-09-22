import { OrderStatus } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class BulkOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsUUID('4', { each: true })
  ids!: string[];
}
