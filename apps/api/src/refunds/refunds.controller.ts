import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundListResponseDto, RefundResponseDto } from './dto/refund-response.dto';
import { RefundsService } from './refunds.service';

@ApiTags('admin-refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @RequirePermission(Permission.ORDERS_READ)
  @ApiOkResponse({ description: 'Paginated list of refunds', type: RefundListResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
  ) {
    return this.refundsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      orderId,
      status,
    });
  }

  @Get('orders/:orderId')
  @RequirePermission(Permission.ORDERS_READ)
  @ApiOkResponse({ description: 'Refunds for an order', type: RefundListResponseDto })
  findByOrder(
    @Param('orderId') orderId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.refundsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      orderId,
    });
  }

  @Get(':id')
  @RequirePermission(Permission.ORDERS_READ)
  @ApiOkResponse({ description: 'Refund detail', type: RefundResponseDto })
  findOne(@Param('id') id: string) {
    return this.refundsService.findOne(id);
  }

  @Post()
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Manual refund created (PENDING)', type: RefundResponseDto })
  create(@Body() dto: CreateRefundDto, @Req() req: Request) {
    return this.refundsService.createManual(dto, this.extractUserId(req));
  }

  @Patch(':id/approve')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Refund approved and processed', type: RefundResponseDto })
  approve(@Param('id') id: string, @Req() req: Request) {
    return this.refundsService.approve(id, this.extractUserId(req));
  }

  @Patch(':id/reject')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Refund rejected (FAILED)', type: RefundResponseDto })
  reject(@Param('id') id: string, @Req() req: Request) {
    return this.refundsService.reject(id, this.extractUserId(req));
  }

  @Patch(':id/retry')
  @RequirePermission(Permission.ORDERS_WRITE)
  @ApiOkResponse({ description: 'Failed refund retried', type: RefundResponseDto })
  retry(@Param('id') id: string, @Req() req: Request) {
    return this.refundsService.retry(id, this.extractUserId(req));
  }

  private extractUserId(req: Request): string | undefined {
    return (req.user as { userId?: string } | undefined)?.userId;
  }
}
