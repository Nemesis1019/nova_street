'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Input, Select } from '../../components/ui/input';
import { fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { StatusPill } from '../../components/ui/status-pill';
import { getAuthToken } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type ExportKind = 'orders' | 'products' | 'users' | 'audit-logs';
type RangeValue = '30' | '90' | 'year' | 'all';

interface ExportHistoryEntry {
  id: string;
  filename: string;
  kind: ExportKind;
  dataset: string;
  createdAt: string;
  size: number;
  rows: number | null;
  from?: string;
  to?: string;
}

const HISTORY_KEY = 'admin-export-history';
const HISTORY_LIMIT = 20;
const CURRENT_YEAR = new Date().getFullYear();

const FILE_ICONS: Record<ExportKind, string> = {
  orders: 'description',
  products: 'inventory_2',
  users: 'group',
  'audit-logs': 'history',
};

const RANGE_OPTIONS: Array<{ value: RangeValue; labelKey: string }> = [
  { value: '30', labelKey: 'pages.exportPage.range30' },
  { value: '90', labelKey: 'pages.exportPage.range90' },
  { value: 'year', labelKey: 'pages.exportPage.rangeYear' },
  { value: 'all', labelKey: 'pages.exportPage.rangeAll' },
];

function rangeToParams(range: RangeValue): { from?: string; to?: string } {
  if (range === 'all') return {};
  const now = new Date();
  const from = new Date(now);
  if (range === '30') from.setDate(from.getDate() - 30);
  if (range === '90') from.setDate(from.getDate() - 90);
  if (range === 'year') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to: now.toISOString() };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function countCsvRows(text: string): number {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return Math.max(lines.length - 1, 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readHistory(): ExportHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validKinds: ExportKind[] = ['orders', 'products', 'users', 'audit-logs'];
    return parsed.filter((entry): entry is ExportHistoryEntry => {
      if (typeof entry !== 'object' || entry === null) return false;
      const candidate = entry as Partial<ExportHistoryEntry>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.filename === 'string' &&
        validKinds.includes(candidate.kind as ExportKind) &&
        typeof candidate.dataset === 'string' &&
        typeof candidate.createdAt === 'string' &&
        typeof candidate.size === 'number'
      );
    });
  } catch {
    return [];
  }
}

function writeHistory(entries: ExportHistoryEntry[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Ignorar cuotas de almacenamiento agotadas: el historial es best-effort.
  }
}

interface ExportParams {
  from?: string;
  to?: string;
  search?: string;
  status?: string;
}

function buildExportUrl(kind: ExportKind, params: ExportParams) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  const queryString = query.toString();
  return `${base}/admin/export/${kind}${queryString ? `?${queryString}` : ''}`;
}

async function requestExport(kind: ExportKind, params: ExportParams, errorMessage: string) {
  const response = await fetch(buildExportUrl(kind, params), {
    headers: { Authorization: `Bearer ${getAuthToken() ?? ''}` },
  });
  if (!response.ok) throw new Error(errorMessage);
  const blob = await response.blob();
  const filename =
    response.headers.get('content-disposition')?.split('filename="')[1]?.replace('"', '') ?? `${kind}.csv`;
  const text = await blob.text();
  return { blob, filename, rows: countCsvRows(text), size: blob.size };
}

