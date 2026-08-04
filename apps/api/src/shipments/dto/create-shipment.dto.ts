import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  carrier!: string;

  @IsString()
  trackingNumber!: string;

  @IsUrl()
  @IsOptional()
  trackingUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
