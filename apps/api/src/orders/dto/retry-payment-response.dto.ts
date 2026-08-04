import { ApiProperty } from '@nestjs/swagger';

export class RetryPaymentResponseDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  paymentUrl!: string;
}
