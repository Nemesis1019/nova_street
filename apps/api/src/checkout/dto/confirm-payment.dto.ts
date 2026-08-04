import { IsObject } from 'class-validator';

export class ConfirmPaymentDto {
  @IsObject()
  providerPayload!: Record<string, unknown>;
}
