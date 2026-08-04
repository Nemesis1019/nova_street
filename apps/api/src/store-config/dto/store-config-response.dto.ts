import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoreConfigResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

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
}
