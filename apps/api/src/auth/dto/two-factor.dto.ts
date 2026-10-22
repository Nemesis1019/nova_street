import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class TwoFactorChallengeDto {
  @ApiProperty({ description: 'Token de desafío devuelto por /auth/login' })
  @IsString()
  challengeToken!: string;
}

export class TwoFactorConfirmDto extends TwoFactorChallengeDto {
  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @IsString()
  @Length(6, 10)
  code!: string;

  @ApiPropertyOptional({ description: 'Confiar en este dispositivo durante 30 días' })
  @IsOptional()
  @IsBoolean()
  trustDevice?: boolean;
}

export class TwoFactorVerifyDto extends TwoFactorConfirmDto {
  @ApiPropertyOptional({ description: 'Usar un código de recuperación en lugar del TOTP' })
  @IsOptional()
  @IsBoolean()
  backup?: boolean;
}

export class TwoFactorDisableDto {
  @ApiProperty({ description: 'Código TOTP actual para confirmar la desactivación' })
  @IsString()
  @Length(6, 10)
  code!: string;
}
