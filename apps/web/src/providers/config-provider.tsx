'use client';

import { createContext, ReactNode, useContext } from 'react';

export type TemplateName = 'storefront' | 'spa-store';

export interface TemplateConfig {
  heroLayout?: 'centered' | 'split' | 'minimal';
  showMarquee?: boolean;
  showIdentitySection?: boolean;
  productCardVariant?: 'default' | 'minimal';
  headerVariant?: 'default' | 'centered' | 'minimal';
  /** Badge circular giratorio del hero. */
  showHeroBadge?: boolean;
  heroBadgeText?: string;
  heroBadgeCenter?: string;
  /** Kicker sobre el título del hero. */
  heroEyebrow?: string;
  heroPrimaryLabel?: string;
  heroPrimaryHref?: string;
  heroSecondaryLabel?: string;
  heroSecondaryHref?: string;
  /** Kicker del detalle de producto (por defecto "{tienda} Original"). */
  productEyebrow?: string;
}

export interface StoreConfig {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  appearanceMode?: string | null;
  surfaceColor?: string | null;
  surfaceMutedColor?: string | null;
  borderColor?: string | null;
  errorColor?: string | null;
  successColor?: string | null;
  warningColor?: string | null;
  darkBackgroundColor?: string | null;
  darkTextColor?: string | null;
  heroImageUrl?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialLinks?: unknown;
  currencyCode: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  enableCustomDesigns?: boolean;
  enableNewsletter?: boolean;
  enableCatalogFilters?: boolean;
  template?: TemplateName;
  templateConfig?: TemplateConfig | null;
  storefrontConfig?: Record<string, unknown> | null;
  shippingBaseCost?: number;
  freeShippingThreshold?: number | null;
  termsPageId?: string | null;
  termsVersion?: number;
  minOrderAmount?: number | null;
  productionEstimateDays?: number | null;
  deliveryEstimateDays?: number | null;
  emailSenderName?: string | null;
  emailSenderAddress?: string | null;
  googleOAuthEnabled?: boolean;
  googleClientId?: string | null;
  appleOAuthEnabled?: boolean;
  appleClientId?: string | null;
}

const ConfigContext = createContext<StoreConfig | null>(null);

export function ConfigProvider({
  config,
  children,
}: {
  config: StoreConfig;
  children: ReactNode;
}) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useStoreConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useStoreConfig must be used within ConfigProvider');
  }
  return context;
}
