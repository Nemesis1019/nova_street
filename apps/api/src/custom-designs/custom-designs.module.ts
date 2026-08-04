import { Module } from '@nestjs/common';

import { CartModule } from '../cart/cart.module';
import { EmailModule } from '../email/email.module';
import { CustomDesignsController } from './custom-designs.controller';
import { CustomDesignsService } from './custom-designs.service';

@Module({
  imports: [CartModule, EmailModule],
  controllers: [CustomDesignsController],
  providers: [CustomDesignsService],
  exports: [CustomDesignsService],
})
export class CustomDesignsModule {}
