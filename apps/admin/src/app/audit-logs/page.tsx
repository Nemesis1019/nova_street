'use client';

import type { components } from '@ecommerce/api-client';
import { useForm } from '@mantine/form';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ReactNode, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Input, Select } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type AuditLogEntry = components['schemas']['AuditLogEntryDto'];

type Translate = (key: string) => string;

const PAGE_SIZES = [25, 50, 100] as const;

const FILTER_INPUT_CLASS = 'border-transparent bg-surface-container-low/60 focus:bg-surface-container-lowest';

const AVATAR_STYLES = [
  'bg-primary text-on-primary',
  'bg-secondary-container text-on-secondary-container',
  'bg-surface-container-highest text-on-surface',
];

interface AuditFilters {
  entity: string;
  entityId: string;
  action: string;
  userId: string;
}

const EMPTY_FILTERS: AuditFilters = { entity: '', entityId: '', action: '', userId: '' };

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CO');
}

function getActorName(log: AuditLogEntry, t: Translate) {
  if (!log.user) return t('pages.auditLogs.systemActor');
  const name = `${log.user.firstName ?? ''} ${log.user.lastName ?? ''}`.trim();
  return name || log.user.email;
}

function getActorContext(log: AuditLogEntry, t: Translate) {
  return log.user?.email ?? t('pages.auditLogs.webhookContext');
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || 'SA';
}

function getAvatarClass(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % AVATAR_STYLES.length;
  }
  return AVATAR_STYLES[hash];
}

function getActionBadgeClass(action: string) {
  const value = action.toUpperCase();
  if (/(DELETE|SUSPEND|REMOVE)/.test(value)) return 'bg-error-container text-on-error-container';
  if (/(APPROVE|ASSIGN)/.test(value)) return 'bg-secondary-fixed text-on-secondary-fixed';
  if (/CREATE/.test(value)) return 'bg-primary text-on-primary';
  if (/(UPDATE|CHANGE)/.test(value)) return 'bg-secondary-container text-on-secondary-container';
  return 'bg-surface-container-highest text-on-surface';
}

function truncateId(value: string) {
  return value.length > 16 ? `${value.slice(0, 13)}...` : value;
}

function formatJson(value: unknown) {
  if (value === null || value === undefined) return 'null';
  return JSON.stringify(value, null, 2);
}

