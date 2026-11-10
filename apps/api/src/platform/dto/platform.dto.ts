import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'acme' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: 'Acme Store' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'acme.nova.app' })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ example: 'Password1234' })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiPropertyOptional({ description: 'Usar una BD existente en lugar de crear tenant_<slug>' })
  @IsString()
  @IsOptional()
  databaseUrl?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'SUSPENDED'])
  @IsOptional()
  status?: 'ACTIVE' | 'SUSPENDED';
}

export class UpdateTenantSubscriptionDto {
  @ApiProperty({ description: 'ID del plan activo a asignar al cliente' })
  @IsUUID()
  planId!: string;
}

export class SubscriptionActionDto {
  @ApiPropertyOptional({ description: 'Motivo de la acción, para auditoría' })
  @IsString()
  @IsOptional()
  reason?: string;
}
