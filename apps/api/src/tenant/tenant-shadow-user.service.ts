import { randomBytes } from 'node:crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';

export interface PlatformShadowUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

interface CacheEntry {
  user: PlatformShadowUser;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60_000;

/**
 * Un PlatformUser (superadmin transversal) no existe en la BD de cada tenant,
 * pero las escrituras/auditoría usan FKs a `users`. Este servicio resuelve un
 * **usuario espejo** por tenant (marcado con `platformUserId`) para que el
 * mismo superadmin pueda operar en todas las tiendas sin impersonar a otra
 * cuenta. El espejo tiene rol SUPER_ADMIN y una contraseña aleatoria (no se
 * usa para login: la identidad real es el PlatformUser).
 */
@Injectable()
export class TenantShadowUserService {
  private readonly logger = new Logger(TenantShadowUserService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
  ) {}

  async resolve(platformUser: {
    id: string;
    email: string;
    name: string;
  }): Promise<PlatformShadowUser> {
    const tenant = this.context.requireCurrent();
    const cacheKey = `${tenant.slug}:${platformUser.id}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    const role = await this.prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      throw new UnauthorizedException('El tenant no tiene rol SUPER_ADMIN configurado');
    }

    let user = await this.prisma.user.findUnique({
      where: { platformUserId: platformUser.id },
    });

    if (!user) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: platformUser.email },
      });

      // Si el email ya existe como SUPER_ADMIN del tenant (p. ej. la cuenta
      // real admin@tienda.com en nova), se reutiliza y se vincula. Si es otro
      // tipo de usuario, se crea un espejo con email sintético para no
      // apropiarse de una cuenta de cliente.
      if (emailTaken && emailTaken.platformUserId === null && emailTaken.roleId === role.id) {
        user = await this.prisma.user.update({
          where: { id: emailTaken.id },
          data: { platformUserId: platformUser.id, isActive: true, isSuspended: false },
        });
        this.logger.log(
          `Usuario existente vinculado a plataforma en "${tenant.slug}": ${emailTaken.email}`,
        );
      } else {
        const email = emailTaken
          ? `platform-${platformUser.id}@${tenant.slug}.platform`
          : platformUser.email;
        const [firstName, ...rest] = platformUser.name.trim().split(/\s+/);
        const passwordHash = await argon2.hash(randomBytes(32).toString('hex'));

        try {
          user = await this.prisma.user.create({
            data: {
              email,
              passwordHash,
              firstName: firstName || 'Platform',
              lastName: rest.join(' '),
              emailVerified: true,
              emailVerifiedAt: new Date(),
              isActive: true,
              isSuspended: false,
              roleId: role.id,
              platformUserId: platformUser.id,
            },
          });
          this.logger.log(
            `Usuario espejo de plataforma creado en "${tenant.slug}": ${email}`,
          );
        } catch (error) {
          // Carrera entre dos requests: otro proceso lo creó.
          if ((error as { code?: string }).code !== 'P2002') throw error;
          user = await this.prisma.user.findUnique({
            where: { platformUserId: platformUser.id },
          });
          if (!user) throw error;
        }
      }
    } else {
      // El superadmin siempre debe poder operar; se corrige rol/estado.
      const needsFix =
        !user.isActive || user.isSuspended || user.roleId !== role.id;
      if (needsFix) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { isActive: true, isSuspended: false, roleId: role.id },
        });
      }
    }

    const permissions = new Set<string>([
      ...(role.permissions ?? []),
      ...(user.permissions ?? []),
    ]);

    const shadow: PlatformShadowUser = {
      userId: user.id,
      email: platformUser.email,
      role: role.name,
      permissions: Array.from(permissions),
    };
    this.cache.set(cacheKey, { user: shadow, expiresAt: Date.now() + CACHE_TTL_MS });
    return shadow;
  }
}
