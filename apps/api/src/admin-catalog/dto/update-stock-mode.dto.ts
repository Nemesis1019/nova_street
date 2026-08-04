import { StockMode } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateStockModeDto {
  @IsEnum(StockMode)
  stockMode!: StockMode;
}
