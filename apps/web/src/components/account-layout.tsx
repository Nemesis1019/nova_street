'use client';

import { Container, Grid, GridCol, Stack, Text } from '@mantine/core';
import { IconLocation, IconPackage, IconShield, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

import { useAuthStore } from '../store/auth-store';
import { StoreFooter } from './store-footer';
import { StoreHeader } from './store-header';

const menuItems = [
  { href: '/account', label: 'Perfil', icon: IconUser },
  { href: '/account/addresses', label: 'Direcciones', icon: IconLocation },
  { href: '/orders', label: 'Pedidos', icon: IconPackage },
  { href: '/account/security', label: 'Seguridad', icon: IconShield },
];

export function AccountLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="xl" px={0}>
          <Grid gap="xl" align="flex-start">
            <GridCol span={{ base: 12, md: 3 }}>
              <Stack gap="xs">
                <Text
                  size="xs"
                  mb="md"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Cuenta
                </Text>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '16px',
                        border: '1px solid #0d0d0d',
                        backgroundColor: active ? '#0d0d0d' : 'transparent',
                        color: active ? '#fcf9f8' : '#0d0d0d',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                        fontSize: '18px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </Stack>
            </GridCol>
            <GridCol span={{ base: 12, md: 9 }}>{children}</GridCol>
          </Grid>
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
