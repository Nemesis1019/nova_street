import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import { DEFAULT_CURRENCY_CODE } from '@ecommerce/shared';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';
import { JetBrains_Mono,Plus_Jakarta_Sans } from 'next/font/google';

import { AdminFrame } from '../components/admin-frame';
import { apiClient } from '../lib/api';
import { ConfigProvider, StoreConfig } from '../providers/config-provider';
import { I18nProvider } from '../providers/i18n-provider';
import { PlatformProvider } from '../providers/platform-provider';
import { QueryProvider } from '../providers/query-provider';
import { ThemeProvider } from '../providers/theme-provider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

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
    <html lang="es" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <head>
        <ColorSchemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="font-body-md text-body-md text-on-surface antialiased bg-surface">
        <ConfigProvider config={config}>
          <I18nProvider>
            <QueryProvider>
              <PlatformProvider>
                <ThemeProvider>
                  <AdminFrame>{children}</AdminFrame>
                </ThemeProvider>
              </PlatformProvider>
            </QueryProvider>
          </I18nProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
