import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [PrismaModule, AuditModule, PaymentModule],
  controllers: [RefundsController],
  providers: [RefundsService],
})
export class RefundsModule {}
