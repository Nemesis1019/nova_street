'use client';

import { Grid, GridCol, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

import { useStoreConfig } from '../providers/config-provider';
import { BrandLogo } from './brand-logo';
import { StoreFooter } from './store-footer';

interface AuthShellProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  /** Contenido de la tarjeta (formulario, mensaje, etc.). */
  children: ReactNode;
  /** `false` para embeber en una página que ya tiene header/footer propios. */
  withChrome?: boolean;
}

/**
 * Layout de las pantallas de autenticación (login, registro, recuperación…):
 * imagen de fondo del hero con overlay, título/descripción a la izquierda y
 * tarjeta de contenido a la derecha.
 */
export function AuthShell({ eyebrow, title, description, children, withChrome = true }: AuthShellProps) {
  const config = useStoreConfig();
  const backgroundImage = config.heroImageUrl;

  const content = (
    <Grid gap="xl" maw={1100} w="100%" style={{ position: 'relative', zIndex: 1 }}>
      <GridCol span={{ base: 12, md: 6 }}>
        <Stack gap="xs">
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#e4e2e1',
            }}
          >
            {eyebrow}
          </Text>
          <Title
            order={1}
            style={{
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              fontSize: 'clamp(48px, 8vw, 96px)',
              lineHeight: 0.9,
            }}
          >
            {title}
          </Title>
          <Text size="md" maw={400} style={{ color: '#e4e2e1' }}>
            {description}
          </Text>
        </Stack>
      </GridCol>

      <GridCol span={{ base: 12, md: 6 }}>
        <div
          style={{
            padding: '48px',
            border: '1px solid #0d0d0d',
            backgroundColor: '#f6f3f2',
            color: '#1b1c1c',
          }}
        >
          {children}
        </div>
      </GridCol>
    </Grid>
  );

  const section = (
    <section
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 16px',
        backgroundColor: '#0d0d0d',
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#fcf9f8',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(13,13,13,0.62)' }} />
      {content}
    </section>
  );

  if (!withChrome) {
    return section;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fcf9f8' }}>
      <header style={{ borderBottom: '1px solid #0d0d0d', padding: '16px 64px' }}>
        <BrandLogo />
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>{section}</main>

      <StoreFooter />
    </div>
  );
}
