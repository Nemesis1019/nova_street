import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddStockDto {
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
