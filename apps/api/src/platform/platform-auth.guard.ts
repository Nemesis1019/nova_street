import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { TenantContextService } from '../tenant/tenant-context.service';
import { TenantRegistryService } from '../tenant/tenant-registry.service';
import type { PlatformActor } from './platform-audit.service';
import { PlatformAuthService } from './platform-auth.service';

interface PlatformJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  scope?: string;
  tenant?: string;
}

export type PlatformRequest = Request & {
  platformActor?: PlatformActor;
  platformUser?: { id: string; email: string; name: string; role: string };
};

export function actorFromRequest(req: Request): PlatformActor {
  return (req as PlatformRequest).platformActor ?? {};
}

/**
 * Guard de plataforma:
 * - Token de operador (`scope: 'platform'`), validado contra la BD maestra.
 * - Compatibilidad legacy (dev): SUPER_ADMIN del tenant por defecto.
 *   En producción se desactiva con `ALLOW_LEGACY_PLATFORM_ADMIN=false`.
 */
@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(
    private readonly auth: PlatformAuthService,
    private readonly jwt: JwtService,
    private readonly registry: TenantRegistryService,
    private readonly context: TenantContextService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<PlatformRequest>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) throw new UnauthorizedException();

    let payload: PlatformJwtPayload | null = null;
    try {
      payload = this.jwt.verify<PlatformJwtPayload>(token, { secret: process.env.JWT_SECRET });
    } catch {
      payload = null;
    }

    if (!payload) throw new UnauthorizedException();

    if (payload.scope === 'platform') {
      const user = await this.auth.findActive(payload.sub);
      req.platformUser = { id: user.id, email: user.email, name: user.name, role: user.role };
      req.platformActor = {
        platformUserId: user.id,
        email: user.email,
        role: user.role,
      };
      return true;
    }

    // Legacy: solo en dev o si se habilita explícitamente.
    const legacyAllowed =
      this.config.get<string>('ALLOW_LEGACY_PLATFORM_ADMIN') !== 'false' &&
      (process.env.NODE_ENV !== 'production' ||
        this.config.get<string>('ALLOW_LEGACY_PLATFORM_ADMIN') === 'true');

    if (!legacyAllowed) {
      throw new ForbiddenException(
        'La administración de clientes requiere una cuenta de plataforma',
      );
    }

    if (payload.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Solo la cuenta de plataforma puede administrar clientes');
    }

    const current = this.context.current();
    const defaultTenant = await this.registry.getDefault();
    if (!current || !defaultTenant || current.slug !== defaultTenant.slug) {
      throw new ForbiddenException(
        'La administración de clientes solo está disponible en la cuenta de plataforma',
      );
    }

    req.platformActor = {
      legacyUserId: payload.sub,
      email: payload.email,
      role: 'OWNER',
    };
    return true;
  }
}