function getUserLabel(user: { id: string; email: string; firstName?: string; lastName?: string }) {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name ? `${name} (${user.email})` : user.email;
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildDiffPayload(log: AuditLogEntry, t: Translate) {
  return {
    entity: log.entity,
    entityId: log.entityId,
    action: log.action,
    actor: getActorName(log, t),
    before: log.before ?? null,
    after: log.after ?? null,
    createdAt: log.createdAt,
  };
}

interface KpiCardProps {
  label: string;
  topRight: ReactNode;
  value: ReactNode;
  unit: string;
  footer: ReactNode;
}

function KpiCard({ label, topRight, value, unit, footer }: KpiCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        {topRight}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-headline-xl text-headline-xl font-numeric-tabular text-on-surface">{value}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">{unit}</span>
      </div>
      <div className="mt-2">{footer}</div>
    </div>
  );
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(25);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [range, setRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [rangeOpened, setRangeOpened] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filterForm = useForm<AuditFilters>({ initialValues: { ...EMPTY_FILTERS } });

  const { data: logsResponse, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-audit-logs', page, limit, filters, range],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/audit-logs', {
        params: {
          query: {
            page: String(page),
            limit: String(limit),
            entity: filters.entity || undefined,
            entityId: filters.entityId || undefined,
            action: filters.action || undefined,
            userId: filters.userId || undefined,
            from: range.from ? new Date(`${range.from}T00:00:00`).toISOString() : undefined,
            to: range.to ? new Date(`${range.to}T23:59:59.999`).toISOString() : undefined,
          },
        },
      });
      if (error) throw error;
      return data;
    },
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

  const logs = logsResponse?.data ?? [];
  const total = logsResponse?.meta?.total ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const operatorMap = new Map<string, string>();
  logs.forEach((log) => operatorMap.set(log.user?.id ?? 'system', getActorName(log, t)));
  const operatorsCount = operatorMap.size;
  const operatorNames = Array.from(operatorMap.values()).join(', ');

  const rangeActive = Boolean(range.from || range.to);
  const rangeTitle = rangeActive
    ? t('pages.auditLogs.rangeActiveTitle')
        .replace('{{from}}', range.from || t('pages.auditLogs.dateRangeStart'))
        .replace('{{to}}', range.to || t('pages.auditLogs.dateRangeEnd'))
    : t('pages.auditLogs.filterByDateRange');

  function handleApplyFilters(values: AuditFilters) {
    setPage(1);
    setFilters(values);
  }

  function handleResetFilters() {
    filterForm.setValues({ ...EMPTY_FILTERS });
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function openRangeModal() {
    setFromDraft(range.from);
    setToDraft(range.to);
    setRangeOpened(true);
  }

  function applyRange() {
    if (fromDraft && toDraft && fromDraft > toDraft) {
      notifyError({
        title: t('pages.auditLogs.invalidRangeTitle'),
        message: t('pages.auditLogs.invalidRangeMessage'),
      });
      return;
    }
    setRange({ from: fromDraft, to: toDraft });
    setPage(1);
    setRangeOpened(false);
  }

  function clearRange() {
    setFromDraft('');
    setToDraft('');
    setRange({ from: '', to: '' });
    setPage(1);
    setRangeOpened(false);
  }

  function handleExportCsv() {
    if (logs.length === 0) return;
    const header = [
      t('pages.auditLogs.csvDate'),
      t('pages.auditLogs.csvAction'),
      t('pages.auditLogs.csvEntity'),
      t('pages.auditLogs.csvReferenceId'),
      t('pages.auditLogs.csvUser'),
      t('pages.auditLogs.csvEmailContext'),
      t('pages.auditLogs.csvBeforeJson'),
      t('pages.auditLogs.csvAfterJson'),
    ];
    const rows = logs.map((log) => [
      formatDateTime(log.createdAt),
      log.action,
      log.entity,
      log.entityId,
      getActorName(log, t),
      getActorContext(log, t),
      formatJson(log.before),
      formatJson(log.after),
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess({
      title: t('pages.auditLogs.toastExported'),
      message: t('pages.auditLogs.toastExportedMessage').replace('{{count}}', String(logs.length)),
    });
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <PageHeader
          breadcrumb={[{ label: t('pages.auditLogs.breadcrumbSettings') }, { label: t('pages.auditLogs.breadcrumbLogs') }]}
          title={t('pages.auditLogs.title')}
          subtitle={t('pages.auditLogs.subtitle')}
          actions={
            <>
              <Button variant="secondary" icon="calendar_today" onClick={openRangeModal} title={rangeTitle}>
                {t('pages.auditLogs.dateRange')}
                {rangeActive && <span className="h-1.5 w-1.5 rounded-full bg-secondary" />}
              </Button>
              <Button
                icon="download"
                onClick={handleExportCsv}
                disabled={logs.length === 0}
                title={t('pages.auditLogs.exportTitle')}
              >
                {t('pages.auditLogs.exportButton')}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t('pages.auditLogs.kpiEvents')}
            topRight={
              <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                {t('pages.auditLogs.today')}
              </span>
            }
            value={<AnimatedNumber value={total} />}
            unit={t('pages.auditLogs.actionsUnit')}
            footer={
              <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                <Icon name="sync" className="text-[16px] text-primary" />
                <span>{t('pages.auditLogs.activeFlow')}</span>
              </div>
            }
          />
          <KpiCard
            label={t('pages.auditLogs.kpiActiveOperators')}
            topRight={<span className="inline-block h-2 w-2 rounded-full bg-primary" />}
            value={<AnimatedNumber value={operatorsCount} />}
            unit={t('pages.auditLogs.usersWithMutations')}
            footer={
              <div className="truncate font-label-sm text-label-sm text-on-surface-variant" title={operatorNames}>
                {operatorNames || t('pages.auditLogs.noOperators')}
              </div>
            }
          />
          <KpiCard
            label={t('pages.auditLogs.kpiCriticalAlerts')}
            topRight={<Icon name="shield" className="text-[18px] text-on-surface-variant" />}
            value={<AnimatedNumber value={0} />}
            unit={t('pages.auditLogs.reportedIncidents')}
            footer={
              <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                <Icon name="verified" className="text-[16px]" />
                <span>
                  {t('pages.auditLogs.hashVerified')}{' '}
                  <span className="text-on-surface-variant/70">{t('pages.auditLogs.informative')}</span>
                </span>
              </div>
            }
          />
          <KpiCard
            label={t('pages.auditLogs.kpiRetention')}
            topRight={<Icon name="policy" className="text-[18px] text-on-surface-variant" />}
            value={<AnimatedNumber value={365} />}
            unit={t('pages.auditLogs.historyDays')}
            footer={
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.auditLogs.gdprPolicies')}
              </div>
            }
          />
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <form className="flex flex-col gap-4" onSubmit={filterForm.onSubmit(handleApplyFilters)}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-entity" className="font-label-sm text-label-sm font-semibold text-on-surface">
                  {t('pages.auditLogs.fieldEntity')}
                </label>
                <Input
                  id="filter-entity"
                  placeholder={t('pages.auditLogs.fieldEntityPlaceholder')}
                  inputClassName={FILTER_INPUT_CLASS}
                  {...filterForm.getInputProps('entity')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-entity-id" className="font-label-sm text-label-sm font-semibold text-on-surface">
                  {t('pages.auditLogs.fieldEntityId')}
                </label>
                <Input
                  id="filter-entity-id"
                  placeholder={t('pages.auditLogs.fieldEntityIdPlaceholder')}
                  inputClassName={FILTER_INPUT_CLASS}
                  {...filterForm.getInputProps('entityId')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-action" className="font-label-sm text-label-sm font-semibold text-on-surface">
                  {t('pages.auditLogs.fieldAction')}
                </label>
                <Input
                  id="filter-action"
                  placeholder={t('pages.auditLogs.fieldActionPlaceholder')}
                  inputClassName={FILTER_INPUT_CLASS}
                  {...filterForm.getInputProps('action')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="filter-user" className="font-label-sm text-label-sm font-semibold text-on-surface">
                  {t('pages.auditLogs.fieldUser')}
                </label>
                <Select id="filter-user" inputClassName={FILTER_INPUT_CLASS} {...filterForm.getInputProps('userId')}>
                  <option value="">{t('pages.auditLogs.allOperators')}</option>
                  {(users ?? []).map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserLabel(user)}
                    </option>
                  ))}
                  <option value="system" disabled title={t('pages.auditLogs.systemActorOptionTitle')}>
                    {t('pages.auditLogs.systemActorOption')}
                  </option>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                <Icon name="tune" className="text-[16px]" />
                <span>{t('pages.auditLogs.predictiveSearch')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-lg bg-surface-container-low px-3.5 py-1.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
                >
                  {t('pages.auditLogs.clear')}
                </button>
                <Button type="submit" className="px-4 py-1.5">
                  {t('pages.auditLogs.applyFilters')}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon="history"
              title={t('pages.auditLogs.emptyTitle')}
              description={t('pages.auditLogs.emptyDescription')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <th className="rounded-l-lg px-3 py-3">{t('pages.auditLogs.columnDateTime')}</th>
                    <th className="px-3 py-3">{t('pages.auditLogs.columnAction')}</th>
                    <th className="px-3 py-3">{t('pages.auditLogs.columnEntity')}</th>
                    <th className="px-3 py-3">{t('pages.auditLogs.columnReferenceId')}</th>
                    <th className="px-3 py-3">{t('pages.auditLogs.columnUser')}</th>
                    <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.auditLogs.columnDetails')}</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableRowsContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm text-on-surface"
                >
                  {logs.map((log) => (
                    <motion.tr
                      variants={fadeInUp}
                      key={log.id}
                      className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="whitespace-nowrap px-3 py-3.5 font-numeric-tabular text-on-surface">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 font-mono font-label-sm text-label-sm ${getActionBadgeClass(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-medium">{log.entity}</td>
                      <td className="px-3 py-3.5">
                        <span className="font-mono text-label-sm text-on-surface-variant" title={log.entityId}>
                          {truncateId(log.entityId)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-label-sm text-[10px] ${getAvatarClass(log.user?.id ?? 'system')}`}
                          >
                            {getInitials(getActorName(log, t))}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface">{getActorName(log, t)}</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {getActorContext(log, t)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="rounded bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                        >
                          {t('pages.auditLogs.viewJsonDiff')}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {!isLoading && (
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low/30 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.auditLogs.showingPrefix')}{' '}
                  <span className="font-medium text-on-surface">
                    {rangeStart} - {rangeEnd}
                  </span>{' '}
                  {t('pages.auditLogs.showingMiddle')}{' '}
                  <span className="font-medium text-on-surface">{total}</span>{' '}
                  {t('pages.auditLogs.showingSuffix')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t('pages.auditLogs.rowsPerPage')}
                  </span>
                  <select
                    value={limit}
                    onChange={(event) => {
                      setLimit(Number(event.currentTarget.value));
                      setPage(1);
                    }}
                    className="cursor-pointer rounded bg-surface-container-lowest px-2 py-1 font-label-sm text-label-sm text-on-surface focus:outline-none"
                  >
                    {PAGE_SIZES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ml-auto">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
            <Icon name="verified_user" className="text-[22px] text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {t('pages.auditLogs.integrityTitle')}
              </span>
              <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                {t('pages.auditLogs.sha256Badge')}
              </span>
            </div>
            <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
              {t('pages.auditLogs.integrityBody')}
            </p>
          </div>
        </div>
      </div>

      <AppModal
        opened={rangeOpened}
        onClose={() => setRangeOpened(false)}
        title={
          <span className="flex items-center gap-2">
            <Icon name="calendar_today" className="text-[20px] text-primary" />
            {t('pages.auditLogs.dateRange')}
          </span>
        }
        subtitle={t('pages.auditLogs.rangeModalSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={clearRange}>
              {t('pages.auditLogs.clear')}
            </Button>
            <Button onClick={applyRange}>{t('pages.auditLogs.applyRange')}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="range-from" className="font-label-sm text-label-sm font-semibold text-on-surface">
              {t('pages.auditLogs.fromLabel')}
            </label>
            <Input
              id="range-from"
              type="date"
              value={fromDraft}
              onChange={(event) => setFromDraft(event.currentTarget.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="range-to" className="font-label-sm text-label-sm font-semibold text-on-surface">
              {t('pages.auditLogs.toLabel')}
            </label>
            <Input
              id="range-to"
              type="date"
              value={toDraft}
              onChange={(event) => setToDraft(event.currentTarget.value)}
            />
          </div>
        </div>
        <p className="mt-3 font-label-sm text-label-sm text-on-surface-variant">
          {t('pages.auditLogs.rangeHelp')}
        </p>
      </AppModal>

      <AppModal
        opened={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={
          <span className="flex items-center gap-2">
            <Icon name="data_object" className="text-[20px] text-primary" />
            {t('pages.auditLogs.detailTitle')}
          </span>
        }
        subtitle={selectedLog ? `${selectedLog.action} · ${selectedLog.entity}` : undefined}
        size="lg"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <span className="font-mono font-label-sm text-label-sm text-on-surface-variant">
              {t('pages.auditLogs.detailFooterNotice')}
            </span>
            <Button onClick={() => setSelectedLog(null)}>{t('pages.auditLogs.closeInspector')}</Button>
          </div>
        }
      >
        <div className="max-h-80 overflow-x-auto rounded-lg bg-primary p-4 font-mono font-label-sm text-label-sm text-on-primary">
          <pre className="leading-relaxed">
            {selectedLog ? formatJson(buildDiffPayload(selectedLog, t)) : ''}
          </pre>
        </div>
      </AppModal>
    </>
  );
}