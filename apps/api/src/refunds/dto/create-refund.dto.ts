import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ format: 'uuid', description: 'Orden a reembolsar' })
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional({ description: 'Monto en centavos; por defecto el total de la orden' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @ApiProperty({ description: 'Motivo del reembolso' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
