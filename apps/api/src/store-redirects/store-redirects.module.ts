import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AdminStoreRedirectsController } from './admin-store-redirects.controller';
import { StoreRedirectsController } from './store-redirects.controller';
import { StoreRedirectsService } from './store-redirects.service';

@Module({
  imports: [PrismaModule],
  controllers: [StoreRedirectsController, AdminStoreRedirectsController],
  providers: [StoreRedirectsService],
})
export class StoreRedirectsModule {}
