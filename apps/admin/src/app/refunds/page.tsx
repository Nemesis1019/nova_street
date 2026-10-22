'use client';

import type { components } from '@ecommerce/api-client';
import { useForm } from '@mantine/form';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactNode, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { StatusPill, StatusTone } from '../../components/ui/status-pill';
import { TableSkeletonRows } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type RefundRecord = components['schemas']['RefundResponseDto'] & {
  createdBy?: { firstName: string; lastName: string; email: string } | null;
};

type RefundDetail = RefundRecord & {
  payment?: { id: string; provider?: string | null; providerTransactionId?: string | null } | null;
};

type TabId = 'all' | 'PENDING' | 'COMPLETED' | 'FAILED';

const PAGE_SIZE = 20;

const STATUS_META: Record<string, { labelKey: string; tone: StatusTone }> = {
  COMPLETED: { labelKey: 'pages.refunds.statusCompleted', tone: 'success' },
  FAILED: { labelKey: 'pages.refunds.statusFailed', tone: 'danger' },
  PENDING: { labelKey: 'pages.refunds.statusPending', tone: 'warning' },
};

const TABS: Array<{ id: TabId; labelKey: string }> = [
  { id: 'all', labelKey: 'pages.refunds.tabAll' },
  { id: 'PENDING', labelKey: 'pages.refunds.tabPending' },
  { id: 'COMPLETED', labelKey: 'pages.refunds.tabCompleted' },
  { id: 'FAILED', labelKey: 'pages.refunds.tabFailed' },
];

const STATUS_OPTIONS = [
  { value: '', labelKey: 'pages.refunds.statusOptionAll' },
  { value: 'COMPLETED', labelKey: 'pages.refunds.statusOptionCompleted' },
  { value: 'PENDING', labelKey: 'pages.refunds.statusOptionPending' },
  { value: 'FAILED', labelKey: 'pages.refunds.statusOptionFailed' },
];

function formatPrice(amount: number) {
  return `$${amount.toLocaleString('es-CO')}`;
}

