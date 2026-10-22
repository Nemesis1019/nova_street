import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class BulkOrderPaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus;

  @IsUUID('4', { each: true })
  ids!: string[];
}