export default function ExportPage() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [ordersRange, setOrdersRange] = useState<RangeValue>('30');
  const [usersSearch, setUsersSearch] = useState('');
  const [usersStatus, setUsersStatus] = useState('');
  const [auditRange, setAuditRange] = useState<RangeValue>('30');
  const [pending, setPending] = useState<ExportKind | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const datasetLabels: Record<ExportKind, string> = {
    orders: t('pages.exportPage.datasetOrders'),
    products: t('pages.exportPage.datasetProducts'),
    users: t('pages.exportPage.datasetUsers'),
    'audit-logs': t('pages.exportPage.datasetAuditLogs'),
  };

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const runExport = async (
    kind: ExportKind,
    params: ExportParams,
    options?: { register?: boolean },
  ) => {
    const register = options?.register ?? true;
    setPending(kind);
    try {
      const result = await requestExport(kind, params, t('pages.exportPage.downloadError'));
      downloadBlob(result.blob, result.filename);
      if (register) {
        const entry: ExportHistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          filename: result.filename,
          kind,
          dataset: datasetLabels[kind],
          createdAt: new Date().toISOString(),
          size: result.size,
          rows: result.rows,
          from: params.from,
          to: params.to,
        };
        setHistory((previous) => {
          const next = [entry, ...previous].slice(0, HISTORY_LIMIT);
          writeHistory(next);
          return next;
        });
      }
      notifySuccess({
        title: t('pages.exportPage.toastExported'),
        message: t('pages.exportPage.toastExportedMessage').replace('{{filename}}', result.filename),
      });
    } catch (error) {
      notifyError({ title: t('pages.exportPage.toastError'), message: getApiErrorMessage(error) });
    } finally {
      setPending(null);
    }
  };

  const hasRowData = history.some((entry) => typeof entry.rows === 'number');
  const totalRows = history.reduce((acc, entry) => acc + (entry.rows ?? 0), 0);
  const totalSize = history.reduce((acc, entry) => acc + entry.size, 0);
  const isBusy = pending !== null;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          breadcrumb={[{ label: t('pages.exportPage.breadcrumbSettings') }, { label: t('pages.exportPage.breadcrumbExports') }]}
          title={
            <span className="flex flex-wrap items-baseline gap-3">
              {t('pages.exportPage.title')}
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-uppercase text-label-uppercase text-on-surface-variant">
                {t('pages.exportPage.badge')}
              </span>
            </span>
          }
          subtitle={t('pages.exportPage.subtitle')}
          actions={
            <>
              <Button
                variant="secondary"
                icon="history"
                onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {t('pages.exportPage.downloadHistory')}
              </Button>
              <span title={t('common.comingSoon')} className="inline-flex">
                <Button icon="tune" disabled>
                  {t('pages.exportPage.newCustomExport')}
                </Button>
              </span>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.exportPage.kpiReportsGenerated')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="download_done" className="text-[18px]" />
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">
                  {history.length}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.exportPage.currentMonthlyCycle')}
                </span>
              </div>
              <span className="flex items-center gap-1 rounded bg-surface-container px-2 py-1 font-label-sm text-label-sm text-on-surface">
                <Icon name="arrow_upward" className="text-[14px]" />
                +14.2%
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.exportPage.kpiRecordVolume')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="view_list" className="text-[18px]" />
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="font-headline-xl text-headline-xl font-bold tracking-tight font-numeric-tabular text-on-surface">
                  {hasRowData ? totalRows.toLocaleString('es-CO') : '—'}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.exportPage.rowsProcessed')}
                </span>
              </div>
              <span className="rounded bg-surface-container-low px-2 py-1 font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.exportPage.integrityPercent')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.exportPage.kpiDominantFormat')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="table_chart" className="text-[18px]" />
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                  CSV UTF-8
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Excel / Numbers / Sheets</span>
              </div>
              <span className="rounded bg-secondary-container px-2 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                {t('pages.exportPage.quotaBadge')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.exportPage.kpiSecurity')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="lock" className="text-[18px]" />
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">SHA-256</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.exportPage.tokenExpiry')}
                </span>
              </div>
              <span className="flex items-center gap-1 rounded bg-surface-container-high px-2 py-1 font-label-sm text-label-sm text-on-surface">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                {t('pages.exportPage.activeLabel')}
              </span>
            </div>
          </div>
        </div>

        {/* Módulos de exportación directa */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">
                {t('pages.exportPage.modulesTitle')}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.exportPage.modulesSubtitle')}
              </p>
            </div>
            <div className="hidden items-center gap-2 font-label-sm text-label-sm text-on-surface-variant sm:flex">
              <Icon name="sync" className="text-[16px]" />
              <span>{t('pages.exportPage.syncedAgo')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pedidos & Transacciones */}
            <div className="flex flex-col justify-between gap-6 rounded-xl bg-surface-container-lowest p-7 shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
                      <Icon name="receipt_long" className="text-[24px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {t('pages.exportPage.ordersCardTitle')}
                      </span>
                      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                        {t('pages.exportPage.ordersCardOverline')}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-surface-container px-2.5 py-1 font-numeric-tabular text-label-sm text-on-surface">
                    {t('pages.exportPage.ordersRecordCount')}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {t('pages.exportPage.ordersCardBody')}
                </p>
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="export-orders-range"
                      className="font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {t('pages.exportPage.dateRangeLabel')}
                    </label>
                    <Select
                      id="export-orders-range"
                      value={ordersRange}
                      onChange={(event) => setOrdersRange(event.currentTarget.value as RangeValue)}
                      inputClassName="border-transparent bg-surface-container-low"
                    >
                      {RANGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey).replace('{{year}}', String(CURRENT_YEAR))}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5" title={t('common.comingSoon')}>
                    <label
                      htmlFor="export-orders-status"
                      className="font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {t('pages.exportPage.transactionStatus')}
                    </label>
                    <Select
                      id="export-orders-status"
                      disabled
                      title={t('common.comingSoon')}
                      inputClassName="border-transparent bg-surface-container-low"
                    >
                      <option value="all">{t('pages.exportPage.allOrders')}</option>
                      <option value="paid">{t('pages.exportPage.onlyPaid')}</option>
                      <option value="refunded">{t('pages.exportPage.withRefunds')}</option>
                      <option value="production">{t('pages.exportPage.inProductionQueue')}</option>
                    </Select>
                    <span className="font-label-sm text-label-sm text-on-surface-variant/80">
                      {t('pages.exportPage.statusFilterComingSoon')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full py-3.5"
                  icon="download"
                  disabled={isBusy}
                  onClick={() => runExport('orders', rangeToParams(ordersRange))}
                >
                  {t('pages.exportPage.exportOrdersCsv')}
                </Button>
                <div className="flex items-center justify-between px-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('pages.exportPage.utf8ExcelBom')}
                  </span>
                  <span className="font-numeric-tabular">~ 3.4 MB</span>
                </div>
              </div>
            </div>

            {/* Catálogo de Productos & SKUs */}
            <div className="flex flex-col justify-between gap-6 rounded-xl bg-surface-container-lowest p-7 shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
                      <Icon name="inventory_2" className="text-[24px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {t('pages.exportPage.productsCardTitle')}
                      </span>
                      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                        {t('pages.exportPage.productsCardOverline')}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-surface-container px-2.5 py-1 font-numeric-tabular text-label-sm text-on-surface">
                    {t('pages.exportPage.productsRecordCount')}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {t('pages.exportPage.productsCardBody')}
                </p>
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5" title={t('common.comingSoon')}>
                    <label
                      htmlFor="export-products-category"
                      className="font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {t('pages.exportPage.matrixCategory')}
                    </label>
                    <Select
                      id="export-products-category"
                      disabled
                      title={t('common.comingSoon')}
                      inputClassName="border-transparent bg-surface-container-low"
                    >
                      <option value="all">{t('pages.exportPage.allCategories')}</option>
                      <option value="hoodies">{t('pages.exportPage.hoodies')}</option>
                      <option value="tees">{t('pages.exportPage.tees')}</option>
                      <option value="pants">{t('pages.exportPage.pants')}</option>
                      <option value="accessories">{t('pages.exportPage.accessories')}</option>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5" title={t('common.comingSoon')}>
                    <label
                      htmlFor="export-products-mode"
                      className="font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {t('pages.exportPage.operatingMode')}
                    </label>
                    <Select
                      id="export-products-mode"
                      disabled
                      title={t('common.comingSoon')}
                      inputClassName="border-transparent bg-surface-container-low"
                    >
                      <option value="all">{t('pages.exportPage.allModes')}</option>
                      <option value="stock">{t('pages.exportPage.immediateStock')}</option>
                      <option value="mto">{t('pages.exportPage.madeToOrder')}</option>
                      <option value="archive">{t('pages.exportPage.discontinuedArchive')}</option>
                    </Select>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant/80">
                  {t('pages.exportPage.productFiltersComingSoon')}
                </span>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full py-3.5"
                  icon="download"
                  disabled={isBusy}
                  onClick={() => runExport('products', {})}
                >
                  {t('pages.exportPage.exportProductsCsv')}
                </Button>
                <div className="flex items-center justify-between px-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('pages.exportPage.includesVariantsMatrix')}
                  </span>
                  <span className="font-numeric-tabular">~ 1.1 MB</span>
                </div>
              </div>
            </div>

            {/* Usuarios & Clientes */}
            <div className="flex flex-col justify-between gap-6 rounded-xl bg-surface-container-lowest p-7 shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
                      <Icon name="group" className="text-[24px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {t('pages.exportPage.usersCardTitle')}
                      </span>
                      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                        {t('pages.exportPage.usersCardOverline')}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-surface-container px-2.5 py-1 font-numeric-tabular text-label-sm text-on-surface">
                    {t('pages.exportPage.usersRecordCount')}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {t('pages.exportPage.usersCardBody')}
                </p>
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="export-users-search"
                      className="font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {t('pages.exportPage.usersSearchLabel')}
                    </label>
                    <Input
                      id="export-users-search"
                      variant="filled"
                      placeholder={t('pages.exportPage.usersSearchPlaceholder')}
                      value={usersSearch}
                      onChange={(event) => setUsersSearch(event.currentTarget.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="export-users-status"
                      className="font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {t('pages.exportPage.usersStatusLabel')}
                    </label>
                    <Select
                      id="export-users-status"
                      value={usersStatus}
                      onChange={(event) => setUsersStatus(event.currentTarget.value)}
                      inputClassName="border-transparent bg-surface-container-low"
                    >
                      <option value="">{t('pages.exportPage.usersStatusAll')}</option>
                      <option value="active">{t('pages.exportPage.usersStatusActive')}</option>
                      <option value="suspended">{t('pages.exportPage.usersStatusSuspended')}</option>
                      <option value="inactive">{t('pages.exportPage.usersStatusInactive')}</option>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full py-3.5"
                  icon="download"
                  disabled={isBusy}
                  onClick={() =>
                    runExport('users', {
                      ...(usersSearch.trim() ? { search: usersSearch.trim() } : {}),
                      ...(usersStatus ? { status: usersStatus } : {}),
                    })
                  }
                >
                  {t('pages.exportPage.exportUsersCsv')}
                </Button>
                <div className="flex items-center justify-between px-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('pages.exportPage.usersFooterHint')}
                  </span>
                </div>
              </div>
            </div>

            {/* Auditoría de cambios */}
            <div className="flex flex-col justify-between gap-6 rounded-xl bg-surface-container-lowest p-7 shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
                      <Icon name="history" className="text-[24px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {t('pages.exportPage.auditCardTitle')}
                      </span>
                      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                        {t('pages.exportPage.auditCardOverline')}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-surface-container px-2.5 py-1 font-numeric-tabular text-label-sm text-on-surface">
                    {t('pages.exportPage.auditRecordCount')}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {t('pages.exportPage.auditCardBody')}
                </p>
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="export-audit-range"
                      className="font-label-sm text-label-sm text-on-surface-variant"
                    >
                      {t('pages.exportPage.auditRangeLabel')}
                    </label>
                    <Select
                      id="export-audit-range"
                      value={auditRange}
                      onChange={(event) => setAuditRange(event.currentTarget.value as RangeValue)}
                      inputClassName="border-transparent bg-surface-container-low"
                    >
                      {RANGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey).replace('{{year}}', String(CURRENT_YEAR))}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full py-3.5"
                  icon="download"
                  disabled={isBusy}
                  onClick={() => runExport('audit-logs', rangeToParams(auditRange))}
                >
                  {t('pages.exportPage.exportAuditLogsCsv')}
                </Button>
                <div className="flex items-center justify-between px-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {t('pages.exportPage.auditFooterHint')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de descargas */}
        <div ref={historyRef} id="export-history-section" className="flex scroll-mt-24 flex-col gap-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">
                {t('pages.exportPage.historyTitle')}
              </h2>
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-numeric-tabular text-label-sm text-on-surface">
                {(history.length === 1
                  ? t('pages.exportPage.historyCountSingular')
                  : t('pages.exportPage.historyCountPlural')
                ).replace('{{count}}', String(history.length))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.exportPage.cloudStorage')}
              </span>
              <span className="font-numeric-tabular font-label-sm text-label-sm text-on-surface">
                {formatBytes(totalSize)} / 500 MB
              </span>
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            {history.length === 0 ? (
              <EmptyState
                icon="history"
                title={t('pages.exportPage.historyEmptyTitle')}
                description={t('pages.exportPage.historyEmptyDescription')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                      <th className="rounded-l-lg px-3 py-3">{t('pages.exportPage.columnFile')}</th>
                      <th className="px-3 py-3">{t('pages.exportPage.columnDataset')}</th>
                      <th className="px-3 py-3">{t('pages.exportPage.columnGeneratedBy')}</th>
                      <th className="px-3 py-3">{t('pages.exportPage.columnDateTime')}</th>
                      <th className="px-3 py-3">{t('pages.exportPage.columnSize')}</th>
                      <th className="px-3 py-3">{t('pages.exportPage.columnStatus')}</th>
                      <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.exportPage.columnActions')}</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={tableRowsContainer} initial="hidden" animate="visible">
                    {history.map((entry) => (
                      <motion.tr
                        variants={fadeInUp}
                        key={entry.id}
                        className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                      >
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <Icon name={FILE_ICONS[entry.kind]} className="text-[20px] text-on-surface" />
                            <div className="flex flex-col">
                              <span className="font-medium font-numeric-tabular text-on-surface">{entry.filename}</span>
                              <span className="text-[11px] text-on-surface-variant">
                                {typeof entry.rows === 'number'
                                  ? t('pages.exportPage.rowsSuffix').replace(
                                      '{{count}}',
                                      entry.rows.toLocaleString('es-CO'),
                                    )
                                  : t('pages.exportPage.commaDelimited')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-on-surface">{datasetLabels[entry.kind]}</td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
                              AT
                            </div>
                            <span className="text-on-surface">{t('pages.exportPage.generatedByValue')}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 font-numeric-tabular text-on-surface-variant">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="px-3 py-3.5 font-numeric-tabular text-on-surface">
                          {formatBytes(entry.size)}
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusPill label={t('pages.exportPage.statusReady')} tone="success" />
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title={t('pages.exportPage.download')}
                              aria-label={t('pages.exportPage.redownload').replace('{{filename}}', entry.filename)}
                              disabled={isBusy}
                              onClick={() =>
                                runExport(entry.kind, { from: entry.from, to: entry.to }, { register: false })
                              }
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Icon name="download" className="text-[18px]" />
                            </button>
                            <span title={t('common.comingSoon')} className="inline-flex">
                              <button
                                type="button"
                                title={t('common.comingSoon')}
                                aria-label={t('pages.exportPage.copyLinkComingSoon')}
                                disabled
                                className="cursor-not-allowed rounded-lg p-1.5 text-on-surface-variant opacity-50"
                              >
                                <Icon name="link" className="text-[18px]" />
                              </button>
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Banner RGPD */}
        <div className="flex flex-col items-start justify-between gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface">
              <Icon name="policy" className="text-[22px]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {t('pages.exportPage.gdprTitle')}
              </span>
              <p className="max-w-3xl font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.exportPage.gdprBody')}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-surface-container-low px-4 py-2 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
          >
            <span>{t('pages.exportPage.retentionPolicies')}</span>
            <Icon name="arrow_forward" className="text-[16px]" />
          </button>
        </div>
      </div>
    </>
  );
}