function formatDateTime(value: string, suffix: string) {
  const formatted = new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatted} ${suffix}`;
}

function createdByLabel(refund: RefundRecord, fallback: string) {
  if (!refund.createdBy) return fallback;
  const name = [refund.createdBy.firstName, refund.createdBy.lastName].filter(Boolean).join(' ').trim();
  return name || refund.createdBy.email;
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function RefundsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filterForm = useForm({
    initialValues: { status: '', search: '' },
  });

  const queryClient = useQueryClient();
  const [manualOpen, setManualOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ id: string; action: 'approve' | 'reject' | 'retry' } | null>(null);

  const manualForm = useForm({
    initialValues: { orderId: '', amount: '', reason: '' },
    validate: {
      orderId: (value) => (value ? null : t('pages.refunds.validationOrderRequired')),
      amount: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed);
        return Number.isInteger(parsed) && parsed > 0 ? null : t('pages.refunds.validationAmountInvalid');
      },
      reason: (value) => (value.trim().length >= 3 ? null : t('pages.refunds.validationReasonRequired')),
    },
  });

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-refunds', page, filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/refunds', {
        params: {
          query: {
            page: String(page),
            limit: String(PAGE_SIZE),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.search ? { search: filters.search } : {}),
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-refunds', 'stats'],
    queryFn: async () => {
      const [allResponse, pendingResponse, completedResponse, failedResponse] = await Promise.all([
        apiClient.GET('/admin/refunds', { params: { query: { page: '1', limit: '100' } } }),
        apiClient.GET('/admin/refunds', { params: { query: { page: '1', limit: '1', status: 'PENDING' } } }),
        apiClient.GET('/admin/refunds', { params: { query: { page: '1', limit: '1', status: 'COMPLETED' } } }),
        apiClient.GET('/admin/refunds', { params: { query: { page: '1', limit: '1', status: 'FAILED' } } }),
      ]);
      const { data: allData, error: allError } = allResponse;
      const { data: pendingData, error: pendingError } = pendingResponse;
      const { data: completedData, error: completedError } = completedResponse;
      const { data: failedData, error: failedError } = failedResponse;
      if (allError) throw allError;
      if (pendingError) throw pendingError;
      if (completedError) throw completedError;
      if (failedError) throw failedError;

      const sample = allData?.data ?? [];
      const now = new Date();
      const monthTotal = sample.reduce((sum, refund) => {
        const created = new Date(refund.createdAt);
        const isCurrentMonth =
          created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
        return isCurrentMonth ? sum + refund.amount : sum;
      }, 0);

      return {
        all: allData?.meta.total ?? 0,
        pending: pendingData?.meta.total ?? 0,
        completed: completedData?.meta.total ?? 0,
        failed: failedData?.meta.total ?? 0,
        monthTotal,
      };
    },
    staleTime: 60_000,
  });

  const { data: totalOrders } = useQuery({
    queryKey: ['admin-orders', 'total-count'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/orders', { params: { query: { limit: '1' } } });
      return data?.meta.total ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: orderOptions = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders', 'refund-select'],
    enabled: manualOpen,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/orders', {
        params: { query: { page: '1', limit: '100' } },
      });
      if (error) throw error;
      return data?.data ?? [];
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-refunds', 'detail', detailId],
    enabled: Boolean(detailId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/refunds/{id}', {
        params: { path: { id: detailId as string } },
      });
      if (error) throw error;
      return data;
    },
  });

  const detailRecord = detail as RefundDetail | undefined;

  const invalidateRefunds = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.PATCH('/admin/refunds/{id}/approve', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    onSuccess: (refund) => {
      invalidateRefunds();
      setConfirmState(null);
      if (refund?.status === 'COMPLETED') {
        notifySuccess({ title: t('pages.refunds.toastApproved') });
      } else {
        notifyError({ title: t('pages.refunds.toastApproveFailed') });
      }
    },
    onError: (error) => {
      notifyError({ title: t('pages.refunds.toastApproveError'), message: getApiErrorMessage(error) });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/refunds/{id}/reject', { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateRefunds();
      setConfirmState(null);
      notifySuccess({ title: t('pages.refunds.toastRejected') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.refunds.toastRejectError'), message: getApiErrorMessage(error) });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.PATCH('/admin/refunds/{id}/retry', { params: { path: { id } } });
      if (error) throw error;
      return data;
    },
    onSuccess: (refund) => {
      invalidateRefunds();
      if (refund?.status === 'COMPLETED') {
        notifySuccess({ title: t('pages.refunds.toastRetried') });
      } else {
        notifyError({ title: t('pages.refunds.toastRetryFailed') });
      }
    },
    onError: (error) => {
      notifyError({ title: t('pages.refunds.toastRetryError'), message: getApiErrorMessage(error) });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: { orderId: string; amount: string; reason: string }) => {
      const { error } = await apiClient.POST('/admin/refunds', {
        body: {
          orderId: values.orderId,
          reason: values.reason.trim(),
          ...(values.amount.trim() ? { amount: Number(values.amount) } : {}),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateRefunds();
      setManualOpen(false);
      manualForm.reset();
      notifySuccess({ title: t('pages.refunds.toastCreated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.refunds.toastCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const confirmMeta = confirmState
    ? confirmState.action === 'approve'
      ? {
          title: t('pages.refunds.confirmApproveTitle'),
          body: t('pages.refunds.confirmApproveBody'),
          tone: 'primary' as const,
          pending: approveMutation.isPending,
          run: () => approveMutation.mutate(confirmState.id),
        }
      : confirmState.action === 'reject'
        ? {
            title: t('pages.refunds.confirmRejectTitle'),
            body: t('pages.refunds.confirmRejectBody'),
            tone: 'danger' as const,
            pending: rejectMutation.isPending,
            run: () => rejectMutation.mutate(confirmState.id),
          }
        : {
            title: t('pages.refunds.confirmRetryTitle'),
            body: t('pages.refunds.confirmRetryBody'),
            tone: 'primary' as const,
            pending: retryMutation.isPending,
            run: () => retryMutation.mutate(confirmState.id),
          }
    : null;

  const records = (data?.data ?? []) as RefundRecord[];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const counts: Record<TabId, number> = {
    all: stats?.all ?? 0,
    PENDING: stats?.pending ?? 0,
    COMPLETED: stats?.completed ?? 0,
    FAILED: stats?.failed ?? 0,
  };

  const refundRate = totalOrders && stats ? (stats.all / totalOrders) * 100 : null;

  const allSelected = records.length > 0 && records.every((refund) => selectedIds.includes(refund.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );
  };

  const toggleAll = () => {
    const visibleIds = records.map((refund) => refund.id);
    setSelectedIds((previous) =>
      allSelected ? previous.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...previous, ...visibleIds])),
    );
  };

  const changeTab = (tab: TabId) => {
    const status = tab === 'all' ? '' : tab;
    setFilters((current) => ({ ...current, status }));
    filterForm.setFieldValue('status', status);
    setPage(1);
    setSelectedIds([]);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setSelectedIds([]);
  };

  const exportCsv = () => {
    const selectedRecords = selectedIds.length > 0 ? records.filter((refund) => selectedIds.includes(refund.id)) : records;
    const rows: string[][] = [
      [
        t('pages.refunds.csvOrder'),
        t('pages.refunds.csvAmount'),
        t('pages.refunds.csvReason'),
        t('pages.refunds.csvStatus'),
        t('pages.refunds.csvProviderId'),
        t('pages.refunds.csvCreatedBy'),
        t('pages.refunds.csvDate'),
      ],
      ...selectedRecords.map((refund) => [
        refund.orderId,
        String(refund.amount),
        refund.reason,
        refund.status,
        refund.providerRefundId ?? '',
        createdByLabel(refund, t('pages.refunds.system')),
        new Date(refund.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reembolsos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess({ title: t('pages.refunds.toastExported') });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: t('pages.refunds.breadcrumbSales') },
            { label: t('pages.refunds.breadcrumbRefunds') },
          ]}
          title={t('pages.refunds.title')}
          subtitle={t('pages.refunds.subtitle')}
          actions={
            <>
              <Button variant="secondary" icon="file_download" iconClassName="text-[18px]" onClick={exportCsv}>
                {t('pages.refunds.exportCsv')}
              </Button>
              <Button icon="add" iconClassName="text-[18px]" onClick={() => setManualOpen(true)}>
                {t('pages.refunds.requestManual')}
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.refunds.kpiTotalMonth')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
                <Icon name="payments" className="text-[18px]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-on-surface">
                <AnimatedNumber value={stats?.monthTotal ?? 0} format={formatPrice} />
              </span>
              <div className="flex items-center gap-2 font-label-sm text-label-sm">
                <span className="rounded-full bg-surface-container px-2 py-0.5 font-medium text-on-surface-variant">
                  +1.2%
                </span>
                <span className="text-on-surface-variant">{t('pages.refunds.vsLastMonth')}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.refunds.kpiPending')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Icon name="pending_actions" className="text-[18px]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-on-surface">
                  <AnimatedNumber value={counts.PENDING} />
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-label-sm text-label-sm font-medium text-amber-800">
                  {t('pages.refunds.needsAttention')}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.refunds.averageResolution')}{' '}
                <strong className="font-semibold text-on-surface">4.5 hrs</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.refunds.kpiReturnRate')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Icon name="percent" className="text-[18px]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-on-surface">
                  {refundRate === null ? '—' : `${refundRate.toFixed(1)}%`}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-label-sm text-label-sm font-medium text-emerald-800">
                  {t('pages.refunds.underControl')}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.refunds.kpiTarget')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.refunds.kpiFailed')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-error">
                <Icon name="report_problem" className="text-[18px]" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-error">
                  <AnimatedNumber value={counts.FAILED} />
                </span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 font-label-sm text-label-sm font-medium text-error">
                  {t('pages.refunds.gatewayReview')}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.refunds.gatewayIncidents')}
              </span>
            </div>
          </div>
        </div>

        {/* Panel principal: tabs, filtros, tabla y paginación */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex flex-col gap-5 bg-surface-container-lowest p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <SegmentedTabs
                value={filters.status === '' ? 'all' : (filters.status as TabId)}
                options={TABS.map((tab) => {
                  const active = filters.status === (tab.id === 'all' ? '' : tab.id);
                  return {
                    value: tab.id,
                    label: (
                      <>
                        {t(tab.labelKey)}
                        <span
                          className={`ml-1 font-numeric-tabular text-label-sm ${
                            tab.id === 'FAILED' && counts.FAILED > 0
                              ? 'text-error'
                              : active
                                ? 'text-on-surface-variant'
                                : 'text-on-surface-variant/70'
                          }`}
                        >
                          {counts[tab.id]}
                        </span>
                      </>
                    ),
                  };
                })}
                onChange={(value) => changeTab(value)}
                size="md"
                layoutId="refunds-status"
              />
              <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t('pages.refunds.gatewaysSynced')}</span>
              </div>
            </div>

            <form
              className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center"
              onSubmit={filterForm.onSubmit((values) => {
                setPage(1);
                setFilters(values);
                setSelectedIds([]);
              })}
            >
              <Input
                icon="search"
                variant="filled"
                placeholder={t('pages.refunds.searchPlaceholder')}
                className="flex-1"
                inputClassName="border-0 bg-surface-container-low py-2.5 focus:bg-surface-container-lowest"
                {...filterForm.getInputProps('search')}
              />
              <Select
                aria-label={t('pages.refunds.filterStatusAria')}
                className="min-w-[200px]"
                inputClassName="border-0 bg-surface-container-low py-2.5 focus:bg-surface-container-lowest"
                {...filterForm.getInputProps('status')}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </Select>
              <div className="min-w-[220px]" title={t('common.comingSoon')}>
                <Select
                  aria-label={t('pages.refunds.filterMethodAria')}
                  disabled
                  inputClassName="border-0 bg-surface-container-low py-2.5"
                >
                  <option value="">{t('pages.refunds.methodAll')}</option>
                  <option value="card">{t('pages.refunds.methodCard')}</option>
                  <option value="balance">{t('pages.refunds.methodBalance')}</option>
                  <option value="transfer">{t('pages.refunds.methodTransfer')}</option>
                </Select>
              </div>
              <Button type="submit" icon="tune" iconClassName="text-[18px]">
                {t('pages.refunds.filterButton')}
              </Button>
            </form>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left font-body-sm text-body-sm">
              <thead>
                <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                  <th className="w-12 rounded-l-lg px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleAll}
                        label={t('pages.refunds.selectAll')}
                      />
                    </div>
                  </th>
                  <th className="px-3 py-3">{t('pages.refunds.columnOrder')}</th>
                  <th className="px-3 py-3 text-right">{t('pages.refunds.columnAmount')}</th>
                  <th className="px-3 py-3">{t('pages.refunds.columnReason')}</th>
                  <th className="px-3 py-3">{t('pages.refunds.columnStatus')}</th>
                  <th className="px-3 py-3">{t('pages.refunds.columnProviderId')}</th>
                  <th className="px-3 py-3">{t('pages.refunds.columnCreatedAt')}</th>
                  <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.refunds.columnActions')}</th>
                </tr>
              </thead>
              <motion.tbody
                variants={tableRowsContainer}
                initial="hidden"
                animate="visible"
                className="font-body-sm text-body-sm text-on-surface"
              >
                {isError ? (
                  <tr>
                    <td colSpan={8}>
                      <QueryError onRetry={() => refetch()} retrying={isFetching} />
                    </td>
                  </tr>
                ) : isLoading ? (
                  <TableSkeletonRows rows={8} columns={8} />
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon="currency_exchange"
                        title={t('pages.refunds.emptyTitle')}
                        description={t('pages.refunds.emptyDescription')}
                      />
                    </td>
                  </tr>
                ) : (
                  records.map((refund) => {
                    const meta = STATUS_META[refund.status];
                    const statusMeta = meta
                      ? { label: t(meta.labelKey), tone: meta.tone }
                      : { label: refund.status, tone: 'neutral' as StatusTone };
                    const rowTint =
                      refund.status === 'FAILED' ? 'bg-rose-50/40' : refund.status === 'PENDING' ? 'bg-amber-50/40' : '';
                    return (
                      <motion.tr
                        variants={fadeInUp}
                        key={refund.id}
                        className={`border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low ${rowTint}`}
                      >
                        <td className="px-3 py-3.5 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={selectedIds.includes(refund.id)}
                              onChange={() => toggleSelection(refund.id)}
                              label={t('pages.refunds.selectItem').replace('{{id}}', refund.id)}
                            />
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 font-numeric-tabular text-body-md font-semibold">
                          <Link
                            href={`/orders/${refund.orderId}`}
                            title={refund.orderId}
                            className="text-primary transition-colors hover:underline"
                          >
                            #{refund.orderId.slice(-6)}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-numeric-tabular text-headline-sm font-semibold text-on-surface">
                          {formatPrice(refund.amount)}
                        </td>
                        <td className="max-w-xs px-3 py-3.5">
                          <span className="block truncate text-on-surface" title={refund.reason}>
                            {refund.reason}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <StatusPill
                            label={statusMeta.label}
                            tone={statusMeta.tone}
                            className="font-label-uppercase text-label-uppercase"
                          />
                        </td>
                        <td className="px-3 py-3.5 font-numeric-tabular">
                          {refund.providerRefundId ? (
                            <div
                              className={`flex items-center gap-1.5 ${
                                refund.status === 'FAILED' ? 'text-error' : 'text-on-surface-variant'
                              }`}
                            >
                              <Icon
                                name={refund.status === 'FAILED' ? 'sync_problem' : 'credit_card'}
                                className="text-[16px]"
                              />
                              <span className="font-mono font-medium text-on-surface">{refund.providerRefundId}</span>
                            </div>
                          ) : (
                            <span className="font-body-sm text-label-sm italic text-on-surface-variant/70">
                              {t('pages.refunds.pendingIssue')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm text-on-surface">
                              {createdByLabel(refund, t('pages.refunds.system'))}
                            </span>
                            <span className="font-numeric-tabular text-label-sm text-on-surface-variant">
                              {formatDateTime(refund.createdAt, t('pages.refunds.timeSuffix'))}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {refund.status === 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => setDetailId(refund.id)}
                                className="rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
                              >
                                {t('pages.refunds.viewReceipt')}
                              </button>
                            )}
                            {refund.status === 'FAILED' && (
                              <button
                                type="button"
                                onClick={() => setConfirmState({ id: refund.id, action: 'retry' })}
                                disabled={retryMutation.isPending && retryMutation.variables === refund.id}
                                className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm font-medium text-error transition-colors hover:bg-surface-container disabled:opacity-50"
                              >
                                <Icon name="refresh" className="text-[14px]" />
                                {t('pages.refunds.retry')}
                              </button>
                            )}
                            {refund.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmState({ id: refund.id, action: 'approve' })}
                                  disabled={approveMutation.isPending && approveMutation.variables === refund.id}
                                  className="rounded-lg bg-primary px-3 py-1.5 font-label-sm text-label-sm text-on-primary transition-colors hover:bg-surface-tint disabled:opacity-50"
                                >
                                  {t('pages.refunds.approve')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmState({ id: refund.id, action: 'reject' })}
                                  disabled={rejectMutation.isPending && rejectMutation.variables === refund.id}
                                  className="rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
                                >
                                  {t('pages.refunds.reject')}
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setDetailId(refund.id)}
                              title={t('pages.refunds.viewReceipt')}
                              className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                            >
                              <Icon name="more_vert" className="text-[20px]" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </motion.tbody>
            </table>
          </div>

          <div className="px-6 pb-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={changePage}
              summary={t('pages.refunds.paginationSummary')
                .replace('{{start}}', String(start))
                .replace('{{end}}', String(end))
                .replace('{{total}}', String(total))}
            />
          </div>
        </div>

        {/* Banner operativo */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-surface-container-low p-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary shadow-sm">
              <Icon name="account_balance" className="text-[22px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {t('pages.refunds.bannerTitle')}
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.refunds.bannerBodyPrefix')}
                <strong className="text-on-surface">{t('pages.refunds.bannerBodyStrong')}</strong>
                {t('pages.refunds.bannerBodySuffix')}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex flex-shrink-0 items-center gap-1 font-label-md text-label-md font-semibold text-primary hover:underline"
          >
            <span>{t('pages.refunds.refundPolicy')}</span>
            <Icon name="arrow_forward" className="text-[16px]" />
          </button>
        </div>
      </div>

      {/* Modal: solicitar reembolso manual */}
      <AppModal
        opened={manualOpen}
        onClose={() => setManualOpen(false)}
        title={t('pages.refunds.manualTitle')}
        subtitle={t('pages.refunds.manualSubtitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setManualOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="add"
              iconClassName="text-[18px]"
              disabled={createMutation.isPending}
              onClick={() => manualForm.onSubmit((values) => createMutation.mutate(values))()}
            >
              {t('pages.refunds.manualSubmit')}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={manualForm.onSubmit((values) => createMutation.mutate(values))}>
          <Field label={t('pages.refunds.manualOrderLabel')} required>
            <Select disabled={ordersLoading} {...manualForm.getInputProps('orderId')}>
              <option value="">{ordersLoading ? t('common.loading') : t('pages.refunds.manualOrderPlaceholder')}</option>
              {orderOptions.map((order) => (
                <option key={order.id} value={order.id}>
                  {t('pages.refunds.manualOrderOption')
                    .replace('{{id}}', order.id.slice(-6))
                    .replace('{{customer}}', order.user?.email ?? '')
                    .replace('{{amount}}', order.totalAmount.toLocaleString('es-CO'))}
                </option>
              ))}
            </Select>
            {manualForm.errors.orderId && (
              <span className="font-label-sm text-label-sm text-error">{manualForm.errors.orderId}</span>
            )}
          </Field>
          <Field label={t('pages.refunds.manualAmountLabel')} hint={t('pages.refunds.manualAmountPlaceholder')}>
            <Input type="number" min={1} step={1} {...manualForm.getInputProps('amount')} />
            {manualForm.errors.amount && (
              <span className="font-label-sm text-label-sm text-error">{manualForm.errors.amount}</span>
            )}
          </Field>
          <Field label={t('pages.refunds.manualReasonLabel')} required>
            <Input placeholder={t('pages.refunds.manualReasonPlaceholder')} {...manualForm.getInputProps('reason')} />
            {manualForm.errors.reason && (
              <span className="font-label-sm text-label-sm text-error">{manualForm.errors.reason}</span>
            )}
          </Field>
        </form>
      </AppModal>

      {/* Modal: confirmación de acciones */}
      <AppModal
        opened={Boolean(confirmMeta)}
        onClose={() => setConfirmState(null)}
        title={confirmMeta?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmState(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={confirmMeta?.tone === 'danger' ? 'danger' : 'primary'}
              disabled={confirmMeta?.pending}
              onClick={() => confirmMeta?.run()}
            >
              {t('pages.refunds.confirmButton')}
            </Button>
          </>
        }
      >
        <p className="font-body-md text-body-md text-on-surface-variant">{confirmMeta?.body}</p>
      </AppModal>

      {/* Modal: comprobante de reembolso */}
      <AppModal
        opened={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={t('pages.refunds.detailTitle')}
        subtitle={t('pages.refunds.detailSubtitle').replace('{{id}}', (detailId ?? '').slice(-6))}
        footer={
          <Button variant="secondary" onClick={() => setDetailId(null)}>
            {t('pages.refunds.detailClose')}
          </Button>
        }
      >
        {detailLoading || !detailRecord ? (
          <p className="py-8 text-center font-body-md text-body-md text-on-surface-variant">
            {t('pages.refunds.detailLoading')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailField
              label={t('pages.refunds.detailOrder')}
              value={
                <Link
                  href={`/orders/${detailRecord.orderId}`}
                  className="font-numeric-tabular text-primary hover:underline"
                >
                  #{detailRecord.orderId.slice(-6)}
                </Link>
              }
            />
            <DetailField
              label={t('pages.refunds.detailAmount')}
              value={<span className="font-numeric-tabular">{formatPrice(detailRecord.amount)}</span>}
            />
            <DetailField
              label={t('pages.refunds.detailStatus')}
              value={
                <StatusPill
                  label={
                    STATUS_META[detailRecord.status]
                      ? t(STATUS_META[detailRecord.status].labelKey)
                      : detailRecord.status
                  }
                  tone={STATUS_META[detailRecord.status]?.tone ?? 'neutral'}
                />
              }
            />
            <DetailField
              label={t('pages.refunds.detailProviderId')}
              value={
                <span className="font-mono">
                  {detailRecord.providerRefundId ?? t('pages.refunds.pendingNoProvider')}
                </span>
              }
            />
            <DetailField
              label={t('pages.refunds.detailPaymentProvider')}
              value={detailRecord.payment?.provider ?? '—'}
            />
            <DetailField
              label={t('pages.refunds.detailTransactionId')}
              value={<span className="font-mono">{detailRecord.payment?.providerTransactionId ?? '—'}</span>}
            />
            <DetailField
              label={t('pages.refunds.detailCreatedBy')}
              value={createdByLabel(detailRecord, t('pages.refunds.system'))}
            />
            <DetailField
              label={t('pages.refunds.detailCreatedAt')}
              value={formatDateTime(detailRecord.createdAt, t('pages.refunds.timeSuffix'))}
            />
            <DetailField
              label={t('pages.refunds.detailUpdatedAt')}
              value={formatDateTime(detailRecord.updatedAt, t('pages.refunds.timeSuffix'))}
            />
            <DetailField label={t('pages.refunds.detailReason')} value={detailRecord.reason} className="sm:col-span-2" />
          </div>
        )}
      </AppModal>
    </>
  );
}

function DetailField({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className="font-body-md text-body-md text-on-surface">{value}</span>
    </div>
  );
}
