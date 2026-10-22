import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { CorsPolicyService } from '../common/cors-policy.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  getTrustedDeviceFromRequest,
  setRefreshTokenCookie,
  setTrustedDeviceCookie,
} from './auth-cookies.util';
import { AuthThrottle } from './decorators/auth-throttle.decorator';
import { AppleLoginDto } from './dto/apple-login.dto';
import {
  AuthUserDto,
  LoginResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
  TrustedDeviceDto,
  TwoFactorRecoveryCodesResponseDto,
  TwoFactorSessionResponseDto,
  TwoFactorSetupResponseDto,
} from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  TwoFactorChallengeDto,
  TwoFactorConfirmDto,
  TwoFactorDisableDto,
  TwoFactorVerifyDto,
} from './dto/two-factor.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly corsPolicy: CorsPolicyService,
  ) {}

  @Post('register')
  @AuthThrottle()
  @ApiOkResponse({ type: RegisterResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } = await this.authService.register(dto);
    setRefreshTokenCookie(req, res, refreshToken);
    return response;
  }

  @Post('login')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password, {
      trustedDeviceToken: getTrustedDeviceFromRequest(req),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      remember: dto.remember ?? true,
    });

    if ('twoFactorRequired' in result) {
      return result;
    }

    const { refreshToken, ...response } = result;
    setRefreshTokenCookie(req, res, refreshToken, { remember: dto.remember ?? true });
    return response;
  }

  // ---------- Verificación en dos pasos ----------

  @Post('2fa/setup')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TwoFactorSetupResponseDto })
  async twoFactorSetup(@Body() dto: TwoFactorChallengeDto) {
    return this.authService.setupTwoFactor(dto.challengeToken);
  }

  @Post('2fa/setup/confirm')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TwoFactorSessionResponseDto })
  async twoFactorSetupConfirm(
    @Body() dto: TwoFactorConfirmDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { trustedDeviceToken, refreshToken, remember, ...response } = await this.authService.confirmTwoFactor(
      dto.challengeToken,
      dto.code,
      { trustDevice: dto.trustDevice, userAgent: req.headers['user-agent'], ip: req.ip },
    );
    setRefreshTokenCookie(req, res, refreshToken, { remember });
    if (trustedDeviceToken) {
      setTrustedDeviceCookie(req, res, trustedDeviceToken);
    }
    return response;
  }

  @Post('2fa/verify')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TwoFactorSessionResponseDto })
  async twoFactorVerify(
    @Body() dto: TwoFactorVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { trustedDeviceToken, refreshToken, remember, ...response } = await this.authService.verifyTwoFactor(
      dto.challengeToken,
      dto.code,
      {
        backup: dto.backup,
        trustDevice: dto.trustDevice,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    );
    setRefreshTokenCookie(req, res, refreshToken, { remember });
    if (trustedDeviceToken) {
      setTrustedDeviceCookie(req, res, trustedDeviceToken);
    }
    return response;
  }

  @Post('2fa/disable')
  @AuthThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async twoFactorDisable(@Req() req: Request, @Body() dto: TwoFactorDisableDto) {
    const userId = (req.user as { userId: string }).userId;
    await this.authService.disableTwoFactor(userId, dto.code);
  }

  @Post('2fa/recovery-codes')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: TwoFactorRecoveryCodesResponseDto })
  async twoFactorRecoveryCodes(@Req() req: Request, @Body() dto: TwoFactorDisableDto) {
    const userId = (req.user as { userId: string }).userId;
    const recoveryCodes = await this.authService.regenerateTwoFactorRecoveryCodes(userId, dto.code);
    return { recoveryCodes };
  }

  // ----- Gestión de 2FA desde una sesión autenticada (pantalla de seguridad) -----

  @Post('2fa/setup/current')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: TwoFactorSetupResponseDto })
  async twoFactorSetupCurrent(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.setupTwoFactorForUser(userId);
  }

  @Post('2fa/setup/confirm/current')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: TwoFactorRecoveryCodesResponseDto })
  async twoFactorSetupConfirmCurrent(@Req() req: Request, @Body() dto: TwoFactorDisableDto) {
    const userId = (req.user as { userId: string }).userId;
    const recoveryCodes = await this.authService.confirmTwoFactorForUser(userId, dto.code);
    return { recoveryCodes };
  }

  @Get('2fa/devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: [TrustedDeviceDto] })
  async twoFactorDevices(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.listTrustedDevices(userId);
  }

  @Delete('2fa/devices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async twoFactorRevokeDevice(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    await this.authService.revokeTrustedDevice(userId, id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RefreshResponseDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.assertAllowedOrigin(req);
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }
    const { refreshToken: newRefreshToken, accessToken } = await this.authService.refresh(refreshToken);
    setRefreshTokenCookie(req, res, newRefreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.assertAllowedOrigin(req);
    const userId = (req.user as { userId: string }).userId;
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }
    clearRefreshTokenCookie(req, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserDto })
  me(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.usersService.findById(userId);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RegisterResponseDto })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: RegisterResponseDto })
  async resendVerification(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.resendVerificationEmail(userId);
  }

  @Post('forgot-password')
  @AuthThrottle()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Respuesta genérica para no revelar si el email existe
    return { message: 'If the email is registered, a reset link has been sent' };
  }

  @Post('reset-password')
  @AuthThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('accept-terms')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async acceptTerms(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.acceptTerms(userId);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } = await this.authService.googleLogin(dto.idToken);
    setRefreshTokenCookie(req, res, refreshToken);
    return response;
  }

  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  async appleLogin(
    @Body() dto: AppleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } = await this.authService.appleLogin(
      dto.identityToken,
      dto.email,
      dto.firstName,
      dto.lastName,
    );
    setRefreshTokenCookie(req, res, refreshToken);
    return response;
  }

  /**
   * Anti-CSRF para endpoints que usan cookies (refresh/logout): si el navegador
   * envía Origin, debe pertenecer a la plataforma o a un tenant registrado.
   */
  private async assertAllowedOrigin(req: Request) {
    const origin = req.headers.origin;
    if (!origin) return;
    if (!(await this.corsPolicy.isAllowedOrigin(origin))) {
      throw new ForbiddenException('Origen no permitido');
    }
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }
}
