'use client';

import '@mantine/notifications/styles.css';

import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ReactNode } from 'react';

import { useStoreConfig } from './config-provider';

function solidScale(color: string): [string, string, string, string, string, string, string, string, string, string] {
  return Array(10).fill(color) as [string, string, string, string, string, string, string, string, string, string];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const config = useStoreConfig();

  const theme: MantineThemeOverride = {
    primaryColor: 'dark',
    primaryShade: 9,
    defaultRadius: 'md',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    headings: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      sizes: {
        h1: { fontSize: '32px', lineHeight: '40px', fontWeight: '700' },
        h2: { fontSize: '24px', lineHeight: '32px', fontWeight: '700' },
        h3: { fontSize: '18px', lineHeight: '24px', fontWeight: '700' },
        h4: { fontSize: '16px', lineHeight: '24px', fontWeight: '700' },
      },
    },
    fontSizes: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '18px',
    },
    colors: {
      dark: [
        '#f9f9f9',
        '#f4f3f3',
        '#eeeeee',
        '#e8e8e8',
        '#e2e2e2',
        '#c4c7c7',
        '#747878',
        '#444748',
        '#1a1c1c',
        '#000000',
      ],
      primary: solidScale('#000000'),
      secondary: solidScale('#5d5f5f'),
      surface: [
        '#ffffff',
        '#f9f9f9',
        '#f4f3f3',
        '#eeeeee',
        '#e8e8e8',
        '#e2e2e2',
        '#c4c7c7',
        '#747878',
        '#444748',
        '#1a1c1c',
      ],
    },
    black: '#0D0D0D',
    white: '#FFFFFF',
    components: {
      Button: {
        defaultProps: {
          radius: 'md',
        },
        styles: {
          root: {
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
          },
        },
      },
      Table: {
        styles: {
          thead: {
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontSize: '11px',
            fontWeight: 700,
          },
        },
      },
      Badge: {
        defaultProps: {
          radius: 'sm',
          variant: 'outline',
        },
      },
      Paper: {
        defaultProps: {
          radius: 'md',
          withBorder: true,
        },
      },
      Input: {
        defaultProps: {
          radius: 'md',
        },
        styles: {
          input: {
            borderColor: '#E5E5E5',
            ':focus': {
              borderColor: '#000000',
            },
          },
        },
      },
      Switch: {
        defaultProps: {
          color: 'dark',
        },
      },
      Modal: {
        defaultProps: {
          radius: 'md',
        },
      },
    },
  };

  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={1000} />
      <div
        style={{
          backgroundColor: config.backgroundColor ?? '#f9f9f9',
          color: config.textColor ?? '#1a1c1c',
          minHeight: '100vh',
        }}
      >
        {children}
      </div>
    </MantineProvider>
  );
}
