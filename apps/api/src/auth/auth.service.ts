import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, createPublicKey, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import type { SignOptions } from 'jsonwebtoken';
import * as jwt from 'jsonwebtoken';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTenantSlug } from '../tenant/tenant-runtime';
import { getTenantStorefrontUrl } from '../tenant/tenant-url.util';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { SanitizedUser, UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Horas de validez del link de verificación de email. */
const EMAIL_VERIFICATION_TTL_HOURS = 24;

function getHashOptions(): argon2.Options | undefined {
  // Use lighter params in tests to avoid OOM when many workers hash concurrently.
  if (process.env.NODE_ENV === 'test') {
    return { type: argon2.argon2id, memoryCost: 8192, timeCost: 2, parallelism: 1 };
  }
  return undefined;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: SanitizedUser; verificationEmailSent: boolean } & TokenPair> {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!customerRole) {
      throw new Error('CUSTOMER role not found');
    }

    const passwordHash = await argon2.hash(dto.password, getHashOptions());

    const termsVersion = await this.getActiveTermsVersion();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: customerRole.id,
        acceptedTermsAt: dto.acceptedTerms ? new Date() : null,
        acceptedTermsVersion: dto.acceptedTerms ? String(termsVersion) : null,
      },
      include: { role: true },
    });

    const verificationEmailSent = await this.sendEmailVerificationLink(user);

    try {
      await this.emailService.sendWelcome(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email', error);
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    return {
      user: this.usersService.sanitizeUser(user),
      verificationEmailSent,
      ...tokens,
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const verification = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);

    const user = await this.usersService.findById(verification.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerified) {
      return { user };
    }

    await this.sendEmailVerificationLink(user, { throwOnError: true });
    return { user };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // No revelar si el email existe; respuesta idéntica en ambos casos.
    if (!user || user.isGuest) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.$transaction([
      // Invalida tokens anteriores sin usar
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    const webUrl = this.getWebUrl();
    const resetUrl = `${webUrl}/reset-password?token=${token}`;

    try {
      await this.emailService.sendPasswordReset(user.email, user.firstName, resetUrl, 60);
    } catch (error) {
      console.error('Failed to send password reset email', error);
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashResetToken(token);

    const stored = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(newPassword, getHashOptions());

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      // Revoca todas las sesiones activas por seguridad
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getWebUrl(): string {
    return getTenantStorefrontUrl();
  }

  private async sendEmailVerificationLink(
    user: SanitizedUser,
    options: { throwOnError?: boolean } = {},
  ): Promise<boolean> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_TTL_HOURS);

    await this.prisma.$transaction([
      // Invalida links de verificación anteriores sin usar
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const verificationUrl = `${this.getWebUrl()}/verify-email?token=${token}`;

    try {
      await this.emailService.sendEmailVerification(
        user.email,
        user.firstName,
        verificationUrl,
        EMAIL_VERIFICATION_TTL_HOURS,
      );
      return true;
    } catch (error) {
      // El registro no falla si el email no se puede enviar; el reenvío manual
      // sí propaga el error para que el usuario sepa que no salió.
      console.error('Failed to send verification email', error);
      if (options.throwOnError) {
        throw new ServiceUnavailableException('Could not send verification email');
      }
      return false;
    }
  }

  async login(
    email: string,
    password: string,
    context: { trustedDeviceToken?: string; userAgent?: string; ip?: string; remember?: boolean } = {},
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account suspended');
    }

    // Roles corporativos (ADMIN/STAFF por defecto) requieren verificación en dos pasos.
    if (this.twoFactorService.isRequiredFor(user.role.name)) {
      const trusted =
        user.twoFactorEnabled &&
        (await this.twoFactorService.isTrustedDevice(user.id, context.trustedDeviceToken));

      if (!trusted) {
        const purpose = user.twoFactorEnabled ? 'verify' : 'setup';
        return {
          twoFactorRequired: true as const,
          twoFactorSetupRequired: purpose === 'setup',
          challengeToken: this.twoFactorService.signChallenge(user, purpose, context.remember ?? true),
          user: this.usersService.sanitizeUser(user),
        };
      }
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  /** Emite una sesión completa (se usa al completar el flujo 2FA). */
  async issueSessionForUser(
    userId: string,
    impersonation?: { impersonatedBy?: string; impersonatedAt?: Date; readOnly?: boolean },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account suspended');
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, impersonation);
    return { user: this.usersService.sanitizeUser(user), ...tokens };
  }

  async setupTwoFactor(challengeToken: string) {
    const payload = this.twoFactorService.verifyChallenge(challengeToken, 'setup');
    return this.twoFactorService.startSetup(payload.sub);
  }

  async confirmTwoFactor(
    challengeToken: string,
    code: string,
    options: { trustDevice?: boolean; userAgent?: string; ip?: string } = {},
  ) {
    const payload = this.twoFactorService.verifyChallenge(challengeToken, 'setup');
    const recoveryCodes = await this.twoFactorService.confirmSetup(payload.sub, code);
    const session = await this.issueSessionForUser(payload.sub);
    const trustedDeviceToken = options.trustDevice
      ? await this.twoFactorService.createTrustedDevice(payload.sub, {
          userAgent: options.userAgent,
          ip: options.ip,
        })
      : undefined;
    return { ...session, recoveryCodes, trustedDeviceToken, remember: payload.remember };
  }

  async verifyTwoFactor(
    challengeToken: string,
    code: string,
    options: { backup?: boolean; trustDevice?: boolean; userAgent?: string; ip?: string } = {},
  ) {
    const payload = this.twoFactorService.verifyChallenge(challengeToken, 'verify');
    const valid = await this.twoFactorService.verifyCode(payload.sub, code, options.backup);
    if (!valid) {
      throw new UnauthorizedException('Invalid verification code');
    }
    const session = await this.issueSessionForUser(payload.sub);
    const trustedDeviceToken = options.trustDevice
      ? await this.twoFactorService.createTrustedDevice(payload.sub, {
          userAgent: options.userAgent,
          ip: options.ip,
        })
      : undefined;
    return { ...session, trustedDeviceToken, remember: payload.remember };
  }

  async disableTwoFactor(userId: string, code: string) {
    await this.twoFactorService.disable(userId, code);
  }

  async regenerateTwoFactorRecoveryCodes(userId: string, code: string) {
    return this.twoFactorService.regenerateRecoveryCodes(userId, code);
  }

  // ----- Gestión de 2FA desde una sesión ya autenticada (panel admin) -----

  /** Inicia la configuración de 2FA para un usuario autenticado. */
  async setupTwoFactorForUser(userId: string) {
    return this.twoFactorService.startSetup(userId);
  }

  /** Confirma la configuración de 2FA de un usuario autenticado y devuelve códigos de recuperación. */
  async confirmTwoFactorForUser(userId: string, code: string) {
    return this.twoFactorService.confirmSetup(userId, code);
  }

  /** Lista los dispositivos confiables vigentes del usuario autenticado. */
  async listTrustedDevices(userId: string) {
    return this.twoFactorService.listTrustedDevices(userId);
  }

  /** Revoca un dispositivo confiable del usuario autenticado. */
  async revokeTrustedDevice(userId: string, deviceId: string) {
    await this.twoFactorService.revokeTrustedDevice(userId, deviceId);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { role: true } } },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.user.isSuspended) {
      throw new UnauthorizedException('Account suspended');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokenPair(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      {
        // Se preserva la marca original para que el TTL de impersonación no se renueve.
        impersonatedBy: stored.impersonatedBy ?? undefined,
        impersonatedAt: stored.impersonatedAt ?? undefined,
        readOnly: stored.readOnly,
      },
    );
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(newPassword, getHashOptions());
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens to force re-login on other devices.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async acceptTerms(userId: string) {
    const termsVersion = await this.getActiveTermsVersion();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        acceptedTermsAt: new Date(),
        acceptedTermsVersion: String(termsVersion),
      },
      include: { role: true },
    });
    return this.usersService.sanitizeUser(user);
  }

  async googleLogin(idToken: string) {
    const payload = await this.verifyGoogleIdToken(idToken);
    const email = payload.email;
    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    const user = await this.findOrCreateOAuthUser({
      provider: 'google',
      providerId: payload.sub,
      email,
      firstName: payload.given_name ?? email.split('@')[0],
      lastName: payload.family_name ?? '',
    });

    return this.oauthLoginResponse(user);
  }

  async appleLogin(identityToken: string, email?: string, firstName?: string, lastName?: string) {
    const payload = await this.verifyAppleIdToken(identityToken);
    const existingByProvider = await this.prisma.user.findUnique({
      where: { appleId: payload.sub },
      include: { role: true },
    });

    if (existingByProvider) {
      return this.oauthLoginResponse(existingByProvider);
    }

    if (!email) {
      throw new UnauthorizedException('Apple account did not provide an email. Sign in again sharing your email.');
    }

    const user = await this.findOrCreateOAuthUser({
      provider: 'apple',
      providerId: payload.sub,
      email,
      firstName: firstName ?? email.split('@')[0],
      lastName: lastName ?? '',
    });

    return this.oauthLoginResponse(user);
  }

  private async verifyGoogleIdToken(idToken: string) {
    const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    if (!config?.googleOAuthEnabled || !config.googleClientId) {
      throw new UnauthorizedException('Google sign-in is not enabled');
    }

    try {
      const client = new OAuth2Client(config.googleClientId);
      const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId });
      const payload = ticket.getPayload();
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid Google token');
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException(`Invalid Google token: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async verifyAppleIdToken(identityToken: string): Promise<{ sub: string }> {
    const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    if (!config?.appleOAuthEnabled || !config.appleClientId) {
      throw new UnauthorizedException('Apple sign-in is not enabled');
    }

    try {
      const decodedHeader = jwt.decode(identityToken, { complete: true });
      const kid = (decodedHeader?.header as { kid?: string } | null)?.kid;
      if (!kid) {
        throw new Error('Missing kid in Apple token');
      }

      const response = await fetch('https://appleid.apple.com/auth/keys');
      if (!response.ok) {
        throw new Error('Could not fetch Apple keys');
      }
      const jwks = (await response.json()) as { keys: Array<{ kty: string; kid: string; n: string; e: string }> };
      const key = jwks.keys.find((candidate) => candidate.kid === kid);
      if (!key) {
        throw new Error('Apple key not found');
      }

      const publicKey = createPublicKey({ key: { kty: key.kty, n: key.n, e: key.e }, format: 'jwk' });
      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: config.appleClientId,
      }) as { sub: string };

      return payload;
    } catch (error) {
      throw new UnauthorizedException(`Invalid Apple token: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async findOrCreateOAuthUser(data: {
    provider: 'google' | 'apple';
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const providerField = data.provider === 'google' ? 'googleId' : 'appleId';
    const email = data.email.toLowerCase();

    const byProvider = await this.prisma.user.findFirst({
      where: { [providerField]: data.providerId },
      include: { role: true },
    });
    if (byProvider) {
      return byProvider;
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (byEmail) {
      // Vincula la cuenta OAuth a la cuenta existente por email
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { [providerField]: data.providerId, ...(byEmail.emailVerified ? {} : { emailVerified: true, emailVerifiedAt: new Date() }) },
        include: { role: true },
      });
    }

    const customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) {
      throw new Error('CUSTOMER role not found');
    }

    const placeholderHash = await argon2.hash(randomBytes(32).toString('hex'), getHashOptions());

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: placeholderHash,
        firstName: data.firstName,
        lastName: data.lastName,
        roleId: customerRole.id,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        [providerField]: data.providerId,
      },
      include: { role: true },
    });
  }

  private async oauthLoginResponse(user: User & { role: Role }) {
    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  private async getActiveTermsVersion(): Promise<number> {
    try {
      const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
      return config?.termsVersion ?? 1;
    } catch {
      return 1;
    }
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    role: Role,
    impersonation: { impersonatedBy?: string; impersonatedAt?: Date; readOnly?: boolean } = {},
  ): Promise<TokenPair> {
    const tenant = getCurrentTenantSlug();
    const impersonatedAt = impersonation.impersonatedBy
      ? (impersonation.impersonatedAt ?? new Date())
      : undefined;
    const payload = {
      sub: userId,
      email,
      role: role.name,
      ...(tenant ? { tenant } : {}),
      ...(impersonation.impersonatedBy && impersonatedAt
        ? {
            impersonatedBy: impersonation.impersonatedBy,
            impersonatedAt: impersonatedAt.getTime(),
            ...(impersonation.readOnly ? { readOnly: true } : {}),
          }
        : {}),
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<SignOptions['expiresIn']>(
        'JWT_ACCESS_EXPIRATION',
      ),
    });

    const refreshTokenValue = randomBytes(40).toString('hex');
    const refreshTokenHash = this.hashToken(refreshTokenValue);
    const refreshExpiresIn = this.configService.getOrThrow<SignOptions['expiresIn']>(
      'JWT_REFRESH_EXPIRATION',
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: this.expiresAtFromDuration(refreshExpiresIn),
        impersonatedBy: impersonation.impersonatedBy ?? null,
        impersonatedAt: impersonatedAt ?? null,
        readOnly: impersonation.readOnly ?? false,
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private hashToken(token: string): string {
    return token; // In a real app, use a secure hash like SHA-256. Simplified for now.
  }

  private expiresAtFromDuration(duration: SignOptions['expiresIn']): Date {
    const now = new Date();

    if (typeof duration === 'number') {
      now.setSeconds(now.getSeconds() + duration);
      return now;
    }

    if (!duration) {
      now.setDate(now.getDate() + 7);
      return now;
    }

    const value = parseInt(duration, 10);
    const unit = duration.replace(/\d+/g, '').trim();

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      default:
        now.setDate(now.getDate() + 7);
    }

    return now;
  }
}
