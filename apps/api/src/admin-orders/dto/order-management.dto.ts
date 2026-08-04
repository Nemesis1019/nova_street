import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AssignOrderDto {
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class UpdateOrderNotesDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RefundOrderDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;
}
