import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PrismaModule, StockModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
