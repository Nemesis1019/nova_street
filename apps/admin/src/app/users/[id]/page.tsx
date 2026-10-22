'use client';

import type { components } from '@ecommerce/api-client';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { LoadingState } from '../../../components/loading-state';
import { AppModal } from '../../../components/ui/app-modal';
import { Button } from '../../../components/ui/button';
import { Card, EmptyState } from '../../../components/ui/card';
import { Icon } from '../../../components/ui/icon';
import { Field, Select, Textarea } from '../../../components/ui/input';
import { QueryError } from '../../../components/ui/query-error';
import { StatusPill, StatusTone } from '../../../components/ui/status-pill';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';
import { useTranslation } from '../../../providers/i18n-provider';

type AdminUser = components['schemas']['AdminUserResponseDto'];
type UserOrder = components['schemas']['UserOrderDto'];
type UserOrderItem = components['schemas']['UserOrderItemDto'];

interface UserAddressView {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

const ORDER_STATUS_META: Record<string, { labelKey: string; tone: StatusTone }> = {
  PENDING_PAYMENT: { labelKey: 'pages.orders.statusPendingPayment', tone: 'warning' },
  PAID: { labelKey: 'pages.orders.statusPaid', tone: 'info' },
  IN_PRODUCTION: { labelKey: 'pages.userDetail.statusInProduction', tone: 'warning' },
  READY_TO_SHIP: { labelKey: 'pages.userDetail.statusReadyToShip', tone: 'info' },
  SHIPPED: { labelKey: 'pages.orders.statusShipped', tone: 'info' },
  DELIVERED: { labelKey: 'pages.orders.statusDelivered', tone: 'neutral' },
  CANCELLED: { labelKey: 'pages.orders.statusCancelled', tone: 'danger' },
  REFUNDED: { labelKey: 'pages.orders.statusRefunded', tone: 'danger' },
};

const PAYMENT_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'PENDING', tone: 'warning' },
  AUTHORIZED: { label: 'AUTHORIZED', tone: 'info' },
  PAID: { label: 'PAID', tone: 'success' },
  FAILED: { label: 'FAILED', tone: 'danger' },
  REFUNDED: { label: 'REFUNDED', tone: 'neutral' },
};

const ROLE_LABEL_KEYS: Record<string, string> = {
  ADMIN: 'pages.userDetail.roleAdmin',
  CUSTOMER: 'pages.userDetail.roleCustomer',
};

