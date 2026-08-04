import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes, randomInt } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SanitizedUser, UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

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
  ) {}

  async register(dto: RegisterDto): Promise<{ user: SanitizedUser } & TokenPair> {
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

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: customerRole.id,
        acceptedTermsAt: dto.acceptedTerms ? new Date() : null,
        acceptedTermsVersion: dto.acceptedTerms ? '1.0' : null,
      },
      include: { role: true },
    });

    await this.createAndSendVerificationCode(user);

    try {
      await this.emailService.sendWelcome(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email', error);
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  async verifyEmail(userId: string, code: string) {
    const verification = await this.prisma.emailVerificationCode.findFirst({
      where: {
        userId,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);

    const user = await this.usersService.findById(userId);
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

    await this.createAndSendVerificationCode(user);
    return { user };
  }

  private async createAndSendVerificationCode(user: SanitizedUser) {
    const code = this.generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.emailVerificationCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    try {
      await this.emailService.sendEmailVerification(user.email, user.firstName, code);
    } catch (error) {
      // Do not fail registration if email cannot be sent; log and continue.
      console.error('Failed to send verification email', error);
    }
  }

  private generateOtp(): string {
    return randomInt(100000, 999999).toString();
  }

  async login(email: string, password: string) {
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

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
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

  private async generateTokenPair(
    userId: string,
    email: string,
    role: Role,
  ): Promise<TokenPair> {
    const payload = { sub: userId, email, role: role.name };
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
