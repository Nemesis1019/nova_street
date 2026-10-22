import { createHash } from 'node:crypto';

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { generateSecret, generateURI, verify } from 'otplib';

import { MasterPrismaService } from '../prisma/master-prisma.service';
import { decryptSecret, encryptSecret } from '../tenant/crypto.util';
import {
  hashPlatformToken,
  newPlatformRefreshToken,
  platformRefreshExpiresAt,
} from './platform-cookies.util';

export interface PlatformUserPublic {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
}

interface AuthContext {
  ip?: string;
  userAgent?: string;
}

interface PlatformJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  scope?: string;
  name?: string;
}

const PLATFORM_ISSUER = 'NÖVA Platform';

/**
 * Autenticación de operadores de plataforma (identidad propia en la BD
 * maestra, separada de los usuarios de cada tenant). Access token JWT de vida
 * corta + refresh opaco con rotación en `platform_sessions`.
 */
@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly master: MasterPrismaService,
    private readonly jwt: JwtService,
  ) {}

  sanitize(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    lastLoginAt: Date | null;
  }): PlatformUserPublic {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async findActive(id: string) {
    const user = await this.master.platformUser.findUnique({ where: { id } });
    if (!user || !user.isActive) throw new UnauthorizedException('Platform user inactive');
    return user;
  }

  /** Confirma la contraseña y emite un token de step-up de 10 minutos. */
  async stepUp(userId: string, password: string) {
    await this.verifyPassword(userId, password);
    return { stepUpToken: this.signStepUp(userId), expiresIn: 600 };
  }

  /** Valida un step-up emitido para este operador (cambio de cliente). */
  async verifyStepUp(userId: string, token?: string): Promise<void> {
    if (!token) throw new UnauthorizedException('Password confirmation required');
    try {
      const payload = this.jwt.verify<PlatformJwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
      if (payload.scope !== 'platform-step-up' || payload.sub !== userId) {
        throw new UnauthorizedException('Invalid step-up token');
      }
    } catch {
      throw new UnauthorizedException('Step-up token expired or invalid');
    }
  }

  async verifyPassword(userId: string, password?: string): Promise<void> {
    if (!password) {
      throw new UnauthorizedException('Password confirmation required');
    }
    const user = await this.master.platformUser.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid password confirmation');
    }
  }

  async login(email: string, password: string, context: AuthContext & { code?: string }) {
    const user = await this.master.platformUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.twoFactorEnabled) {
      if (!context.code) {
        return {
          twoFactorRequired: true as const,
          challengeToken: this.signChallenge(user.id),
        };
      }
      if (!(await this.checkTotp(user.id, context.code))) {
        throw new UnauthorizedException('Invalid verification code');
      }
    }

    return this.issueSession(user.id, context);
  }

  async verifyTwoFactor(challengeToken: string, code: string, context: AuthContext) {
    let payload: PlatformJwtPayload;
    try {
      payload = this.jwt.verify<PlatformJwtPayload>(challengeToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid challenge');
    }
    if (payload.scope !== 'platform-2fa') {
      throw new UnauthorizedException('Invalid challenge');
    }
    if (!(await this.checkTotp(payload.sub, code))) {
      throw new UnauthorizedException('Invalid verification code');
    }
    return this.issueSession(payload.sub, context);
  }

  async refresh(refreshToken: string, context: AuthContext) {
    const session = await this.master.platformSession.findFirst({
      where: {
        tokenHash: hashPlatformToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { platformUser: true },
    });

    if (!session || !session.platformUser.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.master.platformSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(session.platformUserId, context);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.master.platformSession.updateMany({
      where: { tokenHash: hashPlatformToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.findActive(userId);
    return this.sanitize(user);
  }

  async setupTwoFactor(userId: string) {
    const user = await this.findActive(userId);
    if (user.twoFactorEnabled) throw new BadRequestException('2FA is already enabled');

    const secret = user.twoFactorSecret ? decryptSecret(user.twoFactorSecret) : generateSecret();
    if (!user.twoFactorSecret) {
      await this.master.platformUser.update({
        where: { id: userId },
        data: { twoFactorSecret: encryptSecret(secret) },
      });
    }

    const otpauthUrl = generateURI({ issuer: PLATFORM_ISSUER, label: user.email, secret });
    return { secret, otpauthUrl };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const user = await this.findActive(userId);
    if (!user.twoFactorSecret) throw new BadRequestException('2FA setup was not started');
    if (!(await this.checkTotp(userId, code))) {
      throw new UnauthorizedException('Invalid verification code');
    }
    await this.master.platformUser.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { enabled: true };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.findActive(userId);
    if (!user.twoFactorEnabled) return { enabled: false };
    if (!(await this.checkTotp(userId, code))) {
      throw new UnauthorizedException('Invalid verification code');
    }
    await this.master.platformUser.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await this.revokeSessions(userId);
    return { enabled: false };
  }

  // ---------- Operadores ----------

  async listUsers() {
    const users = await this.master.platformUser.findMany({
      orderBy: [{ createdAt: 'asc' }],
    });
    return users.map((user) => this.sanitize(user));
  }

  async createUser(input: {
    email: string;
    name: string;
    password: string;
    role?: 'OWNER' | 'OPERATOR' | 'SUPPORT';
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.master.platformUser.findUnique({ where: { email } });
    if (existing) throw new BadRequestException(`Ya existe un operador con el email "${email}"`);

    const user = await this.master.platformUser.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await argon2.hash(input.password),
        role: input.role ?? 'OPERATOR',
      },
    });
    return this.sanitize(user);
  }

  async updateUser(
    id: string,
    input: { name?: string; role?: 'OWNER' | 'OPERATOR' | 'SUPPORT'; isActive?: boolean },
  ) {
    const user = await this.master.platformUser.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('Operador no encontrado');

    const updated = await this.master.platformUser.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        role: input.role,
        isActive: input.isActive,
      },
    });

    if (input.isActive === false) await this.revokeSessions(id);
    return this.sanitize(updated);
  }

  async revokeSessions(platformUserId: string) {
    await this.master.platformSession.updateMany({
      where: { platformUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessions(platformUserId: string) {
    return this.master.platformSession.findMany({
      where: { platformUserId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
    });
  }

  // ---------- Internos ----------

  private async issueSession(userId: string, context: AuthContext) {
    const user = await this.findActive(userId);

    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        scope: 'platform',
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: (process.env.PLATFORM_ACCESS_EXPIRATION ?? '15m') as never,
      },
    );

    const refreshToken = newPlatformRefreshToken();
    await this.master.platformSession.create({
      data: {
        platformUserId: user.id,
        tokenHash: hashPlatformToken(refreshToken),
        expiresAt: platformRefreshExpiresAt(),
        ip: context.ip ?? null,
        userAgent: context.userAgent?.slice(0, 500) ?? null,
      },
    });
    await this.master.platformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      stepUpToken: this.signStepUp(user.id),
      refreshToken,
      user: this.sanitize(user),
    };
  }

  private signStepUp(userId: string): string {
    return this.jwt.sign(
      { sub: userId, scope: 'platform-step-up' },
      { secret: process.env.JWT_SECRET, expiresIn: '10m' },
    );
  }

  private signChallenge(userId: string): string {
    return this.jwt.sign(
      { sub: userId, scope: 'platform-2fa' },
      { secret: process.env.JWT_SECRET, expiresIn: '10m' },
    );
  }

  private async checkTotp(userId: string, code: string): Promise<boolean> {
    const user = await this.master.platformUser.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) return false;
    try {
      const result = await verify({
        secret: decryptSecret(user.twoFactorSecret),
        token: code.replace(/\D/g, ''),
      });
      return result.valid;
    } catch {
      return false;
    }
  }

  /** Hash usado para tokens opacos de plataforma (no se guardan en claro). */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
