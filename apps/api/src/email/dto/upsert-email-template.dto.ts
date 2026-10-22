import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertEmailTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  html!: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
