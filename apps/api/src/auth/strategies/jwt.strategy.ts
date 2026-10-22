import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { MasterPrismaService } from '../../prisma/master-prisma.service';
import { getCurrentTenantSlug } from '../../tenant/tenant-runtime';
import { TenantShadowUserService } from '../../tenant/tenant-shadow-user.service';
import { UsersService } from '../../users/users.service';
import { Permission } from '../permissions';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  /** Tenant al que pertenece la sesión (SaaS multi-cliente). */
  tenant?: string;
  permissions?: Permission[];
  /** `platform` = token de superadmin transversal; `platform-2fa`/`platform-step-up` no son de acceso. */
  scope?: string;
  name?: string;
  /** Sesión abierta por impersonación desde el panel de plataforma. */
  impersonatedBy?: string;
  impersonatedAt?: number;
  /** Impersonación de solo lectura (sin mutaciones). */
  readOnly?: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  permissions: Permission[];
  emailVerified: boolean;
  readOnly?: boolean;
  isPlatform?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly master: MasterPrismaService,
    private readonly shadowUsers: TenantShadowUserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Los tokens de desafío 2FA / step-up no sirven como tokens de acceso.
    if (payload.scope && payload.scope !== 'platform') {
      throw new UnauthorizedException();
    }

    // Superadmin transversal: el mismo token opera en cualquier tenant.
    if (payload.scope === 'platform') {
      const platformUser = await this.master.platformUser.findUnique({
        where: { id: payload.sub },
      });
      if (!platformUser || !platformUser.isActive) {
        throw new UnauthorizedException();
      }

      const shadow = await this.shadowUsers.resolve(platformUser);
      return {
        userId: shadow.userId,
        email: platformUser.email,
        role: shadow.role,
        permissions: shadow.permissions as Permission[],
        emailVerified: true,
        readOnly: false,
        isPlatform: true,
      };
    }

    // Un token emitido para otro cliente no puede usarse en este tenant.
    const currentTenant = getCurrentTenantSlug();
    if (payload.tenant && currentTenant && payload.tenant !== currentTenant) {
      throw new UnauthorizedException();
    }

    // Las sesiones impersonadas caducan aunque el refresh token siga vigente.
    if (payload.impersonatedAt) {
      const ttlMinutes = Number(process.env.IMPERSONATION_TTL_MINUTES ?? 120);
      if (Number.isFinite(ttlMinutes) && Date.now() - payload.impersonatedAt > ttlMinutes * 60_000) {
        throw new UnauthorizedException('Impersonation session expired');
      }
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const allPermissions = new Set([
      ...(user.role.permissions ?? []),
      ...(user.permissions ?? []),
    ]);

    return {
      userId: payload.sub,
      email: payload.email,
      role: user.role.name,
      permissions: Array.from(allPermissions) as Permission[],
      emailVerified: user.emailVerified,
      readOnly: payload.readOnly === true,
    };
  }
}
