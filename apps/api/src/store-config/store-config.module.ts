import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StoreConfigController } from './store-config.controller';
import { StoreConfigService } from './store-config.service';

@Module({
  imports: [PrismaModule],
  controllers: [StoreConfigController],
  providers: [StoreConfigService],
})
export class StoreConfigModule {}
