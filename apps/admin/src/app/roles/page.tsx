'use client';

import type { components } from '@ecommerce/api-client';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Fragment, useState } from 'react';

import { LoadingState } from '../../components/loading-state';
import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Textarea } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { StatusPill } from '../../components/ui/status-pill';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { allPermissions, getPermissionLabel } from '../../lib/permissions';
import { useTranslation } from '../../providers/i18n-provider';

type AdminRole = components['schemas']['AdminRoleResponseDto'];
type AdminUser = components['schemas']['AdminUserResponseDto'];

interface PermissionCategory {
  id: string;
  labelKey: string;
  icon: string;
  prefixes: string[];
}

interface PermissionGroup {
  category: PermissionCategory;
  permissions: string[];
}

const OTHER_CATEGORY: PermissionCategory = { id: 'other', labelKey: 'pages.roles.categoryOther', icon: 'apps', prefixes: [] };

/** Categorías derivadas del prefijo del permiso (products, orders, users, ...). */
const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'catalog',
    labelKey: 'pages.roles.categoryCatalog',
    icon: 'inventory_2',
    prefixes: ['products', 'categories', 'stock', 'variants'],
  },
  {
    id: 'sales',
    labelKey: 'pages.roles.categorySales',
    icon: 'receipt_long',
    prefixes: ['orders', 'coupons', 'currencies', 'shipping_options', 'shipments'],
  },
  {
    id: 'customers',
    labelKey: 'pages.roles.categoryCustomers',
    icon: 'group',
    prefixes: ['customers', 'reviews'],
  },
  {
    id: 'operations',
    labelKey: 'pages.roles.categoryOperations',
    icon: 'precision_manufacturing',
    prefixes: ['production', 'custom_designs', 'queues'],
  },
  {
    id: 'content',
    labelKey: 'pages.roles.categoryContent',
    icon: 'storefront',
    prefixes: ['assets', 'pages', 'store_config', 'email_templates', 'redirects'],
  },
  {
    id: 'integrations',
    labelKey: 'pages.roles.categoryIntegrations',
    icon: 'hub',
    prefixes: ['providers'],
  },
  {
    id: 'system',
    labelKey: 'pages.roles.categorySystem',
    icon: 'verified_user',
    prefixes: ['users', 'roles', 'analytics', 'audit_logs', 'exports', 'dashboard', 'backups'],
  },
];

const AVATAR_STYLES = [
  'bg-surface-container-highest text-on-surface',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-primary-fixed text-on-primary-fixed',
  'bg-primary text-on-primary',
];

const ROLE_ICON_RULES: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['ADMIN', 'MASTER', 'SUPER'], icon: 'shield_person' },
  { keywords: ['PRODUC', 'TALLER', 'OPERAR'], icon: 'precision_manufacturing' },
  { keywords: ['SOPORTE', 'SUPPORT', 'ATENCION'], icon: 'support_agent' },
  { keywords: ['MARKETING', 'CONTENIDO'], icon: 'campaign' },
  { keywords: ['BODEGA', 'INVENTARIO', 'STOCK'], icon: 'inventory_2' },
  { keywords: ['CUSTOMER', 'CLIENTE'], icon: 'person' },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function categoryForPermission(permission: string): PermissionCategory {
  const prefix = permission.split(':')[0];
  return PERMISSION_CATEGORIES.find((category) => category.prefixes.includes(prefix)) ?? OTHER_CATEGORY;
}

function groupPermissions(permissions: string[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const permission of permissions) {
    const category = categoryForPermission(permission);
    const existing = groups.get(category.id);
    if (existing) {
      existing.permissions.push(permission);
    } else {
      groups.set(category.id, { category, permissions: [permission] });
    }
  }
  const order = [...PERMISSION_CATEGORIES.map((category) => category.id), OTHER_CATEGORY.id];
  return [...groups.values()].sort((a, b) => order.indexOf(a.category.id) - order.indexOf(b.category.id));
}

const ALL_PERMISSION_GROUPS = groupPermissions(allPermissions);

function permissionPillLabel(permission: string, t: (key: string) => string) {
  return getPermissionLabel(permission, t).toUpperCase();
}

