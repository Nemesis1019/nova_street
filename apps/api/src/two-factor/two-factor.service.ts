import { createHash, randomBytes, randomInt } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';

import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTenantSlug } from '../tenant/tenant-runtime';
import { decryptSecret, encryptSecret } from './two-factor-crypto.util';

/** Cantidad de códigos de recuperación generados al activar 2FA. */
const RECOVERY_CODE_COUNT = 8;
/** Días de confianza para un dispositivo recordado. */
const TRUSTED_DEVICE_DAYS = 30;
/** Validez del token de desafío (entre login y verificación 2FA). */
const CHALLENGE_TTL = '10m';

export type TwoFactorChallengePurpose = 'setup' | 'verify';

interface ChallengePayload {
  sub: string;
  email: string;
  role: string;
  tenant?: string;
  scope: '2fa';
  purpose: TwoFactorChallengePurpose;
  /** Elección de "recordarme" hecha en el login (para la cookie de refresh). */
  remember: boolean;
}

interface DeviceInfo {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Roles corporativos que deben usar 2FA (configurable por env). */
  isRequiredFor(roleName: string): boolean {
    const forced = (
      this.configService.get<string>('TWO_FACTOR_FORCED_ROLES') ?? 'SUPER_ADMIN,ADMIN,STAFF'
    )
      .split(',')
      .map((role) => role.trim().toUpperCase())
      .filter(Boolean);
    return forced.includes(roleName.toUpperCase());
  }

  private get issuer(): string {
    return this.configService.get<string>('TWO_FACTOR_ISSUER') ?? 'NÖVA Admin';
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private normalizeRecoveryCode(code: string): string {
    return code.replace(/\D/g, '');
  }

  private formatRecoveryCode(code: string): string {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      let digits = '';
      for (let i = 0; i < 8; i += 1) {
        digits += String(randomInt(0, 10));
      }
      return this.formatRecoveryCode(digits);
    });
  }

  // ---------- Setup ----------

  /** Genera (o recupera) el secreto pendiente y devuelve el QR para vincular el dispositivo. */
  async startSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    let secret = user.twoFactorSecret ? decryptSecret(user.twoFactorSecret) : null;
    if (!secret) {
      secret = generateSecret();
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: encryptSecret(secret) },
      });
    }

    const otpauthUrl = generateURI({ issuer: this.issuer, label: user.email, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });

    return { secret, otpauthUrl, qrDataUrl };
  }

  /** Confirma el código del autenticador, activa 2FA y devuelve los códigos de recuperación. */
  async confirmSetup(userId: string, token: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA setup was not started');
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = decryptSecret(user.twoFactorSecret);
    const isValid = await this.checkTotp(secret, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const recoveryCodes = this.generateRecoveryCodes();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date() },
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          userId,
          codeHash: this.hash(this.normalizeRecoveryCode(code)),
        })),
      }),
    ]);

    return recoveryCodes;
  }

  // ---------- Verificación ----------

  private async checkTotp(secret: string, token: string): Promise<boolean> {
    try {
      const result = await verify({ secret, token: token.replace(/\D/g, '') });
      return result.valid;
    } catch {
      return false;
    }
  }

  /** Verifica un código TOTP o un código de recuperación (lo consume). */
  async verifyCode(userId: string, token: string, isBackupCode = false): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled for this account');
    }

    if (isBackupCode) {
      const codeHash = this.hash(this.normalizeRecoveryCode(token));
      const recovery = await this.prisma.twoFactorRecoveryCode.findFirst({
        where: { userId, codeHash, usedAt: null },
      });
      if (!recovery) {
        return false;
      }
      await this.prisma.twoFactorRecoveryCode.update({
        where: { id: recovery.id },
        data: { usedAt: new Date() },
      });
      return true;
    }

    return this.checkTotp(decryptSecret(user.twoFactorSecret), token);
  }

  /** Desactiva 2FA (requiere un código válido) y limpia dispositivos y códigos. */
  async disable(userId: string, token: string): Promise<void> {
    const valid = await this.verifyCode(userId, token);
    if (!valid) {
      throw new UnauthorizedException('Invalid verification code');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorEnabledAt: null, twoFactorSecret: null },
      }),
      this.prisma.trustedDevice.deleteMany({ where: { userId } }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
    ]);
  }

  /** Regenera los códigos de recuperación (requiere un código válido). */
  async regenerateRecoveryCodes(userId: string, token: string): Promise<string[]> {
    const valid = await this.verifyCode(userId, token);
    if (!valid) {
      throw new UnauthorizedException('Invalid verification code');
    }
    const recoveryCodes = this.generateRecoveryCodes();
    await this.prisma.$transaction([
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({
          userId,
          codeHash: this.hash(this.normalizeRecoveryCode(code)),
        })),
      }),
    ]);
    return recoveryCodes;
  }

  // ---------- Challenge tokens ----------

  signChallenge(
    user: { id: string; email: string; role: { name: string } },
    purpose: TwoFactorChallengePurpose,
    remember = true,
  ): string {
    const tenant = getCurrentTenantSlug();
    const payload: ChallengePayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      ...(tenant ? { tenant } : {}),
      scope: '2fa',
      purpose,
      remember,
    };
    return this.jwtService.sign(payload, { expiresIn: CHALLENGE_TTL });
  }

  verifyChallenge(token: string, purpose?: TwoFactorChallengePurpose): ChallengePayload {
    try {
      const payload = this.jwtService.verify<ChallengePayload>(token);
      if (payload.scope !== '2fa') {
        throw new UnauthorizedException('Invalid challenge token');
      }
      const currentTenant = getCurrentTenantSlug();
      if (payload.tenant && currentTenant && payload.tenant !== currentTenant) {
        throw new UnauthorizedException('Invalid challenge tenant');
      }
      if (purpose && payload.purpose !== purpose) {
        throw new UnauthorizedException('Invalid challenge purpose');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired challenge token');
    }
  }

  // ---------- Dispositivos confiables ----------

  async createTrustedDevice(userId: string, info: DeviceInfo = {}): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.trustedDevice.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        userAgent: info.userAgent?.slice(0, 255),
        ip: info.ip?.slice(0, 64),
        expiresAt,
      },
    });
    return token;
  }

  async isTrustedDevice(userId: string, token?: string): Promise<boolean> {
    if (!token) {
      return false;
    }
    const device = await this.prisma.trustedDevice.findUnique({
      where: { tokenHash: this.hash(token) },
    });
    if (!device || device.userId !== userId || device.expiresAt < new Date()) {
      return false;
    }
    await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  /** Lista los dispositivos confiables vigentes (sin datos sensibles). */
  async listTrustedDevices(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /** Revoca un dispositivo confiable del usuario. */
  async revokeTrustedDevice(userId: string, deviceId: string) {
    const device = await this.prisma.trustedDevice.findFirst({
      where: { id: deviceId, userId },
    });
    if (!device) {
      throw new NotFoundException('Trusted device not found');
    }
    await this.prisma.trustedDevice.delete({ where: { id: device.id } });
  }
}
