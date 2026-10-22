'use client';

import { Menu } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useCallback, useEffect, useState } from 'react';

import packageJson from '../../package.json';
import { ADMIN_NAV, SidebarBadge } from '../lib/admin-nav';
import { apiClient, getAuthToken, setAuthToken } from '../lib/api';
import { clearTokens, CurrentUser, getCurrentUser } from '../lib/auth';
import { platformRequest } from '../lib/platform-auth';
import { getAdminTenantSlug, setAdminTenantSlug, setPlatformMode } from '../lib/tenant';
import { useStoreConfig } from '../providers/config-provider';
import { useTranslation } from '../providers/i18n-provider';
import { usePlatformSession } from '../providers/platform-provider';
import { CommandPalette } from './command-palette';
import { NotificationsBell } from './notifications-bell';
import { ClientSwitcher } from './platform/client-switcher';
import { Icon } from './ui/icon';
import { DRAWER_SPRING, LAYOUT_SPRING } from './ui/motion';

const COLLAPSED_KEY = 'nova-admin-sidebar-collapsed';

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
] as const;

function getStoreUrl() {
  const raw = process.env.NEXT_PUBLIC_WEB_URL;
  if (!raw) return 'http://localhost:3000';
  const cleaned = raw.replace(/^\[|\]$/g, '').split(',')[0].trim();
  return cleaned || 'http://localhost:3000';
}

const BADGE_STYLES: Record<SidebarBadge, string> = {
  orders: 'bg-secondary-container text-on-secondary-container',
  production: 'bg-surface-container text-on-surface',
  reviews: 'bg-secondary-fixed text-on-secondary-fixed',
  designs: 'bg-surface-container-high text-on-surface-variant',
};

