'use client';

import { Menu } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select } from '../../components/ui/input';
import { fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { StatusPill, StatusTone } from '../../components/ui/status-pill';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient, getAuthToken } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

const orderStatuses = [
  { value: 'PENDING_PAYMENT', labelKey: 'pages.orders.statusPendingPayment' },
  { value: 'PAID', labelKey: 'pages.orders.statusPaid' },
  { value: 'IN_PRODUCTION', labelKey: 'pages.orders.statusInProduction' },
  { value: 'READY_TO_SHIP', labelKey: 'pages.orders.statusReadyToShip' },
  { value: 'SHIPPED', labelKey: 'pages.orders.statusShipped' },
  { value: 'DELIVERED', labelKey: 'pages.orders.statusDelivered' },
  { value: 'CANCELLED', labelKey: 'pages.orders.statusCancelled' },
  { value: 'REFUNDED', labelKey: 'pages.orders.statusRefunded' },
];

const paymentStatuses = [
  { value: 'PENDING', labelKey: 'pages.orders.paymentPending' },
  { value: 'AUTHORIZED', labelKey: 'pages.orders.paymentAuthorized' },
  { value: 'PAID', labelKey: 'pages.orders.paymentPaid' },
  { value: 'FAILED', labelKey: 'pages.orders.paymentFailed' },
  { value: 'REFUNDED', labelKey: 'pages.orders.paymentRefunded' },
];

const ORDER_STATUS_META: Record<string, { labelKey: string; tone: StatusTone }> = {
  PENDING_PAYMENT: { labelKey: 'pages.orders.metaPending', tone: 'warning' },
  PAID: { labelKey: 'pages.orders.metaPaid', tone: 'secondary' },
  IN_PRODUCTION: { labelKey: 'pages.orders.metaInProduction', tone: 'neutral' },
  READY_TO_SHIP: { labelKey: 'pages.orders.metaReadyToShip', tone: 'info' },
  SHIPPED: { labelKey: 'pages.orders.metaShipped', tone: 'info' },
  DELIVERED: { labelKey: 'pages.orders.metaDelivered', tone: 'success' },
  CANCELLED: { labelKey: 'pages.orders.metaCancelled', tone: 'danger' },
  REFUNDED: { labelKey: 'pages.orders.metaRefunded', tone: 'danger' },
};

const PAYMENT_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'PENDING', tone: 'warning' },
  AUTHORIZED: { label: 'AUTHORIZED', tone: 'info' },
  PAID: { label: 'PAID', tone: 'secondary' },
  FAILED: { label: 'FAILED', tone: 'danger' },
  REFUNDED: { label: 'REFUNDED', tone: 'neutral' },
};

function formatPrice(amount: number) {
  return `$${amount.toLocaleString('es-CO')}`;
}

type OrderColumnKey = 'customer' | 'total' | 'status' | 'payment' | 'date' | 'actions';

interface SavedFilter {
  id: string;
  name: string;
  search: string;
  statusFilter: string | null;
  paymentFilter: string | null;
}

const ALL_ORDER_COLUMNS: { key: Exclude<OrderColumnKey, 'actions'>; labelKey: string; shortKey: string }[] = [
  { key: 'customer', labelKey: 'pages.orders.columnCustomer', shortKey: 'pages.orders.columnCustomer' },
  { key: 'total', labelKey: 'pages.orders.columnTotal', shortKey: 'pages.orders.columnTotal' },
  { key: 'status', labelKey: 'pages.orders.columnStatus', shortKey: 'pages.orders.columnStatus' },
  { key: 'payment', labelKey: 'pages.orders.columnPayment', shortKey: 'pages.orders.columnPayment' },
  { key: 'date', labelKey: 'pages.orders.columnDate', shortKey: 'pages.orders.columnDate' },
];

const PAGE_SIZES = [10, 25, 50];

