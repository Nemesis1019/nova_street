'use client';

import '@mantine/notifications/styles.css';

import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ReactNode, useEffect, useMemo, useState } from 'react';

import { useStoreConfig } from './config-provider';

export type AppearanceMode = 'LIGHT' | 'DARK' | 'SYSTEM';

function solidScale(color: string): [string, string, string, string, string, string, string, string, string, string] {
  return Array(10).fill(color) as [string, string, string, string, string, string, string, string, string, string];
}

// Design system NÖVA / Urban Autonomy
export const NOVA_COLORS = {
  surface: '#fcf9f8',
  surfaceDim: '#dcd9d9',
  surfaceBright: '#fcf9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: '#f0eded',
  surfaceContainerHigh: '#eae7e7',
  surfaceContainerHighest: '#e4e2e1',
  onSurface: '#1b1c1c',
  onSurfaceVariant: '#444748',
  inverseSurface: '#303030',
  inverseOnSurface: '#f3f0ef',
  outline: '#747878',
  outlineVariant: '#c4c7c7',
  surfaceTint: '#5f5e5e',
  primary: '#0d0d0d',
  onPrimary: '#ffffff',
  primaryContainer: '#1c1b1b',
  onPrimaryContainer: '#858383',
  inversePrimary: '#c9c6c5',
  secondary: '#5f5f58',
  onSecondary: '#ffffff',
  secondaryContainer: '#e2e0d7',
  onSecondaryContainer: '#64635c',
  tertiary: '#000000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#161e00',
  onTertiaryContainer: '#7d895b',
  olive: '#6f7a4e',
  oliveLight: '#c0cc99',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
};

function resolveColorScheme(mode: AppearanceMode | string | undefined, systemDark: boolean): 'light' | 'dark' {
  if (mode === 'DARK') return 'dark';
  if (mode === 'LIGHT') return 'light';
  return systemDark ? 'dark' : 'light';
}

