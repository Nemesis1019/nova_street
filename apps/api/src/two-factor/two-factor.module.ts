import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [PrismaModule],
  providers: [TwoFactorService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
