import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from '../payment/payment.service';
import { OrderResponseDto } from './dto/order-response.dto';
import { RetryPaymentResponseDto } from './dto/retry-payment-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [OrderResponseDto] })
  findAll(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.ordersService.findAll(userId);
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  findOne(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    return this.ordersService.findOne(userId, id);
  }

  @Post(':id/retry-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RetryPaymentResponseDto })
  async retryPayment(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    const { url } = await this.paymentService.createCheckoutSession(id, userId);
    return { orderId: id, paymentUrl: url };
  }
}
