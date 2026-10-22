import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import {
  PlatformCodeDto,
  PlatformLoginDto,
  PlatformPasswordDto,
  PlatformTwoFactorDto,
} from './dto/platform-auth.dto';
import { PlatformAuditService } from './platform-audit.service';
import { actorFromRequest,PlatformAuthGuard } from './platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';
import { clearPlatformRefreshCookie, getPlatformRefreshToken, setPlatformRefreshCookie } from './platform-cookies.util';

@ApiTags('platform-auth')
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(
    private readonly auth: PlatformAuthService,
    private readonly audit: PlatformAuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: PlatformLoginDto) {
    const result = await this.auth.login(dto.email, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      code: dto.code,
    });

    if ('twoFactorRequired' in result) {
      return result;
    }

    setPlatformRefreshCookie(res, result.refreshToken);
    await this.audit.log(
      {
        platformUserId: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      { action: 'PLATFORM_LOGIN', entity: 'PlatformUser', entityId: result.user.id },
      req,
    );

    return {
      accessToken: result.accessToken,
      stepUpToken: result.stepUpToken,
      user: result.user,
    };
  }

  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  async loginTwoFactor(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: PlatformTwoFactorDto,
  ) {
    const result = await this.auth.verifyTwoFactor(dto.challengeToken, dto.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setPlatformRefreshCookie(res, result.refreshToken);
    await this.audit.log(
      {
        platformUserId: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      { action: 'PLATFORM_LOGIN', entity: 'PlatformUser', entityId: result.user.id },
      req,
    );
    return {
      accessToken: result.accessToken,
      stepUpToken: result.stepUpToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = getPlatformRefreshToken(req);
    if (!token) throw new UnauthorizedException('Missing refresh token');

    const result = await this.auth.refresh(token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setPlatformRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(getPlatformRefreshToken(req));
    clearPlatformRefreshCookie(res);
  }

  @Post('step-up')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  async stepUp(@Req() req: Request, @Body() dto: PlatformPasswordDto) {
    const actor = actorFromRequest(req);
    if (!actor.platformUserId) {
      throw new UnauthorizedException('Requiere una cuenta de plataforma (no legacy)');
    }
    return this.auth.stepUp(actor.platformUserId, dto.password);
  }

  @Get('me')
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  async me(@Req() req: Request) {
    const actor = actorFromRequest(req);
    if (actor.platformUserId) {
      return { ...(await this.auth.me(actor.platformUserId)), legacy: false };
    }
    return {
      id: actor.legacyUserId ?? 'legacy',
      email: actor.email ?? null,
      name: 'Cuenta del tenant',
      role: 'OWNER',
      isActive: true,
      twoFactorEnabled: false,
      lastLoginAt: null,
      legacy: true,
    };
  }

  @Post('2fa/setup')
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  setupTwoFactor(@Req() req: Request) {
    const actor = actorFromRequest(req);
    if (!actor.platformUserId) {
      throw new UnauthorizedException('Requiere una cuenta de plataforma (no legacy)');
    }
    return this.auth.setupTwoFactor(actor.platformUserId);
  }

  @Post('2fa/confirm')
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  confirmTwoFactor(@Req() req: Request, @Body() dto: PlatformCodeDto) {
    const actor = actorFromRequest(req);
    if (!actor.platformUserId) {
      throw new UnauthorizedException('Requiere una cuenta de plataforma (no legacy)');
    }
    return this.auth.confirmTwoFactor(actor.platformUserId, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  disableTwoFactor(@Req() req: Request, @Body() dto: PlatformCodeDto) {
    const actor = actorFromRequest(req);
    if (!actor.platformUserId) {
      throw new UnauthorizedException('Requiere una cuenta de plataforma (no legacy)');
    }
    return this.auth.disableTwoFactor(actor.platformUserId, dto.code);
  }

  @Get('sessions')
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  sessions(@Req() req: Request) {
    const actor = actorFromRequest(req);
    if (!actor.platformUserId) return [];
    return this.auth.listSessions(actor.platformUserId);
  }

  @Post('sessions/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  async revokeSessions(@Req() req: Request) {
    const actor = actorFromRequest(req);
    if (actor.platformUserId) await this.auth.revokeSessions(actor.platformUserId);
  }

  @Get('audit')
  @UseGuards(PlatformAuthGuard)
  @ApiBearerAuth()
  auditLog(@Req() req: Request) {
    void req;
    return this.audit.list(50);
  }
}
