import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShippingCredentialsResponseDto {
  @ApiProperty({ description: 'Proveedor de envíos activo', example: 'flatRate' })
  provider!: string;

  @ApiPropertyOptional({ description: 'URL base de la API del carrier' })
  apiUrl?: string | null;

  @ApiPropertyOptional({ description: 'ID/cuenta del carrier' })
  accountId?: string | null;

  @ApiProperty({ description: 'Indica si hay una API key configurada' })
  hasApiKey!: boolean;

  @ApiPropertyOptional({ description: 'Últimos 4 caracteres de la API key (para verificación visual)' })
  apiKeyLast4?: string | null;
}

export class UpdateShippingCredentialsDto {
  @ApiPropertyOptional({ description: 'Proveedor de envíos (flatRate, externo, ...)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  provider?: string;

  @ApiPropertyOptional({ description: 'URL base de la API del carrier' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  apiUrl?: string;

  @ApiPropertyOptional({ description: 'ID/cuenta del carrier' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  accountId?: string;

  @ApiPropertyOptional({ description: 'API key del carrier (se guarda tal cual; nunca se devuelve completa)' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  apiKey?: string;
}
