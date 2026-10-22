'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { getAdminTenantSlug } from '../lib/tenant';

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
  /** URL del storefront del tenant actual (la agrega GET /store-config). */
  storefrontUrl?: string | null;
}

const ConfigContext = createContext<StoreConfig | null>(null);
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function ConfigProvider({
  config,
  children,
}: {
  config: StoreConfig;
  children: ReactNode;
}) {
  // El layout es SSR y no conoce el tenant (vive en localStorage), por lo que
  // la config inicial es la del tenant por defecto. Al montar, se refresca con
  // el X-Tenant real para no mezclar branding/datos entre clientes.
  const [current, setCurrent] = useState<StoreConfig>(config);

  useEffect(() => {
    let cancelled = false;
    const tenant = getAdminTenantSlug();

    fetch(`${baseUrl}/store-config`, {
      credentials: 'include',
      headers: {
        'X-Client': 'admin',
        ...(tenant ? { 'X-Tenant': tenant } : {}),
      },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setCurrent((previous) => ({ ...previous, ...(data as Partial<StoreConfig>) }));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  // El metadata SSR no conoce el tenant; el título se ajusta al cliente activo.
  useEffect(() => {
    if (current.name) document.title = `Admin - ${current.name}`;
  }, [current.name]);

  return <ConfigContext.Provider value={current}>{children}</ConfigContext.Provider>;
}

export function useStoreConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useStoreConfig must be used within ConfigProvider');
  }
  return context;
}
