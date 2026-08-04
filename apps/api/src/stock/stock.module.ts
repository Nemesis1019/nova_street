import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StockPolicyResolver } from './stock-policy.resolver';

@Module({
  imports: [PrismaModule],
  providers: [StockPolicyResolver],
  exports: [StockPolicyResolver],
})
export class StockModule {}
