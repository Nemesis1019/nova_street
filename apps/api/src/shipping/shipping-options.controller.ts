import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { CreateShippingOptionDto } from './dto/create-shipping-option.dto';
import { EstimatedShippingOptionResponseDto } from './dto/estimated-shipping-option-response.dto';
import { ShippingOptionResponseDto } from './dto/shipping-option-response.dto';
import { UpdateShippingOptionDto } from './dto/update-shipping-option.dto';
import { ShippingOptionsService } from './shipping-options.service';

@ApiTags('shipping-options')
@Controller('shipping-options')
export class ShippingOptionsController {
  constructor(
    private readonly service: ShippingOptionsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOkResponse({ type: [ShippingOptionResponseDto] })
  findActive() {
    return this.service.findAll(false);
  }

  @Get('estimate')
  @ApiOkResponse({ type: [EstimatedShippingOptionResponseDto] })
  async estimate(@Query('subtotal') subtotal: string) {
    const value = Number(subtotal);
    if (Number.isNaN(value) || value < 0) {
      return this.service.calculateEstimatedOptions(0);
    }
    return this.service.calculateEstimatedOptions(value);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission(Permission.SHIPPING_OPTIONS_READ)
  @ApiOkResponse({ type: [ShippingOptionResponseDto] })
  findAll() {
    return this.service.findAll(true);
  }

  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission(Permission.SHIPPING_OPTIONS_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: ShippingOptionResponseDto })
  async create(@Req() req: Request, @Body() dto: CreateShippingOptionDto) {
    const userId = this.extractUserId(req);
    const created = await this.service.create(dto);
    await this.auditService.log({
      userId,
      action: 'CREATE_SHIPPING_OPTION',
      entity: 'ShippingOption',
      entityId: created.id,
      after: this.shippingOptionSnapshot(created),
    });
    return created;
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission(Permission.SHIPPING_OPTIONS_WRITE)
  @ApiOkResponse({ type: ShippingOptionResponseDto })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateShippingOptionDto,
  ) {
    const userId = this.extractUserId(req);
    const before = await this.service.findOneOrThrow(id);
    const updated = await this.service.update(id, dto);
    await this.auditService.log({
      userId,
      action: 'UPDATE_SHIPPING_OPTION',
      entity: 'ShippingOption',
      entityId: id,
      before: this.shippingOptionSnapshot(before),
      after: this.shippingOptionSnapshot(updated),
    });
    return updated;
  }

  @Delete('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission(Permission.SHIPPING_OPTIONS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    const before = await this.service.findOneOrThrow(id);
    await this.service.remove(id);
    await this.auditService.log({
      userId,
      action: 'DELETE_SHIPPING_OPTION',
      entity: 'ShippingOption',
      entityId: id,
      before: this.shippingOptionSnapshot(before),
    });
  }

  private extractUserId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  private shippingOptionSnapshot(option: Record<string, unknown>): Record<string, unknown> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = option;
    return rest;
  }
}
