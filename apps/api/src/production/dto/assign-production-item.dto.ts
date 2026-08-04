import { IsOptional, IsUUID } from 'class-validator';

export class AssignProductionItemDto {
  @IsUUID()
  @IsOptional()
  assignedToId?: string | null;
}
