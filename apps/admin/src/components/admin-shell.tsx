'use client';

import { AppShell, Burger, Button, Group, NavLink, Paper, Select, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

import { logout } from '../lib/auth';
import { useStoreConfig } from '../providers/config-provider';
import { useTranslation } from '../providers/i18n-provider';

function useNavItems() {
  const { t } = useTranslation();
  return [
    { href: '/dashboard', label: t('nav.dashboard') },
    { href: '/products', label: t('nav.products') },
    { href: '/categories', label: t('nav.categories') },
    { href: '/inventory', label: t('nav.inventory') },
    { href: '/coupons', label: t('nav.coupons') },
    { href: '/orders', label: t('nav.orders') },
    { href: '/production', label: t('nav.production') },
    { href: '/reviews', label: t('nav.reviews') },
    { href: '/refunds', label: t('nav.refunds') },
    { href: '/users', label: t('nav.users') },
    { href: '/custom-designs', label: t('nav.designs') },
    { href: '/audit-logs', label: t('nav.audit') },
    { href: '/export', label: t('nav.export') },
    { href: '/pages', label: t('nav.pages') },
    { href: '/templates', label: t('nav.templates') },
    { href: '/store-config', label: t('nav.config') },
    { href: '/currencies', label: t('nav.currencies') },
  ];
}

export function AdminShell({ children }: { children: ReactNode }) {
  const config = useStoreConfig();
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const navItems = useNavItems();
  const { locale, setLocale, t } = useTranslation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
      styles={{
        header: {
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E5E5',
        },
        navbar: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E5E5',
        },
        main: {
          backgroundColor: '#FAFAFA',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Title order={3} style={{ letterSpacing: '0.05em', fontWeight: 700 }}>
                Admin {config.name}
              </Title>
            </Link>
          </Group>
          <Select
            value={locale}
            onChange={(value) => value && setLocale(value as 'es' | 'en' | 'pt')}
            data={[
              { value: 'es', label: 'ES' },
              { value: 'en', label: 'EN' },
              { value: 'pt', label: 'PT' },
            ]}
            size="xs"
            aria-label={t('language.select')}
            styles={{
              input: { border: 'none', backgroundColor: 'transparent', minWidth: 60 },
              dropdown: { borderRadius: 0, border: '1px solid #0d0d0d' },
            }}
          />
          <Button variant="subtle" c="dark" onClick={logout}>
            {t('nav.logout')}
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              active={active}
              onClick={() => opened && toggle()}
              styles={{
                root: {
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: active ? '#FFFFFF' : '#0D0D0D',
                  backgroundColor: active ? '#000000' : 'transparent',
                  '&:hover': {
                    backgroundColor: active ? '#000000' : '#F7F7F7',
                  },
                },
                label: {
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '0.02em',
                },
              }}
            />
          );
        })}
      </AppShell.Navbar>

      <AppShell.Main>
        <Paper radius="md" p="xl" withBorder style={{ minHeight: 'calc(100vh - 120px)', backgroundColor: '#FFFFFF' }}>
          {children}
        </Paper>
      </AppShell.Main>
    </AppShell>
  );
}
