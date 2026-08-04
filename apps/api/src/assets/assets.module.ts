import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { CustomerAssetsController } from './customer-assets.controller';
import { ImageController } from './image.controller';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [AssetsController, CustomerAssetsController, ImageController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
