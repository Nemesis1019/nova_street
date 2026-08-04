import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateTrackingDto {
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  carrier?: string;

  @IsUrl()
  @IsOptional()
  trackingUrl?: string;
}