function roleIcon(role: AdminRole) {
  const haystack = normalize(`${role.name} ${role.description ?? ''}`);
  return ROLE_ICON_RULES.find((rule) => rule.keywords.some((keyword) => haystack.includes(normalize(keyword))))?.icon ?? 'admin_panel_settings';
}

function isCustomerRole(role: AdminRole) {
  const name = normalize(role.name);
  return name.includes('customer') || name.includes('cliente');
}

function userInitials(user: AdminUser) {
  const first = user.firstName?.trim().charAt(0) ?? '';
  const last = user.lastName?.trim().charAt(0) ?? '';
  return `${first}${last}`.toUpperCase() || user.email.charAt(0).toUpperCase();
}

function userShortName(user: AdminUser) {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (!first && !last) return user.email;
  return [first, last ? `${last.charAt(0).toUpperCase()}.` : ''].filter(Boolean).join(' ');
}

function userFullName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}

function PermissionChecklist({
  groups,
  selected,
  onToggle,
}: {
  groups: PermissionGroup[];
  selected: string[];
  onToggle: (permission: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map(({ category, permissions }) => (
        <div key={category.id} className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-on-surface">
            <Icon name={category.icon} className="text-[15px]" />
            {t(category.labelKey)}
          </span>
          <div className="flex flex-col gap-1.5">
            {permissions.map((permission) => (
              <div key={permission} className="flex items-center gap-2">
                <Checkbox
                  checked={selected.includes(permission)}
                  onChange={() => onToggle(permission)}
                  label={getPermissionLabel(permission, t)}
                />
                <span
                  className="cursor-pointer select-none font-body-sm text-body-sm text-on-surface"
                  onClick={() => onToggle(permission)}
                >
                  {getPermissionLabel(permission, t)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RolesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'matrix'>('list');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const createForm = useForm<{ name: string; description: string; permissions: string[] }>({
    initialValues: { name: '', description: '', permissions: [] },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : t('pages.roles.validationNameRequired')),
    },
  });

  const { data: rolesResponse, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users/roles');
      if (error) throw error;
      return data;
    },
  });

  const roles = rolesResponse?.data ?? [];

  const memberQueries = useQueries({
    queries: roles.map((role) => ({
      queryKey: ['admin-role-members', role.name],
      queryFn: async () => {
        const { data, error } = await apiClient.GET('/admin/users', {
          params: { query: { role: role.name, limit: '8' } },
        });
        if (error) throw error;
        return data;
      },
      staleTime: 60_000,
    })),
  });

  const updatePermissions = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }) => {
      const { error } = await apiClient.PATCH('/admin/users/roles/{id}/permissions', {
        params: { path: { id } },
        body: { permissions },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setEditingRoleId(null);
      notifySuccess({ title: t('pages.roles.toastPermissionsUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.roles.toastPermissionsUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const createRole = useMutation({
    mutationFn: async (values: { name: string; description?: string; permissions: string[] }) => {
      const { error } = await apiClient.POST('/admin/users/roles', {
        body: { name: values.name, description: values.description, permissions: values.permissions },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      closeCreate();
      createForm.reset();
      notifySuccess({ title: t('pages.roles.toastRoleCreated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.roles.toastRoleCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const normalizedQuery = normalize(permissionSearch.trim());

  function permissionMatches(permission: string) {
    if (!normalizedQuery) return true;
    return normalize(`${permission} ${getPermissionLabel(permission, t)}`).includes(normalizedQuery);
  }

  function roleMatchesQuery(role: AdminRole) {
    if (!normalizedQuery) return true;
    return (
      normalize(`${role.name} ${role.description ?? ''}`).includes(normalizedQuery) ||
      role.permissions.some((permission) => permissionMatches(permission))
    );
  }

  function pillHighlight(permission: string) {
    if (!normalizedQuery) return '';
    return permissionMatches(permission) ? 'ring-2 ring-primary' : 'opacity-30';
  }

  function startEditing(role: AdminRole) {
    setEditingRoleId(role.id);
    setSelectedPermissions(role.permissions);
  }

  function togglePermission(permission: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((item) => item !== permission) : [...prev, permission],
    );
  }

  function toggleCreatePermission(permission: string) {
    const current = createForm.values.permissions;
    createForm.setFieldValue(
      'permissions',
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  }

  function handleCreate(values: { name: string; description: string; permissions: string[] }) {
    createRole.mutate({
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      permissions: values.permissions,
    });
  }

  const visibleRoles = roles.filter(roleMatchesQuery);
  const matrixGroups = normalizedQuery
    ? groupPermissions(allPermissions.filter((permission) => permissionMatches(permission)))
    : ALL_PERMISSION_GROUPS;

  const customerRoleIndex = roles.findIndex(isCustomerRole);
  const storefrontCount = roles.filter(isCustomerRole).length;
  const adminCount = roles.length - storefrontCount;
  const customerCount =
    customerRoleIndex >= 0 ? memberQueries[customerRoleIndex]?.data?.meta.total ?? 0 : 0;
  const membersReady = memberQueries.length > 0 && memberQueries.every((query) => query.data !== undefined);
  const totalAssigned = memberQueries.reduce((sum, query) => sum + (query.data?.meta.total ?? 0), 0);
  const staffCount = Math.max(totalAssigned - customerCount, 0);

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {/* Breadcrumb & Top Bar */}
        <PageHeader
          breadcrumb={[
            { label: t('pages.roles.breadcrumbCustomers'), href: '/users' },
            { label: t('pages.roles.breadcrumbRoles') },
          ]}
          title={
            <span className="flex flex-wrap items-center gap-3">
              <span>{t('pages.roles.title')}</span>
              <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label-uppercase text-label-uppercase text-on-secondary-container">
                {t('pages.roles.badge')}
              </span>
            </span>
          }
          subtitle={
            <span className="block max-w-2xl">
              {t('pages.roles.subtitle')}
            </span>
          }
          actions={
            <>
              {/* Sin endpoint disponible: deshabilitado a propósito. */}
              <Button variant="secondary" icon="restore" disabled title={t('common.comingSoon')}>
                {t('pages.roles.restorePolicies')}
              </Button>
              <Button icon="add_moderator" onClick={openCreate}>
                {t('pages.roles.newRole')}
              </Button>
            </>
          }
        />

        {isError ? (
          <QueryError onRetry={() => refetch()} retrying={isFetching} />
        ) : isLoading ? (
          <LoadingState />
        ) : roles.length === 0 ? (
          <div className="rounded-xl bg-surface-container-lowest shadow-sm">
            <EmptyState
              icon="admin_panel_settings"
              title={t('pages.roles.emptyTitle')}
              description={t('pages.roles.emptyDescription')}
              action={
                <Button icon="add_moderator" onClick={openCreate}>
                  {t('pages.roles.createRoleTitle')}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.roles.kpiRolesConfigured')}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                    <Icon name="admin_panel_settings" className="text-[18px]" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                    <AnimatedNumber value={roles.length} />
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.roles.activeSuffix')}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>
                    {t('pages.roles.adminBreakdown')
                      .replace('{{admin}}', String(adminCount))
                      .replace('{{storefront}}', String(storefrontCount))}
                  </span>
                </div>
              </div>

              <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.roles.kpiAssignedUsers')}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                    <Icon name="badge" className="text-[18px]" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                    {membersReady ? <AnimatedNumber value={staffCount} /> : '—'}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.roles.internalStaff')}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                  <Icon name="groups" className="text-[16px] text-on-surface-variant" />
                  <span>
                    {membersReady
                      ? t('pages.roles.customerAccounts').replace('{{count}}', String(customerCount))
                      : t('pages.roles.calculatingCustomerAccounts')}
                  </span>
                </div>
              </div>

              <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.roles.kpiPermissionsMatrix')}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                    <Icon name="key" className="text-[18px]" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                    <AnimatedNumber value={allPermissions.length} />
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.roles.capabilities')}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                  <Icon name="check_circle" className="text-[16px] text-emerald-600" />
                  <span>{t('pages.roles.fullyMapped')}</span>
                </div>
              </div>

              {/* Sin endpoint de cumplimiento 2FA: valor estático. */}
              <div
                title={t('common.comingSoon')}
                className="relative flex cursor-not-allowed flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.roles.kpi2faCompliance')}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                    <Icon name="security" className="text-[18px]" />
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                    —
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.roles.noData')}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-surface-container-highest" />
                  <span>{t('pages.roles.no2faEndpoint')}</span>
                </div>
              </div>
            </div>

            {/* Filter & Action Controls */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm md:flex-row">
              <div className="flex w-full flex-1 items-center gap-3 md:w-auto md:max-w-md">
                <Input
                  icon="filter_list"
                  placeholder={t('pages.roles.filterPlaceholder')}
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.currentTarget.value)}
                  className="w-full"
                />
              </div>
              <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-end">
                <SegmentedTabs
                  value={view}
                  options={[
                    {
                      value: 'list',
                      label: (
                        <span className="flex items-center gap-1.5">
                          <Icon name="view_agenda" className="text-[16px]" />
                          <span>{t('pages.roles.viewList')}</span>
                        </span>
                      ),
                    },
                    {
                      value: 'matrix',
                      label: (
                        <span className="flex items-center gap-1.5">
                          <Icon name="table_chart" className="text-[16px]" />
                          <span>{t('pages.roles.viewMatrix')}</span>
                        </span>
                      ),
                    },
                  ]}
                  onChange={(value) => setView(value)}
                  layoutId="roles-view"
                />
                <div className="h-6 w-px bg-surface-container" />
                {/* Sin endpoint disponible: deshabilitado a propósito. */}
                <button
                  type="button"
                  disabled
                  title={t('common.comingSoon')}
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 font-label-sm text-label-sm text-on-surface opacity-60 transition-colors"
                >
                  <Icon name="tune" className="text-[16px]" />
                  <span>{t('pages.roles.filters')}</span>
                </button>
              </div>
            </div>

            {view === 'list' ? (
              <div className="flex flex-col gap-6">
                {visibleRoles.map((role) => {
                  const roleIndex = roles.indexOf(role);
                  const roleMembers = memberQueries[roleIndex]?.data?.data ?? [];
                  const assignedReady = memberQueries[roleIndex]?.data !== undefined;
                  const assignedCount = memberQueries[roleIndex]?.data?.meta.total ?? 0;
                  const editing = editingRoleId === role.id;
                  const customerRole = isCustomerRole(role);
                  const fullyGranted =
                    role.permissions.length === allPermissions.length &&
                    allPermissions.every((permission) => role.permissions.includes(permission));
                  const activeGroups = groupPermissions(role.permissions);

                  return (
                    <div
                      key={role.id}
                      className={`role-card flex flex-col gap-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm transition-all hover:shadow-md ${
                        customerRole ? 'opacity-90' : ''
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                              customerRole
                                ? 'bg-surface-container-high text-on-surface-variant'
                                : fullyGranted
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-surface-container text-on-surface'
                            }`}
                          >
                            <Icon name={roleIcon(role)} className="text-[24px]" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-headline-md text-headline-md font-semibold tracking-tight text-on-surface">
                                {role.name}
                              </span>
                              {role.permissions.length > 0 && (
                                <StatusPill tone="success" label={t('pages.roles.pill2faForced')} />
                              )}
                              <span className="rounded-full bg-surface-container px-2 py-0.5 font-numeric-tabular text-label-sm font-semibold text-on-surface">
                                {assignedReady
                                  ? (assignedCount === 1
                                      ? t('pages.roles.assignedUserSingular')
                                      : t('pages.roles.assignedUserPlural')
                                    ).replace('{{count}}', String(assignedCount))
                                  : t('pages.roles.loadingUsers')}
                              </span>
                            </div>
                            <p className="font-body-md text-body-md text-on-surface-variant">
                              {role.description || t('pages.roles.noDescription')}
                            </p>
                            {roleMembers.length > 0 && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                  {t('pages.roles.membersLabel')}
                                </span>
                                <div className="flex items-center -space-x-1.5">
                                  {roleMembers.slice(0, 3).map((member, index) => (
                                    <div
                                      key={member.id}
                                      title={userFullName(member)}
                                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-surface-container-lowest ${
                                        AVATAR_STYLES[index % AVATAR_STYLES.length]
                                      }`}
                                    >
                                      {userInitials(member)}
                                    </div>
                                  ))}
                                </div>
                                <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">
                                  {roleMembers.slice(0, 3).map(userShortName).join(', ')}
                                  {assignedCount > 3
                                    ? ` ${t('pages.roles.moreMembers').replace(
                                        '{{count}}',
                                        String(assignedCount - 3),
                                      )}`
                                    : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {editing ? (
                            <>
                              <Button
                                icon="save"
                                onClick={() =>
                                  updatePermissions.mutate({ id: role.id, permissions: selectedPermissions })
                                }
                                disabled={updatePermissions.isPending}
                              >
                                {updatePermissions.isPending ? t('common.saving') : t('pages.roles.save')}
                              </Button>
                              <Button variant="secondary" onClick={() => setEditingRoleId(null)}>
                                {t('common.cancel')}
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(role)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-surface-container-low px-3.5 py-1.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
                              >
                                <Icon name="tune" className="text-[16px]" />
                                <span>{t('pages.roles.editPermissions')}</span>
                              </button>
                              {/* Sin endpoint disponible: deshabilitado a propósito. */}
                              <button
                                type="button"
                                disabled
                                title={t('common.comingSoon')}
                                className="flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3.5 py-1.5 font-label-md text-label-md text-on-surface-variant opacity-60 shadow-sm transition-colors"
                              >
                                <Icon name="content_copy" className="text-[16px]" />
                                <span>{t('pages.roles.duplicateRole')}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {editing ? (
                        <div className="flex flex-col gap-4 rounded-xl bg-surface p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-label-uppercase text-label-uppercase font-semibold uppercase text-on-surface-variant">
                              {t('pages.roles.editPermissionsCount')
                                .replace('{{selected}}', String(selectedPermissions.length))
                                .replace('{{total}}', String(allPermissions.length))}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {t('pages.roles.changesAppliedOnSave')}
                            </span>
                          </div>
                          <PermissionChecklist
                            groups={ALL_PERMISSION_GROUPS}
                            selected={selectedPermissions}
                            onToggle={togglePermission}
                          />
                        </div>
                      ) : role.permissions.length === 0 ? (
                        <div className="flex flex-col gap-2 rounded-xl bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="lock" className="text-[18px]" />
                            <span className="font-body-sm text-body-sm font-medium">
                              {t('pages.roles.noBackofficePermissions')}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {t('pages.roles.forbiddenNotice')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 rounded-xl bg-surface p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-label-uppercase text-label-uppercase font-semibold uppercase text-on-surface-variant">
                              {t('pages.roles.activePermissionsCount')
                                .replace('{{selected}}', String(role.permissions.length))
                                .replace('{{total}}', String(allPermissions.length))}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {fullyGranted
                                ? t('pages.roles.allPrivilegesGranted')
                                : t('pages.roles.roleSpecificScope')}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {activeGroups.map(({ category, permissions }) => (
                              <div key={category.id} className="flex flex-col gap-2">
                                <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-on-surface">
                                  <Icon name={category.icon} className="text-[15px]" />
                                  {t(category.labelKey)}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {permissions.map((permission) => (
                                    <span
                                      key={permission}
                                      className={`perm-pill rounded bg-secondary-container/60 px-2 py-1 font-label-uppercase text-[10px] font-semibold text-on-secondary-container ${pillHighlight(
                                        permission,
                                      )}`}
                                    >
                                      {permissionPillLabel(permission, t)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {visibleRoles.length === 0 && (
                  <div className="rounded-xl bg-surface-container-lowest shadow-sm">
                    <EmptyState
                      icon="search_off"
                      title={t('pages.roles.emptyResultsTitle')}
                      description={t('pages.roles.emptyResultsDescription')}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                <div className="flex flex-col gap-2 bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.roles.matrixTitle')}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.roles.matrixSubtitle')}
                    </p>
                  </div>
                  <span className="w-fit rounded-md bg-surface-container-lowest px-2.5 py-1 font-label-uppercase text-label-uppercase text-on-surface-variant">
                    {t('pages.roles.matrixActivePermissions').replace('{{count}}', String(allPermissions.length))}
                  </span>
                </div>
                {matrixGroups.length === 0 ? (
                  <EmptyState
                    icon="search_off"
                    title={t('pages.roles.emptyResultsTitle')}
                    description={t('pages.roles.matrixEmptyDescription')}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-body-sm text-body-sm">
                      <thead>
                        <tr className="bg-surface font-label-uppercase text-[11px] tracking-wider text-on-surface-variant">
                          <th className="px-6 py-3 font-semibold">{t('pages.roles.matrixModulePermission')}</th>
                          {roles.map((role) => (
                            <th key={role.id} className="w-36 px-4 py-3 text-center font-semibold">
                              {role.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <motion.tbody
                        variants={tableRowsContainer}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-surface-container"
                      >
                        {matrixGroups.map(({ category, permissions }) => (
                          <Fragment key={category.id}>
                            <tr className="bg-surface-container-low/70">
                              <td colSpan={1 + roles.length} className="px-6 py-2">
                                <span className="flex items-center gap-1.5 font-label-uppercase text-label-uppercase text-on-surface-variant">
                                  <Icon name={category.icon} className="text-[15px]" />
                                  {t(category.labelKey)}
                                </span>
                              </td>
                            </tr>
                            {permissions.map((permission) => (
                              <motion.tr
                                variants={fadeInUp}
                                key={permission}
                                className="transition-colors hover:bg-surface"
                              >
                                <td className="px-6 py-3">
                                  <span className="flex flex-col">
                                    <span className="font-medium text-on-surface">
                                      {permissionPillLabel(permission, t)}
                                    </span>
                                    <span className="font-mono text-[11px] text-on-surface-variant">{permission}</span>
                                  </span>
                                </td>
                                {roles.map((role) => {
                                  const granted = role.permissions.includes(permission);
                                  return (
                                    <td
                                      key={role.id}
                                      className={`px-4 py-3 text-center ${
                                        granted ? 'text-emerald-600' : 'text-on-surface-variant/40'
                                      }`}
                                    >
                                      <Icon
                                        name={granted ? 'check_circle' : 'remove'}
                                        className="text-[18px]"
                                      />
                                    </td>
                                  );
                                })}
                              </motion.tr>
                            ))}
                          </Fragment>
                        ))}
                      </motion.tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Security & RBAC Notice Footer Card */}
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-surface-container-low p-5 shadow-sm md:flex-row md:items-center">
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-on-surface">
                  <Icon name="info" className="text-[20px]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {t('pages.roles.rbacNoticeTitle')}
                  </span>
                  <p className="mt-0.5 max-w-3xl font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.roles.rbacNoticeBody')}
                  </p>
                </div>
              </div>
              <Link
                href="/audit-logs"
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface"
              >
                <span>{t('pages.roles.viewAuditLogs')}</span>
                <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Modal: Crear Nuevo Rol */}
      <AppModal
        opened={createOpened}
        onClose={closeCreate}
        title={t('pages.roles.createRoleTitle')}
        subtitle={t('pages.roles.createRoleSubtitle')}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeCreate}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="add_moderator"
              onClick={() => createForm.onSubmit(handleCreate)()}
              disabled={createRole.isPending}
            >
              {createRole.isPending ? t('pages.roles.creatingRole') : t('pages.roles.createRoleSubmit')}
            </Button>
          </>
        }
      >
        <form onSubmit={createForm.onSubmit(handleCreate)} className="flex flex-col gap-4">
          <Field label={t('pages.roles.fieldName')} required>
            <Input placeholder={t('pages.roles.fieldNamePlaceholder')} {...createForm.getInputProps('name')} />
            {createForm.errors.name && (
              <span className="font-label-sm text-label-sm text-error">{createForm.errors.name}</span>
            )}
          </Field>

          <Field label={t('pages.roles.fieldDescription')}>
            <Textarea
              rows={2}
              placeholder={t('pages.roles.fieldDescriptionPlaceholder')}
              {...createForm.getInputProps('description')}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
              {t('pages.roles.permissionsCount')
                .replace('{{selected}}', String(createForm.values.permissions.length))
                .replace('{{total}}', String(allPermissions.length))}
            </span>
            <PermissionChecklist
              groups={ALL_PERMISSION_GROUPS}
              selected={createForm.values.permissions}
              onToggle={toggleCreatePermission}
            />
          </div>
        </form>
      </AppModal>
    </>
  );
}
