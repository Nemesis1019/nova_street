import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedEmailGuard } from '../auth/guards/verified-email.guard';
import { CheckoutService } from './checkout.service';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { CalculateShippingCostDto } from './dto/calculate-shipping-cost.dto';
import {
  ApplyCouponResponseDto,
  CheckoutSummaryResponseDto,
  ConfirmPaymentResponseDto,
} from './dto/checkout-response.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { InitCheckoutDto } from './dto/init-checkout.dto';
import { ShippingCostResponseDto } from './dto/shipping-cost-response.dto';

@ApiTags('checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, VerifiedEmailGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('shipping-cost')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ShippingCostResponseDto })
  calculateShippingCost(@Req() req: Request, @Body() dto: CalculateShippingCostDto) {
    const userId = this.extractUserId(req);
    return this.checkoutService.calculateShippingCost(userId, dto);
  }

  @Post('init')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CheckoutSummaryResponseDto })
  init(@Req() req: Request, @Body() dto: InitCheckoutDto) {
    const userId = this.extractUserId(req);
    return this.checkoutService.initCheckout(userId, dto);
  }

  @Post(':orderId/apply-coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ApplyCouponResponseDto })
  applyCoupon(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() dto: ApplyCouponDto,
  ) {
    const userId = this.extractUserId(req);
    return this.checkoutService.applyCoupon(orderId, userId, dto);
  }

  @Post(':orderId/confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ConfirmPaymentResponseDto })
  confirmPayment(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() _dto: ConfirmPaymentDto,
  ) {
    const userId = this.extractUserId(req);
    return this.checkoutService.confirmPayment(orderId, userId);
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