function useSidebarCounts() {
  const { data: metrics } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/dashboard/metrics');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: productionCount = 0 } = useQuery({
    queryKey: ['sidebar-count-production'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/production', { params: { query: { limit: '1' } } });
      if (error) throw error;
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: reviewsCount = 0 } = useQuery({
    queryKey: ['sidebar-count-reviews'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/reviews', {
        params: { query: { limit: '1', isApproved: 'false' } },
      });
      if (error) throw error;
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: designsCount = 0 } = useQuery({
    queryKey: ['sidebar-count-designs'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/custom-designs/admin/all', {
        params: { query: { limit: '1', status: 'PENDING_REVIEW' } },
      });
      if (error) throw error;
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  return {
    orders: metrics?.pendingOrders ?? 0,
    production: productionCount,
    reviews: reviewsCount,
    designs: designsCount,
  } satisfies Record<SidebarBadge, number>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const config = useStoreConfig();
  const { locale, setLocale, t } = useTranslation();
  const pathname = usePathname();
  const counts = useSidebarCounts();
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === 'undefined' ? false : window.localStorage.getItem(COLLAPSED_KEY) === '1',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser>({ name: 'Admin Tienda', email: 'admin@nova.co', role: 'ADMIN' });
  const defaultTenantSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'nova';
  const [tenantSlug, setTenantSlug] = useState(defaultTenantSlug);
  const impersonating = tenantSlug !== defaultTenantSlug;
  const { user: platformUser } = usePlatformSession();
  const canSwitchTenant = Boolean(platformUser);
  const tenantsPreview = useQuery({
    queryKey: ['platform', 'tenants'],
    enabled: canSwitchTenant,
    queryFn: () =>
      platformRequest<Array<{ slug: string; storefrontUrl: string | null }>>('/platform/tenants'),
    staleTime: 30_000,
  });
  const currentPreview = tenantsPreview.data?.find((tenant) => tenant.slug === tenantSlug);
  // Vista previa del cliente seleccionado (nunca la tienda por defecto si estás
  // administrando otro cliente).
  const storeUrl = currentPreview?.storefrontUrl ?? config.storefrontUrl ?? getStoreUrl();
  // El shell solo se renderiza en el cliente: matchMedia da el valor correcto desde el primer render.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    setTenantSlug(getAdminTenantSlug() ?? defaultTenantSlug);
  }, [defaultTenantSlug, pathname]);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  useHotkeys([
    ['mod+B', toggleCollapsed],
    ['ctrl+B', toggleCollapsed],
  ]);

  const translate = (key: string | undefined, fallback: string) => {
    if (!key) return fallback;
    const value = t(key);
    return value === key ? fallback : value;
  };

  /**
   * Cierra la sesión del cliente actual y:
   * - con PlatformUser → queda en el panel transversal (sin usuario de tenant);
   * - sin PlatformUser (legacy) → va al login (no vuelve al usuario de nova).
   */
  const backToPlatform = async () => {
    // Superadmin de plataforma: su token es la sesión transversal. Solo cambia
    // al panel y conserva la identidad; no se revoca ni se impersona a nadie.
    if (platformUser) {
      setPlatformMode(true);
      setAdminTenantSlug(defaultTenantSlug);
      window.location.href = '/clients';
      return;
    }

    // Admin local/legacy: se revoca la sesión del tenant y se va al login.
    const token = getAuthToken();
    try {
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Client': 'admin',
            'X-Tenant': tenantSlug,
          },
        });
      }
    } catch {
      // Best effort: aunque falle la revocación, se limpia la sesión local.
    }

    setAuthToken(undefined);
    clearTokens();
    setAdminTenantSlug(defaultTenantSlug);
    setPlatformMode(true);
    window.location.href = '/';
  };

  // "Salir" cierra el cliente y deja el perfil de plataforma (o el login).
  const handleLogout = () => {
    void backToPlatform();
  };

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-primary/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-outline-variant/60 bg-surface-container-lowest/80 shadow-card backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen((previous) => !previous)}
              title={mobileOpen ? translate('header.closeMenu', 'Cerrar menú') : translate('header.openMenu', 'Abrir menú')}
              className="flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface lg:hidden"
            >
              <Icon name={mobileOpen ? 'close' : 'menu'} className="text-[22px]" />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/dashboard"
                className="truncate font-headline-sm text-headline-sm uppercase tracking-wider text-primary"
              >
                Admin {config.name}
              </Link>
              <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-primary sm:inline-block" />
              <span className="hidden shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant sm:inline-block">
                v{packageJson.version}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleCollapsed}
              title={
                collapsed
                  ? translate('header.expandMenu', 'Expandir menú (Ctrl+B)')
                  : translate('header.collapseMenu', 'Colapsar menú (Ctrl+B)')
              }
              className="hidden items-center justify-center rounded-lg bg-primary p-1.5 text-on-primary transition-colors hover:bg-primary/90 lg:flex"
            >
              <Icon name={collapsed ? 'menu_open' : 'vertical_split'} className="text-[19px]" />
            </button>

            <CommandPalette />
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <ClientSwitcher enabled={canSwitchTenant} />

            <div className="hidden items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2.5 py-1 xl:flex">
              <Icon name="storefront" className="text-[18px] text-on-surface-variant" />
              <span className="font-label-sm text-label-sm text-on-surface">
                {config.name} ({config.currencyCode})
              </span>
            </div>

            <Menu position="bottom-end" shadow="md" width={170} withinPortal>
              <Menu.Target>
                <button
                  type="button"
                  aria-label={translate('header.changeLanguage', 'Cambiar idioma')}
                  className="hidden items-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2.5 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-low sm:flex"
                >
                  <span>{locale.toUpperCase()}</span>
                  <Icon name="expand_more" className="text-[16px] text-on-surface-variant" />
                </button>
              </Menu.Target>
              <Menu.Dropdown>
                {LANGUAGES.map((language) => (
                  <Menu.Item
                    key={language.value}
                    onClick={() => setLocale(language.value)}
                    leftSection={
                      locale === language.value ? (
                        <Icon name="check" className="text-[16px]" />
                      ) : (
                        <span className="inline-block w-[16px]" />
                      )
                    }
                  >
                    <span className="font-label-sm text-label-sm">{language.label}</span>
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>

            <Link
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-outline-variant/50 px-3 py-1.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low md:flex"
            >
              <Icon name="open_in_new" className="text-[16px]" />
              <span>{translate('header.preview', 'Vista Previa')}</span>
            </Link>

            <NotificationsBell />

            <div className="hidden h-6 w-px bg-outline-variant/40 lg:block" />

            <Menu position="bottom-end" shadow="md" width={230} withinPortal>
              <Menu.Target>
                <button
                  type="button"
                  aria-label={translate('header.account', 'Cuenta')}
                  className="hidden items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-surface-container-low lg:flex"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Icon
                      name={platformUser ? 'shield_person' : 'person'}
                      className="text-[18px] text-on-primary"
                    />
                  </span>
                  <span className="max-w-[160px] truncate font-label-md text-label-md text-on-surface">
                    {platformUser ? platformUser.name : user.name}
                  </span>
                  <Icon name="expand_more" className="text-[16px] text-on-surface-variant" />
                </button>
              </Menu.Target>
              <Menu.Dropdown>
                {platformUser ? (
                  <div className="border-b border-outline-variant/30 px-3 py-2">
                    <div className="flex items-center gap-1.5 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      <Icon name="shield_person" className="text-[14px]" />
                      {translate('header.platformProfile', 'Perfil de plataforma')}
                    </div>
                    <div className="max-w-[190px] truncate font-label-md text-label-md text-on-surface">
                      {platformUser.email}
                    </div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">
                      {platformUser.role}
                    </div>
                  </div>
                ) : null}
                <div className="px-3 py-2">
                  <div className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                    {translate('header.currentClient', 'Cliente actual')}
                  </div>
                  {platformUser ? (
                    <>
                      <div className="font-label-md text-label-md text-on-surface">{config.name}</div>
                      <div className="max-w-[190px] truncate font-label-sm text-label-sm text-on-surface-variant">
                        {tenantSlug}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-label-md text-label-md text-on-surface">{user.name}</div>
                      <div className="max-w-[190px] truncate font-label-sm text-label-sm text-on-surface-variant">
                        {user.email}
                      </div>
                    </>
                  )}
                </div>
                {platformUser ? (
                  <Menu.Item
                    component="a"
                    href="/clients"
                    leftSection={<Icon name="dns" className="text-[18px]" />}
                  >
                    <span className="font-label-md text-label-md">
                      {translate('header.platformClients', 'Clientes')}
                    </span>
                  </Menu.Item>
                ) : null}
                <Menu.Divider />
                <Menu.Item onClick={handleLogout} leftSection={<Icon name="logout" className="text-[18px]" />}>
                  <span className="font-label-md text-label-md">{translate('nav.logout', 'Salir')}</span>
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>
      </header>

      <motion.aside
        animate={{ x: isDesktop || mobileOpen ? 0 : '-100%' }}
        transition={DRAWER_SPRING}
        className={`fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-72 flex-col justify-between overflow-hidden bg-surface-container-lowest shadow-card transition-[width] duration-200 ${
          collapsed ? 'lg:w-16' : 'lg:w-72'
        }`}
      >
        <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          {ADMIN_NAV.filter(
            (group) =>
              group.titleKey !== 'sidebar.groups.platform' ||
              Boolean(platformUser) ||
              (user.role === 'SUPER_ADMIN' && !impersonating),
          ).map((group) => (
            <div key={group.title} className="flex flex-col gap-1">
              <div
                className={`px-3 pb-1 font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/70 ${
                  collapsed ? 'lg:hidden' : ''
                }`}
              >
                {translate(group.titleKey, group.title)}
              </div>
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badgeValue = item.badge ? counts[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={translate(item.labelKey, item.label)}
                    className={`relative flex items-center rounded-lg px-3 py-2 font-body-sm text-body-sm transition-colors ${
                      active
                        ? 'font-label-md text-on-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    } ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-between'}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="admin-sidebar-active"
                        transition={LAYOUT_SPRING}
                        className="absolute inset-0 rounded-lg bg-primary"
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-3 ${collapsed ? 'lg:gap-0' : ''}`}>
                      <Icon name={item.icon} className="text-[20px] shrink-0" />
                      <span className={collapsed ? 'lg:hidden' : ''}>{translate(item.labelKey, item.label)}</span>
                    </span>
                    {item.badge && badgeValue > 0 && !collapsed && (
                      <span
                        className={`relative z-10 rounded-full px-1.5 py-0.5 font-numeric-tabular text-label-sm ${BADGE_STYLES[item.badge]}`}
                      >
                        {badgeValue}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-outline-variant/50 bg-surface-container-lowest shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <div className="p-3">
            {/* Usuario (solo mobile: en desktop vive en el header) */}
            <div className="mb-2 flex items-center gap-3 px-3 lg:hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                <Icon
                  name={platformUser ? 'shield_person' : 'person'}
                  className="text-[18px] text-on-primary"
                />
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-label-md text-label-md font-medium text-on-surface">
                  {platformUser ? platformUser.name : user.name}
                </span>
                {platformUser ? (
                  <span className="truncate font-label-sm text-[10px] text-on-surface-variant">
                    {platformUser.email}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={translate('nav.logout', 'Salir')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-error-container/20 hover:text-error ${
                collapsed ? 'lg:justify-center lg:px-2' : 'w-full'
              }`}
            >
              <Icon name="logout" className="text-[20px]" />
              <span className={collapsed ? 'lg:hidden' : ''}>{translate('nav.logout', 'Salir')}</span>
            </button>
          </div>
        </div>
      </motion.aside>

      <div className={`flex min-h-screen flex-col transition-all duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-72'}`}>
        <main className="min-h-screen w-full bg-surface pt-16">
          {impersonating ? (
            <div className="border-b border-outline-variant/40 bg-secondary-container">
              <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-8">
                <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-secondary-container">
                  <Icon name="admin_panel_settings" className="text-[18px]" />
                  <span>
                    {translate('header.managingTenant', 'Administrando')} <strong>{tenantSlug}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={backToPlatform}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="arrow_back" className="text-[16px]" />
                  {translate('header.backToPlatform', 'Volver a plataforma')}
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex w-full flex-col px-4 py-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </>
  );
}
