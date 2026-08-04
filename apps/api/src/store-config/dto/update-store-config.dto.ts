import { IsBoolean, IsEnum, IsInt, IsJSON, IsOptional, IsString, IsUrl, Length, Matches, Max, Min } from 'class-validator';

export class UpdateStoreConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsUrl()
  @IsOptional()
  faviconUrl?: string;

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

  @IsUrl()
  @IsOptional()
  heroImageUrl?: string;

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
}
