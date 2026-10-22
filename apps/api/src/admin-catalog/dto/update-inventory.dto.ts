import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  quantity!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
