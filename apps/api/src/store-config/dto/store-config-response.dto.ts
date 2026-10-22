import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoreConfigResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ description: 'URL pública del storefront del tenant actual' })
  storefrontUrl?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  faviconUrl?: string;

  @ApiProperty()
  primaryColor!: string;

  @ApiProperty()
  secondaryColor!: string;

  @ApiProperty()
  backgroundColor!: string;

  @ApiProperty()
  textColor!: string;

  @ApiPropertyOptional()
  heroImageUrl?: string;

  @ApiPropertyOptional()
  heroTitle?: string;

  @ApiPropertyOptional()
  heroSubtitle?: string;

  @ApiPropertyOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiPropertyOptional()
  socialLinks?: object;

  @ApiProperty()
  currencyCode!: string;

  @ApiProperty({ enum: ['LIGHT', 'DARK', 'SYSTEM'] })
  appearanceMode!: string;

  @ApiProperty()
  surfaceColor!: string;

  @ApiProperty()
  surfaceMutedColor!: string;

  @ApiProperty()
  borderColor!: string;

  @ApiProperty()
  errorColor!: string;

  @ApiProperty()
  successColor!: string;

  @ApiProperty()
  warningColor!: string;

  @ApiProperty()
  darkBackgroundColor!: string;

  @ApiProperty()
  darkTextColor!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  maintenanceMode!: boolean;

  @ApiPropertyOptional()
  maintenanceMessage?: string;

  @ApiProperty()
  enableCustomDesigns!: boolean;

  @ApiProperty()
  enableNewsletter!: boolean;

  @ApiProperty()
  enableCatalogFilters!: boolean;

  @ApiProperty()
  template!: string;

  @ApiPropertyOptional()
  templateConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  storefrontConfig?: Record<string, unknown>;

  @ApiProperty()
  emailProvider!: string;

  @ApiProperty()
  paymentProvider!: string;

  @ApiPropertyOptional({ description: 'Llave de identidad de Bold (botón de pagos)' })
  boldApiKey?: string | null;

  @ApiPropertyOptional({ description: 'true si hay una llave secreta de Bold configurada (nunca se devuelve)' })
  boldSecretConfigured?: boolean;

  @ApiPropertyOptional({ description: 'Modo pruebas de Bold (firma de webhook con clave vacía)' })
  boldSandbox?: boolean;

  @ApiPropertyOptional({ description: 'Llave publicable de Stripe (segura para el cliente)' })
  stripePublishableKey?: string | null;

  @ApiPropertyOptional({ description: 'true si hay una secret key de Stripe configurada (nunca se devuelve)' })
  stripeSecretConfigured?: boolean;

  @ApiPropertyOptional({ description: 'true si hay un webhook secret de Stripe configurado (nunca se devuelve)' })
  stripeWebhookConfigured?: boolean;

  @ApiPropertyOptional({ description: 'Host SMTP del tenant (si no, se usa el de la plataforma)' })
  smtpHost?: string | null;

  @ApiPropertyOptional({ description: 'Puerto SMTP del tenant' })
  smtpPort?: number | null;

  @ApiPropertyOptional({ description: 'Usuario SMTP del tenant' })
  smtpUser?: string | null;

  @ApiPropertyOptional({ description: 'true si hay una contraseña SMTP configurada (nunca se devuelve)' })
  smtpPassConfigured?: boolean;

  @ApiPropertyOptional({ description: 'TLS/SSL del SMTP del tenant' })
  smtpSecure?: boolean | null;

  @ApiPropertyOptional({ description: 'Remitente SMTP del tenant' })
  smtpFrom?: string | null;

  @ApiPropertyOptional({ description: 'true si hay una API key de Resend configurada (nunca se devuelve)' })
  resendApiKeyConfigured?: boolean;

  @ApiPropertyOptional({ description: 'Remitente de Resend del tenant' })
  resendFrom?: string | null;

  @ApiProperty()
  shippingProvider!: string;

  @ApiProperty()
  shippingBaseCost!: number;

  @ApiPropertyOptional({ nullable: true })
  freeShippingThreshold?: number | null;

  @ApiPropertyOptional({ nullable: true })
  shippingDiscountPercentage?: number | null;

  @ApiPropertyOptional({ nullable: true })
  shippingDiscountFixedAmount?: number | null;

  @ApiPropertyOptional({ nullable: true })
  termsPageId?: string | null;

  @ApiProperty()
  termsVersion!: number;

  @ApiPropertyOptional({ nullable: true })
  minOrderAmount?: number | null;

  @ApiPropertyOptional({ nullable: true })
  productionEstimateDays?: number | null;

  @ApiPropertyOptional({ nullable: true })
  deliveryEstimateDays?: number | null;

  @ApiPropertyOptional()
  emailSenderName?: string;

  @ApiPropertyOptional()
  emailSenderAddress?: string;

  @ApiProperty()
  googleOAuthEnabled!: boolean;

  @ApiPropertyOptional()
  googleClientId?: string;

  @ApiProperty()
  appleOAuthEnabled!: boolean;

  @ApiPropertyOptional()
  appleClientId?: string;
}
