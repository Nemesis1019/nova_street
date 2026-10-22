import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Clave técnica (minúsculas, números y guiones)', example: 'promo-verano' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'key must contain only lowercase letters, numbers and hyphens',
  })
  key!: string;

  @ApiProperty({ description: 'Nombre visible de la plantilla' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ description: 'Descripción / propósito' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Asunto por defecto (admite variables {{...}})' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  subject!: string;

  @ApiProperty({ description: 'Contenido HTML (admite variables {{...}})' })
  @IsString()
  @IsNotEmpty()
  html!: string;
}
