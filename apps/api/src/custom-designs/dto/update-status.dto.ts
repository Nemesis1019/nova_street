import { CustomDesignStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(CustomDesignStatus)
  status!: CustomDesignStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
