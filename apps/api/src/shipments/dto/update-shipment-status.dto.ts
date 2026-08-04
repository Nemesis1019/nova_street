import { ShipmentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatus)
  status!: ShipmentStatus;
}
