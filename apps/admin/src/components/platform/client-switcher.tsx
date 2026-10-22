'use client';

import { Menu } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { platformRequest } from '../../lib/platform-auth';
import { getAdminTenantSlug, isPlatformMode } from '../../lib/tenant';
import { useTranslation } from '../../providers/i18n-provider';
import { usePlatformSession } from '../../providers/platform-provider';
import { AppModal } from '../ui/app-modal';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';

interface TenantOption {
  id: string;
  slug: string;
  name: string;
  status: string;
  isDefault: boolean;
}

/**
 * Selector transversal de cliente. El superadmin conserva su identidad y su
 * token de plataforma; solo cambia el `X-Tenant` y se recarga la app para que
 * todas las pantallas usen la BD del cliente elegido.
 */
export function ClientSwitcher({
  enabled,
  alwaysVisible = false,
}: {
  enabled: boolean;
  alwaysVisible?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, switchTenant } = usePlatformSession();
  const [currentSlug, setCurrentSlug] = useState<string | undefined>();
  const [platformMode, setPlatformModeState] = useState(false);
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [errorOpen, setErrorOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setCurrentSlug(getAdminTenantSlug());
    setPlatformModeState(isPlatformMode());
  }, []);

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    enabled,
    queryFn: () => platformRequest<TenantOption[]>('/platform/tenants'),
    staleTime: 30_000,
  });

  if (!enabled) return null;

  const tenants = tenantsQuery.data ?? [];
  const current = tenants.find((tenant) => tenant.slug === currentSlug);

  const handleSelect = async (tenant: TenantOption) => {
    if (!platformMode && tenant.slug === currentSlug) return;

    setSwitchingSlug(tenant.slug);
    setSwitchError(null);
    try {
      await switchTenant(tenant);
    } catch (error) {
      setSwitchError(
        error instanceof Error ? error.message : t('header.switchTenantError'),
      );
      setErrorOpen(true);
    } finally {
      setSwitchingSlug(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    window.location.href = '/';
  };

  return (
    <>
      <Menu position="bottom-end" width={280} withinPortal>
        <Menu.Target>
          <button
            type="button"
            title={t('header.currentClient')}
            className={`${
              alwaysVisible ? 'flex' : 'hidden sm:flex'
            } items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2.5 py-1 text-left transition-colors hover:bg-surface-container-low`}
          >
            <Icon name="storefront" className="text-[17px] text-on-surface-variant" />
            <span className="flex max-w-[150px] flex-col leading-tight">
              <span className="truncate font-label-sm text-label-sm text-on-surface">
                {platformMode
                  ? t('header.platformProfile')
                  : (current?.name ?? currentSlug ?? t('header.currentClient'))}
              </span>
              <span className="truncate font-label-sm text-[10px] text-on-surface-variant">
                {platformMode
                  ? t('header.switchTenantTitle')
                  : (current?.slug ?? '')}
              </span>
            </span>
            <Icon name="expand_more" className="text-[16px] text-on-surface-variant" />
          </button>
        </Menu.Target>
        <Menu.Dropdown>
          <div className="px-3 py-2 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
            {t('header.switchTenantTitle')}
          </div>
          {tenants.map((tenant) => (
            <Menu.Item
              key={tenant.id}
              onClick={() => void handleSelect(tenant)}
              disabled={Boolean(switchingSlug)}
              leftSection={
                !platformMode && tenant.slug === currentSlug ? (
                  <Icon name="check" className="text-[16px]" />
                ) : (
                  <span className="inline-block w-[16px]" />
                )
              }
            >
              <span className="font-label-md text-label-md">{tenant.name}</span>
              <span className="ml-2 font-label-sm text-label-sm text-on-surface-variant">
                {tenant.slug}
              </span>
              {switchingSlug === tenant.slug ? (
                <span className="ml-2 font-label-sm text-label-sm text-on-surface-variant">
                  {t('header.switchingTenant')}
                </span>
              ) : null}
            </Menu.Item>
          ))}
          <Menu.Divider />
          <Menu.Item
            onClick={() => setProfileOpen(true)}
            leftSection={<Icon name="shield_person" className="text-[16px]" />}
          >
            <span className="font-label-md text-label-md">{t('header.platformProfile')}</span>
          </Menu.Item>
          <Menu.Item
            onClick={() => router.push('/clients')}
            leftSection={<Icon name="dns" className="text-[16px]" />}
          >
            <span className="font-label-md text-label-md">{t('header.platformClients')}</span>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <AppModal
        opened={profileOpen}
        onClose={() => setProfileOpen(false)}
        title={t('header.platformProfile')}
        subtitle={t('header.platformProfileSubtitle')}
        size="sm"
        footer={
          <Button variant="ghost" onClick={() => setProfileOpen(false)}>
            {t('common.close')}
          </Button>
        }
      >
        {user ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-surface-container-low px-4 py-3">
              <div className="font-label-md text-label-md text-on-surface">{user.name}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">{user.email}</div>
              <div className="mt-1 inline-flex rounded bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed">
                {user.role}
              </div>
            </div>
            <div className="flex items-center justify-between font-body-sm text-body-sm">
              <span className="text-on-surface-variant">{t('header.platformProfile2fa')}</span>
              <span className="text-on-surface">{user.twoFactorEnabled ? 'On' : 'Off'}</span>
            </div>
            <div className="flex items-center justify-between font-body-sm text-body-sm">
              <span className="text-on-surface-variant">{t('header.currentClient')}</span>
              <span className="text-on-surface">
                {platformMode ? t('header.platformProfile') : (current?.name ?? currentSlug)}
              </span>
            </div>
            <Button variant="danger" icon="logout" onClick={() => void handleLogout()}>
              {t('header.platformLogout')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('header.platformProfileNoSession')}
            </p>
            <Button
              icon="shield"
              onClick={() => {
                setProfileOpen(false);
                router.push('/platform-login');
              }}
            >
              {t('header.platformLogin')}
            </Button>
          </div>
        )}
      </AppModal>

      <AppModal
        opened={errorOpen}
        onClose={() => setErrorOpen(false)}
        title={t('header.switchTenantError')}
        size="sm"
        footer={<Button onClick={() => setErrorOpen(false)}>{t('common.close')}</Button>}
      >
        <p className="font-body-sm text-body-sm text-on-surface-variant">{switchError}</p>
      </AppModal>
    </>
  );
}
