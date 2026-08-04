import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { Request } from 'express';

import { AuditLogListResponseDto } from '../audit/dto/audit-log-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminOrdersService } from './admin-orders.service';
import { AssignOrderDto, CancelOrderDto, RefundOrderDto, UpdateOrderNotesDto } from './dto/order-management.dto';
import { AdminOrderDetailResponseDto, AdminOrderListResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto, UpdatePaymentStatusDto } from './dto/update-order-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';

@ApiTags('admin-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of all orders', type: AdminOrderListResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('search') search?: string,
  ) {
    return this.adminOrdersService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      paymentStatus,
      search,
    });
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Order details', type: AdminOrderDetailResponseDto })
  findOne(@Param('id') id: string) {
    return this.adminOrdersService.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOkResponse({ description: 'Order audit timeline', type: AuditLogListResponseDto })
  findTimeline(@Param('id') id: string) {
    return this.adminOrdersService.findTimeline(id);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Order status updated', type: AdminOrderDetailResponseDto })
  updateStatus(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminOrdersService.updateStatus(id, dto.status, this.extractUserId(req));
  }

  @Patch(':id/payment-status')
  @ApiOkResponse({ description: 'Payment status updated', type: AdminOrderDetailResponseDto })
  updatePaymentStatus(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.adminOrdersService.updatePaymentStatus(id, dto.paymentStatus, this.extractUserId(req));
  }

  @Patch(':id/tracking')
  @ApiOkResponse({ description: 'Tracking information updated', type: AdminOrderDetailResponseDto })
  updateTracking(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateTrackingDto) {
    return this.adminOrdersService.updateTracking(id, dto, this.extractUserId(req));
  }

  @Patch(':id/assign')
  @ApiOkResponse({ description: 'Order assigned', type: AdminOrderDetailResponseDto })
  assignOrder(@Req() req: Request, @Param('id') id: string, @Body() dto: AssignOrderDto) {
    return this.adminOrdersService.assignOrder(id, dto.assignedToId, this.extractUserId(req));
  }

  @Patch(':id/notes')
  @ApiOkResponse({ description: 'Order notes updated', type: AdminOrderDetailResponseDto })
  updateNotes(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateOrderNotesDto) {
    return this.adminOrdersService.updateNotes(id, dto.adminNotes, this.extractUserId(req));
  }

  @Patch(':id/cancel')
  @ApiOkResponse({ description: 'Order cancelled', type: AdminOrderDetailResponseDto })
  cancelOrder(@Req() req: Request, @Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.adminOrdersService.cancelOrder(id, dto.reason, this.extractUserId(req));
  }

  @Patch(':id/refund')
  @ApiOkResponse({ description: 'Order refunded', type: AdminOrderDetailResponseDto })
  refundOrder(@Req() req: Request, @Param('id') id: string, @Body() dto: RefundOrderDto) {
    return this.adminOrdersService.refundOrder(id, dto.reason, dto.amount, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
