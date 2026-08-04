import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OrderItemProductionStatus } from '@prisma/client';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignProductionItemDto } from './dto/assign-production-item.dto';
import { ProductionItemListResponseDto, ProductionItemResponseDto } from './dto/production-item-response.dto';
import { UpdateProductionStatusDto } from './dto/update-production-status.dto';
import { ProductionService } from './production.service';

@ApiTags('admin-production')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated production queue', type: ProductionItemListResponseDto })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderItemProductionStatus,
    @Query('search') search?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.productionService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      search,
      assignedToId,
    });
  }

  @Get('items/:id')
  @ApiOkResponse({ description: 'Production item details', type: ProductionItemResponseDto })
  findOne(@Param('id') id: string) {
    return this.productionService.findOne(id);
  }

  @Patch('items/:id/status')
  @ApiOkResponse({ description: 'Production status updated', type: ProductionItemResponseDto })
  updateStatus(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateProductionStatusDto) {
    return this.productionService.updateStatus(id, dto.status, this.extractUserId(req));
  }

  @Patch('items/:id/assign')
  @ApiOkResponse({ description: 'Production item assigned', type: ProductionItemResponseDto })
  assign(@Req() req: Request, @Param('id') id: string, @Body() dto: AssignProductionItemDto) {
    return this.productionService.assign(id, dto, this.extractUserId(req));
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }
}
