import { Body, Controller, ForbiddenException,Get, Param, Patch, Post, Req, UseGuards  } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CreatePlatformUserDto, UpdatePlatformUserDto } from './dto/platform-auth.dto';
import { PlatformAuditService } from './platform-audit.service';
import { actorFromRequest,PlatformAuthGuard } from './platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';

function assertOwner(req: Request) {
  const actor = actorFromRequest(req);
  if (actor.role !== 'OWNER') {
    throw new ForbiddenException('Solo el OWNER de la plataforma puede gestionar operadores');
  }
  return actor;
}

@ApiTags('platform-users')
@ApiBearerAuth()
@UseGuards(PlatformAuthGuard)
@Controller('platform/users')
export class PlatformUsersController {
  constructor(
    private readonly auth: PlatformAuthService,
    private readonly audit: PlatformAuditService,
  ) {}

  @Get()
  list() {
    return this.auth.listUsers();
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreatePlatformUserDto) {
    const actor = assertOwner(req);
    const user = await this.auth.createUser(dto);
    await this.audit.log(
      actor,
      { action: 'PLATFORM_USER_CREATED', entity: 'PlatformUser', entityId: user.id, metadata: { email: user.email, role: user.role } },
      req,
    );
    return user;
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePlatformUserDto) {
    const actor = assertOwner(req);
    if (id === actor.platformUserId && dto.isActive === false) {
      throw new ForbiddenException('No podés desactivar tu propia cuenta');
    }
    const user = await this.auth.updateUser(id, dto);
    await this.audit.log(
      actor,
      {
        action: 'PLATFORM_USER_UPDATED',
        entity: 'PlatformUser',
        entityId: id,
        metadata: { role: dto.role, isActive: dto.isActive },
      },
      req,
    );
    return user;
  }
}
