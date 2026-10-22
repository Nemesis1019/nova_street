import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsJSON, IsOptional, IsString, IsUrl, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator';

/**
 * Convierte strings vacíos (o con solo espacios) en `null` para campos opcionales.
 * `@IsOptional()` ignora `null`/`undefined` pero no `''`, por lo que sin esta
 * transformación los validadores de formato (`@IsUrl`, `@IsEmail`, `@IsUUID`)
 * rechazan el string vacío que envía el admin al dejar un campo sin completar.
 */
const EmptyToNull = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));

export class UpdateStoreConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @EmptyToNull()
  @IsUrl()
  @IsOptional()
  logoUrl?: string | null;

  @EmptyToNull()
  @IsUrl()
  @IsOptional()
  faviconUrl?: string | null;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'primaryColor must be a valid CSS color',
  })
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'secondaryColor must be a valid CSS color',
  })
  @IsOptional()
  secondaryColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'backgroundColor must be a valid CSS color',
  })
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'textColor must be a valid CSS color',
  })
  @IsOptional()
  textColor?: string;

  @EmptyToNull()
  @IsUrl()
  @IsOptional()
  heroImageUrl?: string | null;

  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroSubtitle?: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsJSON()
  @IsOptional()
  socialLinks?: string;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currencyCode?: string;

  @IsEnum(['LIGHT', 'DARK', 'SYSTEM'] as const)
  @IsOptional()
  appearanceMode?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'surfaceColor must be a valid CSS color',
  })
  @IsOptional()
  surfaceColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'surfaceMutedColor must be a valid CSS color',
  })
  @IsOptional()
  surfaceMutedColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'borderColor must be a valid CSS color',
  })
  @IsOptional()
  borderColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'errorColor must be a valid CSS color',
  })
  @IsOptional()
  errorColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'successColor must be a valid CSS color',
  })
  @IsOptional()
  successColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'warningColor must be a valid CSS color',
  })
  @IsOptional()
  warningColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'darkBackgroundColor must be a valid CSS color',
  })
  @IsOptional()
  darkBackgroundColor?: string;

  @IsString()
  @Length(4, 9)
  @Matches(/^#([0-9A-Fa-f]{3}){1,2}$|^rgb\(|^hsl\(/, {
    message: 'darkTextColor must be a valid CSS color',
  })
  @IsOptional()
  darkTextColor?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @IsString()
  @IsOptional()
  maintenanceMessage?: string;

  @IsBoolean()
  @IsOptional()
  enableCustomDesigns?: boolean;

  @IsBoolean()
  @IsOptional()
  enableNewsletter?: boolean;

  @IsBoolean()
  @IsOptional()
  enableCatalogFilters?: boolean;

  @IsString()
  @IsOptional()
  template?: string;

  @IsJSON()
  @IsOptional()
  templateConfig?: string;

  @IsJSON()
  @IsOptional()
  storefrontConfig?: string;

  @IsString()
  @IsOptional()
  emailProvider?: string;

  @IsString()
  @IsOptional()
  paymentProvider?: string;

  @EmptyToNull()
  @IsString()
  @IsOptional()
  boldApiKey?: string | null;

  @IsString()
  @IsOptional()
  boldSecretKey?: string;

  @IsBoolean()
  @IsOptional()
  boldSandbox?: boolean;

  @EmptyToNull()
  @IsString()
  @IsOptional()
  stripePublishableKey?: string | null;

  @IsString()
  @IsOptional()
  stripeSecretKey?: string;

  @IsString()
  @IsOptional()
  stripeWebhookSecret?: string;

  @EmptyToNull()
  @IsString()
  @IsOptional()
  smtpHost?: string | null;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  smtpPort?: number;

  @EmptyToNull()
  @IsString()
  @IsOptional()
  smtpUser?: string | null;

  @IsString()
  @IsOptional()
  smtpPass?: string;

  @IsBoolean()
  @IsOptional()
  smtpSecure?: boolean;

  @EmptyToNull()
  @IsString()
  @IsOptional()
  smtpFrom?: string | null;

  @IsString()
  @IsOptional()
  resendApiKey?: string;

  @EmptyToNull()
  @IsString()
  @IsOptional()
  resendFrom?: string | null;

  @IsString()
  @IsOptional()
  shippingProvider?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  shippingBaseCost?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  freeShippingThreshold?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  shippingDiscountPercentage?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  shippingDiscountFixedAmount?: number;

  @IsUUID()
  @IsOptional()
  termsPageId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  termsVersion?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  productionEstimateDays?: number;

  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  deliveryEstimateDays?: number;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  emailSenderName?: string;

  @EmptyToNull()
  @IsEmail()
  @IsOptional()
  emailSenderAddress?: string | null;

  @IsBoolean()
  @IsOptional()
  googleOAuthEnabled?: boolean;

  @IsString()
  @IsOptional()
  googleClientId?: string;

  @IsBoolean()
  @IsOptional()
  appleOAuthEnabled?: boolean;

  @IsString()
  @IsOptional()
  appleClientId?: string;
}
