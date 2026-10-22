import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PreviewEmailTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(300)
  subject?: string;

  @IsString()
  @IsOptional()
  html?: string;

  /** Overrides del layout global para previsualizar sin guardar. */
  @IsString()
  @IsOptional()
  headerHtml?: string;

  @IsString()
  @IsOptional()
  footerHtml?: string;
}
