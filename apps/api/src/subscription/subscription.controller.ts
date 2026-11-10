import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { SubscriptionService } from './subscription.service';

class SubscriptionCheckoutDto {
  @ApiPropertyOptional({ description: 'Plan a contratar; si falta se usa el plan actual' })
  @IsOptional()
  @IsUUID()
  planId?: string;
}

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @RequirePermission(Permission.STORE_CONFIG_READ)
  @ApiOperation({ summary: 'Estado de la suscripción SaaS del cliente actual' })
  @ApiOkResponse({ description: 'Planes, estado, vencimiento e historial de pagos' })
  overview() {
    return this.subscriptionService.getCurrentOverview();
  }

  @Post('checkout')
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  @ApiOperation({ summary: 'Configuración del botón Bold para pagar la suscripción' })
  @ApiOkResponse({ description: 'Config efímera del botón de pagos Bold' })
  checkout(@Body() dto: SubscriptionCheckoutDto) {
    return this.subscriptionService.createCheckoutForCurrentTenant(dto.planId);
  }
}
