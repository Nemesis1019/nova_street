'use client';

import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Input } from '../../components/ui/input';
import { fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { Switch } from '../../components/ui/switch';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

interface StoreRedirect {
  id: string;
  fromPath: string;
  toUrl: string;
  statusCode: number;
  isActive: boolean;
}

const STATUS_LABEL_KEYS: Record<number, string> = {
  301: 'pages.redirects.status301',
  302: 'pages.redirects.status302',
  307: 'pages.redirects.status307',
  308: 'pages.redirects.status308',
};

const STATUS_OPTIONS = [
  { value: 301, labelKey: 'pages.redirects.status301', descriptionKey: 'pages.redirects.status301Description' },
  { value: 302, labelKey: 'pages.redirects.status302', descriptionKey: 'pages.redirects.status302Description' },
  { value: 307, labelKey: 'pages.redirects.status307', descriptionKey: 'pages.redirects.status307Description' },
  { value: 308, labelKey: 'pages.redirects.status308', descriptionKey: 'pages.redirects.status308Description' },
] as const;

export default function RedirectsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<StoreRedirect | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const { data: redirects, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-store-redirects'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/store-redirects');
      if (error) throw error;
      return (data ?? []) as StoreRedirect[];
    },
  });

  const form = useForm({
    initialValues: { fromPath: '', toUrl: '', statusCode: 301, isActive: true },
    validate: {
      fromPath: (value: string) => (value.startsWith('/') ? null : t('pages.redirects.validationFromPath')),
      toUrl: (value: string) =>
        value.startsWith('/') || value.startsWith('http') ? null : t('pages.redirects.validationToUrl'),
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-store-redirects'] });

  const save = useMutation({
    mutationFn: async (values: { fromPath: string; toUrl: string; statusCode: number; isActive: boolean }) => {
      if (editing) {
        const { error } = await apiClient.PATCH('/admin/store-redirects/{id}', {
          params: { path: { id: editing.id } },
          body: values as never,
        });
        if (error) throw error;
      } else {
        const { error } = await apiClient.POST('/admin/store-redirects', {
          body: values as never,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      notifySuccess({
        title: editing ? t('pages.redirects.toastUpdated') : t('pages.redirects.toastCreated'),
      });
      close();
      setEditing(null);
    },
    onError: (error) => {
      notifyError({ title: t('pages.redirects.toastSaveError'), message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/store-redirects/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      notifySuccess({ title: t('pages.redirects.toastDeleted') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.redirects.toastDeleteError'), message: getApiErrorMessage(error) });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (redirect: StoreRedirect) => {
      const { error } = await apiClient.PATCH('/admin/store-redirects/{id}', {
        params: { path: { id: redirect.id } },
        body: { isActive: !redirect.isActive } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      notifyError({ title: t('pages.redirects.toastStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.setValues({ fromPath: '', toUrl: '', statusCode: 301, isActive: true });
    open();
  };

  const openEdit = (redirect: StoreRedirect) => {
    setEditing(redirect);
    form.setValues({
      fromPath: redirect.fromPath,
      toUrl: redirect.toUrl,
      statusCode: redirect.statusCode,
      isActive: redirect.isActive,
    });
    open();
  };

  const closeModal = () => {
    close();
    setEditing(null);
  };

  const handleCopy = (path: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(path)
        .then(() =>
          notifySuccess({ title: t('pages.redirects.toastCopied').replace('{{path}}', path) }),
        )
        .catch(() => notifyError({ title: t('pages.redirects.toastCopyError') }));
    } else {
      notifyError({
        title: t('pages.redirects.toastCopyError'),
        message: t('common.clipboardUnavailable'),
      });
    }
  };

  const redirectsList = redirects ?? [];
  const totalCount = redirectsList.length;
  const activeCount = redirectsList.filter((redirect) => redirect.isActive).length;

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: t('pages.redirects.breadcrumbStorefront') },
            { label: t('pages.redirects.breadcrumbRedirects') },
          ]}
          title={t('pages.redirects.title')}
          subtitle={t('pages.redirects.subtitle')}
          actions={
            <Button icon="add" onClick={openCreate}>
              {t('pages.redirects.newRedirect')}
            </Button>
          }
        />

        {/*
          KPIs: solo "Reglas Activas" sale de datos reales (GET /admin/store-redirects).
          Los KPIs 2-4 no tienen endpoint disponible → valor "—" con badge "Próximamente".
        */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.redirects.kpiActive')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="alt_route" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-numeric-tabular font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                  {activeCount}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.redirects.kpiActiveHint')}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.redirects.kpiActiveOk')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.redirects.kpiRedirected')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="sync_alt" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-numeric-tabular font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                  —
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.redirects.kpiRedirectedUnit')}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                {t('common.comingSoon')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.redirects.kpiLatency')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="bolt" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-numeric-tabular font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                  —
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.redirects.kpiLatencyHint')}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                {t('common.comingSoon')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.redirects.kpiMitigation')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="verified_user" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-numeric-tabular font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                  —
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.redirects.kpiMitigationHint')}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                {t('common.comingSoon')}
              </span>
            </div>
          </div>
        </div>

        {/* Banner: arquitectura del enrutador edge (visual estático) */}
        <div className="flex flex-col items-center justify-between gap-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm lg:flex-row">
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
              <Icon name="hub" className="text-[26px]" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.redirects.bannerTitle')}
                </span>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.redirects.bannerLive')}
                </span>
              </div>
              <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.redirects.bannerBody')}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-4 overflow-x-auto rounded-lg bg-surface-container-low px-4 py-3 lg:w-auto">
            <div className="flex items-center gap-2">
              <Icon name="person" className="text-[16px] text-on-surface-variant" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.redirects.flowClient')}
              </span>
            </div>
            <Icon name="arrow_forward" className="text-[18px] text-on-surface-variant/40" />
            <div className="flex items-center gap-2 rounded-md bg-surface-container-lowest px-3 py-1.5 shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                {t('pages.redirects.flowWorker')}
              </span>
            </div>
            <Icon name="arrow_forward" className="text-[18px] text-on-surface-variant/40" />
            <div className="flex items-center gap-2">
              <Icon name="call_missed_outgoing" className="text-[16px] text-on-surface-variant" />
              <span className="font-label-sm text-label-sm text-on-surface">
                {t('pages.redirects.flowDestination')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de reglas */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : redirectsList.length === 0 ? (
            <EmptyState
              icon="alt_route"
              title={t('pages.redirects.emptyTitle')}
              description={t('pages.redirects.emptyDescription')}
              action={
                <Button icon="add" onClick={openCreate}>
                  {t('pages.redirects.newRedirect')}
                </Button>
              }
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="rounded-l-lg px-3 py-3 text-left font-semibold">
                      {t('pages.redirects.columnFrom')}
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">{t('pages.redirects.columnTo')}</th>
                    <th className="px-3 py-3 text-left font-semibold">
                      {t('pages.redirects.columnStatusType')}
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">{t('pages.redirects.columnHits')}</th>
                    <th className="px-3 py-3 text-center font-semibold">
                      {t('pages.redirects.columnActive')}
                    </th>
                    <th className="rounded-r-lg px-3 py-3 text-right font-semibold">
                      {t('pages.redirects.columnActions')}
                    </th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableRowsContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm text-on-surface"
                >
                  {redirectsList.map((redirect) => {
                    const isInternal = redirect.toUrl.startsWith('/');
                    const isPrimary = redirect.statusCode === 301;
                    return (
                      <motion.tr
                        variants={fadeInUp}
                        key={redirect.id}
                        className={`border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low ${
                          redirect.isActive ? '' : 'opacity-60'
                        }`}
                      >
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-surface-container-high px-2 py-1 font-mono text-[13px] font-semibold text-on-surface">
                              {redirect.fromPath}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(redirect.fromPath)}
                              title={t('pages.redirects.actionCopyPath')}
                              className="text-on-surface-variant/40 transition-colors hover:text-on-surface"
                            >
                              <Icon name="content_copy" className="text-[16px]" />
                            </button>
                          </div>
                        </td>
                        <td className="max-w-xs px-3 py-3.5">
                          {isInternal ? (
                            <Link
                              href={redirect.toUrl}
                              className="group inline-flex max-w-full items-center gap-1.5 truncate text-on-surface underline decoration-outline-variant/60 underline-offset-2 transition-colors hover:text-primary"
                            >
                              <span className="truncate font-mono text-[13px]">{redirect.toUrl}</span>
                              <Icon
                                name="open_in_new"
                                className="text-[14px] text-on-surface-variant group-hover:text-primary"
                              />
                            </Link>
                          ) : (
                            <a
                              href={redirect.toUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex max-w-full items-center gap-1.5 truncate text-on-surface underline decoration-outline-variant/60 underline-offset-2 transition-colors hover:text-primary"
                            >
                              <span className="truncate font-mono text-[13px]">{redirect.toUrl}</span>
                              <Icon
                                name="open_in_new"
                                className="text-[14px] text-on-surface-variant group-hover:text-primary"
                              />
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold ${
                              isPrimary
                                ? 'bg-surface-container text-on-surface'
                                : 'bg-secondary-container text-on-secondary-container'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isPrimary ? 'bg-primary' : 'bg-on-secondary-container'
                              }`}
                            />
                            {STATUS_LABEL_KEYS[redirect.statusCode]
                              ? t(STATUS_LABEL_KEYS[redirect.statusCode])
                              : redirect.statusCode}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right font-numeric-tabular font-medium text-on-surface">—</td>
                        <td className="px-3 py-3.5 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={redirect.isActive}
                              onChange={() => toggleActive.mutate(redirect)}
                              disabled={toggleActive.isPending}
                              label={t('pages.redirects.actionActivate').replace(
                                '{{path}}',
                                redirect.fromPath,
                              )}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(redirect)}
                              className="rounded px-2.5 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => remove.mutate(redirect.id)}
                              disabled={remove.isPending}
                              className="rounded bg-error-container/30 px-2.5 py-1 font-label-sm text-label-sm text-on-error-container transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}

          {!isLoading && (
            <div className="border-t border-outline-variant/20 bg-surface-container-low/40 px-4 pb-4">
              <Pagination
                page={1}
                totalPages={1}
                onChange={() => undefined}
                summary={t('pages.redirects.paginationSummary')
                  .replace('{{shown}}', String(totalCount))
                  .replace('{{total}}', String(totalCount))}
              />
            </div>
          )}
        </div>

        {/* Cards informativos inferiores (estáticos) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="flex flex-col justify-between gap-4 lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                <Icon name="cloud_sync" className="text-[22px]" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.redirects.syncTitle')}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t('pages.redirects.syncBody')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-surface-container-low/40 p-4 sm:grid-cols-3">
              <div className="flex flex-col">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.redirects.syncPurgeLabel')}
                </span>
                <span className="mt-0.5 font-numeric-tabular font-semibold text-on-surface">
                  {t('pages.redirects.syncPurgeValue')}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.redirects.syncSeoLabel')}
                </span>
                <span className="mt-0.5 font-numeric-tabular font-semibold text-on-surface">
                  {t('pages.redirects.syncSeoValue')}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.redirects.syncQueryLabel')}
                </span>
                <span className="mt-0.5 font-numeric-tabular font-semibold text-on-surface">
                  {t('pages.redirects.syncQueryValue')}
                </span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
                <Icon name="help_outline" className="text-[20px]" />
                <span>{t('pages.redirects.bestPracticesTitle')}</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.redirects.bestPracticesBefore')}
                <strong>301</strong>
                {t('pages.redirects.bestPracticesMiddle')}
                <strong>302</strong>
                {t('pages.redirects.bestPracticesAfter')}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                className="flex items-center gap-1.5 font-label-md text-label-md font-medium text-on-surface transition-colors hover:text-primary"
              >
                <span>{t('pages.redirects.viewDocs')}</span>
                <Icon name="arrow_forward" className="text-[16px]" />
              </button>
            </div>
          </Card>
        </div>
      </div>

      <AppModal
        opened={opened}
        onClose={closeModal}
        size="md"
        title={editing ? t('pages.redirects.modalEditTitle') : t('pages.redirects.modalNewTitle')}
        subtitle={t('pages.redirects.modalSubtitle')}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="save"
              onClick={() => form.onSubmit((values) => save.mutate(values))()}
              disabled={save.isPending}
            >
              {save.isPending
                ? t('common.saving')
                : editing
                  ? t('pages.redirects.saveChanges')
                  : t('pages.redirects.savePublish')}
            </Button>
          </>
        }
      >
        <form onSubmit={form.onSubmit((values) => save.mutate(values))} className="flex flex-col gap-4">
          <Field label={t('pages.redirects.fieldFrom')} required hint={t('pages.redirects.fieldFromHint')}>
            <div className="flex items-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 transition-colors focus-within:border-primary">
              <span className="select-none font-mono text-body-sm text-on-surface-variant/70">
                {form.values.fromPath.startsWith('/') ? '' : '/'}
              </span>
              <input
                {...form.getInputProps('fromPath')}
                placeholder="promo-verano"
                className="w-full bg-transparent font-mono text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
              />
            </div>
            {form.errors.fromPath && <span className="font-label-sm text-label-sm text-error">{form.errors.fromPath}</span>}
          </Field>

          <Field label={t('pages.redirects.fieldTo')} required hint={t('pages.redirects.fieldToHint')}>
            <Input
              {...form.getInputProps('toUrl')}
              placeholder={t('pages.redirects.fieldToPlaceholder')}
              inputClassName="font-mono"
            />
            {form.errors.toUrl && <span className="font-label-sm text-label-sm text-error">{form.errors.toUrl}</span>}
          </Field>

          <Field label={t('pages.redirects.fieldStatusCode')}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-container-low p-2.5 transition-colors hover:bg-surface-container"
                >
                  <input
                    type="radio"
                    name="http-status"
                    value={option.value}
                    checked={form.values.statusCode === option.value}
                    onChange={() => form.setFieldValue('statusCode', option.value)}
                    className="accent-primary"
                  />
                  <span className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {t(option.labelKey)}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {t(option.descriptionKey)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-2.5">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-semibold text-on-surface">
                {t('pages.redirects.fieldActive')}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.redirects.fieldActiveHint')}
              </span>
            </div>
            <Switch
              checked={form.values.isActive}
              onChange={(checked) => form.setFieldValue('isActive', checked)}
              label={t('pages.redirects.fieldActive')}
            />
          </div>
        </form>
      </AppModal>
    </>
  );
}
