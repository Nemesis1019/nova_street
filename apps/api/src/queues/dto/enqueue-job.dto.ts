import { IsEnum, IsObject } from 'class-validator';

export enum QueueJobType {
  SEND_BULK_EMAIL = 'sendBulkEmail',
  GENERATE_DESIGN_PREVIEW = 'generateDesignPreview',
  RECONCILE_PAYMENTS = 'reconcilePayments',
}

export class EnqueueJobDto {
  @IsEnum(QueueJobType)
  type!: QueueJobType;

  @IsObject()
  payload!: Record<string, unknown>;
}
