import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AdminCouponController } from './admin-coupon.controller';
import { AdminCouponService } from './admin-coupon.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCouponController],
  providers: [AdminCouponService],
})
export class AdminCouponsModule {}
