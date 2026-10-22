'use client';

import { Menu } from '@mantine/core';
import { useForm } from '@mantine/form';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactNode, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Input, Select } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { StatusPill, StatusTone } from '../../components/ui/status-pill';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

const PAGE_SIZE = 20;

const PRODUCTION_STATUSES = ['PENDING_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_TO_SHIP'] as const;
type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

const STATUS_META: Record<
  ProductionStatus,
  { labelKey: string; tone: StatusTone; next: ProductionStatus | null }
> = {
  PENDING_PRODUCTION: { labelKey: 'pages.production.statusPending', tone: 'warning', next: 'IN_PRODUCTION' },
  IN_PRODUCTION: { labelKey: 'pages.production.statusInProduction', tone: 'secondary', next: 'QUALITY_CHECK' },
  QUALITY_CHECK: { labelKey: 'pages.production.statusQualityCheck', tone: 'info', next: 'READY_TO_SHIP' },
  READY_TO_SHIP: { labelKey: 'pages.production.statusReadyToShip', tone: 'success', next: null },
};

const statusOptions = PRODUCTION_STATUSES.map((value) => ({ value, labelKey: STATUS_META[value].labelKey }));

interface ProductionRecord {
  id: string;
  orderId: string;
  type: 'STANDARD' | 'CUSTOM';
  quantity: number;
  productionStatus: ProductionStatus;
  assignedToId?: string;
  assignedTo?: { id: string; name: string; email: string };
  productName?: string;
  variantLabel?: string;
  designTemplateName?: string;
  createdAt: string;
  // La API todavía no expone estos campos; si alguna vez llegan a estar presentes, la UI los usa automáticamente.
  printFileUrl?: string | null;
  productImageUrl?: string | null;
  priority?: string | null;
}

interface AssignableUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

function getUserLabel(user: AssignableUser): string {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name ? `${name} (${user.email})` : user.email;
}

