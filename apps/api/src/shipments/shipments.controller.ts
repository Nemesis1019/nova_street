import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AdminShipmentListResponseDto, AdminShipmentResponseDto } from './dto/shipment-response.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ShipmentsService } from './shipments.service';

@ApiTags('admin-shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/orders/:orderId/shipments')
export class AdminShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @ApiOkResponse({ description: 'Order shipments', type: AdminShipmentListResponseDto })
  findByOrder(@Param('orderId') orderId: string) {
    return this.shipmentsService.findByOrder(orderId);
  }

  @Post()
  @ApiOkResponse({ description: 'Shipment created', type: AdminShipmentResponseDto })
  create(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shipmentsService.create(orderId, dto, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}

@ApiTags('admin-shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/shipments/:id')
export class AdminShipmentStatusController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Patch('status')
  @ApiOkResponse({ description: 'Shipment status updated', type: AdminShipmentResponseDto })
  updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shipmentsService.updateStatus(id, dto.status, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
