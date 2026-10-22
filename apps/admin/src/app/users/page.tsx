'use client';

import type { components } from '@ecommerce/api-client';
import { useDisclosure } from '@mantine/hooks';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { allPermissions, defaultNewUserPermissions, getPermissionLabel } from '../../lib/permissions';
import { useTranslation } from '../../providers/i18n-provider';

type AdminUser = components['schemas']['AdminUserResponseDto'];

const PAGE_SIZE = 10;
const SAMPLE_LIMIT = 100;

type ViewTab = 'all' | 'customers' | 'staff' | 'suspended';
type ViewMode = 'list' | 'cards';

const DESIGN_ROLES = ['CUSTOMER', 'STAFF', 'ADMIN'];

const ROLE_SHORT_LABEL_KEYS: Record<string, string> = {
  CUSTOMER: 'pages.users.roleCustomer',
  STAFF: 'pages.users.roleStaff',
  ADMIN: 'pages.users.roleAdmin',
};

const ROLE_SELECT_LABEL_KEYS: Record<string, string> = {
  CUSTOMER: 'pages.users.roleCustomerSelect',
  STAFF: 'pages.users.roleStaffSelect',
  ADMIN: 'pages.users.roleAdminSelect',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  CUSTOMER: 'bg-surface-container text-on-surface',
  STAFF: 'bg-primary text-on-primary',
  ADMIN: 'bg-surface-container-highest text-on-surface',
};

const ROLE_ICONS: Record<string, string> = {
  CUSTOMER: 'person',
  STAFF: 'precision_manufacturing',
  ADMIN: 'shield',
};

const STATUS_OPTIONS = [
  { value: '', labelKey: 'pages.users.statusAll' },
  { value: 'active', labelKey: 'pages.users.statusActive' },
  { value: 'suspended', labelKey: 'pages.users.statusSuspended' },
  { value: 'unverified', labelKey: 'pages.users.statusUnverified' },
];

function matchesTab(user: AdminUser, tab: ViewTab): boolean {
  if (tab === 'customers') return user.role.name === 'CUSTOMER';
  if (tab === 'staff') return user.role.name !== 'CUSTOMER';
  if (tab === 'suspended') return user.isSuspended;
  return true;
}

function matchesStatus(user: AdminUser, status: string): boolean {
  if (status === 'active') return user.isActive && !user.isSuspended;
  if (status === 'suspended') return user.isSuspended;
  if (status === 'unverified') return !user.emailVerified;
  return true;
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/);
  const [firstName, ...rest] = parts;
  return { firstName: firstName ?? '', lastName: rest.join(' ') };
}

function getUserName(user: { firstName?: string | null; lastName?: string | null }): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
}

