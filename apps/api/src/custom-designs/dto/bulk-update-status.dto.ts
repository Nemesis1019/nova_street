import { CustomDesignStatus } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class BulkUpdateStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsEnum(CustomDesignStatus)
  status!: CustomDesignStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
