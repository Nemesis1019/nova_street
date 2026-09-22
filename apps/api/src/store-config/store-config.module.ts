import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreConfigController } from './store-config.controller';
import { StoreConfigService } from './store-config.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [StoreConfigController],
  providers: [StoreConfigService],
})
export class StoreConfigModule {}