export default function OrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<OrderColumnKey[]>({
    key: 'admin-orders-visible-columns',
    defaultValue: ['customer', 'total', 'status', 'payment', 'date', 'actions'],
  });
  const [savedFilters, setSavedFilters] = useLocalStorage<SavedFilter[]>({
    key: 'admin-orders-saved-filters',
    defaultValue: [],
  });
  const [filterName, setFilterName] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string; status: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  const [manualOpened, { open: openManual, close: closeManual }] = useDisclosure(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ variantId: string; quantity: number }>>([
    { variantId: '', quantity: 1 },
  ]);
  const [manualShippingOptionId, setManualShippingOptionId] = useState('');
  const [manualPaymentStatus, setManualPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [manualAdminNotes, setManualAdminNotes] = useState('');
  const [manualUseNewAddress, setManualUseNewAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    line1: '',
    city: '',
    state: '',
    country: 'Colombia',
    zipCode: '',
    phone: '',
  });

  const { data: manualVariants } = useQuery({
    queryKey: ['admin-inventory', 'manual-order'],
    enabled: manualOpened,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/inventory', {
        params: { query: { limit: '100' } },
      });
      if (error) throw error;
      return data?.data ?? [];
    },
  });

  const { data: manualShippingOptions } = useQuery({
    queryKey: ['shipping-options', 'manual-order'],
    enabled: manualOpened,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/shipping-options');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ordersResponse, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-orders', page, limit, search, statusFilter, paymentFilter],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/orders', {
        params: {
          query: {
            page: String(page),
            limit: String(limit),
            search: search || undefined,
            status: statusFilter || undefined,
            paymentStatus: paymentFilter || undefined,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-order', detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const { data, error } = await apiClient.GET('/admin/orders/{id}', {
        params: { path: { id: detailId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(detailId),
  });

  const { data: totalOrders = 0 } = useQuery({
    queryKey: ['orders-kpi-total'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/orders', { params: { query: { limit: '1' } } });
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: metrics } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/dashboard/metrics');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: monthSales } = useQuery({
    queryKey: ['orders-kpi-average-ticket'],
    queryFn: async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data } = await apiClient.GET('/admin/analytics/sales', {
        params: { query: { from: from.toISOString(), to: now.toISOString() } },
      });
      return data;
    },
    staleTime: 60_000,
  });

  const { data: cancelledTotal = 0 } = useQuery({
    queryKey: ['orders-kpi-cancelled'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/orders', {
        params: { query: { limit: '1', status: 'CANCELLED' } },
      });
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: refundedTotal = 0 } = useQuery({
    queryKey: ['orders-kpi-refunded'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/orders', {
        params: { query: { limit: '1', status: 'REFUNDED' } },
      });
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/status', {
        params: { path: { id } },
        body: { status } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', detailId] });
      notifySuccess({ title: t('pages.orders.toastStatusUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orders.toastStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: string }) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/payment-status', {
        params: { path: { id } },
        body: { paymentStatus } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', detailId] });
      notifySuccess({ title: t('pages.orders.toastPaymentUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orders.toastPaymentError'), message: getApiErrorMessage(error) });
    },
  });

  const updateTracking = useMutation({
    mutationFn: async ({ id, trackingNumber, carrier }: { id: string; trackingNumber: string; carrier: string }) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/tracking', {
        params: { path: { id } },
        body: { trackingNumber, carrier } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', detailId] });
      notifySuccess({ title: t('pages.orders.toastTrackingUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orders.toastTrackingError'), message: getApiErrorMessage(error) });
    },
  });

  const bulkStatus = useMutation({
    mutationFn: async ({ status, ids }: { status: string; ids: string[] }) => {
      const { error } = await apiClient.POST('/admin/orders/bulk/status', {
        body: { status, ids } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds([]);
      notifySuccess({ title: t('pages.orders.toastBulkStatusUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orders.toastBulkStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const bulkPaymentStatus = useMutation({
    mutationFn: async ({ paymentStatus, ids }: { paymentStatus: string; ids: string[] }) => {
      const { error } = await apiClient.PATCH('/admin/orders/bulk/payment-status', {
        body: { paymentStatus, ids } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds([]);
      notifySuccess({ title: t('pages.orders.toastBulkPaymentUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orders.toastBulkPaymentError'), message: getApiErrorMessage(error) });
    },
  });

  const createManualOrder = useMutation({
    mutationFn: async () => {
      if (!manualEmail.trim()) {
        throw new Error(t('pages.orders.manualEmailRequired'));
      }
      const items = manualItems
        .filter((item) => item.variantId)
        .map((item) => ({
          variantId: item.variantId,
          quantity: Math.max(1, Math.floor(item.quantity) || 1),
        }));
      if (items.length === 0) {
        throw new Error(t('pages.orders.manualItemsRequired'));
      }
      if (manualUseNewAddress) {
        const required = [
          manualAddress.line1,
          manualAddress.city,
          manualAddress.state,
          manualAddress.country,
          manualAddress.zipCode,
        ];
        if (required.some((value) => !value.trim())) {
          throw new Error(t('pages.orders.manualAddressRequired'));
        }
      }

      const { error } = await apiClient.POST('/admin/orders/manual', {
        body: {
          email: manualEmail.trim(),
          items,
          ...(manualShippingOptionId ? { shippingOptionId: manualShippingOptionId } : {}),
          ...(manualUseNewAddress
            ? {
                address: {
                  line1: manualAddress.line1.trim(),
                  city: manualAddress.city.trim(),
                  state: manualAddress.state.trim(),
                  country: manualAddress.country.trim(),
                  zipCode: manualAddress.zipCode.trim(),
                  ...(manualAddress.phone.trim() ? { phone: manualAddress.phone.trim() } : {}),
                },
              }
            : {}),
          paymentStatus: manualPaymentStatus,
          ...(manualAdminNotes.trim() ? { adminNotes: manualAdminNotes.trim() } : {}),
        } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      closeManual();
      notifySuccess({ title: t('pages.orders.toastManualCreated') });
      setManualEmail('');
      setManualItems([{ variantId: '', quantity: 1 }]);
      setManualShippingOptionId('');
      setManualPaymentStatus('PENDING');
      setManualAdminNotes('');
      setManualUseNewAddress(false);
      setManualAddress({ line1: '', city: '', state: '', country: 'Colombia', zipCode: '', phone: '' });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orders.toastManualError'), message: getApiErrorMessage(error) });
    },
  });

  const orders = ordersResponse?.data ?? [];
  const total = ordersResponse?.meta?.total ?? 0;
  const totalPages = total ? Math.ceil(total / limit) : 1;

  useEffect(() => {
    if (detail) {
      setTrackingNumber(detail.trackingNumber ?? '');
      setCarrier(detail.carrier ?? '');
    }
  }, [detail]);

  function handleOpenDetail(id: string) {
    setDetailId(id);
    openDetail();
  }

  function handleStatusChange(id: string, status: string) {
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      setPendingStatusChange({ id, status });
      openConfirm();
      return;
    }
    updateStatus.mutate({ id, status });
  }

  function confirmStatusChange() {
    if (pendingStatusChange) {
      updateStatus.mutate(pendingStatusChange);
      setPendingStatusChange(null);
      closeConfirm();
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]));
  }

  function toggleAll() {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  }

  function saveFilter() {
    if (!filterName.trim()) return;
    const newFilter: SavedFilter = {
      id: `${Date.now()}`,
      name: filterName.trim(),
      search,
      statusFilter,
      paymentFilter,
    };
    setSavedFilters((current) => [...current, newFilter]);
    setFilterName('');
    notifySuccess({ title: t('pages.orders.toastFilterSaved') });
  }

  function loadFilter(id: string | null) {
    if (!id) return;
    const filter = savedFilters.find((f) => f.id === id);
    if (!filter) return;
    setSearch(filter.search);
    setStatusFilter(filter.statusFilter);
    setPaymentFilter(filter.paymentFilter);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter(null);
    setPaymentFilter(null);
    setPage(1);
  }

  const exportSelection = () => {
    const selected = orders.filter((order) => selectedIds.includes(order.id));
    const rows = [
      [
        t('pages.orders.csvOrder'),
        t('pages.orders.columnCustomer'),
        t('pages.orders.columnTotal'),
        t('pages.orders.columnStatus'),
        t('pages.orders.columnPayment'),
        t('pages.orders.columnDate'),
      ],
    ];
    selected.forEach((order) => {
      rows.push([
        order.id,
        order.user.email,
        String(order.totalAmount),
        order.status,
        order.paymentStatus,
        order.createdAt,
      ]);
    });
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ordenes-seleccionadas-${selectedIds.length}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportOrders = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admin/export/orders`, {
        headers: { Authorization: `Bearer ${getAuthToken() ?? ''}` },
      });
      if (!response.ok) throw new Error(t('pages.orders.exportErrorMessage'));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ordenes-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notifyError({ title: t('pages.orders.toastExportError'), message: getApiErrorMessage(error) });
    }
  };

  const isVisible = (key: OrderColumnKey) => visibleColumns.includes(key);
  const visibleNonActionColumns = ALL_ORDER_COLUMNS.filter((column) => isVisible(column.key));
  const hiddenColumns = ALL_ORDER_COLUMNS.filter((column) => !isVisible(column.key));
  const cancellationRate = totalOrders ? ((cancelledTotal + refundedTotal) / totalOrders) * 100 : 0;

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          overline={
            <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-secondary">
              {t('pages.orders.overline')}
            </span>
          }
          title={
            <span className="flex flex-wrap items-center gap-3">
              {t('pages.orders.title')}
              <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                {t('pages.orders.registered').replace('{{count}}', String(totalOrders))}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-secondary-fixed">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t('pages.orders.pendingProcessing').replace('{{count}}', String(metrics?.pendingOrders ?? 0))}
              </span>
            </span>
          }
          actions={
            <>
              <Button variant="secondary" icon="file_download" onClick={exportOrders}>
                {t('pages.orders.exportCsv')}
              </Button>
              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <Button variant="secondary" icon="view_column">
                    {t('pages.orders.columns')}
                    <Icon name="keyboard_arrow_down" className="text-[16px]" />
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {ALL_ORDER_COLUMNS.map((column) => (
                    <Menu.Item
                      key={column.key}
                      onClick={() => {
                        const next = isVisible(column.key)
                          ? visibleColumns.filter((key) => key !== column.key)
                          : [...visibleColumns.filter((key) => key !== 'actions'), column.key, 'actions'];
                        setVisibleColumns(next as OrderColumnKey[]);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Icon
                          name={isVisible(column.key) ? 'check_box' : 'check_box_outline_blank'}
                          className="text-[16px]"
                        />
                        {t(column.labelKey)}
                      </span>
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
              <button
                type="button"
                onClick={openManual}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary shadow-md transition-colors hover:bg-surface-tint"
              >
                <Icon name="add" className="text-[18px]" />
                {t('pages.orders.createManualOrder')}
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider">
                {t('pages.orders.kpiTotalOrders')}
              </span>
              <Icon name="receipt_long" className="text-[20px]" />
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                {totalOrders}
              </span>
              <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary">
                <Icon name="calendar_today" className="text-[14px]" />
                {t('pages.orders.thisMonth')}
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider">
                {t('pages.orders.kpiPending')}
              </span>
              <Icon name="pending_actions" className="text-[20px]" />
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                {metrics?.pendingOrders ?? 0}
              </span>
              <span className="rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-label-sm font-medium text-on-surface">
                {t('pages.orders.priority')}
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider">
                {t('pages.orders.kpiAverageTicket')}
              </span>
              <Icon name="analytics" className="text-[20px]" />
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                {formatPrice(monthSales?.averageOrderValue ?? 0)}
              </span>
              <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface">
                <Icon name="trending_up" className="text-[14px]" />
                {t('pages.orders.currentMonth')}
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between text-secondary">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider">
                {t('pages.orders.kpiCancellationRefund')}
              </span>
              <Icon name="assignment_return" className="text-[20px]" />
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                {cancellationRate.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary">
                <Icon name="verified" className="text-[14px]" />
                {t('pages.orders.optimalControl')}
              </span>
            </div>
          </div>
        </div>

        <Card className="p-0">
          <div className="grid grid-cols-1 gap-4 border-b border-outline-variant/30 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.orders.searchLabel')}
              </label>
              <Input
                icon="search"
                variant="filled"
                placeholder={t('pages.orders.searchPlaceholder')}
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.orders.orderStatusLabel')}
              </label>
              <Select
                value={statusFilter ?? ''}
                onChange={(event) => {
                  setStatusFilter(event.currentTarget.value || null);
                  setPage(1);
                }}
              >
                <option value="">{t('pages.orders.allStatuses')}</option>
                {orderStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {t(status.labelKey)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.orders.paymentStatusLabel')}
              </label>
              <Select
                value={paymentFilter ?? ''}
                onChange={(event) => {
                  setPaymentFilter(event.currentTarget.value || null);
                  setPage(1);
                }}
              >
                <option value="">{t('pages.orders.allPayments')}</option>
                {paymentStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {t(status.labelKey)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.orders.savedFilters')}
              </label>
              <div className="flex items-center gap-2">
                <Select
                  icon="bookmark"
                  value=""
                  onChange={(event) => loadFilter(event.currentTarget.value || null)}
                  className="flex-1"
                >
                  <option value="">{t('pages.orders.defaultFilters')}</option>
                  {savedFilters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.name}
                    </option>
                  ))}
                </Select>
                <Menu position="bottom-end" shadow="md">
                  <Menu.Target>
                    <button
                      type="button"
                      title={t('pages.orders.saveCurrentFilter')}
                      className="flex items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                    >
                      <Icon name="bookmark_add" className="text-[18px]" />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <div className="flex items-center gap-2 p-2">
                      <input
                        value={filterName}
                        onChange={(event) => setFilterName(event.currentTarget.value)}
                        placeholder={t('pages.orders.filterNamePlaceholder')}
                        className="w-44 rounded-lg border border-outline-variant/50 px-2 py-1.5 font-body-sm text-body-sm focus:border-primary focus:outline-none"
                      />
                      <Button variant="secondary" onClick={saveFilter} disabled={!filterName.trim()}>
                        {t('pages.orders.save')}
                      </Button>
                    </div>
                  </Menu.Dropdown>
                </Menu>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-label-uppercase text-label-uppercase text-on-surface-variant/70">
                {t('pages.orders.visibleColumns')}
              </span>
              {visibleNonActionColumns.map((column) => (
                <span
                  key={column.key}
                  className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-on-surface"
                >
                  {t(column.shortKey)}
                  <button
                    type="button"
                    aria-label={t('pages.orders.hideColumn').replace('{{name}}', t(column.labelKey))}
                    onClick={() => setVisibleColumns(visibleColumns.filter((key) => key !== column.key))}
                    className="text-on-surface-variant transition-colors hover:text-error"
                  >
                    <Icon name="close" className="text-[13px]" />
                  </button>
                </span>
              ))}
              {hiddenColumns.length > 0 && (
                <Menu position="bottom-end" shadow="md">
                  <Menu.Target>
                    <button
                      type="button"
                      title={t('pages.orders.addColumn')}
                      className="flex items-center rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                    >
                      <Icon name="add" className="text-[16px]" />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {hiddenColumns.map((column) => (
                      <Menu.Item
                        key={column.key}
                        onClick={() =>
                          setVisibleColumns([...visibleColumns.filter((key) => key !== 'actions'), column.key, 'actions'])
                        }
                      >
                        {t(column.labelKey)}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              )}
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-secondary transition-colors hover:text-on-surface"
            >
              <Icon name="restart_alt" className="text-[16px]" />
              {t('pages.orders.clearFilters')}
            </button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-inverse-surface px-4 py-3 text-inverse-on-surface">
              <span className="flex items-center gap-2 font-body-sm text-body-sm">
                <Icon name="check_circle" className="text-[18px]" />
                {t('pages.orders.selectedCount').replace('{{count}}', String(selectedIds.length))}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Menu position="bottom-end" shadow="md">
                  <Menu.Target>
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 px-3 py-1.5 font-label-sm text-label-sm transition-colors hover:bg-white/10"
                    >
                      {t('pages.orders.changeStatus')}
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {orderStatuses.map((status) => (
                      <Menu.Item
                        key={status.value}
                        onClick={() => bulkStatus.mutate({ status: status.value, ids: selectedIds })}
                      >
                        {t(status.labelKey)}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
                <button
                  type="button"
                  onClick={() => bulkPaymentStatus.mutate({ paymentStatus: 'PAID', ids: selectedIds })}
                  className="rounded-lg border border-white/20 px-3 py-1.5 font-label-sm text-label-sm transition-colors hover:bg-white/10"
                >
                  {t('pages.orders.markAsPaid')}
                </button>
                <button
                  type="button"
                  disabled
                  title={t('pages.orders.comingSoon')}
                  className="cursor-not-allowed rounded-lg border border-white/20 px-3 py-1.5 font-label-sm text-label-sm opacity-50"
                >
                  {t('pages.orders.assignProduction')}
                </button>
                <button
                  type="button"
                  onClick={exportSelection}
                  className="rounded-lg bg-white px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-white/90"
                >
                  {t('pages.orders.exportSelection')}
                </button>
              </div>
            </div>
          )}

          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={10} columns={8} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title={t('pages.orders.emptyTitle')}
              description={t('pages.orders.emptyDescription')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <th className="w-12 rounded-l-lg px-3 py-3">
                      <Checkbox
                        checked={orders.length > 0 && selectedIds.length === orders.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < orders.length}
                        onChange={toggleAll}
                        label={t('pages.orders.selectAll')}
                      />
                    </th>
                    {isVisible('customer') && <th className="px-3 py-3">{t('pages.orders.tableCustomer')}</th>}
                    {isVisible('total') && <th className="px-3 py-3">{t('pages.orders.columnTotal')}</th>}
                    {isVisible('status') && <th className="px-3 py-3">{t('pages.orders.tableOrderStatus')}</th>}
                    {isVisible('payment') && <th className="px-3 py-3">{t('pages.orders.tablePaymentStatus')}</th>}
                    {isVisible('date') && <th className="px-3 py-3">{t('pages.orders.tableDate')}</th>}
                    {isVisible('actions') && (
                      <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.orders.tableActions')}</th>
                    )}
                  </tr>
                </thead>
                <motion.tbody variants={tableRowsContainer} initial="hidden" animate="visible">
                  {orders.map((order) => {
                    const statusMeta = ORDER_STATUS_META[order.status] ?? {
                      labelKey: '',
                      tone: 'neutral' as StatusTone,
                    };
                    const paymentMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
                      label: order.paymentStatus,
                      tone: 'neutral' as StatusTone,
                    };
                    return (
                      <motion.tr
                        variants={fadeInUp}
                        key={order.id}
                        className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                      >
                        <td className="px-3 py-3.5">
                          <Checkbox
                            checked={selectedIds.includes(order.id)}
                            onChange={() => toggleSelection(order.id)}
                            label={t('pages.orders.selectOrder').replace('{{id}}', order.id)}
                          />
                        </td>
                        {isVisible('customer') && (
                          <td className="px-3 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-numeric-tabular text-body-sm font-semibold text-on-surface">
                                {order.user.email}
                              </span>
                              <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                                <span className="font-mono">#{order.id.slice(0, 8)}</span>
                                <span>•</span>
                                <span>
                                  {t('pages.orders.itemsCount').replace('{{count}}', String(order.items.length))}
                                </span>
                              </span>
                            </div>
                          </td>
                        )}
                        {isVisible('total') && (
                          <td className="px-3 py-3.5 font-numeric-tabular text-body-sm font-semibold text-on-surface">
                            {formatPrice(order.totalAmount)}
                          </td>
                        )}
                        {isVisible('status') && (
                          <td className="px-3 py-3.5">
                            <StatusPill
                              label={statusMeta.labelKey ? t(statusMeta.labelKey) : order.status}
                              tone={statusMeta.tone}
                            />
                          </td>
                        )}
                        {isVisible('payment') && (
                          <td className="px-3 py-3.5">
                            <StatusPill label={paymentMeta.label} tone={paymentMeta.tone} />
                          </td>
                        )}
                        {isVisible('date') && (
                          <td className="px-3 py-3.5 font-label-sm text-label-sm text-on-surface-variant">
                            {new Date(order.createdAt).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        )}
                        {isVisible('actions') && (
                          <td className="px-3 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetail(order.id)}
                                className="rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                              >
                                {t('pages.orders.viewEdit')}
                              </button>
                              <Link
                                href={`/orders/${order.id}`}
                                title={t('pages.orders.openFullDetail')}
                                className="flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                              >
                                <Icon name="arrow_forward" className="text-[18px]" />
                              </Link>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}

          {!isLoading && orders.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 px-4 pb-4">
              <div className="flex items-center gap-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.orders.rowsLabel')}</span>
                <SegmentedTabs
                  value={String(limit)}
                  options={PAGE_SIZES.map((size) => ({ value: String(size), label: size }))}
                  onChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                  layoutId="orders-page-size"
                />
              </div>
              <div className="flex-1">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                  summary={t('pages.orders.paginationSummary')
                    .replace('{{start}}', String((page - 1) * limit + 1))
                    .replace('{{end}}', String(Math.min(page * limit, total)))
                    .replace('{{total}}', String(total))}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <AppModal
        opened={detailOpened}
        onClose={closeDetail}
        title={t('pages.orders.detailTitle').replace('{{id}}', detail?.id?.slice(0, 8) ?? '')}
        subtitle={detail ? t('pages.orders.detailSubtitle').replace('{{email}}', detail.user.email) : undefined}
        size="xl"
        footer={
          detail ? (
            <Link
              href={`/orders/${detail.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 px-3.5 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
            >
              {t('pages.orders.openDetailPage')}
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          ) : null
        }
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-surface-container-low p-3">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.orders.columnTotal')}
                </span>
                <p className="font-headline-sm text-headline-sm font-bold font-numeric-tabular text-on-surface">
                  {formatPrice(detail.totalAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-3">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.orders.columnDate')}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface">
                  {new Date(detail.createdAt).toLocaleString('es-CO')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.orders.orderStatusLabel')}
                </label>
                <Select
                  value={detail.status}
                  onChange={(event) => event.currentTarget.value && handleStatusChange(detail.id, event.currentTarget.value)}
                >
                  {orderStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {t(status.labelKey)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.orders.paymentStatusLabel')}
                </label>
                <Select
                  value={detail.paymentStatus}
                  onChange={(event) =>
                    event.currentTarget.value &&
                    updatePaymentStatus.mutate({ id: detail.id, paymentStatus: event.currentTarget.value })
                  }
                >
                  {paymentStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {t(status.labelKey)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/30 p-4">
              <p className="mb-3 font-body-sm text-body-sm font-semibold text-on-surface">
                {t('pages.orders.shipping')}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  placeholder={t('pages.orders.trackingPlaceholder')}
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.currentTarget.value)}
                />
                <Input
                  placeholder={t('pages.orders.carrierPlaceholder')}
                  value={carrier}
                  onChange={(event) => setCarrier(event.currentTarget.value)}
                />
              </div>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => updateTracking.mutate({ id: detail.id, trackingNumber, carrier })}
                disabled={updateTracking.isPending}
              >
                {updateTracking.isPending ? t('common.saving') : t('pages.orders.saveTracking')}
              </Button>
            </div>

            <div>
              <p className="mb-3 font-body-sm text-body-sm font-semibold text-on-surface">
                {t('pages.orders.items')}
              </p>
              <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                      <th className="px-3 py-2.5">{t('pages.orders.itemProduct')}</th>
                      <th className="px-3 py-2.5">{t('pages.orders.itemQuantity')}</th>
                      <th className="px-3 py-2.5">{t('pages.orders.itemUnitPrice')}</th>
                      <th className="px-3 py-2.5">{t('pages.orders.itemProduction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.id} className="border-b border-outline-variant/20 last:border-0">
                        <td className="px-3 py-3 font-body-sm text-body-sm text-on-surface">
                          {item.type === 'STANDARD'
                            ? item.productVariant?.product?.name ?? t('pages.orders.itemProduct')
                            : item.customDesign?.designTemplate?.name ?? t('pages.orders.customDesignFallback')}
                        </td>
                        <td className="px-3 py-3 font-numeric-tabular text-body-sm text-on-surface">{item.quantity}</td>
                        <td className="px-3 py-3 font-numeric-tabular text-body-sm text-on-surface">
                          {formatPrice(item.unitPrice)}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill label={item.productionStatus} tone="neutral" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AppModal>

      <AppModal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={t('pages.orders.confirmTitle')}
        subtitle={t('pages.orders.confirmSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmStatusChange} disabled={updateStatus.isPending}>
              {t('pages.orders.confirm')}
            </Button>
          </>
        }
      >
        <p className="font-body-sm text-body-sm text-on-surface">
          {t('pages.orders.confirmPrefix')}{' '}
          <strong>
            {t(orderStatuses.find((s) => s.value === pendingStatusChange?.status)?.labelKey ?? '')}
          </strong>
          {t('pages.orders.confirmSuffix')}
        </p>
      </AppModal>

      {/* Modal: crear orden manual */}
      <AppModal
        opened={manualOpened}
        onClose={closeManual}
        title={t('pages.orders.manualTitle')}
        subtitle={t('pages.orders.manualSubtitle')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeManual}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="add"
              iconClassName="text-[18px]"
              disabled={createManualOrder.isPending}
              onClick={() => createManualOrder.mutate()}
            >
              {createManualOrder.isPending ? t('common.saving') : t('pages.orders.manualSubmit')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label={t('pages.orders.manualEmailLabel')} required hint={t('pages.orders.manualEmailHint')}>
            <Input
              type="email"
              placeholder="cliente@email.com"
              value={manualEmail}
              onChange={(event) => setManualEmail(event.currentTarget.value)}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
              {t('pages.orders.manualItemsLabel')}
            </span>
            {manualItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  className="flex-1"
                  value={item.variantId}
                  onChange={(event) =>
                    setManualItems((prev) =>
                      prev.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, variantId: event.currentTarget.value } : row,
                      ),
                    )
                  }
                >
                  <option value="">{t('pages.orders.manualVariantPlaceholder')}</option>
                  {(manualVariants ?? []).map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.sku}
                      {variant.product?.name ? ` — ${variant.product.name}` : ''}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  value={item.quantity}
                  onChange={(event) =>
                    setManualItems((prev) =>
                      prev.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, quantity: Number(event.currentTarget.value) }
                          : row,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={t('pages.orders.manualRemoveItem')}
                  disabled={manualItems.length === 1}
                  onClick={() => setManualItems((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                  className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-40"
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              icon="add"
              iconClassName="text-[16px]"
              onClick={() => setManualItems((prev) => [...prev, { variantId: '', quantity: 1 }])}
            >
              {t('pages.orders.manualAddItem')}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('pages.orders.manualShippingLabel')}>
              <Select
                value={manualShippingOptionId}
                onChange={(event) => setManualShippingOptionId(event.currentTarget.value)}
              >
                <option value="">{t('pages.orders.manualShippingNone')}</option>
                {(manualShippingOptions ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} — ${option.price.toLocaleString('es-CO')}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('pages.orders.manualPaymentLabel')}>
              <Select
                value={manualPaymentStatus}
                onChange={(event) => setManualPaymentStatus(event.currentTarget.value as 'PENDING' | 'PAID')}
              >
                <option value="PENDING">{t('pages.orders.paymentPending')}</option>
                <option value="PAID">{t('pages.orders.statusPaid')}</option>
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/30 p-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={manualUseNewAddress}
                onChange={() => setManualUseNewAddress((current) => !current)}
                label={t('pages.orders.manualNewAddress')}
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.orders.manualNewAddress')}
              </span>
            </div>
            {manualUseNewAddress && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('pages.orders.manualAddressLine1')} required className="sm:col-span-2">
                  <Input
                    value={manualAddress.line1}
                    onChange={(event) =>
                      setManualAddress((prev) => ({ ...prev, line1: event.currentTarget.value }))
                    }
                  />
                </Field>
                <Field label={t('pages.orders.manualAddressCity')} required>
                  <Input
                    value={manualAddress.city}
                    onChange={(event) =>
                      setManualAddress((prev) => ({ ...prev, city: event.currentTarget.value }))
                    }
                  />
                </Field>
                <Field label={t('pages.orders.manualAddressState')} required>
                  <Input
                    value={manualAddress.state}
                    onChange={(event) =>
                      setManualAddress((prev) => ({ ...prev, state: event.currentTarget.value }))
                    }
                  />
                </Field>
                <Field label={t('pages.orders.manualAddressCountry')} required>
                  <Input
                    value={manualAddress.country}
                    onChange={(event) =>
                      setManualAddress((prev) => ({ ...prev, country: event.currentTarget.value }))
                    }
                  />
                </Field>
                <Field label={t('pages.orders.manualAddressZip')} required>
                  <Input
                    value={manualAddress.zipCode}
                    onChange={(event) =>
                      setManualAddress((prev) => ({ ...prev, zipCode: event.currentTarget.value }))
                    }
                  />
                </Field>
                <Field label={t('pages.orders.manualAddressPhone')} className="sm:col-span-2">
                  <Input
                    value={manualAddress.phone}
                    onChange={(event) =>
                      setManualAddress((prev) => ({ ...prev, phone: event.currentTarget.value }))
                    }
                  />
                </Field>
              </div>
            )}
          </div>

          <Field label={t('pages.orders.manualNotesLabel')}>
            <Input
              value={manualAdminNotes}
              onChange={(event) => setManualAdminNotes(event.currentTarget.value)}
            />
          </Field>
        </div>
      </AppModal>
    </>
  );
}
