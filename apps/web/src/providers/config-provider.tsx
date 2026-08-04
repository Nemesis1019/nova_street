'use client';

import { createContext, ReactNode, useContext } from 'react';

export type TemplateName = 'storefront' | 'spa-store';

export interface TemplateConfig {
  heroLayout?: 'centered' | 'split' | 'minimal';
  showMarquee?: boolean;
  showIdentitySection?: boolean;
  productCardVariant?: 'default' | 'minimal';
  headerVariant?: 'default' | 'centered' | 'minimal';
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
