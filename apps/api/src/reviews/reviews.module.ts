import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminReviewsController, ProductReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ProductReviewsController, AdminReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
