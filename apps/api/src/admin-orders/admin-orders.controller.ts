import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { Request } from 'express';

import { AuditLogListResponseDto } from '../audit/dto/audit-log-response.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AdminOrdersService } from './admin-orders.service';
import { BulkOrderStatusDto } from './dto/bulk-order-status.dto';
import { AssignOrderDto, CancelOrderDto, RefundOrderDto, UpdateOrderNotesDto } from './dto/order-management.dto';
import { AdminOrderDetailResponseDto, AdminOrderListResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto, UpdatePaymentStatusDto } from './dto/update-order-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';

@ApiTags('admin-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @RequirePermission(Permission.ORDERS_READ)
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
  @RequirePermission(Permission.ORDERS_READ)
  @ApiOkResponse({ description: 'Order details', type: AdminOrderDetailResponseDto })
  findOne(@Param('id') id: string) {
    return this.adminOrdersService.findOne(id);
  }

  @Get(':id/timeline')
  @RequirePermission(Permission.ORDERS_READ)
  @ApiOkResponse({ description: 'Order audit timeline', type: AuditLogListResponseDto })
  findTimeline(@Param('id') id: string) {
    return this.adminOrdersService.findTimeline(id);
  }

  @Patch(':id/status')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Order status updated', type: AdminOrderDetailResponseDto })
  updateStatus(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminOrdersService.updateStatus(id, dto.status, this.extractUserId(req));
  }

  @Patch(':id/payment-status')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Payment status updated', type: AdminOrderDetailResponseDto })
  updatePaymentStatus(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.adminOrdersService.updatePaymentStatus(id, dto.paymentStatus, this.extractUserId(req));
  }

  @Patch(':id/tracking')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Tracking information updated', type: AdminOrderDetailResponseDto })
  updateTracking(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateTrackingDto) {
    return this.adminOrdersService.updateTracking(id, dto, this.extractUserId(req));
  }

  @Patch(':id/assign')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Order assigned', type: AdminOrderDetailResponseDto })
  assignOrder(@Req() req: Request, @Param('id') id: string, @Body() dto: AssignOrderDto) {
    return this.adminOrdersService.assignOrder(id, dto.assignedToId, this.extractUserId(req));
  }

  @Patch(':id/notes')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Order notes updated', type: AdminOrderDetailResponseDto })
  updateNotes(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateOrderNotesDto) {
    return this.adminOrdersService.updateNotes(id, dto.adminNotes, this.extractUserId(req));
  }

  @Patch(':id/cancel')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Order cancelled', type: AdminOrderDetailResponseDto })
  cancelOrder(@Req() req: Request, @Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.adminOrdersService.cancelOrder(id, dto.reason, this.extractUserId(req));
  }

  @Patch(':id/refund')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Order refunded', type: AdminOrderDetailResponseDto })
  refundOrder(@Req() req: Request, @Param('id') id: string, @Body() dto: RefundOrderDto) {
    return this.adminOrdersService.refundOrder(id, dto.reason, dto.amount, this.extractUserId(req));
  }

  @Post('bulk/status')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Bulk status updated', type: Object })
  bulkUpdateStatus(@Req() req: Request, @Body() dto: BulkOrderStatusDto) {
    return this.adminOrdersService.bulkUpdateStatus(dto.ids, dto.status, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
