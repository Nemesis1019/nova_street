import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { StoreConfigResponseDto } from './dto/store-config-response.dto';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';
import { StoreConfigService } from './store-config.service';

@ApiTags('store-config')
@Controller('store-config')
export class StoreConfigController {
  constructor(
    private readonly storeConfigService: StoreConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOkResponse({ type: StoreConfigResponseDto })
  getConfig() {
    return this.storeConfigService.findOrCreateDefault();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  @ApiBearerAuth()
  @ApiOkResponse({ type: StoreConfigResponseDto })
  async updateConfig(@Req() req: Request, @Body() dto: UpdateStoreConfigDto) {
    const userId = (req.user as { userId: string }).userId;
    const before = await this.storeConfigService.findOrCreateDefault();
    const updated = await this.storeConfigService.update(dto, userId);

    await this.auditService.log({
      userId,
      action: 'UPDATE_STORE_CONFIG',
      entity: 'StoreConfig',
      entityId: before.id,
      before: this.storeConfigSnapshot(before),
      after: this.storeConfigSnapshot(updated),
    });

    return updated;
  }

  private storeConfigSnapshot(config: Record<string, unknown>): Record<string, unknown> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = config;
    return rest;
  }
}
