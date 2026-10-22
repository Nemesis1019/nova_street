import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiPropertyOptional({ description: 'Indica si el usuario tiene 2FA activado' })
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Documento de identidad' })
  document?: string | null;
}

export class TrustedDeviceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ description: 'User-Agent del navegador' })
  userAgent?: string | null;

  @ApiPropertyOptional({ description: 'IP desde la que se confió el dispositivo' })
  ip?: string | null;

  @ApiProperty({ description: 'Último uso del dispositivo' })
  lastUsedAt!: Date;

  @ApiProperty({ description: 'Vencimiento de la confianza (30 días)' })
  expiresAt!: Date;

  @ApiProperty()
  createdAt!: Date;
}

export class LoginResponseDto {
  @ApiPropertyOptional({ description: 'Token de acceso (ausente cuando se requiere 2FA)' })
  accessToken?: string;

  @ApiPropertyOptional()
  user?: AuthUserDto;

  @ApiPropertyOptional({ description: 'true cuando la cuenta requiere verificación en dos pasos' })
  twoFactorRequired?: boolean;

  @ApiPropertyOptional({ description: 'true cuando el usuario debe configurar 2FA por primera vez' })
  twoFactorSetupRequired?: boolean;

  @ApiPropertyOptional({ description: 'Token temporal para completar el flujo 2FA' })
  challengeToken?: string;
}

export class RegisterResponseDto extends LoginResponseDto {
  @ApiProperty({ description: 'Indica si el email de verificación se pudo enviar' })
  verificationEmailSent!: boolean;
}

export class RefreshResponseDto {
  @ApiProperty()
  accessToken!: string;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'Secreto TOTP (para carga manual)' })
  secret!: string;

  @ApiProperty({ description: 'URI otpauth:// para autenticadores' })
  otpauthUrl!: string;

  @ApiProperty({ description: 'QR en formato data URL (PNG)' })
  qrDataUrl!: string;
}

export class TwoFactorSessionResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  user!: AuthUserDto;

  @ApiPropertyOptional({ type: [String], description: 'Códigos de recuperación (solo al activar 2FA)' })
  recoveryCodes?: string[];
}

export class TwoFactorRecoveryCodesResponseDto {
  @ApiProperty({ type: [String] })
  recoveryCodes!: string[];
}
