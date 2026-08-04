import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { OrderResponseDto } from '../orders/dto/order-response.dto';
import { OrdersService } from '../orders/orders.service';
import { CheckoutService } from './checkout.service';
import { CheckoutSummaryResponseDto } from './dto/checkout-response.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';

@ApiTags('checkout')
@Controller('checkout/guest')
export class GuestCheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('init')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: CheckoutSummaryResponseDto })
  init(@Body() dto: GuestCheckoutDto) {
    return this.checkoutService.guestCheckout(dto);
  }

  @Get('orders/:token')
  @ApiOkResponse({ type: OrderResponseDto })
  async getOrder(@Param('token') token: string) {
    const user = await this.checkoutService.findGuestByToken(token);
    if (!user || user.orders.length === 0) {
      throw new NotFoundException('Order not found');
    }
    return this.ordersService.findOne(user.id, user.orders[0].id);
  }
}
