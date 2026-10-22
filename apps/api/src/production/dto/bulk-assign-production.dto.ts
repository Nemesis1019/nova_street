import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class BulkAssignProductionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsUUID()
  @IsOptional()
  assignedToId?: string | null;
}
