import '@mantine/core/styles.css';

import { DEFAULT_CURRENCY_CODE } from '@ecommerce/shared';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';

import { apiClient } from '../lib/api';
import { ConfigProvider, StoreConfig } from '../providers/config-provider';
import { I18nProvider } from '../providers/i18n-provider';
import { QueryProvider } from '../providers/query-provider';
import { ThemeProvider } from '../providers/theme-provider';

const defaultConfig: StoreConfig = {
  id: 'default',
  name: 'NÖVA',
  primaryColor: '#000000',
  secondaryColor: '#5d5f5f',
  backgroundColor: '#f9f9f9',
  textColor: '#1a1c1c',
  currencyCode: DEFAULT_CURRENCY_CODE,
};

async function fetchStoreConfig(): Promise<StoreConfig> {
  try {
    const { data } = await apiClient.GET('/store-config');
    if (data) {
      return { ...defaultConfig, ...(data as unknown as Partial<StoreConfig>) };
    }
  } catch {
    // Fallback to default config when the API is unavailable (e.g. during static build).
  }
  return defaultConfig;
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchStoreConfig();
  return {
    title: `Admin - ${config.name}`,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await fetchStoreConfig();

  return (
    <html lang="es">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <ConfigProvider config={config}>
          <I18nProvider>
            <QueryProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </QueryProvider>
          </I18nProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
