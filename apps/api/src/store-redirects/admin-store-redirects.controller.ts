import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { CreateStoreRedirectDto } from './dto/create-store-redirect.dto';
import { UpdateStoreRedirectDto } from './dto/update-store-redirect.dto';
import { StoreRedirectsService } from './store-redirects.service';

@ApiTags('admin-store-redirects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/store-redirects')
export class AdminStoreRedirectsController {
  constructor(private readonly storeRedirectsService: StoreRedirectsService) {}

  @Get()
  @RequirePermission(Permission.REDIRECTS_READ)
  findAll() {
    return this.storeRedirectsService.findAll();
  }

  @Post()
  @RequirePermission(Permission.REDIRECTS_WRITE)
  create(@Body() dto: CreateStoreRedirectDto) {
    return this.storeRedirectsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(Permission.REDIRECTS_WRITE)
  update(@Param('id') id: string, @Body() dto: UpdateStoreRedirectDto) {
    return this.storeRedirectsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(Permission.REDIRECTS_WRITE)
  remove(@Param('id') id: string) {
    return this.storeRedirectsService.remove(id);
  }
}