function useSystemDark() {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return systemDark;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const config = useStoreConfig();
  const systemDark = useSystemDark();
  const mode = resolveColorScheme(config.appearanceMode ?? 'LIGHT', systemDark);
  const isDark = mode === 'dark';

  const primary = config.primaryColor || NOVA_COLORS.primary;
  const secondary = config.secondaryColor || NOVA_COLORS.secondary;
  const background = isDark
    ? config.darkBackgroundColor || NOVA_COLORS.primary
    : config.backgroundColor || NOVA_COLORS.surface;
  const text = isDark
    ? config.darkTextColor || NOVA_COLORS.surfaceBright
    : config.textColor || NOVA_COLORS.onSurface;
  const surface = isDark ? config.darkBackgroundColor || '#1a1a1a' : config.surfaceColor || NOVA_COLORS.surfaceContainerLowest;
  const surfaceMuted = isDark ? '#2a2a2a' : config.surfaceMutedColor || NOVA_COLORS.surfaceContainerLow;
  const border = isDark ? '#3a3a3a' : config.borderColor || NOVA_COLORS.primary;
  const error = config.errorColor || NOVA_COLORS.error;
  const success = config.successColor || '#2f9e44';
  const warning = config.warningColor || '#f76707';

  const cssVariables = useMemo(
    () => ({
      '--color-primary': primary,
      '--color-secondary': secondary,
      '--color-background': background,
      '--color-text': text,
      '--color-surface': surface,
      '--color-surface-muted': surfaceMuted,
      '--color-border': border,
      '--color-error': error,
      '--color-success': success,
      '--color-warning': warning,
    }),
    [background, border, error, primary, secondary, success, surface, surfaceMuted, text, warning],
  );

  const theme: MantineThemeOverride = useMemo(
    () => ({
      primaryColor: 'primary',
      defaultRadius: 0,
      focusRing: 'always',
      fontFamily: 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      headings: {
        fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
        fontWeight: '400',
        sizes: {
          h1: { fontSize: '64px', lineHeight: '60px' },
          h2: { fontSize: '48px', lineHeight: '44px' },
          h3: { fontSize: '32px', lineHeight: '32px' },
          h4: { fontSize: '24px', lineHeight: '28px' },
          h5: { fontSize: '18px', lineHeight: '24px' },
          h6: { fontSize: '14px', lineHeight: '20px' },
        },
      },
      colors: {
        primary: solidScale(primary),
        secondary: solidScale(secondary),
        olive: solidScale(NOVA_COLORS.olive),
        dark: solidScale(NOVA_COLORS.primary),
      },
      black: NOVA_COLORS.primary,
      white: NOVA_COLORS.surface,
      components: {
        Button: {
          defaultProps: {
            radius: 0,
            size: 'md',
          },
          styles: {
            root: {
              textTransform: 'uppercase',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              letterSpacing: '0.05em',
              fontSize: '18px',
              padding: '16px 24px',
              height: 'auto',
            },
          },
        },
        Card: {
          defaultProps: {
            radius: 0,
          },
          styles: {
            root: {
              border: '1px solid var(--color-border)',
              boxShadow: 'none',
              backgroundColor: 'var(--color-surface)',
            },
          },
        },
        TextInput: {
          styles: {
            input: {
              border: 'none',
              borderBottom: '2px solid var(--color-border)',
              borderRadius: 0,
              backgroundColor: 'transparent',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              color: 'var(--color-text)',
            },
            label: {
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              fontSize: '12px',
              letterSpacing: '0.05em',
              color: 'var(--color-text)',
            },
          },
        },
        PasswordInput: {
          styles: {
            input: {
              border: 'none',
              borderBottom: '2px solid var(--color-border)',
              borderRadius: 0,
              backgroundColor: 'transparent',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              color: 'var(--color-text)',
            },
            label: {
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              fontSize: '12px',
              letterSpacing: '0.05em',
              color: 'var(--color-text)',
            },
          },
        },
        NumberInput: {
          styles: {
            input: {
              border: '1px solid var(--color-border)',
              borderRadius: 0,
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
            },
          },
        },
        Select: {
          styles: {
            input: {
              border: '1px solid var(--color-border)',
              borderRadius: 0,
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
            },
            label: {
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              fontSize: '12px',
              color: 'var(--color-text)',
            },
          },
        },
        Radio: {
          styles: {
            radio: {
              borderRadius: 0,
              borderColor: 'var(--color-border)',
            },
          },
        },
        Badge: {
          styles: {
            root: {
              borderRadius: 0,
              textTransform: 'uppercase',
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              fontSize: '10px',
              letterSpacing: '0.05em',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text)',
            },
          },
        },
        Table: {
          styles: {
            table: {
              borderCollapse: 'collapse',
            },
            thead: {
              borderBottom: '2px solid var(--color-border)',
            },
            th: {
              textTransform: 'uppercase',
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              fontSize: '12px',
              letterSpacing: '0.05em',
              color: 'var(--color-text)',
            },
            tr: {
              borderBottom: '1px solid color-mix(in srgb, var(--color-border) 10%, transparent)',
            },
            td: {
              color: 'var(--color-text)',
            },
          },
        },
        Slider: {
          styles: {
            track: {
              backgroundColor: 'var(--color-border)',
              height: '2px',
            },
            bar: {
              backgroundColor: 'var(--color-primary)',
            },
            thumb: {
              backgroundColor: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              borderRadius: 0,
            },
          },
        },
        Switch: {
          styles: {
            track: {
              borderRadius: 0,
              border: '1px solid var(--color-border)',
            },
            thumb: {
              borderRadius: 0,
            },
          },
        },
        Checkbox: {
          styles: {
            input: {
              borderRadius: 0,
              borderColor: 'var(--color-border)',
            },
          },
        },
        Modal: {
          defaultProps: {
            radius: 0,
          },
          styles: {
            content: {
              borderRadius: 0,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            },
            header: {
              borderBottom: '1px solid var(--color-border)',
            },
            title: {
              color: 'var(--color-text)',
            },
          },
        },
        Drawer: {
          defaultProps: {
            radius: 0,
          },
          styles: {
            content: {
              borderRight: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            },
            header: {
              borderBottom: '1px solid var(--color-border)',
            },
          },
        },
        Stepper: {
          styles: {
            step: {
              '&[data-progress]': {
                color: 'var(--color-primary)',
              },
            },
            stepIcon: {
              borderRadius: 0,
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            },
            separator: {
              backgroundColor: 'var(--color-border)',
            },
          },
        },
        Pagination: {
          styles: {
            control: {
              borderRadius: 0,
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            },
          },
        },
        FileInput: {
          styles: {
            input: {
              borderRadius: 0,
              borderColor: 'var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
            },
          },
        },
        ColorSwatch: {
          styles: {
            colorSwatch: {
              borderRadius: 0,
            },
          },
        },
        Anchor: {
          defaultProps: {
            c: 'var(--color-text)',
            underline: 'always',
          },
        },
      },
    }),
    [primary, secondary],
  );

  return (
    <MantineProvider theme={theme} forceColorScheme={mode}>
      <Notifications position="top-right" zIndex={1000} />
      <div
        data-theme={mode}
        style={{
          ...cssVariables,
          backgroundColor: background,
          color: text,
          minHeight: '100vh',
        }}
      >
        {children}
      </div>
    </MantineProvider>
  );
}
