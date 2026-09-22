import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { RefundListResponseDto } from './dto/refund-response.dto';
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
}
