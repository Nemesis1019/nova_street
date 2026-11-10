import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import { DEFAULT_CURRENCY_CODE } from '@ecommerce/shared';
import { ColorSchemeScript } from '@mantine/core';
import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono,Plus_Jakarta_Sans } from 'next/font/google';

import { AdminFrame } from '../components/admin-frame';
import { PwaRegister } from '../components/pwa-register';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d0d0d',
};

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchStoreConfig();
  return {
    title: `Admin - ${config.name}`,
    applicationName: 'NÖVA Admin',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: 'NÖVA Admin',
      statusBarStyle: 'default',
    },
    icons: {
      icon: [
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    },
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
        <PwaRegister />
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
