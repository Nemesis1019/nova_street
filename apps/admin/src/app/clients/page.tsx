'use client';

import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { StatusPill, type StatusTone } from '../../components/ui/status-pill';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { platformRequest } from '../../lib/platform-auth';
import { setAdminTenantSlug, setPlatformMode } from '../../lib/tenant';
import { useTranslation } from '../../providers/i18n-provider';
import { usePlatformSession } from '../../providers/platform-provider';

interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  status: 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED';
  isDefault: boolean;
  provisioningError: string | null;
  domains: string[];
  storefrontUrl: string | null;
  createdAt: string;
  hasCustomStorage: boolean;
}

interface TenantMigrationRun {
  id: string;
  name: string;
  status: string;
  durationMs: number | null;
  createdAt: string;
  error: string | null;
}

interface TenantHealth {
  ok: boolean;
  products?: number;
  orders?: number;
  users?: number;
  lastMigration?: string | null;
  error?: string;
  migrations?: TenantMigrationRun[];
}

const STATUS_TONE: Record<TenantSummary['status'], StatusTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  PROVISIONING: 'warning',
};

const EMPTY_FORM = {
  name: '',
  slug: '',
  domain: '',
  adminEmail: '',
  adminPassword: '',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ClientsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [healthOpened, { open: openHealth, close: closeHealth }] = useDisclosure(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [health, setHealth] = useState<{ slug: string; data: TenantHealth } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    user: platformUser,
    login: platformLogin,
    verifyTwoFactor: verifyPlatformTwoFactor,
    logout: platformLogout,
  } = usePlatformSession();
  const [platformLoginOpened, { open: openPlatformLogin, close: closePlatformLogin }] =
    useDisclosure(false);
  const [platformForm, setPlatformForm] = useState({ email: '', password: '', code: '' });
  const [platformChallenge, setPlatformChallenge] = useState<string | null>(null);
  const [platformLoginError, setPlatformLoginError] = useState<string | null>(null);
  const [platformLoginPending, setPlatformLoginPending] = useState(false);
  const [pendingClient, setPendingClient] = useState<TenantSummary | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: async () => {
      return await platformRequest<TenantSummary[]>('/platform/tenants');
    },
    refetchInterval: (query) => {
      const rows = query.state.data as TenantSummary[] | undefined;
      return rows?.some((tenant) => tenant.status === 'PROVISIONING') ? 4000 : false;
    },
  });

  const tenants = tenantsQuery.data ?? [];

  const createTenant = useMutation({
    mutationFn: async () => {
      await platformRequest('/platform/tenants', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          ...(form.domain.trim() ? { domain: form.domain.trim().toLowerCase() } : {}),
          adminEmail: form.adminEmail.trim(),
          adminPassword: form.adminPassword,
        },
      });
    },
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setFormError(null);
      closeCreate();
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (error) => setFormError(error.message),
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) => {
      await platformRequest(`/platform/tenants/${id}`, {
        method: 'PATCH',
        body: { status },
      });
    },
    onSettled: () => {
      setPendingId(null);
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
  });

  const checkHealth = useMutation({
    mutationFn: async (tenant: TenantSummary) => {
      const data = await platformRequest<TenantHealth>(
        `/platform/tenants/${tenant.id}/health`,
      );
      return { slug: tenant.slug, data };
    },
    onSuccess: (result) => {
      setHealth(result);
      openHealth();
    },
  });

  /** Cambia el cliente activo conservando el token/perfil de plataforma. */
  const performSwitch = async (tenant: TenantSummary) => {
    setSwitchingId(tenant.id);
    setActionError(null);
    try {
      await platformRequest(`/platform/tenants/${tenant.id}/select`, { method: 'POST' });
      setAdminTenantSlug(tenant.slug);
      setPlatformMode(false);
      window.location.href = '/dashboard';
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t('pages.clients.error'),
      );
    } finally {
      setSwitchingId(null);
    }
  };

  const switchToClient = (tenant: TenantSummary) => {
    // Sin PlatformUser primero se pide el login de plataforma (mismas
    // credenciales del superadmin) y luego se continúa con el cliente.
    if (!platformUser) {
      setPendingClient(tenant);
      setPlatformLoginError(null);
      setPlatformChallenge(null);
      openPlatformLogin();
      return;
    }
    void performSwitch(tenant);
  };

  const continuePendingClient = () => {
    const target = pendingClient;
    if (!target) return;
    setPendingClient(null);
    void performSwitch(target);
  };

  const submitPlatformLogin = async () => {
    setPlatformLoginError(null);
    setPlatformLoginPending(true);
    try {
      if (platformChallenge) {
        const user = await verifyPlatformTwoFactor(platformChallenge, platformForm.code);
        if (!user) throw new Error(t('pages.clients.platformLoginError'));
        setPlatformChallenge(null);
        setPlatformForm({ email: '', password: '', code: '' });
        closePlatformLogin();
        void tenantsQuery.refetch();
        continuePendingClient();
      } else {
        const result = await platformLogin(
          platformForm.email,
          platformForm.password,
          platformForm.code || undefined,
        );
        if (result.twoFactorRequired) {
          setPlatformChallenge(result.challengeToken ?? null);
          return;
        }
        if (!result.user) throw new Error(t('pages.clients.platformLoginError'));
        setPlatformForm({ email: '', password: '', code: '' });
        closePlatformLogin();
        void tenantsQuery.refetch();
        continuePendingClient();
      }
    } catch (error) {
      setPlatformLoginError(
        error instanceof Error ? error.message : t('pages.clients.platformLoginError'),
      );
    } finally {
      setPlatformLoginPending(false);
    }
  };

  const handlePlatformLogout = async () => {
    await platformLogout();
    window.location.href = '/';
  };

  const submit = () => {
    setFormError(null);
    if (!form.name.trim() || !form.slug.trim() || !form.adminEmail.trim() || form.adminPassword.length < 8) {
      setFormError(t('pages.clients.formError'));
      return;
    }
    createTenant.mutate();
  };

  const toggleStatus = (tenant: TenantSummary) => {
    setPendingId(tenant.id);
    updateTenant.mutate({
      id: tenant.id,
      status: tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    });
  };

  const counts = {
    total: tenants.length,
    active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
    suspended: tenants.filter((tenant) => tenant.status === 'SUSPENDED').length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: t('pages.clients.breadcrumb') }, { label: t('pages.clients.title') }]}
        title={t('pages.clients.title')}
        subtitle={t('pages.clients.subtitle')}
        actions={
          <>
            {platformUser ? (
              <Button
                variant="ghost"
                icon="shield_person"
                onClick={() => void handlePlatformLogout()}
                title={t('pages.clients.platformLogout')}
              >
                {platformUser.email ?? t('pages.clients.platformSession')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                icon="shield"
                onClick={() => {
                  setPlatformLoginError(null);
                  setPlatformChallenge(null);
                  openPlatformLogin();
                }}
              >
                {t('pages.clients.platformLogin')}
              </Button>
            )}
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => void tenantsQuery.refetch()}
              disabled={tenantsQuery.isFetching}
            >
              {t('pages.clients.refresh')}
            </Button>
            <Button icon="add" onClick={openCreate}>
              {t('pages.clients.newTenant')}
            </Button>
          </>
        }
      />

      {!platformUser ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container">
          <div className="flex items-center gap-2 font-body-sm text-body-sm">
            <Icon name="shield_person" className="text-[18px]" />
            <span>{t('pages.clients.platformRequiredHint')}</span>
          </div>
          <Button
            variant="secondary"
            icon="login"
            onClick={() => {
              setPendingClient(null);
              setPlatformLoginError(null);
              setPlatformChallenge(null);
              openPlatformLogin();
            }}
          >
            {t('pages.clients.platformLogin')}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('pages.clients.total'), value: counts.total, icon: 'dns' },
          { label: t('pages.clients.statusActive'), value: counts.active, icon: 'check_circle' },
          { label: t('pages.clients.statusSuspended'), value: counts.suspended, icon: 'pause_circle' },
        ].map((card) => (
          <motion.div
            key={card.label}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container text-on-surface">
              <Icon name={card.icon} className="text-[22px]" />
            </span>
            <div>
              <div className="font-headline-sm text-headline-sm text-on-surface">{card.value}</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">{card.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {actionError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl bg-error-container px-4 py-3 text-on-error-container"
        >
          <span className="font-body-sm text-body-sm">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label={t('common.close')}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-error/10"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-card">
        {tenantsQuery.isLoading ? (
          <TableSkeleton rows={3} columns={5} />
        ) : tenantsQuery.isError ? (
          <QueryError
            description={tenantsQuery.error.message}
            onRetry={() => void tenantsQuery.refetch()}
            retrying={tenantsQuery.isFetching}
          />
        ) : tenants.length === 0 ? (
          <EmptyState
            icon="dns"
            title={t('pages.clients.emptyTitle')}
            description={t('pages.clients.emptyDescription')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                  <th className="rounded-l-lg px-4 py-3">{t('pages.clients.table.tenant')}</th>
                  <th className="px-4 py-3">{t('pages.clients.table.domain')}</th>
                  <th className="px-4 py-3">{t('pages.clients.table.status')}</th>
                  <th className="px-4 py-3">{t('pages.clients.table.created')}</th>
                  <th className="rounded-r-lg px-4 py-3 text-right">{t('pages.clients.table.actions')}</th>
                </tr>
              </thead>
              <motion.tbody variants={tableRowsContainer} initial="hidden" animate="visible" className="font-body-sm text-body-sm">
                {tenants.map((tenant) => (
                  <motion.tr
                    key={tenant.id}
                    variants={fadeInUp}
                    className="border-b border-outline-variant/20 last:border-b-0 hover:bg-surface-container-low/60"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container font-label-md text-label-md text-on-surface">
                          {tenant.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-label-md text-label-md text-on-surface">{tenant.name}</span>
                            {tenant.isDefault ? (
                              <span className="rounded bg-secondary-fixed px-1.5 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed">
                                {t('pages.clients.defaultBadge')}
                              </span>
                            ) : null}
                          </div>
                          <div className="truncate font-label-sm text-label-sm text-on-surface-variant">{tenant.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">
                      {tenant.domains.length > 0 ? tenant.domains.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill
                        tone={STATUS_TONE[tenant.status]}
                        pulse={tenant.status === 'PROVISIONING'}
                        label={t(`pages.clients.status${tenant.status === 'ACTIVE' ? 'Active' : tenant.status === 'SUSPENDED' ? 'Suspended' : 'Provisioning'}`)}
                      />
                      {tenant.provisioningError ? (
                        <div className="mt-1 max-w-[220px] truncate font-label-sm text-label-sm text-error" title={tenant.provisioningError}>
                          {tenant.provisioningError}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">{formatDate(tenant.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {!tenant.isDefault && tenant.status === 'ACTIVE' ? (
                          <Button
                            variant="secondary"
                            icon="admin_panel_settings"
                            onClick={() => switchToClient(tenant)}
                            disabled={switchingId === tenant.id}
                            title={t('pages.clients.impersonate')}
                          >
                            <span className="sr-only">
                              {switchingId === tenant.id
                                ? t('pages.clients.impersonating')
                                : t('pages.clients.impersonate')}
                            </span>
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          icon="monitor_heart"
                          onClick={() => checkHealth.mutate(tenant)}
                          disabled={checkHealth.isPending}
                          title={t('pages.clients.health')}
                        >
                          <span className="sr-only">{t('pages.clients.health')}</span>
                        </Button>
                        {tenant.storefrontUrl ? (
                          <a
                            href={tenant.storefrontUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={t('pages.clients.openStore')}
                            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                          >
                            <Icon name="open_in_new" className="text-[18px]" />
                          </a>
                        ) : null}
                        {!tenant.isDefault ? (
                          <Button
                            variant={tenant.status === 'ACTIVE' ? 'danger' : 'secondary'}
                            icon={tenant.status === 'ACTIVE' ? 'pause' : 'play_arrow'}
                            onClick={() => toggleStatus(tenant)}
                            disabled={updateTenant.isPending && pendingId === tenant.id}
                            title={tenant.status === 'ACTIVE' ? t('pages.clients.suspend') : t('pages.clients.activate')}
                          >
                            <span className="sr-only">
                              {tenant.status === 'ACTIVE' ? t('pages.clients.suspend') : t('pages.clients.activate')}
                            </span>
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      <AppModal
        opened={createOpened}
        onClose={closeCreate}
        title={t('pages.clients.createTitle')}
        subtitle={t('pages.clients.createSubtitle')}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={closeCreate}
              className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              {t('common.cancel')}
            </button>
            <Button onClick={submit} disabled={createTenant.isPending} icon="add">
              {createTenant.isPending ? t('pages.clients.creating') : t('pages.clients.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tenant-name" className="font-label-md text-label-md text-on-surface">
              {t('pages.clients.fieldName')}
            </label>
            <input
              id="tenant-name"
              value={form.name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((prev) => ({ ...prev, name: value }));
              }}
              placeholder="Acme Store"
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tenant-slug" className="font-label-md text-label-md text-on-surface">
              {t('pages.clients.fieldSlug')}
            </label>
            <input
              id="tenant-slug"
              value={form.slug}
              onChange={(event) => {
                const value = event.currentTarget.value.toLowerCase();
                setForm((prev) => ({ ...prev, slug: value }));
              }}
              placeholder="acme"
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
            <p className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.clients.slugHint')}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tenant-domain" className="font-label-md text-label-md text-on-surface">
              {t('pages.clients.fieldDomain')}
            </label>
            <input
              id="tenant-domain"
              value={form.domain}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((prev) => ({ ...prev, domain: value }));
              }}
              placeholder="acme.localhost"
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tenant-admin-email" className="font-label-md text-label-md text-on-surface">
              {t('pages.clients.fieldAdminEmail')}
            </label>
            <input
              id="tenant-admin-email"
              type="email"
              value={form.adminEmail}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((prev) => ({ ...prev, adminEmail: value }));
              }}
              placeholder="admin@acme.com"
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tenant-admin-password" className="font-label-md text-label-md text-on-surface">
              {t('pages.clients.fieldAdminPassword')}
            </label>
            <input
              id="tenant-admin-password"
              type="password"
              value={form.adminPassword}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((prev) => ({ ...prev, adminPassword: value }));
              }}
              placeholder="••••••••"
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
          </div>
          {formError ? (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
              {formError}
            </p>
          ) : null}
          <p className="rounded-lg bg-surface-container-low px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">
            {t('pages.clients.provisioningHint')}
          </p>
        </div>
      </AppModal>

      <AppModal
        opened={healthOpened}
        onClose={closeHealth}
        title={t('pages.clients.healthTitle').replace('{{slug}}', health?.slug ?? '')}
        size="sm"
        footer={<Button onClick={closeHealth}>{t('common.close')}</Button>}
      >
        {health ? (
          health.data.ok ? (
            <div className="flex flex-col gap-3">
              <StatusPill tone="success" label={t('pages.clients.healthOk')} />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('pages.clients.healthProducts'), value: health.data.products ?? 0 },
                  { label: t('pages.clients.healthOrders'), value: health.data.orders ?? 0 },
                  { label: t('pages.clients.healthUsers'), value: health.data.users ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-surface-container-low px-3 py-2 text-center">
                    <div className="font-headline-sm text-headline-sm text-on-surface">{item.value}</div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-surface-container-low px-3 py-2">
                <div className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.clients.healthMigration')}</div>
                <div className="truncate font-body-sm text-body-sm text-on-surface">{health.data.lastMigration ?? '—'}</div>
              </div>
              <div className="rounded-lg bg-surface-container-low px-3 py-2">
                <div className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.clients.healthHistory')}</div>
                {health.data.migrations && health.data.migrations.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1">
                    {health.data.migrations.map((run) => (
                      <li key={run.id} className="flex items-center justify-between gap-3 font-label-sm text-label-sm">
                        <span className="truncate text-on-surface" title={run.name}>
                          {run.name}
                        </span>
                        <span className={run.status === 'APPLIED' ? 'shrink-0 text-emerald-600' : 'shrink-0 text-error'}>
                          {run.status === 'APPLIED' ? t('pages.clients.healthApplied') : t('pages.clients.healthFailed')}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.clients.healthHistoryEmpty')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <StatusPill tone="danger" label={t('pages.clients.healthError')} />
              <p className="font-body-sm text-body-sm text-on-surface-variant">{health.data.error}</p>
            </div>
          )
        ) : null}
      </AppModal>

      <AppModal
        opened={platformLoginOpened}
        onClose={closePlatformLogin}
        title={t('pages.clients.platformLoginTitle')}
        subtitle={t('pages.clients.platformLoginSubtitle')}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={closePlatformLogin}
              className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              {t('common.cancel')}
            </button>
            <Button
              icon="login"
              onClick={() => void submitPlatformLogin()}
              disabled={platformLoginPending}
            >
              {platformLoginPending
                ? t('pages.clients.platformSigningIn')
                : t('pages.clients.platformSignIn')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {platformChallenge ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="platform-code" className="font-label-md text-label-md text-on-surface">
                {t('pages.clients.platformCode')}
              </label>
              <input
                id="platform-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={platformForm.code}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setPlatformForm((prev) => ({ ...prev, code: value }));
                }}
                placeholder="123456"
                className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
              />
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.clients.platformCodeHint')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="platform-email" className="font-label-md text-label-md text-on-surface">
                  {t('pages.clients.platformEmail')}
                </label>
                <input
                  id="platform-email"
                  type="email"
                  autoComplete="username"
                  value={platformForm.email}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setPlatformForm((prev) => ({ ...prev, email: value }));
                  }}
                  placeholder="owner@nova.app"
                  className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="platform-password" className="font-label-md text-label-md text-on-surface">
                  {t('pages.clients.platformPassword')}
                </label>
                <input
                  id="platform-password"
                  type="password"
                  autoComplete="current-password"
                  value={platformForm.password}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setPlatformForm((prev) => ({ ...prev, password: value }));
                  }}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
                />
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.clients.platformLoginHint')}
              </p>
            </>
          )}
          {pendingClient ? (
            <p className="rounded-lg bg-secondary-container px-3 py-2 font-body-sm text-body-sm text-on-secondary-container">
              {t('pages.clients.platformLoginContinueHint').replace(
                '{{tenant}}',
                pendingClient.name,
              )}
            </p>
          ) : null}
          {platformLoginError ? (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
              {platformLoginError}
            </p>
          ) : null}
        </div>
      </AppModal>

    </div>
  );
}
