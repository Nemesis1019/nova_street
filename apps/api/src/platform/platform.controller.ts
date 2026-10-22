import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { setRefreshTokenCookie } from '../auth/auth-cookies.util';
import { CreateTenantDto, UpdateTenantDto } from './dto/platform.dto';
import { ImpersonateTenantDto } from './dto/platform-auth.dto';
import { PlatformService } from './platform.service';
import { actorFromRequest,PlatformAuthGuard } from './platform-auth.guard';

@ApiTags('platform')
@ApiBearerAuth()
@UseGuards(PlatformAuthGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('tenants')
  @ApiOkResponse({ description: 'Listado de clientes de la plataforma' })
  list() {
    return this.platformService.list();
  }

  @Post('tenants')
  create(@Req() req: Request, @Body() dto: CreateTenantDto) {
    return this.platformService.create(dto, actorFromRequest(req), req);
  }

  @Patch('tenants/:id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.platformService.update(id, dto, actorFromRequest(req), req);
  }

  @Post('tenants/:id/select')
  @ApiOkResponse({ description: 'Cambia el cliente activo del superadmin (sin impersonar)' })
  select(@Req() req: Request, @Param('id') id: string) {
    return this.platformService.selectTenant(id, actorFromRequest(req), req);
  }

  @Get('tenants/:id/health')
  @ApiOkResponse({ description: 'Conectividad y métricas básicas del cliente' })
  health(@Param('id') id: string) {
    return this.platformService.health(id);
  }

  @Get('tenants/:id/migrations')
  @ApiOkResponse({ description: 'Historial de migraciones/ejecuciones del cliente' })
  migrations(@Param('id') id: string) {
    return this.platformService.migrations(id);
  }

  @Post('migrate')
  @ApiOkResponse({ description: 'Aplica migraciones pendientes a todos los clientes' })
  migrateAll(@Req() req: Request) {
    return this.platformService.migrateAll(actorFromRequest(req), req);
  }

  @Post('backups')
  @ApiOkResponse({ description: 'Respalda la BD de cada cliente activo' })
  backupAll(@Req() req: Request) {
    return this.platformService.backupAll(actorFromRequest(req), req);
  }

  @Post('tenants/:id/impersonate')
  @ApiOkResponse({ description: 'Sesión de administrador del cliente indicado' })
  async impersonate(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() dto: ImpersonateTenantDto,
  ) {
    const session = await this.platformService.impersonate(id, actorFromRequest(req), dto, req);
    setRefreshTokenCookie(req, res, session.refreshToken, {
      tenantSlug: session.tenant.slug,
      client: 'admin',
      remember: true,
    });
    return {
      accessToken: session.accessToken,
      user: session.user,
      tenant: session.tenant,
    };
  }
}
