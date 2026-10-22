import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class TestEmailTemplateDto {
  @ApiProperty({ description: 'Destinatario de la prueba', example: 'admin@nova.co' })
  @IsEmail()
  @IsNotEmpty()
  to!: string;
}