function formatPrice(value: number) {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CO');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(value: string, t: (key: string) => string) {
  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return '';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('pages.userDetail.relativeJustNow');
  if (minutes < 60) return t('pages.userDetail.relativeMinutes').replace('{{count}}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t(hours === 1 ? 'pages.userDetail.relativeHoursSingular' : 'pages.userDetail.relativeHoursPlural').replace(
      '{{count}}',
      String(hours),
    );
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return t(days === 1 ? 'pages.userDetail.relativeDaysSingular' : 'pages.userDetail.relativeDaysPlural').replace(
      '{{count}}',
      String(days),
    );
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return t(months === 1 ? 'pages.userDetail.relativeMonthsSingular' : 'pages.userDetail.relativeMonthsPlural').replace(
      '{{count}}',
      String(months),
    );
  }
  const years = Math.floor(months / 12);
  return t(years === 1 ? 'pages.userDetail.relativeYearsSingular' : 'pages.userDetail.relativeYearsPlural').replace(
    '{{count}}',
    String(years),
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(user: AdminUser) {
  const parts = [user.firstName, user.lastName].filter((part): part is string => Boolean(part && part.trim()));
  if (parts.length > 0) {
    return parts
      .map((part) => part.trim().charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return (user.email.charAt(0) || '?').toUpperCase();
}

function summarizeItems(items: UserOrderItem[], t: (key: string) => string) {
  if (items.length === 0) return { label: t('pages.userDetail.noItems'), extra: 0 };
  const [first] = items;
  return {
    label: `${first.quantity}x ${first.name || t('pages.userDetail.itemFallback')}`,
    extra: items.length - 1,
  };
}

function getDefaultAddress(user: AdminUser): UserAddressView | null {
  // El DTO actual no expone direcciones; si la API las agrega, se renderizan sin tocar esta página.
  const candidate = user as AdminUser & { defaultAddress?: UserAddressView; address?: UserAddressView };
  const address = candidate.defaultAddress ?? candidate.address;
  if (!address) return null;
  const hasValue = Boolean(
    address.line1 || address.line2 || address.city || address.state || address.postalCode || address.country,
  );
  return hasValue ? address : null;
}

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [suspendOpened, { open: openSuspendModal, close: closeSuspendModal }] = useDisclosure(false);
  const [roleOpened, { open: openRoleModal, close: closeRoleModal }] = useDisclosure(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [roleSelection, setRoleSelection] = useState('');

  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isUserError,
    isFetching: isUserFetching,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: ordersResponse, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['admin-user-orders', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await apiClient.GET('/admin/users/{id}/orders', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: rolesResponse } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users/roles');
      if (error) throw error;
      return data;
    },
  });

  const suspendUser = useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/suspend', {
        params: { path: { id } },
        body: { reason: reason.trim() || undefined },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSuspendReason('');
      closeSuspendModal();
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      notifySuccess({ title: t('pages.users.toastUserSuspended') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastSuspendError'), message: getApiErrorMessage(error) });
    },
  });

  const unsuspendUser = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/unsuspend', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      notifySuccess({ title: t('pages.users.toastUserReactivated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastReactivateError'), message: getApiErrorMessage(error) });
    },
  });

  const updateRole = useMutation({
    mutationFn: async (roleName: string) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/role', {
        params: { path: { id } },
        body: { roleName },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      closeRoleModal();
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      notifySuccess({ title: t('pages.users.toastRoleUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.users.toastRoleUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const orders = ordersResponse?.data ?? [];
  const orderCount = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const averageTicket = orderCount > 0 ? totalSpent / orderCount : 0;
  const latestOrder = orders.reduce<UserOrder | null>((latest, order) => {
    if (!latest) return order;
    return new Date(order.createdAt).getTime() > new Date(latest.createdAt).getTime() ? order : latest;
  }, null);
  const deliveredCount = orders.filter((order) => order.status === 'DELIVERED').length;
  const completedPercent = orderCount > 0 ? Math.round((deliveredCount / orderCount) * 100) : 0;
  const isFrequent = orderCount >= 3;

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '—';
  const address = user ? getDefaultAddress(user) : null;
  const roleOptions = rolesResponse?.data.length
    ? rolesResponse.data.map((role) => role.name)
    : ['ADMIN', 'CUSTOMER'];

  const statusDotClass = user?.isSuspended
    ? 'bg-rose-500'
    : user?.isActive
      ? 'bg-emerald-500'
      : 'bg-amber-500';
  const statusIcon = user?.isSuspended ? 'close' : user?.isActive ? 'check' : 'remove';
  const statusTitle = user?.isSuspended
    ? t('pages.userDetail.statusSuspended')
    : user?.isActive
      ? t('pages.userDetail.statusActive')
      : t('pages.userDetail.statusInactive');

  async function copyEmail() {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.email);
      notifySuccess({ title: t('pages.userDetail.emailCopied') });
    } catch {
      notifyError({ title: t('pages.userDetail.emailCopyError') });
    }
  }

  function handleOpenRoleModal() {
    if (!user) return;
    setRoleSelection(user.role.name);
    openRoleModal();
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        {/* 1. Header: breadcrumb, volver, título y acciones */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              <span>{t('pages.users.breadcrumbCustomers')}</span>
              <span className="text-outline-variant">/</span>
              <Link href="/users" className="transition-colors hover:text-primary">
                {t('pages.userDetail.breadcrumbUsers')}
              </Link>
              <span className="text-outline-variant">/</span>
              <span className="font-medium text-on-surface">{displayName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/users"
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-low"
              >
                <Icon name="arrow_back" className="text-[16px]" />
                <span>{t('pages.userDetail.backToUsers')}</span>
              </Link>
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{t('pages.userDetail.title')}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              icon="lock_reset"
              iconClassName="text-[16px]"
              disabled
              title={t('common.comingSoon')}
            >
              {t('pages.userDetail.resetPassword')}
            </Button>
            <Button
              variant={user?.isSuspended ? 'primary' : 'danger'}
              icon={user?.isSuspended ? 'lock_open' : 'block'}
              iconClassName="text-[16px]"
              onClick={() => (user?.isSuspended ? unsuspendUser.mutate() : openSuspendModal())}
              disabled={!user || suspendUser.isPending || unsuspendUser.isPending}
              title={
                user?.isSuspended
                  ? t('pages.userDetail.reactivateAccountTitle')
                  : t('pages.userDetail.suspendAccountTitle')
              }
            >
              {user?.isSuspended ? t('pages.users.actionReactivate') : t('pages.userDetail.suspendAccount')}
            </Button>
            <Button icon="edit" iconClassName="text-[16px]" disabled title={t('common.comingSoon')}>
              {t('pages.userDetail.editProfile')}
            </Button>
          </div>
        </div>

        {isUserError ? (
          <QueryError onRetry={() => refetchUser()} retrying={isUserFetching} />
        ) : isLoadingUser ? (
          <LoadingState />
        ) : user ? (
          <>
            {/* 2. Card master de perfil */}
            <div className="relative flex flex-col gap-6 overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-surface-container/60 blur-2xl" />
              <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-fixed font-headline-md text-headline-md font-semibold tracking-tight text-on-secondary-fixed shadow-sm">
                      {getInitials(user)}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface-container-lowest ${statusDotClass}`}
                      title={statusTitle}
                    >
                      <Icon name={statusIcon} className="text-[12px] text-white" />
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-headline-md text-headline-md text-on-surface">{displayName}</h2>
                      {user.emailVerified && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-label-sm text-label-sm text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          <span>{t('pages.userDetail.verifiedBuyer')}</span>
                        </span>
                      )}
                      {isFrequent && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-secondary-container">
                          <Icon name="loyalty" className="text-[13px]" />
                          <span>{t('pages.userDetail.frequentCustomer')}</span>
                        </span>
                      )}
                    </div>
                    <p className="flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                      <span>{t('pages.userDetail.systemId')}</span>
                      <code className="break-all rounded bg-surface-container-low px-1.5 py-0.5 font-numeric-tabular text-label-sm text-on-surface">
                        USR-{user.id}
                      </code>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <button
                    type="button"
                    disabled
                    title={t('common.comingSoon')}
                    className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Icon name="send" className="text-[16px]" />
                    <span>{t('pages.userDetail.sendMessage')}</span>
                  </button>
                  <button
                    type="button"
                    disabled
                    title={t('common.comingSoon')}
                    aria-label={t('pages.userDetail.moreOptions')}
                    className="rounded-lg bg-surface-container-low p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Icon name="more_vert" className="text-[20px]" />
                  </button>
                </div>
              </div>

              {/* Metadata en 4 celdas */}
              <div className="relative z-10 grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col justify-between gap-1.5 rounded-lg bg-surface-container-low p-4">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.emailRegistered')}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-body-md text-body-md font-medium text-on-surface">{user.email}</span>
                    <button
                      type="button"
                      onClick={copyEmail}
                      title={t('pages.userDetail.copyEmailTitle')}
                      className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                    >
                      <Icon name="content_copy" className="text-[16px]" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-1.5 rounded-lg bg-surface-container-low p-4">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.contactPhone')}
                  </span>
                  {/* El DTO de usuario no expone teléfono: celda informativa. */}
                  <span className="font-numeric-tabular font-body-md text-body-md font-medium text-on-surface-variant">
                    {t('pages.userDetail.notRegistered')}
                  </span>
                </div>

                <div className="flex flex-col justify-between gap-1.5 rounded-lg bg-surface-container-low p-4">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.assignedRole')}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-surface-container px-2 py-0.5 font-numeric-tabular text-label-sm text-on-surface">
                      {user.role.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenRoleModal}
                      className="font-label-sm text-label-sm text-on-surface-variant underline transition-colors hover:text-primary"
                    >
                      {t('pages.userDetail.change')}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-1.5 rounded-lg bg-surface-container-low p-4">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.customerSince')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Icon name="calendar_today" className="text-[16px] text-on-surface-variant" />
                    <span className="font-body-sm text-body-sm text-on-surface">
                      {formatDate(user.createdAt)}{' '}
                      <span className="text-on-surface-variant">({formatRelative(user.createdAt, t)})</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. KPIs de valor de vida del cliente (LTV) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.totalSpent')}
                  </span>
                  <span className="rounded-lg bg-surface-container-low p-2 text-on-surface">
                    <Icon name="payments" className="text-[18px]" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {formatPrice(totalSpent)}{' '}
                    <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">ARS</span>
                  </span>
                  {/* Tendencia estática del diseño: la API no expone histórico de gasto. */}
                  <span className="inline-flex items-center gap-0.5 font-label-sm text-label-sm text-emerald-600">
                    <Icon name="trending_up" className="text-[14px]" />
                    <span>+18%</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.totalOrders')}
                  </span>
                  <span className="rounded-lg bg-surface-container-low p-2 text-on-surface">
                    <Icon name="shopping_bag" className="text-[18px]" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {orderCount}{' '}
                    <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">
                      {t('pages.userDetail.purchases')}
                    </span>
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.userDetail.completedPercent').replace('{{percent}}', String(completedPercent))}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.averageTicket')}
                  </span>
                  <span className="rounded-lg bg-surface-container-low p-2 text-on-surface">
                    <Icon name="receipt" className="text-[18px]" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {formatPrice(averageTicket)}{' '}
                    <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">ARS</span>
                  </span>
                  {/* Badge estático del diseño: no hay segmentación de clientes en la API. */}
                  <span className="rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-label-sm text-on-surface">
                    {t('pages.userDetail.highTier')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t('pages.userDetail.lastPurchase')}
                  </span>
                  <span className="rounded-lg bg-secondary-container p-2 text-on-secondary-container">
                    <Icon name="schedule" className="text-[18px]" />
                  </span>
                </div>
                <div className="mt-3 flex flex-col">
                  <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {latestOrder ? capitalize(formatRelative(latestOrder.createdAt, t)) : t('pages.userDetail.noPurchases')}
                  </span>
                  <span className="font-numeric-tabular text-body-sm text-on-surface-variant">
                    {latestOrder
                      ? t('pages.userDetail.orderRef').replace('{{id}}', latestOrder.id.slice(0, 8))
                      : t('pages.userDetail.noOrdersYet')}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Workspace de dos columnas */}
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Columna izquierda: órdenes y reseñas */}
              <div className="flex flex-col gap-8 lg:col-span-8">
                {/* Historial de Órdenes */}
                <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <Icon name="order_approve" className="text-[22px] text-primary" />
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        {t('pages.userDetail.orderHistory')}
                      </h3>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                        {orderCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Filtro estático del diseño: la API no expone filtros por usuario. */}
                      <button
                        type="button"
                        disabled
                        title={t('common.comingSoon')}
                        className="flex items-center gap-1 px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon name="filter_list" className="text-[16px]" />
                        <span>{t('pages.userDetail.filter')}</span>
                      </button>
                    </div>
                  </div>

                  {isLoadingOrders ? (
                    <div className="px-6 pb-6">
                      <LoadingState />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="px-6 pb-6">
                      <EmptyState
                        icon="receipt_long"
                        title={t('pages.userDetail.emptyOrdersTitle')}
                        description={t('pages.userDetail.emptyOrdersDescription')}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                              <th className="rounded-l-lg px-3 py-3">{t('pages.userDetail.columnOrderId')}</th>
                              <th className="px-3 py-3">{t('pages.orders.columnDate')}</th>
                              <th className="px-3 py-3">{t('pages.orders.items')}</th>
                              <th className="px-3 py-3">{t('pages.orders.columnPayment')}</th>
                              <th className="px-3 py-3">{t('pages.orders.columnStatus')}</th>
                              <th className="px-3 py-3 text-right">{t('pages.orders.columnTotal')}</th>
                              <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.userDetail.columnAction')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => {
                              const statusMeta = ORDER_STATUS_META[order.status] ?? {
                                labelKey: '',
                                tone: 'neutral' as StatusTone,
                              };
                              const paymentMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
                                label: order.paymentStatus,
                                tone: 'neutral' as StatusTone,
                              };
                              const items = summarizeItems(order.items, t);
                              return (
                                <tr
                                  key={order.id}
                                  className="group border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                                >
                                  <td className="px-3 py-3.5">
                                    <span className="font-numeric-tabular text-body-md font-semibold text-on-surface">
                                      #{order.id.slice(0, 8)}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3.5 font-body-sm text-body-sm text-on-surface-variant">
                                    {formatDate(order.createdAt)}
                                  </td>
                                  <td className="px-3 py-3.5">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-container">
                                        <Icon name="checkroom" className="text-[16px] text-on-surface-variant" />
                                      </div>
                                      <span className="max-w-[180px] truncate font-body-sm text-body-sm font-medium text-on-surface">
                                        {items.label}
                                        {items.extra > 0
                                          ? ` · ${t('pages.userDetail.extraItems').replace('{{count}}', String(items.extra))}`
                                          : ''}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3.5">
                                    <StatusPill label={paymentMeta.label} tone={paymentMeta.tone} />
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3.5">
                                    <StatusPill
                                      label={statusMeta.labelKey ? t(statusMeta.labelKey) : order.status}
                                      tone={statusMeta.tone}
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3.5 text-right">
                                    <span className="font-numeric-tabular text-body-md font-semibold text-on-surface">
                                      {formatPrice(order.totalAmount)}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3.5 text-right">
                                    <Link
                                      href={`/orders/${order.id}`}
                                      className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm transition-all group-hover:bg-primary group-hover:text-on-primary"
                                    >
                                      <span>{t('pages.userDetail.viewDetail')}</span>
                                      <Icon name="arrow_forward" className="text-[14px]" />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low/30 p-4 font-label-sm text-label-sm text-on-surface-variant">
                        <span>
                          {(orderCount === 1
                            ? t('pages.userDetail.showingOrdersSingular')
                            : t('pages.userDetail.showingOrdersPlural')
                          ).replace('{{count}}', String(orderCount))}
                        </span>
                        <span className="font-medium text-on-surface">
                          {t('pages.userDetail.totalHistorical')} {formatPrice(totalSpent)} ARS
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Reseñas & Opiniones */}
                <div className="flex flex-col gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon name="rate_review" className="text-[22px] text-primary" />
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">
                        {t('pages.userDetail.reviewsTitle')}
                      </h3>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                        0
                      </span>
                    </div>
                    <Link
                      href="/reviews"
                      className="font-label-sm text-label-sm text-on-surface-variant underline transition-colors hover:text-on-surface"
                    >
                      {t('pages.userDetail.viewInModeration')}
                    </Link>
                  </div>
                  {/* Sin endpoint de reseñas por usuario: card informativa, sin datos inventados. */}
                  <EmptyState
                    icon="rate_review"
                    title={t('pages.userDetail.emptyReviewsTitle')}
                    description={t('pages.userDetail.emptyReviewsDescription')}
                  />
                </div>
              </div>

              {/* Columna derecha: dirección, marketing, notas y actividad */}
              <div className="flex flex-col gap-6 lg:col-span-4">
                {/* Dirección Predeterminada */}
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-on-surface">
                      <Icon name="local_shipping" className="text-[20px]" />
                      <h3 className="font-headline-sm text-headline-sm">{t('pages.userDetail.defaultAddress')}</h3>
                    </div>
                    {address && (
                      <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface">
                        {t('pages.userDetail.primaryBadge')}
                      </span>
                    )}
                  </div>
                  {address ? (
                    <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-4">
                      <div className="flex items-start gap-2.5">
                        <Icon name="pin_drop" className="mt-0.5 shrink-0 text-[18px] text-on-surface-variant" />
                        <div className="flex flex-col">
                          <span className="font-body-md text-body-md font-medium text-on-surface">{address.line1}</span>
                          {address.line2 && (
                            <span className="font-body-sm text-body-sm text-on-surface-variant">{address.line2}</span>
                          )}
                          {(address.postalCode || address.city || address.state) && (
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {[address.postalCode, address.city, address.state].filter(Boolean).join(' — ')}
                            </span>
                          )}
                          {address.country && (
                            <span className="font-body-sm text-body-sm text-on-surface-variant">{address.country}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-surface-container-low p-6 text-center">
                      <Icon name="pin_drop" className="text-[24px] text-on-surface-variant" />
                      <span className="font-body-sm text-body-sm font-medium text-on-surface">
                        {t('pages.userDetail.noAddress')}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {t('pages.userDetail.noAddressDescription')}
                      </span>
                    </div>
                  )}
                </Card>

                {/* Preferencias de Marketing */}
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-on-surface">
                      <Icon name="mark_email_read" className="text-[20px]" />
                      <h3 className="font-headline-sm text-headline-sm">{t('pages.userDetail.marketingPreferences')}</h3>
                    </div>
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                      {t('common.comingSoon')}
                    </span>
                  </div>
                  {/* Sin endpoint de preferencias: canales del diseño deshabilitados sin datos. */}
                  <div className="flex flex-col gap-3" title={t('common.comingSoon')} aria-disabled="true">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3 opacity-60">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-medium text-on-surface">
                          {t('pages.userDetail.newsletterSubscription')}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {t('pages.userDetail.optInCheckout')}
                        </span>
                      </div>
                      <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                        —
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3 opacity-60">
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-medium text-on-surface">
                          {t('pages.userDetail.preferredChannels')}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {t('pages.userDetail.orderUpdates')}
                        </span>
                      </div>
                      <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                        —
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Notas Internas */}
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-on-surface">
                      <Icon name="sticky_note_2" className="text-[20px]" />
                      <h3 className="font-headline-sm text-headline-sm">{t('pages.userDetail.internalNotes')}</h3>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {t('pages.userDetail.staffOnly')}
                    </span>
                  </div>
                  {/* Sin endpoint de notas internas: textarea y guardado deshabilitados. */}
                  <div className="flex flex-col gap-2">
                    <Textarea
                      rows={2}
                      disabled
                      title={t('common.comingSoon')}
                      placeholder={t('pages.userDetail.notePlaceholder')}
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        icon="add"
                        iconClassName="text-[14px]"
                        disabled
                        title={t('common.comingSoon')}
                      >
                        {t('pages.userDetail.saveNote')}
                      </Button>
                    </div>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.userDetail.internalNotesDescription')}
                  </p>
                </Card>

                {/* Actividad & Seguridad */}
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-on-surface">
                    <Icon name="security" className="text-[20px]" />
                    <h3 className="font-headline-sm text-headline-sm">{t('pages.userDetail.activitySecurity')}</h3>
                  </div>
                  <div className="flex flex-col gap-3 font-body-sm text-body-sm">
                    <div className="flex items-start gap-3">
                      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${statusDotClass}`} />
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{t('pages.userDetail.accountStatus')}</span>
                        <span className="text-on-surface-variant">
                          {user.isSuspended
                            ? t('pages.userDetail.accountSuspended')
                            : user.isActive
                              ? t('pages.userDetail.accountActive')
                              : t('pages.userDetail.accountInactive')}
                        </span>
                        {user.isSuspended && user.suspendedAt && (
                          <span className="font-label-sm text-label-sm text-on-surface-variant/80">
                            {t('pages.userDetail.suspendedSince').replace('{{date}}', formatDateTime(user.suspendedAt))}
                          </span>
                        )}
                        {user.isSuspended && user.suspendedReason && (
                          <span className="font-label-sm text-label-sm text-on-surface-variant/80">
                            {t('pages.userDetail.suspensionReason').replace('{{reason}}', user.suspendedReason)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                          user.emailVerified ? 'bg-emerald-500' : 'bg-surface-container-highest'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{t('pages.userDetail.emailConfirmed')}</span>
                        <span className="text-on-surface-variant">
                          {user.emailVerified ? t('pages.users.verified') : t('pages.userDetail.verificationPending')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-surface-container-highest" />
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{t('pages.userDetail.accountCreated')}</span>
                        <span className="text-on-surface-variant">{formatDateTime(user.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-start pt-2">
                    <Link
                      href="/audit-logs"
                      className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary"
                    >
                      <span>{t('pages.userDetail.viewAuditLog')}</span>
                      <Icon name="arrow_forward" className="text-[14px]" />
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </>
        ) : null}

        {/* Modal de suspensión */}
        <AppModal
          opened={suspendOpened}
          onClose={closeSuspendModal}
          title={t('pages.userDetail.suspendAccount')}
          subtitle={t('pages.users.suspendSubtitle')}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={closeSuspendModal}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                icon="block"
                onClick={() => suspendUser.mutate(suspendReason)}
                disabled={suspendUser.isPending}
              >
                {suspendUser.isPending ? t('pages.users.suspending') : t('pages.userDetail.suspendAccount')}
              </Button>
            </>
          }
        >
          <Field label={t('pages.userDetail.suspendReasonOptional')} hint={t('pages.userDetail.suspendReasonHint')}>
            <Textarea
              rows={3}
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.currentTarget.value)}
              placeholder={t('pages.userDetail.suspendReasonPlaceholder')}
            />
          </Field>
        </AppModal>

        {/* Modal de cambio de rol */}
        <AppModal
          opened={roleOpened}
          onClose={closeRoleModal}
          title={t('pages.userDetail.changeRoleTitle')}
          subtitle={user ? t('pages.userDetail.currentRole').replace('{{role}}', user.role.name) : undefined}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={closeRoleModal}>
                {t('common.cancel')}
              </Button>
              <Button
                icon="check"
                onClick={() => updateRole.mutate(roleSelection)}
                disabled={!roleSelection || roleSelection === user?.role.name || updateRole.isPending}
              >
                {updateRole.isPending ? t('common.saving') : t('pages.userDetail.saveRole')}
              </Button>
            </>
          }
        >
          <Field label={t('pages.userDetail.newRole')} required>
            <Select value={roleSelection} onChange={(event) => setRoleSelection(event.currentTarget.value)}>
              {roleOptions.map((roleName) => (
                <option key={roleName} value={roleName}>
                  {ROLE_LABEL_KEYS[roleName] ? t(ROLE_LABEL_KEYS[roleName]) : roleName}
                </option>
              ))}
            </Select>
          </Field>
        </AppModal>
      </div>
    </>
  );
}
