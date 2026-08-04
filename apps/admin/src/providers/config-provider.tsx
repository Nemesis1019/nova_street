'use client';

import { createContext, ReactNode, useContext } from 'react';

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
  template?: 'storefront';
  templateConfig?: Record<string, unknown> | null;
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
