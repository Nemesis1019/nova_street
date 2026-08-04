import '@mantine/core/styles.css';
import './globals.css';

import { DEFAULT_CURRENCY_CODE } from '@ecommerce/shared';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';

import { AnnouncementBar } from '../components/announcement-bar';
import { AuthRehydrator } from '../components/auth-rehydrator';
import { ComparatorBar } from '../components/comparator-bar';
import { CustomStyles } from '../components/custom-styles';
import { EmailVerificationBanner } from '../components/email-verification-banner';
import { MaintenanceScreen } from '../components/maintenance-screen';
import { apiClient } from '../lib/api';
import { bebasNeue, inter, jetbrainsMono } from '../lib/fonts';
import { ConfigProvider, type StoreConfig } from '../providers/config-provider';
import { CurrencyProvider } from '../providers/currency-provider';
import { I18nProvider } from '../providers/i18n-provider';
import { QueryProvider } from '../providers/query-provider';
import { NOVA_COLORS,ThemeProvider } from '../providers/theme-provider';

const defaultConfig: StoreConfig = {
  id: 'default',
  name: 'Tienda',
  description: '',
  primaryColor: NOVA_COLORS.primary,
  secondaryColor: NOVA_COLORS.olive,
  backgroundColor: NOVA_COLORS.surface,
  textColor: NOVA_COLORS.onSurface,
  currencyCode: DEFAULT_CURRENCY_CODE,
  maintenanceMode: false,
  enableCustomDesigns: true,
  enableNewsletter: true,
  enableCatalogFilters: true,
  template: 'storefront',
  templateConfig: {
    heroLayout: 'centered',
    showMarquee: true,
    showIdentitySection: true,
    productCardVariant: 'default',
    headerVariant: 'default',
  },
};

async function fetchStoreConfig(): Promise<StoreConfig> {
  try {
    const { data: config } = await apiClient.GET('/store-config');
    return (config as StoreConfig) ?? defaultConfig;
  } catch {
    return defaultConfig;
  }
}

async function fetchCurrencies() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/currencies`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Array<{
      id: string;
      code: string;
      name: string;
      symbol: string;
      exchangeRate: number;
      isDefault: boolean;
      isActive: boolean;
      sortOrder: number;
    }>;
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchStoreConfig();
  return {
    title: config.name,
    description: config.description ?? undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await fetchStoreConfig();
  const currencies = await fetchCurrencies();

  return (
    <html
      lang="es"
      className={`${inter.variable} ${bebasNeue.variable} ${jetbrainsMono.variable}`}
      style={{ backgroundColor: config.backgroundColor || NOVA_COLORS.surface }}
    >
      <head>
        <ColorSchemeScript />
      </head>

      <body
        suppressHydrationWarning
        className={inter.className}
        style={{ backgroundColor: config.backgroundColor || NOVA_COLORS.surface }}
      >
        {config.maintenanceMode ? (
          <MaintenanceScreen config={config} />
        ) : (
          <ConfigProvider config={config}>
            <CurrencyProvider initialCurrencies={currencies}>
              <I18nProvider>
                <QueryProvider>
                  <ThemeProvider>
                    <AuthRehydrator>
                      <CustomStyles />
                      <AnnouncementBar />
                      <EmailVerificationBanner />
                      {children}
                      <ComparatorBar />
                    </AuthRehydrator>
                  </ThemeProvider>
                </QueryProvider>
              </I18nProvider>
            </CurrencyProvider>
          </ConfigProvider>
        )}
      </body>
    </html>
  );
}