function getInitials(user: { firstName?: string | null; lastName?: string | null; email: string }): string {
  const words = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (words) {
    const initials = words
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    if (initials) return initials;
  }
  return user.email.slice(0, 2).toUpperCase();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-CO');
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function avatarClasses(user: AdminUser): string {
  if (user.isSuspended) return 'bg-error-container text-on-error-container';
  if (user.role.name === 'STAFF') return 'bg-primary text-on-primary';
  if (user.role.name === 'ADMIN') return 'bg-surface-container-highest text-on-surface';
  return 'bg-surface-container-high text-on-surface';
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function RoleBadge({ roleName }: { roleName: string }) {
  const { t } = useTranslation();
  const labelKey = ROLE_SHORT_LABEL_KEYS[roleName];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 font-label-sm text-label-sm uppercase tracking-wide ${
        ROLE_BADGE_STYLES[roleName] ?? 'bg-surface-container text-on-surface'
      }`}
    >
      {labelKey ? t(labelKey) : roleName}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  const { t } = useTranslation();
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed">
        <Icon name="check" className="text-[14px]" />
        {t('pages.users.verified')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
      <Icon name="help" className="text-[14px]" />
      {t('pages.users.unverified')}
    </span>
  );
}

function AccountStatusBadge({ isActive, isSuspended }: { isActive: boolean; isSuspended: boolean }) {
  const { t } = useTranslation();
  if (isSuspended) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-error-container">
        <span className="h-1.5 w-1.5 rounded-full bg-error" />
        {t('pages.users.suspended')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {isActive ? t('pages.users.active') : t('pages.users.inactive')}
    </span>
  );
}

function PermissionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-container">
      <Checkbox checked={checked} onChange={onChange} label={label} />
      <button type="button" onClick={onChange} className="flex-1 text-left font-body-sm text-body-sm text-on-surface">
        {label}
      </button>
    </div>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<ViewTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [exporting, setExporting] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendOpened, { open: openSuspend, close: closeSuspend }] = useDisclosure(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roleName: 'CUSTOMER',
    permissions: defaultNewUserPermissions,
  });

  // El endpoint de usuarios no soporta filtrar por estado (solo page/limit/search/role), así que
  // los tabs y el select de estado se resuelven contra una muestra de hasta 100 registros.
  const clientFiltered = tab !== 'all' || statusFilter !== '';
  const queryPage = clientFiltered ? 1 : page;
  const queryLimit = clientFiltered ? SAMPLE_LIMIT : PAGE_SIZE;

  const { data: usersResponse, isLoading, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ['admin-users', queryPage, search, roleFilter, queryLimit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users', {
        params: {
          query: {
            page: String(queryPage),
            limit: String(queryLimit),
            search: search || undefined,
            role: roleFilter || undefined,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: sampleResponse, isLoading: isLoadingSample } = useQuery({
    // Prefijo compartido con la lista para que las mutaciones invaliden también la muestra.
    queryKey: ['admin-users', 'sample'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users', {
        params: { query: { page: '1', limit: String(SAMPLE_LIMIT) } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: rolesResponse } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users/roles');
      if (error) throw error;
      return data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-user', detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const { data, error } = await apiClient.GET('/admin/users/{id}', {
        params: { path: { id: detailId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(detailId),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, roleName }: { id: string; roleName: string }) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/role', {
        params: { path: { id } },
        body: { roleName } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', detailId] });
      notifySuccess({ title: t('pages.users.toastRoleUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastRoleUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const suspendUser = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/suspend', {
        params: { path: { id } },
        body: { reason } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSuspendReason('');
      closeSuspend();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', suspendUserId] });
      notifySuccess({ title: t('pages.users.toastUserSuspended') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastSuspendError'), message: getApiErrorMessage(error) });
    },
  });

  const unsuspendUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/unsuspend', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', detailId] });
      notifySuccess({ title: t('pages.users.toastUserReactivated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastReactivateError'), message: getApiErrorMessage(error) });
    },
  });

  const updateUserPermissions = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/permissions', {
        params: { path: { id } },
        body: { permissions },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', detailId] });
      notifySuccess({ title: t('pages.users.toastPermissionsUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastPermissionsUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const createUser = useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      roleName: string;
      permissions: string[];
    }) => {
      const { error } = await apiClient.POST('/admin/users', {
        body: payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setCreateForm({
        fullName: '',
        email: '',
        password: '',
        roleName: 'CUSTOMER',
        permissions: defaultNewUserPermissions,
      });
      closeCreate();
      notifySuccess({ title: t('pages.users.toastUserCreated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastCreateUserError'), message: getApiErrorMessage(error) });
    },
  });

  const apiRoleNames = rolesResponse?.data.map((role) => role.name) ?? [];
  const roleNames = Array.from(new Set<string>([...DESIGN_ROLES, ...apiRoleNames]));
  const availableRoles = roleNames.map((name) => ({
    value: name,
    label: ROLE_SELECT_LABEL_KEYS[name] ? t(ROLE_SELECT_LABEL_KEYS[name]) : name,
  }));

  const users = usersResponse?.data ?? [];
  const sample = sampleResponse?.data ?? [];
  const totalRegistered = sampleResponse?.meta?.total ?? usersResponse?.meta?.total ?? 0;

  // Si hay más registros que la muestra, extrapolamos proporcionalmente (los KPIs y los tabs
  // son aproximados cuando el total supera los 100 más recientes).
  const sampleScale = totalRegistered > sample.length && sample.length > 0 ? totalRegistered / sample.length : 1;
  const estimateFromSample = (predicate: (user: AdminUser) => boolean) => {
    const count = sample.filter(predicate).length;
    return Math.round(count * sampleScale);
  };

  const verifiedCount = estimateFromSample((user) => user.emailVerified);
  const activeCount = estimateFromSample((user) => user.isActive && !user.isSuspended);
  const suspendedCount = estimateFromSample((user) => user.isSuspended);
  const customersCount = estimateFromSample((user) => user.role.name === 'CUSTOMER');
  const staffCount = estimateFromSample((user) => user.role.name !== 'CUSTOMER');
  const pendingVerificationCount = Math.max(totalRegistered - verifiedCount, 0);
  const verifiedRate = totalRegistered > 0 ? (verifiedCount / totalRegistered) * 100 : 0;
  const activeRate = totalRegistered > 0 ? (activeCount / totalRegistered) * 100 : 0;

  const clientRows = clientFiltered
    ? users.filter((user) => matchesTab(user, tab) && matchesStatus(user, statusFilter))
    : users;
  const totalForPagination = clientFiltered ? clientRows.length : usersResponse?.meta?.total ?? 0;
  const totalPages = totalForPagination > 0 ? Math.ceil(totalForPagination / PAGE_SIZE) : 1;
  const visibleUsers = clientFiltered
    ? clientRows.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)
    : users;
  const rangeStart = visibleUsers.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = visibleUsers.length > 0 ? rangeStart + visibleUsers.length - 1 : 0;

  const tabCounts: Record<ViewTab, number> = {
    all: totalRegistered,
    customers: customersCount,
    staff: staffCount,
    suspended: suspendedCount,
  };

  useEffect(() => {
    if (detail) {
      setUserPermissions(detail.permissions ?? []);
    }
  }, [detail]);

  function handleOpenDetail(id: string) {
    setDetailId(id);
    openDetail();
  }

  function handleOpenSuspend(id: string) {
    setSuspendUserId(id);
    openSuspend();
  }

  function handleTabChange(nextTab: ViewTab) {
    setTab(nextTab);
    setPage(1);
  }

  function handleRoleFilterChange(value: string) {
    setRoleFilter(value || null);
    setPage(1);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function submitCreateUser() {
    if (!createForm.fullName.trim() || !createForm.email || !createForm.password) return;
    const { firstName, lastName } = splitFullName(createForm.fullName);
    createUser.mutate({
      email: createForm.email,
      password: createForm.password,
      firstName,
      lastName,
      roleName: createForm.roleName,
      permissions: createForm.permissions,
    });
  }

  async function fetchAllUsers(): Promise<AdminUser[]> {
    // La API no tiene endpoint de export de usuarios: paginamos hasta traer todos
    // los que coinciden con la búsqueda/rol (evita el tope de la "muestra" de 100).
    const BATCH_SIZE = 100;
    const MAX_PAGES = 100; // tope de seguridad: 10.000 registros
    const all: AdminUser[] = [];
    for (let currentPage = 1; currentPage <= MAX_PAGES; currentPage += 1) {
      const { data, error } = await apiClient.GET('/admin/users', {
        params: {
          query: {
            page: String(currentPage),
            limit: String(BATCH_SIZE),
            search: search || undefined,
            role: roleFilter || undefined,
          },
        },
      });
      if (error) throw error;
      const batch = data?.data ?? [];
      all.push(...batch);
      const total = data?.meta?.total ?? all.length;
      if (batch.length === 0 || all.length >= total) break;
    }
    return all;
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const allUsers = await fetchAllUsers();
      const rows = allUsers.filter((user) => matchesTab(user, tab) && matchesStatus(user, statusFilter));
      const header = [
        t('pages.users.csvEmail'),
        t('pages.users.table.name'),
        t('pages.users.table.role'),
        t('pages.users.verified'),
        t('pages.users.fieldStatus'),
        t('pages.users.fieldCreatedAt'),
      ];
      const body = rows.map((user) => [
        user.email,
        getUserName(user),
        ROLE_SHORT_LABEL_KEYS[user.role.name] ? t(ROLE_SHORT_LABEL_KEYS[user.role.name]) : user.role.name,
        user.emailVerified ? t('pages.users.verified') : t('pages.users.unverified'),
        user.isSuspended ? t('pages.users.suspended') : t('pages.users.active'),
        formatDate(user.createdAt),
      ]);
      const csv = [header, ...body].map((row) => row.map(escapeCsv).join(',')).join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notifySuccess({
        title: t('pages.users.toastExported'),
        message: t('pages.users.toastExportedMessage').replace('{{count}}', String(rows.length)),
      });
    } catch (error) {
      notifyError({ title: t('pages.users.toastExportError'), message: getApiErrorMessage(error) });
    } finally {
      setExporting(false);
    }
  }

  function renderRowActions(user: AdminUser) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => handleOpenDetail(user.id)}
          className="rounded-md bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
        >
          {t('pages.users.actionViewProfile')}
        </button>
        {user.isSuspended ? (
          <button
            type="button"
            onClick={() => unsuspendUser.mutate(user.id)}
            disabled={unsuspendUser.isPending}
            className="rounded-md bg-secondary-fixed px-2.5 py-1 font-label-sm text-label-sm text-on-secondary-fixed transition-colors hover:bg-secondary-container disabled:opacity-60"
          >
            {t('pages.users.actionReactivate')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenSuspend(user.id)}
            className="rounded-md bg-error-container/30 px-2.5 py-1 font-label-sm text-label-sm text-error transition-colors hover:bg-error-container"
          >
            {t('pages.users.actionSuspend')}
          </button>
        )}
        {user.role.name === 'ADMIN' ? (
          <>
            <button
              type="button"
              disabled
              title={t('pages.users.immutableHint')}
              className="cursor-not-allowed rounded-md bg-surface-container px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant"
            >
              {t('pages.users.actionImmutable')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenDetail(user.id)}
            className="rounded-md bg-secondary-container px-2.5 py-1 font-label-sm text-label-sm text-on-secondary-container transition-colors hover:bg-secondary-fixed"
          >
            {t('pages.users.actionPermissions')}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          breadcrumb={[{ label: t('pages.users.breadcrumbCustomers') }, { label: t('pages.users.breadcrumbUsers') }]}
          title={t('pages.users.title')}
          subtitle={t('pages.users.subtitle')}
          actions={
            <>
              <Button variant="secondary" icon="file_download" onClick={exportCsv} disabled={exporting}>
                {t('pages.users.exportCsv')}
              </Button>
              <Button icon="person_add" onClick={openCreate}>
                {t('pages.users.newUser')}
              </Button>
            </>
          }
        />

        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.users.totalRegistered')}
              </span>
              <span className="flex items-center rounded-lg bg-surface-container p-2 text-on-surface">
                <Icon name="group" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-headline-xl text-headline-xl font-numeric-tabular text-on-surface">
                {isLoadingSample ? (
                  <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-surface-container-high" />
                ) : (
                  <AnimatedNumber value={totalRegistered} format={formatNumber} />
                )}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed">
                <Icon name="trending_up" className="text-[14px]" />
                {t('pages.users.activeRate').replace('{{rate}}', activeRate.toFixed(1))}
              </span>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-surface-container">
              <div
                className="h-1 rounded-full bg-primary"
                style={{ width: `${Math.min(Math.max(activeRate, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.users.verifiedKpi')}
              </span>
              <span className="flex items-center rounded-lg bg-secondary-container p-2 text-on-secondary-container">
                <Icon name="verified" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-headline-xl text-headline-xl font-numeric-tabular text-on-surface">
                {isLoadingSample ? (
                  <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-surface-container-high" />
                ) : (
                  <AnimatedNumber value={verifiedCount} format={formatNumber} />
                )}
              </span>
              <span className="font-numeric-tabular text-label-sm text-on-surface-variant">
                {t('pages.users.verifiedRate').replace('{{rate}}', verifiedRate.toFixed(1))}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span>
                {t('pages.users.pendingEmails').replace('{{count}}', String(pendingVerificationCount))}
              </span>
              <button
                type="button"
                disabled
                title={t('pages.users.comingSoon')}
                className="cursor-not-allowed font-label-sm text-label-sm font-medium text-primary opacity-60"
              >
                {t('pages.users.resendBatch')}
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.users.activeKpi')}
              </span>
              <span className="flex items-center rounded-lg bg-surface-container-low p-2 text-on-surface">
                <Icon name="check_circle" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-headline-xl text-headline-xl font-numeric-tabular text-on-surface">
                {isLoadingSample ? (
                  <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-surface-container-high" />
                ) : (
                  <AnimatedNumber value={activeCount} format={formatNumber} />
                )}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t('pages.users.operational')}
              </span>
            </div>
            <div className="mt-3 truncate font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.users.suspendedUsers').replace('{{count}}', String(suspendedCount))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.users.suspendedBlocked')}
              </span>
              <span className="flex items-center rounded-lg bg-error-container p-2 text-on-error-container">
                <Icon name="shield" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-headline-xl text-headline-xl font-numeric-tabular text-error">
                {isLoadingSample ? (
                  <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-error-container" />
                ) : (
                  <AnimatedNumber value={suspendedCount} format={formatNumber} />
                )}
              </span>
              <span className="rounded-full bg-error-container px-2 py-0.5 font-label-sm text-label-sm text-on-error-container">
                {t('pages.users.antiFraud')}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span>{t('pages.users.manualReview')}</span>
              <Icon name="arrow_forward" className="text-[16px] text-error" />
            </div>
          </div>
        </div>

        {/* Directory Surface: Filters & Tabular Ledger */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-lowest px-6 pb-3 pt-5">
            <SegmentedTabs
              value={tab}
              options={(
                [
                  { key: 'all', labelKey: 'pages.users.tabs.all' },
                  { key: 'customers', labelKey: 'pages.users.tabs.customers' },
                  { key: 'staff', labelKey: 'pages.users.tabs.staff' },
                  { key: 'suspended', labelKey: 'pages.users.tabs.suspended' },
                ] as const
              ).map((item) => {
                const active = tab === item.key;
                return {
                  value: item.key,
                  label: (
                    <>
                      {t(item.labelKey)}{' '}
                      <span
                        className={`ml-1 font-numeric-tabular ${
                          item.key === 'suspended' && !active ? 'text-error' : active ? 'opacity-80' : ''
                        }`}
                      >
                        {tabCounts[item.key]}
                      </span>
                    </>
                  ),
                };
              })}
              onChange={(value) => handleTabChange(value)}
              variant="primary"
              size="md"
              layoutId="users-view-tabs"
            />
            <div className="flex items-center gap-2">
              <span className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.users.viewLabel')}</span>
              <button
                type="button"
                title={t('pages.users.viewList')}
                aria-label={t('pages.users.viewList')}
                onClick={() => setViewMode('list')}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-surface-container text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Icon name="table_rows" className="text-[18px]" />
              </button>
              <button
                type="button"
                title={t('pages.users.viewCards')}
                aria-label={t('pages.users.viewCards')}
                onClick={() => setViewMode('cards')}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-surface-container text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Icon name="grid_view" className="text-[18px]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 px-6 pb-5 pt-2 md:grid-cols-12">
            <div className="relative flex items-center md:col-span-6">
              <Icon name="search" className="absolute left-3.5 text-[18px] text-on-surface-variant" />
              <input
                type="text"
                aria-label={t('pages.users.searchLabel')}
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setPage(1);
                }}
                placeholder={t('pages.users.searchPlaceholder')}
                className="w-full rounded-lg bg-surface-container-low py-2.5 pl-10 pr-10 font-body-sm text-body-sm text-on-surface transition-all placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  aria-label={t('pages.users.clearSearch')}
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              )}
            </div>
            <div className="relative md:col-span-3">
              <select
                aria-label={t('pages.users.filterRoleLabel')}
                value={roleFilter ?? ''}
                onChange={(event) => handleRoleFilterChange(event.currentTarget.value)}
                className="w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface focus:bg-surface-container focus:outline-none"
              >
                <option value="">{t('pages.users.allRoles')}</option>
                {availableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                className="pointer-events-none absolute right-3 top-3 text-[18px] text-on-surface-variant"
              />
            </div>
            <div className="relative md:col-span-3">
              <select
                aria-label={t('pages.users.filterStatusLabel')}
                value={statusFilter}
                onChange={(event) => handleStatusFilterChange(event.currentTarget.value)}
                className="w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface focus:bg-surface-container focus:outline-none"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {t(status.labelKey)}
                  </option>
                ))}
              </select>
              <Icon
                name="tune"
                className="pointer-events-none absolute right-3 top-3 text-[18px] text-on-surface-variant"
              />
            </div>
          </div>

          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={PAGE_SIZE} columns={8} withAvatar />
          ) : visibleUsers.length === 0 ? (
            <EmptyState
              icon="group_off"
              title={t('pages.users.emptyTitle')}
              description={t('pages.users.emptyDescription')}
            />
          ) : viewMode === 'list' ? (
            <div className={`w-full overflow-x-auto transition-opacity ${isPlaceholderData ? 'opacity-50' : ''}`}>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <th className="rounded-l-lg px-3 py-3">{t('pages.users.table.user')}</th>
                    <th className="px-3 py-3">{t('pages.users.table.name')}</th>
                    <th className="px-3 py-3">{t('pages.users.table.role')}</th>
                    <th className="px-3 py-3">{t('pages.users.verified')}</th>
                    <th className="px-3 py-3">{t('pages.users.fieldStatus')}</th>
                    <th className="px-3 py-3">{t('pages.users.table.orders')}</th>
                    <th className="px-3 py-3">{t('pages.users.fieldCreatedAt')}</th>
                    <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.users.table.actions')}</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableRowsContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm"
                >
                  {visibleUsers.map((user) => (
                    <motion.tr
                      variants={fadeInUp}
                      key={user.id}
                      className={`border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low ${
                        user.isSuspended ? 'bg-error-container/10' : ''
                      }`}
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-numeric-tabular font-medium text-[13px] ${avatarClasses(user)}`}
                          >
                            {getInitials(user)}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-body-md text-body-md font-medium text-on-surface">
                              {user.email}
                            </span>
                            {user.isSuspended ? (
                              <span className="truncate font-label-sm text-label-sm text-error">
                                {user.suspendedReason || t('pages.users.suspendedAccount')}
                              </span>
                            ) : (
                              <span className="truncate font-label-sm text-label-sm text-on-surface-variant">
                                {t('pages.users.idLabel')} {user.id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-body-md text-body-md text-on-surface">{getUserName(user)}</td>
                      <td className="px-3 py-3.5">
                        <RoleBadge roleName={user.role.name} />
                      </td>
                      <td className="px-3 py-3.5">
                        <VerifiedBadge verified={user.emailVerified} />
                      </td>
                      <td className="px-3 py-3.5">
                        <AccountStatusBadge isActive={user.isActive} isSuspended={user.isSuspended} />
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className="font-numeric-tabular text-on-surface-variant"
                          title={t('pages.users.noOrdersInfo')}
                        >
                          —
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-numeric-tabular text-on-surface-variant">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-3 py-3.5">{renderRowActions(user)}</td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 px-6 pb-6 pt-2 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${
                isPlaceholderData ? 'opacity-50' : ''
              }`}
            >
              {visibleUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex flex-col gap-3 rounded-xl border border-outline-variant/30 p-4 ${
                    user.isSuspended ? 'bg-error-container/10' : 'bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-numeric-tabular font-medium text-[13px] ${avatarClasses(user)}`}
                    >
                      {getInitials(user)}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-body-md text-body-md font-medium text-on-surface">
                        {user.email}
                      </span>
                      <span className="truncate font-body-sm text-body-sm text-on-surface">{getUserName(user)}</span>
                      <span
                        className={`truncate font-label-sm text-label-sm ${
                          user.isSuspended ? 'text-error' : 'text-on-surface-variant'
                        }`}
                      >
                        {user.isSuspended
                          ? user.suspendedReason || t('pages.users.suspendedAccount')
                          : `${t('pages.users.idLabel')} ${user.id.slice(0, 8)}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge roleName={user.role.name} />
                    <VerifiedBadge verified={user.emailVerified} />
                    <AccountStatusBadge isActive={user.isActive} isSuspended={user.isSuspended} />
                  </div>
                  <div className="border-t border-outline-variant/20 pt-3">{renderRowActions(user)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-surface-container-lowest px-6 py-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              summary={t('pages.users.paginationSummary')
                .replace('{{start}}', String(rangeStart))
                .replace('{{end}}', String(rangeEnd))
                .replace('{{total}}', String(totalForPagination))}
            />
          </div>
        </div>

        {/* Security & Compliance Footer Card */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-surface-container-low p-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-surface-container-highest p-3 text-on-surface">
              <Icon name="lock" className="text-[24px]" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.users.privacyTitle')}</h2>
              <p className="max-w-3xl font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.users.privacyBody')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              disabled
              title={t('pages.users.comingSoon')}
              className="cursor-not-allowed rounded-lg bg-surface-container px-3.5 py-2 font-label-sm text-label-sm text-on-surface opacity-60"
            >
              {t('pages.users.downloadAccessLog')}
            </button>
            <button
              type="button"
              disabled
              title={t('pages.users.comingSoon')}
              className="cursor-not-allowed rounded-lg bg-surface-container-highest px-3.5 py-2 font-label-sm text-label-sm text-on-surface opacity-60"
            >
              {t('pages.users.retentionSettings')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Crear Nuevo Usuario */}
      <AppModal
        opened={createOpened}
        onClose={closeCreate}
        title={t('pages.users.createTitle')}
        subtitle={t('pages.users.createSubtitle')}
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
            <button
              type="button"
              onClick={submitCreateUser}
              disabled={createUser.isPending}
              className="rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-surface-container-highest hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createUser.isPending ? t('common.saving') : t('pages.users.saveUser')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-user-name" className="font-label-md text-label-md text-on-surface">
              {t('pages.users.fullName')}
            </label>
            <input
              id="new-user-name"
              type="text"
              value={createForm.fullName}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setCreateForm((prev) => ({ ...prev, fullName: value }));
              }}
              placeholder={t('pages.users.fullNamePlaceholder')}
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-user-email" className="font-label-md text-label-md text-on-surface">
              {t('pages.users.email')}
            </label>
            <input
              id="new-user-email"
              type="email"
              value={createForm.email}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setCreateForm((prev) => ({ ...prev, email: value }));
              }}
              placeholder={t('pages.users.emailPlaceholder')}
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-user-password" className="font-label-md text-label-md text-on-surface">
              {t('pages.users.password')}
            </label>
            <input
              id="new-user-password"
              type="password"
              value={createForm.password}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setCreateForm((prev) => ({ ...prev, password: value }));
              }}
              placeholder={t('pages.users.passwordPlaceholder')}
              className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-user-role" className="font-label-md text-label-md text-on-surface">
                {t('pages.users.assignRole')}
              </label>
              <div className="relative">
                <select
                  id="new-user-role"
                  value={createForm.roleName}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCreateForm((prev) => ({ ...prev, roleName: value }));
                  }}
                  className="w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface focus:bg-surface-container focus:outline-none"
                >
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <Icon
                  name="expand_more"
                  className="pointer-events-none absolute right-3 top-3 text-[18px] text-on-surface-variant"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-label-md text-label-md text-on-surface">{t('pages.users.verification')}</span>
              <div
                className="flex items-center gap-2 pt-2.5 opacity-60"
                title={t('pages.users.verificationHint')}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded border border-primary bg-primary text-on-primary">
                  <Icon name="check" className="text-[12px]" />
                </span>
                <span className="font-body-sm text-body-sm text-on-surface">{t('pages.users.verifiedDirect')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface">{t('pages.users.directPermissions')}</span>
            <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-lg bg-surface-container-low p-2">
              {allPermissions.map((permission) => (
                <PermissionToggle
                  key={permission}
                  label={getPermissionLabel(permission, t)}
                  checked={createForm.permissions.includes(permission)}
                  onChange={() =>
                    setCreateForm((prev) => ({
                      ...prev,
                      permissions: prev.permissions.includes(permission)
                        ? prev.permissions.filter((value) => value !== permission)
                        : [...prev.permissions, permission],
                    }))
                  }
                />
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-surface-container-low p-3">
            <Icon name="mail" className="text-[20px] text-on-surface-variant" />
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.users.createHelp')}
            </p>
          </div>
        </div>
      </AppModal>

      {/* Modal: Detalle de Usuario */}
      <AppModal
        opened={detailOpened}
        onClose={closeDetail}
        title={t('pages.users.detailTitle')}
        subtitle={t('pages.users.detailSubtitle')}
        size="md"
        footer={
          <>
            {detail && (
              <Link
                href={`/users/${detail.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 px-3.5 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
              >
                {t('pages.users.openDetailPage')}
              </Link>
            )}
            <button
              type="button"
              onClick={closeDetail}
              className="rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-sm transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            >
              {t('common.close')}
            </button>
          </>
        }
      >
        {detail ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-numeric-tabular text-headline-sm font-semibold text-on-primary">
                {getInitials(detail)}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-headline-sm text-headline-sm text-on-surface">{getUserName(detail)}</span>
                <span className="truncate font-body-sm text-body-sm text-on-surface-variant">{detail.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface-container-low p-3">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.users.fieldCreatedAt')}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface">{formatDateTime(detail.createdAt)}</p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-3">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.users.fieldStatus')}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface">
                  {detail.isSuspended
                    ? t('pages.users.suspended')
                    : detail.isActive
                      ? t('pages.users.active')
                      : t('pages.users.inactive')}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.users.changeRole')}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {roleNames.map((roleName) => {
                  const active = detail.role.name === roleName;
                  return (
                    <button
                      key={roleName}
                      type="button"
                      disabled={updateRole.isPending}
                      onClick={() => {
                        if (!active) updateRole.mutate({ id: detail.id, roleName });
                      }}
                      className={`flex flex-col items-center gap-1 rounded-lg p-3 font-label-md text-label-md transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <Icon name={ROLE_ICONS[roleName] ?? 'badge'} className="text-[20px]" />
                      <span>
                        {ROLE_SHORT_LABEL_KEYS[roleName] ? t(ROLE_SHORT_LABEL_KEYS[roleName]) : roleName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.users.userDirectPermissions')}
              </span>
              <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-lg bg-surface-container-low p-2">
                {allPermissions.map((permission) => (
                  <PermissionToggle
                    key={permission}
                    label={getPermissionLabel(permission, t)}
                    checked={userPermissions.includes(permission)}
                    onChange={() =>
                      setUserPermissions((prev) =>
                        prev.includes(permission)
                          ? prev.filter((value) => value !== permission)
                          : [...prev, permission],
                      )
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => updateUserPermissions.mutate({ id: detail.id, permissions: userPermissions })}
                disabled={updateUserPermissions.isPending}
                className="self-start rounded-lg bg-surface-container px-3.5 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateUserPermissions.isPending ? t('common.saving') : t('pages.users.savePermissions')}
              </button>
            </div>

            {detail.isSuspended && (
              <div className="rounded-lg bg-error-container/40 p-3 font-body-sm text-body-sm text-on-error-container">
                <p>
                  <strong>{t('pages.users.suspendedLabel')}</strong>{' '}
                  {detail.suspendedReason || t('pages.users.noReason')}
                </p>
                <p className="font-label-sm text-label-sm">
                  {detail.suspendedAt ? formatDateTime(detail.suspendedAt) : '—'}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.users.accountActions')}
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled
                  title={t('pages.users.comingSoon')}
                  className="flex w-full cursor-not-allowed items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5 text-left font-body-sm text-body-sm text-on-surface opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <Icon name="lock_reset" className="text-[18px]" />
                    <span>{t('pages.users.resetPassword')}</span>
                  </span>
                  <Icon name="chevron_right" className="text-[16px] text-on-surface-variant" />
                </button>
                <button
                  type="button"
                  disabled
                  title={t('pages.users.comingSoon')}
                  className="flex w-full cursor-not-allowed items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5 text-left font-body-sm text-body-sm text-on-surface opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <Icon name="history" className="text-[18px]" />
                    <span>{t('pages.users.sessionHistory')}</span>
                  </span>
                  <Icon name="chevron_right" className="text-[16px] text-on-surface-variant" />
                </button>
              </div>
            </div>

            {detail.isSuspended ? (
              <button
                type="button"
                onClick={() => unsuspendUser.mutate(detail.id)}
                disabled={unsuspendUser.isPending}
                className="w-full rounded-lg bg-secondary-fixed px-4 py-2.5 font-label-md text-label-md text-on-secondary-fixed transition-colors hover:bg-secondary-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unsuspendUser.isPending ? t('pages.users.reactivating') : t('pages.users.reactivateUser')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenSuspend(detail.id)}
                className="w-full rounded-lg bg-error-container/30 px-4 py-2.5 font-label-md text-label-md text-error transition-colors hover:bg-error-container"
              >
                {t('pages.users.suspendUser')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-10 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[20px]" />
            {t('pages.users.loadingUser')}
          </div>
        )}
      </AppModal>

      {/* Modal: Suspender usuario */}
      <AppModal
        opened={suspendOpened}
        onClose={closeSuspend}
        title={t('pages.users.suspendUser')}
        subtitle={t('pages.users.suspendSubtitle')}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={closeSuspend}
              className="rounded-lg bg-surface-container px-4 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              {t('common.close')}
            </button>
            <button
              type="button"
              disabled={suspendUser.isPending}
              onClick={() => {
                if (suspendUserId) {
                  suspendUser.mutate({ id: suspendUserId, reason: suspendReason });
                }
              }}
              className="rounded-lg bg-error-container px-4 py-2 font-label-md text-label-md text-on-error-container transition-colors hover:bg-error hover:text-on-error disabled:cursor-not-allowed disabled:opacity-60"
            >
              {suspendUser.isPending ? t('pages.users.suspending') : t('pages.users.actionSuspend')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="font-body-sm text-body-sm text-on-surface">{t('pages.users.suspendDescription')}</p>
          <label htmlFor="suspend-reason" className="font-label-md text-label-md text-on-surface">
            {t('pages.users.suspendReason')}
          </label>
          <textarea
            id="suspend-reason"
            value={suspendReason}
            onChange={(event) => setSuspendReason(event.currentTarget.value)}
            placeholder={t('pages.users.suspendReason')}
            rows={3}
            className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
          />
        </div>
      </AppModal>
    </>
  );
}
