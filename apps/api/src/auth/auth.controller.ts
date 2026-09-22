import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginResponseDto, RefreshResponseDto, RegisterResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOkResponse({ type: RegisterResponseDto })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...response } = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, refreshToken);
    return response;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...response } = await this.authService.login(dto.email, dto.password);
    this.setRefreshTokenCookie(res, refreshToken);
    return response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RefreshResponseDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    const { refreshToken: newRefreshToken, accessToken } = await this.authService.refresh(refreshToken);
    this.setRefreshTokenCookie(res, newRefreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = (req.user as { userId: string }).userId;
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }
    this.clearRefreshTokenCookie(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.usersService.findById(userId);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: RegisterResponseDto })
  async verifyEmail(@Req() req: Request, @Body() dto: VerifyEmailDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.verifyEmail(userId, dto.code);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: RegisterResponseDto })
  async resendVerification(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.resendVerificationEmail(userId);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
      maxAge: this.getRefreshCookieMaxAge(),
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
  }

  private getRefreshCookieMaxAge(): number {
    const expiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION') ?? '7d';
    const value = parseInt(expiration, 10);
    const unit = expiration.replace(/\d+/g, '').trim();

    switch (unit) {
      case 'd':
        return value * ONE_DAY_MS;
      case 'h':
        return value * 60 * 60 * 1_000;
      case 'm':
        return value * 60 * 1_000;
      default:
        return 7 * ONE_DAY_MS;
    }
  }
}
