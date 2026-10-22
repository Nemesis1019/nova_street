'use client';

import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { Card, EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { Switch } from '../../components/ui/switch';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

type VisibilityFilter = 'all' | 'active';

const FIELD_LABEL_CLASS = 'font-label-sm text-label-sm font-medium text-on-surface';
const FIELD_INPUT_CLASS =
  'w-full rounded-lg bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface shadow-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary';

const EXAMPLE_BASE_AMOUNT = 100_000;

export default function CurrenciesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-currencies'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/currencies');
      if (error) throw error;
      return (data ?? []) as Currency[];
    },
  });

  const form = useForm({
    initialValues: {
      code: '',
      name: '',
      symbol: '',
      exchangeRate: 1,
      isDefault: false,
      isActive: true,
      sortOrder: 0,
    },
  });

  const create = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const { error } = await apiClient.POST('/admin/currencies', { body: values as never });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      form.reset();
      notifySuccess({ title: t('pages.currencies.toastCreated') });
    },
    onError: (error) => notifyError({ title: t('pages.currencies.toastError'), message: getApiErrorMessage(error) }),
  });

  const update = useMutation({
    mutationFn: async ({ code, values }: { code: string; values: Partial<Currency> }) => {
      const { error } = await apiClient.PATCH('/admin/currencies/{code}', {
        params: { path: { code } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      notifySuccess({ title: t('pages.currencies.toastUpdated') });
    },
    onError: (error) => notifyError({ title: t('pages.currencies.toastError'), message: getApiErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await apiClient.DELETE('/admin/currencies/{code}', {
        params: { path: { code } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      notifySuccess({ title: t('pages.currencies.toastDeleted') });
    },
    onError: (error) => notifyError({ title: t('pages.currencies.toastError'), message: getApiErrorMessage(error) }),
  });

  const syncRates = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/admin/currencies/sync');
      if (error) throw error;
      return data as unknown as {
        base: string;
        updated: Array<{ code: string; previous: number; current: number }>;
        skipped: string[];
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      if (result?.updated?.length) {
        notifySuccess({
          title: t('pages.currencies.toastSynced').replace('{{count}}', String(result.updated.length)),
          message: result.updated
            .map((item) => `${item.code}: ${item.previous} → ${item.current}`)
            .join(' · '),
        });
      } else {
        notifySuccess({ title: t('pages.currencies.toastSyncedNone') });
      }
    },
    onError: (error) =>
      notifyError({ title: t('pages.currencies.toastSyncError'), message: getApiErrorMessage(error) }),
  });

  const currencies = useMemo(() => data ?? [], [data]);
  const activeCurrencies = useMemo(() => currencies.filter((currency) => currency.isActive), [currencies]);
  const defaultCurrency = useMemo(() => currencies.find((currency) => currency.isDefault) ?? null, [currencies]);
  const visibleCurrencies = visibility === 'active' ? activeCurrencies : currencies;

  const baseCode = defaultCurrency?.code ?? 'COP';
  const activeCodes = activeCurrencies.map((currency) => currency.code).join(', ');
  const activeCount = activeCurrencies.length;

  const usd = currencies.find((currency) => currency.code.toUpperCase() === 'USD');
  const eur = currencies.find((currency) => currency.code.toUpperCase() === 'EUR');

  const formatConversion = (currency?: Currency) =>
    currency
      ? `${currency.symbol}${(EXAMPLE_BASE_AMOUNT * Number(currency.exchangeRate)).toFixed(2)} ${currency.code}`
      : '—';

  const setNumericField = (field: 'exchangeRate' | 'sortOrder', value: string) => {
    form.setFieldValue(field, value === '' ? 0 : Number(value));
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: t('pages.currencies.breadcrumbConfig'), href: '/store-config' },
            { label: t('pages.currencies.breadcrumbCurrencies') },
          ]}
          title={
            <span className="flex flex-wrap items-baseline gap-3">
              <span>{t('pages.currencies.title')}</span>
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                {currencies.length === 1
                  ? t('pages.currencies.configuredSingular').replace('{{count}}', String(currencies.length))
                  : t('pages.currencies.configuredPlural').replace('{{count}}', String(currencies.length))}
              </span>
            </span>
          }
          subtitle={t('pages.currencies.subtitle')}
          actions={
            <>
              <button
                type="button"
                onClick={() => syncRates.mutate()}
                disabled={syncRates.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-2.5 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-low disabled:opacity-60"
              >
                <Icon
                  name="sync"
                  className={
                    syncRates.isPending
                      ? 'animate-spin text-[18px] text-on-surface-variant'
                      : 'text-[18px] text-on-surface-variant'
                  }
                />
                <span>
                  {syncRates.isPending ? t('pages.currencies.syncing') : t('pages.currencies.syncRates')}
                </span>
              </button>
              <button
                type="button"
                disabled
                title={t('common.comingSoon')}
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-md text-label-md text-on-primary opacity-60 shadow-sm"
              >
                <Icon name="tune" className="text-[18px]" />
                <span>{t('pages.currencies.conversionSettings')}</span>
              </button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Moneda principal */}
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                {t('pages.currencies.kpiMainCurrency')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="verified" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {defaultCurrency ? `${defaultCurrency.code} (${defaultCurrency.symbol})` : '—'}
                </span>
                <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface">
                  {t('pages.currencies.base')}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {defaultCurrency
                  ? t('pages.currencies.settlementCurrency').replace('{{name}}', defaultCurrency.name)
                  : t('pages.currencies.noBaseCurrency')}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 font-label-sm text-label-sm text-on-surface-variant">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t('pages.currencies.localGateway')}</span>
            </div>
          </div>

          {/* Monedas activas */}
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                {t('pages.currencies.kpiActiveCurrencies')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-container/40 text-on-secondary-container">
                <Icon name="currency_exchange" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {activeCount === 1
                    ? t('pages.currencies.activeSingular').replace('{{count}}', String(activeCount))
                    : t('pages.currencies.activePlural').replace('{{count}}', String(activeCount))}
                </span>
                {activeCount > 0 && (
                  <span className="font-numeric-tabular text-body-sm text-on-surface-variant">({activeCodes})</span>
                )}
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.currencies.crossBorderBilling')}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 font-label-sm text-label-sm text-on-surface-variant">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
              <span>{t('pages.currencies.settledVia')}</span>
            </div>
          </div>

          {/* Última sincronización */}
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                {t('pages.currencies.kpiLastSync')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="update" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">—</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.currencies.syncSource')}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 font-label-sm text-label-sm text-on-surface-variant">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t('pages.currencies.dailyDelta')}</span>
            </div>
          </div>

          {/* Conversión automática */}
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                {t('pages.currencies.kpiAutoConversion')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="public" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  {t('pages.currencies.geoIpActive')}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.currencies.nativeDetection')}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 font-label-sm text-label-sm text-on-surface-variant">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t('pages.currencies.dynamicCartPrices')}</span>
            </div>
          </div>
        </div>

        {/* Formulario + tabla */}
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-12">
          {/* Alta de moneda */}
          <Card className="flex flex-col gap-6 xl:col-span-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.currencies.addNewTitle')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.currencies.addNewSubtitle')}
                </span>
              </div>
              <Icon name="payments" className="text-[22px] text-on-surface-variant" />
            </div>

            <form className="flex flex-col gap-4" onSubmit={form.onSubmit((values) => create.mutate(values))}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="currency-code" className={FIELD_LABEL_CLASS}>
                    {t('pages.currencies.fieldCode')}
                  </label>
                  <input
                    id="currency-code"
                    maxLength={3}
                    placeholder="GBP"
                    required
                    className={`${FIELD_INPUT_CLASS} font-numeric-tabular uppercase`}
                    {...form.getInputProps('code')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="currency-symbol" className={FIELD_LABEL_CLASS}>
                    {t('pages.currencies.fieldSymbol')}
                  </label>
                  <input
                    id="currency-symbol"
                    placeholder="£"
                    required
                    className={FIELD_INPUT_CLASS}
                    {...form.getInputProps('symbol')}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="currency-name" className={FIELD_LABEL_CLASS}>
                  {t('pages.currencies.fieldName')}
                </label>
                <input
                  id="currency-name"
                  placeholder={t('pages.currencies.namePlaceholder')}
                  required
                  className={FIELD_INPUT_CLASS}
                  {...form.getInputProps('name')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="currency-rate" className={FIELD_LABEL_CLASS}>
                      {t('pages.currencies.fieldExchangeRate')}
                    </label>
                    <span className="font-numeric-tabular text-[11px] text-on-surface-variant">
                      {t('pages.currencies.exchangeRateVs').replace('{{code}}', baseCode)}
                    </span>
                  </div>
                  <input
                    id="currency-rate"
                    type="number"
                    min={0}
                    step={0.000001}
                    placeholder="0.000190"
                    required
                    className={`${FIELD_INPUT_CLASS} font-numeric-tabular`}
                    value={form.values.exchangeRate}
                    onChange={(event) => setNumericField('exchangeRate', event.currentTarget.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="currency-order" className={FIELD_LABEL_CLASS}>
                    {t('pages.currencies.fieldOrder')}
                  </label>
                  <input
                    id="currency-order"
                    type="number"
                    min={0}
                    className={`${FIELD_INPUT_CLASS} font-numeric-tabular`}
                    value={form.values.sortOrder}
                    onChange={(event) => setNumericField('sortOrder', event.currentTarget.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-medium text-on-surface">
                      {t('pages.currencies.defaultCurrency')}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.currencies.defaultCurrencyHint')}
                    </span>
                  </div>
                  <Switch
                    checked={form.values.isDefault}
                    onChange={(checked) => form.setFieldValue('isDefault', checked)}
                    label={t('pages.currencies.defaultCurrency')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-medium text-on-surface">
                      {t('pages.currencies.activeCurrency')}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.currencies.activeCurrencyHint')}
                    </span>
                  </div>
                  <Switch
                    checked={form.values.isActive}
                    onChange={(checked) => form.setFieldValue('isActive', checked)}
                    label={t('pages.currencies.activeCurrency')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={create.isPending}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-headline-sm text-headline-sm text-on-primary shadow-sm transition-colors hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="add" className="text-[18px]" />
                <span>
                  {create.isPending ? t('pages.currencies.adding') : t('pages.currencies.addCurrency')}
                </span>
              </button>
            </form>

            <div className="flex items-start gap-3 rounded-lg bg-surface-container p-4">
              <Icon name="info" className="mt-0.5 text-[20px] text-secondary" />
              <div className="flex flex-col gap-0.5">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  {t('pages.currencies.quoteCalculation')}
                </span>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {t('pages.currencies.quoteCalculationBody')}
                </p>
              </div>
            </div>
          </Card>

          {/* Tabla de divisas */}
          <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm xl:col-span-8">
            <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.currencies.availableTitle')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.currencies.availableSubtitle')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.currencies.filterBy')}
                </span>
                <SegmentedTabs
                  value={visibility}
                  options={[
                    {
                      value: 'all',
                      label: t('pages.currencies.filterAll').replace('{{count}}', String(currencies.length)),
                    },
                    {
                      value: 'active',
                      label: t('pages.currencies.filterActive').replace('{{count}}', String(activeCount)),
                    },
                  ]}
                  onChange={(value) => setVisibility(value)}
                  layoutId="currencies-visibility"
                />
              </div>
            </div>

            {isError ? (
              <QueryError onRetry={() => refetch()} retrying={isFetching} />
            ) : isLoading ? (
              <TableSkeleton rows={6} columns={7} />
            ) : visibleCurrencies.length === 0 ? (
              <EmptyState
                icon={visibility === 'active' ? 'search_off' : 'paid'}
                title={
                  visibility === 'active'
                    ? t('pages.currencies.emptyActiveTitle')
                    : t('pages.currencies.emptyTitle')
                }
                description={
                  visibility === 'active'
                    ? t('pages.currencies.emptyActiveDescription')
                    : t('pages.currencies.emptyDescription')
                }
              />
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low/70 font-label-uppercase text-label-uppercase text-on-surface-variant">
                      <th className="px-6 py-3.5">{t('pages.currencies.columnCode')}</th>
                      <th className="px-6 py-3.5">{t('pages.currencies.columnName')}</th>
                      <th className="px-6 py-3.5">{t('pages.currencies.columnSymbol')}</th>
                      <th className="px-6 py-3.5">{t('pages.currencies.columnExchangeRate')}</th>
                      <th className="px-6 py-3.5">{t('pages.currencies.columnDefault')}</th>
                      <th className="px-6 py-3.5">{t('pages.currencies.columnActive')}</th>
                      <th className="px-6 py-3.5 text-right">{t('pages.currencies.columnActions')}</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={tableRowsContainer}
                    initial="hidden"
                    animate="visible"
                    className="font-body-md text-body-md text-on-surface"
                  >
                    {visibleCurrencies.map((currency) => (
                      <motion.tr
                        variants={fadeInUp}
                        key={currency.code}
                        className="group h-16 transition-colors hover:bg-surface"
                      >
                        <td className="px-6 py-4">
                          <span className="rounded-md bg-surface-container px-2.5 py-1 font-numeric-tabular text-label-sm font-bold tracking-wide text-on-surface">
                            {currency.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-on-surface">{currency.name}</td>
                        <td className="px-6 py-4 font-numeric-tabular font-medium text-on-surface">{currency.symbol}</td>
                        <td className="px-6 py-4 font-numeric-tabular font-semibold text-on-surface">
                          {Number(currency.exchangeRate).toFixed(6)}
                        </td>
                        <td className="px-6 py-4">
                          {currency.isDefault ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 font-label-sm text-label-sm font-medium text-on-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              <span>{t('common.yes')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                              {t('common.no')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            title={
                              currency.isDefault ? t('pages.currencies.baseAlwaysActive') : undefined
                            }
                          >
                            <Switch
                              checked={currency.isActive}
                              onChange={(checked) =>
                                update.mutate({ code: currency.code, values: { isActive: checked } })
                              }
                              disabled={currency.isDefault}
                              label={
                                currency.isActive
                                  ? t('pages.currencies.deactivateCurrency').replace('{{code}}', currency.code)
                                  : t('pages.currencies.activateCurrency').replace('{{code}}', currency.code)
                              }
                            />
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {currency.isDefault ? (
                            <button
                              type="button"
                              disabled
                              className="cursor-not-allowed rounded bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant"
                            >
                              {t('pages.currencies.baseCurrency')}
                            </button>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  update.mutate({ code: currency.code, values: { isDefault: true } })
                                }
                                className="rounded-md bg-surface-container px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                              >
                                {t('pages.currencies.setDefault')}
                              </button>
                              <button
                                type="button"
                                disabled={remove.isPending}
                                onClick={() => remove.mutate(currency.code)}
                                className="rounded-md bg-error-container/30 px-2.5 py-1 font-label-sm text-label-sm font-medium text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low/50 p-4">
              <div className="flex items-center gap-3">
                <Icon name="calculate" className="text-[18px] text-on-surface-variant" />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.currencies.examplePrefix').replace('{{base}}', baseCode)}{' '}
                  <strong className="font-numeric-tabular text-on-surface">{formatConversion(usd)}</strong>{' '}
                  {t('pages.currencies.exampleOr')}{' '}
                  <strong className="font-numeric-tabular text-on-surface">{formatConversion(eur)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.currencies.decimalPrecision')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reglas operativas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-on-surface">
              <Icon name="filter_vintage" className="text-[20px]" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {t('pages.currencies.roundingTitle')}
            </h3>
            <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
              {t('pages.currencies.roundingBody')}
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container/40 text-on-secondary-container">
              <Icon name="point_of_sale" className="text-[20px]" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {t('pages.currencies.settlementTitle')}
            </h3>
            <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
              {t('pages.currencies.settlementBody')}
            </p>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-on-surface">
              <Icon name="cloud_sync" className="text-[20px]" />
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {t('pages.currencies.updateFrequencyTitle')}
            </h3>
            <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
              {t('pages.currencies.updateFrequencyBody')}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
