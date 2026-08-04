import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({
  imports: [PrismaModule, AuditModule, EmailModule],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