function getItemName(item: ProductionRecord, fallback: string): string {
  return item.productName ?? item.designTemplateName ?? fallback;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatRelativeTime(iso: string, t: (key: string) => string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) {
    return t('pages.production.relativeMinutes').replace('{{count}}', String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return (
      hours === 1 ? t('pages.production.relativeHoursSingular') : t('pages.production.relativeHoursPlural')
    ).replace('{{count}}', String(hours));
  }
  const days = Math.floor(hours / 24);
  return (
    days === 1 ? t('pages.production.relativeDaysSingular') : t('pages.production.relativeDaysPlural')
  ).replace('{{count}}', String(days));
}

function getRowTint(item: ProductionRecord): string {
  if (item.type === 'CUSTOM') return 'bg-surface-container-low/30';
  if (item.productionStatus === 'IN_PRODUCTION') return 'bg-surface-container-low/20';
  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface KpiCardProps {
  label: string;
  value: number;
  unit: string;
  icon: string;
  iconWrapperClassName: string;
  chip: ReactNode;
  barClassName: string;
  percent: number;
}

function KpiCard({ label, value, unit, icon, iconWrapperClassName, chip, barClassName, percent }: KpiCardProps) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconWrapperClassName}`}>
          <Icon name={icon} className="text-[18px]" />
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-headline-lg font-numeric-tabular text-headline-lg font-semibold text-primary">
            <AnimatedNumber value={value} />
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{unit}</span>
        </div>
        {chip}
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export default function ProductionPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '', assignedToId: '' });
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STANDARD' | 'CUSTOM'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignTarget, setAssignTarget] = useState<ProductionRecord | null>(null);
  const [assignValue, setAssignValue] = useState('null');
  const [bulkOpened, setBulkOpened] = useState(false);
  const [bulkValue, setBulkValue] = useState('null');

  const filterForm = useForm({
    initialValues: { status: '', search: '', assignedToId: '' },
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users-select'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users', {
        params: { query: { page: '1', limit: '100' } },
      });
      if (error) throw error;
      return data?.data ?? [];
    },
  });

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['production-queue', page, filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/production', {
        params: {
          query: {
            page: String(page),
            limit: String(PAGE_SIZE),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.search ? { search: filters.search } : {}),
            ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProductionStatus }) => {
      const { error } = await apiClient.PATCH('/admin/production/items/{id}/status', {
        params: { path: { id } },
        body: { status },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      notifySuccess({ title: t('pages.production.toastStatusUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.production.toastStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const assignItem = useMutation({
    mutationFn: async ({ id, assignedToId }: { id: string; assignedToId: string | null }) => {
      const { error } = await apiClient.PATCH('/admin/production/items/{id}/assign', {
        params: { path: { id } },
        body: { assignedToId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      setAssignTarget(null);
      notifySuccess({ title: t('pages.production.toastAssigned') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.production.toastAssignError'), message: getApiErrorMessage(error) });
    },
  });

  const bulkAssign = useMutation({
    mutationFn: async ({ ids, assignedToId }: { ids: string[]; assignedToId: string | null }) => {
      const { error } = await apiClient.PATCH('/admin/production/bulk/assign', {
        body: { ids, assignedToId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      setSelectedIds([]);
      setBulkOpened(false);
      notifySuccess({ title: t('pages.production.toastBulkAssigned') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.production.toastBulkAssignError'), message: getApiErrorMessage(error) });
    },
  });

  const records: ProductionRecord[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
  const visibleRecords = typeFilter === 'ALL' ? records : records.filter((item) => item.type === typeFilter);

  // La API solo expone el total (meta.total) y la página actual de la cola.
  // Los KPIs por estado son aproximados: se proyecta la muestra cargada sobre meta.total.
  const sampleSize = records.length;
  const approxTotal = total || sampleSize;
  const countInSample = (status: ProductionStatus) =>
    records.filter((item) => item.productionStatus === status).length;
  const approxCount = (status: ProductionStatus) =>
    sampleSize > 0 && total > 0 ? Math.round((countInSample(status) / sampleSize) * total) : 0;
  const approxPercent = (count: number) =>
    approxTotal > 0 ? Math.min(100, Math.round((count / approxTotal) * 100)) : 0;

  const pendingCount = approxCount('PENDING_PRODUCTION');
  const inProductionCount = approxCount('IN_PRODUCTION');
  const readyCount = approxCount('READY_TO_SHIP');
  const pendingPercent = approxPercent(pendingCount);
  const inProductionPercent = approxPercent(inProductionCount);
  const readyPercent = approxPercent(readyCount);
  const standardCount = records.filter((item) => item.type === 'STANDARD').length;
  const customCount = records.filter((item) => item.type === 'CUSTOM').length;
  const allVisibleSelected =
    visibleRecords.length > 0 && visibleRecords.every((item) => selectedIds.includes(item.id));

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = visibleRecords.map((item) => item.id);
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...visibleRecords.map((item) => item.id)])));
    }
  }

  function handleFilterSubmit(values: { status: string; search: string; assignedToId: string }) {
    setPage(1);
    setFilters(values);
    setSelectedIds([]);
  }

  function handleResetFilters() {
    filterForm.setValues({ status: '', search: '', assignedToId: '' });
    setFilters({ status: '', search: '', assignedToId: '' });
    setTypeFilter('ALL');
    setPage(1);
    setSelectedIds([]);
  }

  function handleTypeFilter(value: 'ALL' | 'STANDARD' | 'CUSTOM') {
    setTypeFilter(value);
    setSelectedIds([]);
  }

  function openAssign(item: ProductionRecord) {
    setAssignTarget(item);
    setAssignValue(item.assignedToId ?? 'null');
  }

  function submitAssign() {
    if (!assignTarget) return;
    assignItem.mutate({
      id: assignTarget.id,
      assignedToId: assignValue === 'null' ? null : assignValue,
    });
  }

  function submitBulkAssign() {
    if (selectedIds.length === 0) return;
    bulkAssign.mutate({ ids: selectedIds, assignedToId: bulkValue === 'null' ? null : bulkValue });
  }

  // Hojas de corte: vista de impresión client-side de las filas seleccionadas o, si no hay selección, de la vista visible.
  function handlePrint() {
    const rows =
      selectedIds.length > 0
        ? visibleRecords.filter((item) => selectedIds.includes(item.id))
        : visibleRecords;

    if (rows.length === 0) {
      notifyError({
        title: t('pages.production.toastNoItemsTitle'),
        message: t('pages.production.toastNoItemsMessage'),
      });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
      notifyError({
        title: t('pages.production.toastPopupBlockedTitle'),
        message: t('pages.production.toastPopupBlockedMessage'),
      });
      return;
    }

    const tableRows = rows
      .map((item) => {
        return `<tr>
          <td>#${escapeHtml(item.orderId.slice(-6))}</td>
          <td>${escapeHtml(getItemName(item, t('pages.production.customFallback')))}</td>
          <td>${escapeHtml(item.variantLabel ?? '—')}</td>
          <td class="num">${item.quantity}</td>
          <td>${escapeHtml(t(STATUS_META[item.productionStatus].labelKey))}</td>
          <td>${escapeHtml(item.assignedTo?.name ?? t('pages.production.unassigned'))}</td>
        </tr>`;
      })
      .join('');

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${t('pages.production.printDocTitle')}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 32px; color: #1a1c19; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  p.meta { margin: 0 0 20px; color: #6b7280; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
  th { color: #6b7280; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; }
  td.num { text-align: center; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>${t('pages.production.printHeading')}</h1>
  <p class="meta">${(rows.length === 1 ? t('pages.production.printMetaSingular') : t('pages.production.printMetaPlural'))
    .replace('{{count}}', String(rows.length))
    .replace('{{date}}', new Date().toLocaleString('es-CO'))}</p>
  <table>
    <thead>
      <tr>
        <th>${t('pages.production.columnOrder')}</th>
        <th>${t('pages.production.columnItem')}</th>
        <th>${t('pages.production.columnVariant')}</th>
        <th class="num">${t('pages.production.columnQuantity')}</th>
        <th>${t('pages.production.columnWorkshopStatus')}</th>
        <th>${t('pages.production.columnAssignee')}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={[
            { label: t('pages.production.breadcrumbSales') },
            { label: t('pages.production.breadcrumbProduction') },
          ]}
          title={
            <span className="flex flex-wrap items-baseline gap-3">
              {t('pages.production.title')}
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                {t('pages.production.inWorkshop').replace('{{count}}', String(total))}
              </span>
            </span>
          }
          subtitle={t('pages.production.subtitle')}
          actions={
            <>
              <Button
                variant="secondary"
                icon="print"
                onClick={handlePrint}
                disabled={visibleRecords.length === 0}
                title={
                  selectedIds.length > 0
                    ? t('pages.production.printSelectionTooltip')
                    : t('pages.production.printVisibleTooltip')
                }
              >
                {t('pages.production.printButton')}
              </Button>
              <Button icon="add_task" onClick={() => setBulkOpened(true)}>
                {t('pages.production.bulkAssign')}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t('pages.production.kpiTotal')}
            value={approxTotal}
            unit={t('pages.production.unitItems')}
            icon="precision_manufacturing"
            iconWrapperClassName="bg-surface-container-low text-primary"
            chip={
              <span className="flex items-center gap-0.5 font-label-sm text-label-sm text-secondary">
                <Icon name="insights" className="text-[14px]" />
                {t('pages.production.chipActiveQueue')}
              </span>
            }
            barClassName="bg-primary"
            percent={100}
          />
          <KpiCard
            label={t('pages.production.kpiPending')}
            value={pendingCount}
            unit={t('pages.production.unitGarments')}
            icon="hourglass_top"
            iconWrapperClassName="bg-amber-50 text-amber-700"
            chip={
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-label-sm text-label-sm font-medium text-amber-800">
                {t('pages.production.chipPendingPercent').replace('{{percent}}', String(pendingPercent))}
              </span>
            }
            barClassName="bg-amber-500"
            percent={pendingPercent}
          />
          <KpiCard
            label={t('pages.production.kpiInProduction')}
            value={inProductionCount}
            unit={t('pages.production.unitOnTable')}
            icon="cyclone"
            iconWrapperClassName="bg-secondary-container text-on-secondary-container"
            chip={
              <span className="rounded-full bg-secondary-fixed px-2 py-0.5 font-label-sm text-label-sm font-medium text-on-secondary-fixed">
                {t('pages.production.chipInProductionPercent').replace(
                  '{{percent}}',
                  String(inProductionPercent),
                )}
              </span>
            }
            barClassName="bg-secondary"
            percent={inProductionPercent}
          />
          <KpiCard
            label={t('pages.production.kpiReady')}
            value={readyCount}
            unit={t('pages.production.unitPacked')}
            icon="verified"
            iconWrapperClassName="bg-emerald-50 text-emerald-700"
            chip={
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-label-sm text-label-sm font-medium text-emerald-800">
                {t('pages.production.chipQcApproved')}
              </span>
            }
            barClassName="bg-emerald-600"
            percent={readyPercent}
          />
        </div>

        <Card className="flex flex-col gap-3 p-4">
          <form onSubmit={filterForm.onSubmit(handleFilterSubmit)}>
            <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12">
              <Input
                icon="search"
                variant="filled"
                placeholder={t('pages.production.searchPlaceholder')}
                className="md:col-span-4"
                {...filterForm.getInputProps('search')}
              />
              <div className="flex items-center gap-2 md:col-span-3">
                <label className="hidden whitespace-nowrap font-label-sm text-label-sm text-on-surface-variant xl:block">
                  {t('pages.production.filterStatusLabel')}
                </label>
                <Select className="w-full" {...filterForm.getInputProps('status')}>
                  <option value="">{t('pages.production.allStatuses')}</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2 md:col-span-3">
                <label className="hidden whitespace-nowrap font-label-sm text-label-sm text-on-surface-variant xl:block">
                  {t('pages.production.filterAssigneeLabel')}
                </label>
                <Select className="w-full" {...filterForm.getInputProps('assignedToId')}>
                  <option value="">{t('pages.production.allOperators')}</option>
                  <option value="null">{t('pages.production.unassigned')}</option>
                  {(users ?? []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserLabel(user)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-end gap-2 md:col-span-2">
                <Button type="submit" icon="filter_alt" iconClassName="text-[16px]" className="w-full md:w-auto">
                  {t('pages.production.filterButton')}
                </Button>
                <button
                  type="button"
                  title={t('pages.production.resetFilters')}
                  onClick={handleResetFilters}
                  className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-on-surface"
                >
                  <Icon name="refresh" className="text-[18px]" />
                </button>
              </div>
            </div>
          </form>

          {records.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 text-nowrap">
              <span className="pr-1 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.production.typeLabel')}
              </span>
              <SegmentedTabs
                value={typeFilter}
                options={[
                  {
                    value: 'ALL',
                    label: t('pages.production.typeAll').replace('{{count}}', String(records.length)),
                  },
                  ...(standardCount > 0
                    ? [
                        {
                          value: 'STANDARD' as const,
                          label: t('pages.production.typeStandard').replace('{{count}}', String(standardCount)),
                        },
                      ]
                    : []),
                  ...(customCount > 0
                    ? [
                        {
                          value: 'CUSTOM' as const,
                          label: (
                            <span className="flex items-center gap-1">
                              <span>{t('pages.production.typeCustom')}</span>
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <span className="font-numeric-tabular">({customCount})</span>
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
                onChange={(value) => handleTypeFilter(value)}
                variant="primary"
                layoutId="production-type"
              />
            </div>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/40 px-6 py-3.5">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={!allVisibleSelected && visibleRecords.some((item) => selectedIds.includes(item.id))}
                onChange={toggleAllVisible}
                label={t('pages.production.selectVisibleBatch')}
              />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.production.selectVisibleBatchCount').replace('{{count}}', String(visibleRecords.length))}
              </span>
            </div>
            <div className="flex items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
              <span>{t('pages.production.workshopView')}</span>
              <span className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {t('pages.production.liveUpdated')}
              </span>
            </div>
          </div>

          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={10} columns={8} />
          ) : visibleRecords.length === 0 ? (
            <EmptyState
              icon="precision_manufacturing"
              title={t('pages.production.emptyTitle')}
              description={t('pages.production.emptyDescription')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <th className="w-12 rounded-l-lg px-3 py-3">
                      <span className="sr-only">{t('pages.production.selectColumn')}</span>
                    </th>
                    <th className="px-3 py-3">{t('pages.production.columnOrder')}</th>
                    <th className="px-3 py-3">{t('pages.production.columnItem')}</th>
                    <th className="px-3 py-3">{t('pages.production.columnVariant')}</th>
                    <th className="px-3 py-3 text-center">{t('pages.production.columnQuantity')}</th>
                    <th className="px-3 py-3">{t('pages.production.columnWorkshopStatus')}</th>
                    <th className="px-3 py-3">{t('pages.production.columnAssignee')}</th>
                    <th className="px-3 py-3">{t('pages.production.columnCreatedPriority')}</th>
                    <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.production.columnActions')}</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableRowsContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm text-on-surface"
                >
                  {visibleRecords.map((item) => {
                    const statusMeta = STATUS_META[item.productionStatus];
                    const nextStatus = statusMeta.next;
                    const name = getItemName(item, t('pages.production.customFallback'));
                    const subtitle =
                      item.productName && item.designTemplateName ? item.designTemplateName : undefined;
                    return (
                      <motion.tr
                        variants={fadeInUp}
                        key={item.id}
                        className={`border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low/50 ${getRowTint(item)}`}
                      >
                        <td className="px-3 py-3.5">
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            label={t('pages.production.selectItem').replace('{{name}}', name)}
                          />
                        </td>
                        <td className="px-3 py-3.5">
                          <Link
                            href={`/orders/${item.orderId}`}
                            className="inline-block rounded bg-surface-container-low px-2 py-1 font-numeric-tabular font-semibold text-primary transition-colors hover:bg-surface-container"
                          >
                            #{item.orderId.slice(-6)}
                          </Link>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            {item.productImageUrl ? (
                              <img
                                src={item.productImageUrl}
                                alt={name}
                                className="h-10 w-10 shrink-0 rounded-lg bg-surface-container object-cover"
                              />
                            ) : item.type === 'CUSTOM' ? (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
                                <Icon name="palette" className="text-[20px]" />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                                <Icon name="checkroom" className="text-[20px]" />
                              </div>
                            )}
                            <div className="flex min-w-0 flex-col">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-headline-sm text-headline-sm text-on-surface">
                                  {name}
                                </span>
                                {item.type === 'CUSTOM' && (
                                  <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-label-uppercase text-label-uppercase text-on-surface-variant">
                                    MTO
                                  </span>
                                )}
                              </div>
                              {subtitle && (
                                <span className="font-label-sm text-label-sm text-on-surface-variant">{subtitle}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {item.variantLabel ? (
                            <span className="rounded-md bg-surface-container-low px-2.5 py-1 font-numeric-tabular text-label-sm text-on-surface">
                              {item.variantLabel}
                            </span>
                          ) : (
                            <span className="font-label-sm text-label-sm text-on-surface-variant/60">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-center font-numeric-tabular font-medium">{item.quantity}</td>
                        <td className="px-3 py-3.5">
                          <StatusPill label={t(statusMeta.labelKey)} tone={statusMeta.tone} />
                        </td>
                        <td className="px-3 py-3.5">
                          {item.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                  item.productionStatus === 'IN_PRODUCTION'
                                    ? 'bg-secondary text-on-secondary'
                                    : 'bg-surface-container-high text-on-surface-variant'
                                }`}
                              >
                                {getInitials(item.assignedTo.name)}
                              </div>
                              <span className="font-body-sm text-body-sm text-on-surface">{item.assignedTo.name}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              title={t('pages.production.assignTitle')}
                              onClick={() => openAssign(item)}
                              className="font-body-sm text-body-sm italic text-on-surface-variant/70 transition-colors hover:text-primary"
                            >
                              {t('pages.production.unassigned')}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-numeric-tabular text-label-sm text-on-surface">
                              {formatRelativeTime(item.createdAt, t)}
                            </span>
                            {/* Prioridad: la API todavía no expone este dato; se muestra solo si llega a estar presente. */}
                            {item.priority && (
                              <span className="font-label-sm text-label-sm font-medium text-secondary">{item.priority}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.productionStatus !== 'READY_TO_SHIP' && (
                              <button
                                type="button"
                                title={t('pages.production.markCompleteTooltip')}
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ id: item.id, status: 'READY_TO_SHIP' })}
                                className="rounded-lg p-1.5 text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Icon name="check_circle" className="text-[18px]" />
                              </button>
                            )}
                            {nextStatus && (
                              <button
                                type="button"
                                title={
                                  item.productionStatus === 'PENDING_PRODUCTION'
                                    ? t('pages.production.startCutTooltip')
                                    : t('pages.production.nextStepTooltip')
                                }
                                disabled={updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ id: item.id, status: nextStatus })}
                                className="rounded-lg p-1.5 text-primary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Icon name="arrow_forward" className="text-[18px]" />
                              </button>
                            )}
                            <button
                              type="button"
                              title={
                                item.assignedTo
                                  ? t('pages.production.reassignTooltip')
                                  : t('pages.production.assignTitle')
                              }
                              onClick={() => openAssign(item)}
                              className="rounded-lg p-1.5 text-primary transition-colors hover:bg-surface-container-low"
                            >
                              <Icon name="person_add" className="text-[18px]" />
                            </button>
                            {item.printFileUrl ? (
                              <a
                                href={item.printFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                title={t('pages.production.viewPrintFileTooltip')}
                                className="rounded-lg p-1.5 text-primary transition-colors hover:bg-surface-container-low"
                              >
                                <Icon name="attachment" className="text-[18px]" />
                              </a>
                            ) : item.type === 'CUSTOM' ? (
                              <button
                                type="button"
                                disabled
                                title={t('pages.production.printFileComingSoonTooltip')}
                                className="cursor-not-allowed rounded-lg p-1.5 text-on-surface-variant/40"
                              >
                                <Icon name="attachment" className="text-[18px]" />
                              </button>
                            ) : null}
                            <Menu position="bottom-end" shadow="md">
                              <Menu.Target>
                                <button
                                  type="button"
                                  title={t('pages.production.optionsTooltip')}
                                  className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                                >
                                  <Icon name="more_vert" className="text-[18px]" />
                                </button>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Label>{t('pages.production.columnWorkshopStatus')}</Menu.Label>
                                {PRODUCTION_STATUSES.map((value) => (
                                  <Menu.Item
                                    key={value}
                                    disabled={value === item.productionStatus || updateStatus.isPending}
                                    leftSection={
                                      <Icon
                                        name={value === item.productionStatus ? 'check' : 'radio_button_unchecked'}
                                        className="text-[16px]"
                                      />
                                    }
                                    onClick={() => updateStatus.mutate({ id: item.id, status: value })}
                                  >
                                    {t(STATUS_META[value].labelKey)}
                                  </Menu.Item>
                                ))}
                              </Menu.Dropdown>
                            </Menu>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}

          {!isLoading && total > 0 && (
            <div className="border-t border-outline-variant/30 px-6 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(nextPage) => {
                  setPage(nextPage);
                  setSelectedIds([]);
                }}
                summary={t('pages.production.paginationSummary')
                  .replace('{{start}}', String((page - 1) * PAGE_SIZE + 1))
                  .replace('{{end}}', String(Math.min(page * PAGE_SIZE, total)))
                  .replace('{{total}}', String(total))}
              />
            </div>
          )}
        </Card>

        <div className="flex items-center justify-center gap-2 py-4 font-label-sm text-label-sm text-on-surface-variant/70">
          <Icon name="precision_manufacturing" className="text-[16px]" />
          <span>{t('pages.production.footerStatus')}</span>
        </div>
      </div>

      <AppModal
        opened={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        title={t('pages.production.assignTitle')}
        subtitle={
          assignTarget
            ? t('pages.production.modalOrderSubtitle')
                .replace('{{order}}', assignTarget.orderId.slice(-6))
                .replace('{{item}}', getItemName(assignTarget, t('pages.production.customFallback')))
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAssignTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitAssign} disabled={assignItem.isPending}>
              {assignItem.isPending ? t('pages.production.assigning') : t('pages.production.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.production.assigneeLabel')}
          </label>
          <Select value={assignValue} onChange={(event) => setAssignValue(event.currentTarget.value)}>
            <option value="null">{t('pages.production.unassigned')}</option>
            {(users ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {getUserLabel(user)}
              </option>
            ))}
          </Select>
        </div>
      </AppModal>

      <AppModal
        opened={bulkOpened}
        onClose={() => setBulkOpened(false)}
        title={t('pages.production.bulkAssign')}
        subtitle={(selectedIds.length === 1
          ? t('pages.production.bulkSubtitleSingular')
          : t('pages.production.bulkSubtitlePlural')
        ).replace('{{count}}', String(selectedIds.length))}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkOpened(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitBulkAssign} disabled={selectedIds.length === 0 || bulkAssign.isPending}>
              {bulkAssign.isPending ? t('pages.production.assigning') : t('pages.production.bulkSave')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.production.assigneeLabel')}
          </label>
          <Select value={bulkValue} onChange={(event) => setBulkValue(event.currentTarget.value)}>
            <option value="null">{t('pages.production.unassigned')}</option>
            {(users ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {getUserLabel(user)}
              </option>
            ))}
          </Select>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t('pages.production.bulkHint')}
          </p>
        </div>
      </AppModal>
    </>
  );
}
