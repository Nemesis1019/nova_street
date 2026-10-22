import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class PlatformLoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ description: 'Código TOTP si el operador tiene 2FA' })
  @IsString()
  @IsOptional()
  code?: string;
}

export class PlatformCodeDto {
  @ApiProperty()
  @IsString()
  code!: string;
}

export class PlatformTwoFactorDto {
  @ApiProperty()
  @IsString()
  challengeToken!: string;

  @ApiProperty()
  @IsString()
  code!: string;
}

export class CreatePlatformUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: ['OWNER', 'OPERATOR', 'SUPPORT'] })
  @IsIn(['OWNER', 'OPERATOR', 'SUPPORT'])
  @IsOptional()
  role?: 'OWNER' | 'OPERATOR' | 'SUPPORT';
}

export class UpdatePlatformUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ['OWNER', 'OPERATOR', 'SUPPORT'] })
  @IsIn(['OWNER', 'OPERATOR', 'SUPPORT'])
  @IsOptional()
  role?: 'OWNER' | 'OPERATOR' | 'SUPPORT';

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class PlatformPasswordDto {
  @ApiProperty()
  @IsString()
  password!: string;
}

export class ImpersonateTenantDto {
  @ApiProperty({ description: 'Motivo de la impersonación (auditoría)' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiPropertyOptional({ description: 'Sesión de solo lectura (sin mutaciones)' })
  @IsBoolean()
  @IsOptional()
  readOnly?: boolean;

  @ApiPropertyOptional({ description: 'Contraseña del operador (step-up)' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Token de step-up vigente (evita pedir la contraseña de nuevo)' })
  @IsString()
  @IsOptional()
  stepUpToken?: string;
}
