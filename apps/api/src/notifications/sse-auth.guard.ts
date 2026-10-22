import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { MasterPrismaService } from '../prisma/master-prisma.service';
import { getCurrentTenantSlug } from '../tenant/tenant-runtime';
import { TenantShadowUserService } from '../tenant/tenant-shadow-user.service';
import { UsersService } from '../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenant?: string;
  scope?: string;
}

@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly master: MasterPrismaService,
    private readonly shadowUsers: TenantShadowUserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.query.token as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      // Token de superadmin transversal: se resuelve el usuario espejo del tenant.
      if (payload.scope === 'platform') {
        const platformUser = await this.master.platformUser.findUnique({
          where: { id: payload.sub },
        });
        if (!platformUser || !platformUser.isActive) {
          throw new UnauthorizedException('Platform user inactive');
        }
        const shadow = await this.shadowUsers.resolve(platformUser);
        request.user = {
          userId: shadow.userId,
          email: platformUser.email,
          role: shadow.role,
        };
        return true;
      }

      // Desafíos 2FA/step-up no son tokens de acceso.
      if (payload.scope) {
        throw new UnauthorizedException('Invalid token scope');
      }

      const currentTenant = getCurrentTenantSlug();
      if (payload.tenant && currentTenant && payload.tenant !== currentTenant) {
        throw new UnauthorizedException('Token issued for another tenant');
      }
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      request.user = { userId: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
