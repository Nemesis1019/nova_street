import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StoreConfigResponseDto } from './dto/store-config-response.dto';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';
import { StoreConfigService } from './store-config.service';

@ApiTags('store-config')
@Controller('store-config')
export class StoreConfigController {
  constructor(private readonly storeConfigService: StoreConfigService) {}

  @Get()
  @ApiOkResponse({ type: StoreConfigResponseDto })
  getConfig() {
    return this.storeConfigService.findOrCreateDefault();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOkResponse({ type: StoreConfigResponseDto })
  updateConfig(@Req() req: Request, @Body() dto: UpdateStoreConfigDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.storeConfigService.update(dto, userId);
  }
}
