'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { apiClient } from '../lib/api';
import { useTranslation } from '../providers/i18n-provider';
import { LoadingState } from './loading-state';
import { TrendsChart } from './trends-chart';
import { Icon } from './ui/icon';
import { AnimatedNumber, fadeInUp, staggerContainer } from './ui/motion';
import { PageHeader } from './ui/page-header';
import { QueryError } from './ui/query-error';
import { SegmentedTabs } from './ui/segmented-tabs';
import { StatusPill, StatusTone } from './ui/status-pill';

type Period = '7d' | '30d' | 'month';

const PERIODS: Array<{ value: Period; labelKey: string }> = [
  { value: '7d', labelKey: 'pages.dashboard.period7d' },
  { value: '30d', labelKey: 'pages.dashboard.period30d' },
  { value: 'month', labelKey: 'pages.dashboard.periodThisMonth' },
];

const ORDER_STATUS: Record<string, { labelKey: string; tone: StatusTone }> = {
  PENDING_PAYMENT: { labelKey: 'pages.dashboard.orderPending', tone: 'warning' },
  PAID: { labelKey: 'pages.dashboard.orderPaid', tone: 'secondary' },
  IN_PRODUCTION: { labelKey: 'pages.dashboard.orderInProduction', tone: 'neutral' },
  READY_TO_SHIP: { labelKey: 'pages.dashboard.orderReadyToShip', tone: 'info' },
  SHIPPED: { labelKey: 'pages.dashboard.orderShipped', tone: 'info' },
  DELIVERED: { labelKey: 'pages.dashboard.orderDelivered', tone: 'success' },
  CANCELLED: { labelKey: 'pages.dashboard.orderCancelled', tone: 'danger' },
  REFUNDED: { labelKey: 'pages.dashboard.orderRefunded', tone: 'danger' },
};

const QUICK_LINKS = [
  {
    href: '/products',
    icon: 'inventory_2',
    titleKey: 'pages.dashboard.quickProductsTitle',
    descriptionKey: 'pages.dashboard.quickProductsDescription',
  },
  {
    href: '/categories',
    icon: 'category',
    titleKey: 'pages.dashboard.quickCategoriesTitle',
    descriptionKey: 'pages.dashboard.quickCategoriesDescription',
  },
  {
    href: '/inventory',
    icon: 'warehouse',
    titleKey: 'pages.dashboard.quickInventoryTitle',
    descriptionKey: 'pages.dashboard.quickInventoryDescription',
  },
  {
    href: '/coupons',
    icon: 'confirmation_number',
    titleKey: 'pages.dashboard.quickCouponsTitle',
    descriptionKey: 'pages.dashboard.quickCouponsDescription',
  },
  {
    href: '/orders',
    icon: 'receipt_long',
    titleKey: 'pages.dashboard.quickOrdersTitle',
    descriptionKey: 'pages.dashboard.quickOrdersDescription',
  },
  {
    href: '/custom-designs',
    icon: 'palette',
    titleKey: 'pages.dashboard.quickDesignsTitle',
    descriptionKey: 'pages.dashboard.quickDesignsDescription',
    designs: true,
  },
  {
    href: '/users',
    icon: 'group',
    titleKey: 'pages.dashboard.quickUsersTitle',
    descriptionKey: 'pages.dashboard.quickUsersDescription',
  },
  {
    href: '/store-config',
    icon: 'settings',
    titleKey: 'pages.dashboard.quickConfigTitle',
    descriptionKey: 'pages.dashboard.quickConfigDescription',
  },
];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getRange(period: Period) {
  const now = new Date();
  const to = now;
  const from = startOfDay(now);
  if (period === '7d') from.setDate(from.getDate() - 6);
  else if (period === '30d') from.setDate(from.getDate() - 29);
  else from.setDate(1);
  return { from, to };
}

function getPreviousRange(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - duration - 1);
  return { prevFrom, prevTo };
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

function formatNumber(value: number) {
  return value.toLocaleString('es-CO');
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function TrendBadge({ value, suffix }: { value: number | null; suffix?: string }) {
  const { t } = useTranslation();
  const label = suffix ?? t('pages.dashboard.vsPrevious');
  if (value === null) {
    return (
      <span className="font-label-sm text-label-sm text-on-surface-variant/70">
        {t('pages.dashboard.noComparison')}
      </span>
    );
  }
  const positive = value >= 0;
  return (
    <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary">
      <span className={`inline-flex items-center font-medium ${positive ? 'text-on-surface' : 'text-error'}`}>
        <Icon name={positive ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />
        {Math.abs(value).toFixed(1)}%
      </span>
      <span className="text-on-surface-variant/70">{label}</span>
    </span>
  );
}

interface KpiCardProps {
  label: string;
  icon: string;
  iconClassName?: string;
  value: React.ReactNode;
  footer: React.ReactNode;
  valueClassName?: string;
}

function KpiCard({ label, icon, iconClassName = '', value, footer, valueClassName = 'text-on-surface' }: KpiCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -2 }}
      className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between text-secondary">
        <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider">{label}</span>
        <Icon name={icon} className={`text-[20px] ${iconClassName}`} />
      </div>
      <div className="mt-4 flex flex-col gap-1">
        <span className={`font-headline-lg text-headline-lg font-bold font-numeric-tabular ${valueClassName}`}>{value}</span>
        <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary">{footer}</div>
      </div>
    </motion.div>
  );
}

export function DashboardView() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('7d');
  const { from, to } = useMemo(() => getRange(period), [period]);
  const { prevFrom, prevTo } = useMemo(() => getPreviousRange(from, to), [from, to]);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : new Date().getDate();

  const { data: metrics, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/dashboard/metrics');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: trends } = useQuery({
    queryKey: ['admin-dashboard-trends', days],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/dashboard/trends', {
        params: { query: { days: String(days) } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: sales } = useQuery({
    queryKey: ['admin-dashboard-sales', period],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/analytics/sales', {
        params: { query: { from: from.toISOString(), to: to.toISOString() } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: previousSales } = useQuery({
    queryKey: ['admin-dashboard-sales-previous', period],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/analytics/sales', {
        params: { query: { from: prevFrom.toISOString(), to: prevTo.toISOString() } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: topProducts } = useQuery({
    queryKey: ['admin-dashboard-top-products', period],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/analytics/top-products', {
        params: { query: { from: from.toISOString(), to: to.toISOString(), limit: '4' } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: conversion } = useQuery({
    queryKey: ['admin-dashboard-conversion', period],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/analytics/conversion', {
        params: { query: { from: from.toISOString(), to: to.toISOString() } },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: designsCount = 0 } = useQuery({
    queryKey: ['sidebar-count-designs'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/custom-designs/admin/all', {
        params: { query: { limit: '1', status: 'PENDING_REVIEW' } },
      });
      if (error) throw error;
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const conversionRate = (conversion?.cartToOrderRate ?? 0) * 100;
  const averageDailyOrders = sales && days > 0 ? Math.round(sales.totalOrders / days) : 0;
  const maxProductRevenue = Math.max(...(topProducts?.data ?? []).map((product) => product.revenue), 1);

  const exportCsv = () => {
    const rows: string[][] = [
      [t('pages.dashboard.csvDate'), t('pages.dashboard.csvOrders'), t('pages.dashboard.csvRevenue')],
    ];
    (trends?.data ?? []).forEach((point) => {
      rows.push([point.date, String(point.orders), String(point.revenue)]);
    });
    rows.push([]);
    rows.push([
      t('pages.dashboard.csvPeriod'),
      t('pages.dashboard.csvPaidOrders'),
      t('pages.dashboard.csvIncome'),
      t('pages.dashboard.csvAverageTicket'),
      t('pages.dashboard.csvConversion'),
    ]);
    rows.push([
      period,
      String(sales?.totalOrders ?? 0),
      String(sales?.totalRevenue ?? 0),
      String(sales?.averageOrderValue ?? 0),
      conversionRate.toFixed(2),
    ]);
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          overline={
            <div className="flex items-center gap-2">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-secondary">
                {t('pages.dashboard.overline')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/50 px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-container">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {t('pages.dashboard.live')}
              </span>
            </div>
          }
          title={t('pages.dashboard.title')}
          subtitle={t('pages.dashboard.subtitle')}
          actions={
            <>
              <SegmentedTabs
                value={period}
                options={PERIODS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                onChange={(value) => setPeriod(value)}
                layoutId="dashboard-period"
              />
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3.5 py-2 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-low"
              >
                <Icon name="download" className="text-[18px] text-secondary" />
                <span>{t('pages.dashboard.export')}</span>
              </button>
            </>
          }
        />

        {isError ? (
          <QueryError onRetry={() => refetch()} retrying={isFetching} />
        ) : isLoading ? (
          <LoadingState />
        ) : (
          <>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            >
              <KpiCard
                label={t('pages.dashboard.kpiTotalOrders')}
                icon="shopping_bag"
                value={<AnimatedNumber value={sales?.totalOrders ?? 0} format={formatNumber} />}
                footer={<TrendBadge value={percentChange(sales?.totalOrders ?? 0, previousSales?.totalOrders ?? 0)} />}
              />
              <KpiCard
                label={t('pages.dashboard.kpiPaidRevenue')}
                icon="payments"
                value={<AnimatedNumber value={sales?.totalRevenue ?? 0} format={formatCurrency} />}
                footer={<TrendBadge value={percentChange(sales?.totalRevenue ?? 0, previousSales?.totalRevenue ?? 0)} />}
              />
              <KpiCard
                label={t('pages.dashboard.kpiPending')}
                icon="pending_actions"
                value={
                  <span className="flex items-baseline gap-2">
                    {formatNumber(metrics?.pendingOrders ?? 0)}
                    <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
                  </span>
                }
                footer={
                  <span className="rounded bg-surface-container px-1.5 font-medium text-on-surface">
                    {t('pages.dashboard.activeQueue')}
                  </span>
                }
              />
              <KpiCard
                label={t('pages.dashboard.kpiNewUsers')}
                icon="group_add"
                value={<AnimatedNumber value={metrics?.totalUsers ?? 0} format={formatNumber} />}
                footer={
                  <>
                    <span className="font-medium text-on-surface">
                      {t('pages.dashboard.ordersToday').replace('{{count}}', String(metrics?.ordersToday ?? 0))}
                    </span>
                    <span className="text-on-surface-variant/70">{t('pages.dashboard.records')}</span>
                  </>
                }
              />
              <KpiCard
                label={t('pages.dashboard.kpiStockAlert')}
                icon="notification_important"
                iconClassName="text-error"
                value={
                  <span className="flex items-baseline gap-2">
                    {formatNumber(metrics?.lowStockCount ?? 0)}
                    <span className="font-label-sm text-label-sm font-semibold uppercase text-error">
                      {t('pages.dashboard.critical')}
                    </span>
                  </span>
                }
                valueClassName="text-error"
                footer={
                  <span className="text-on-surface-variant/70">{t('pages.dashboard.restockImmediately')}</span>
                }
              />
              <KpiCard
                label={t('pages.dashboard.kpiAverageTicket')}
                icon="receipt"
                value={<AnimatedNumber value={sales?.averageOrderValue ?? 0} format={formatCurrency} />}
                footer={
                  <span className="inline-flex items-center font-medium text-on-surface">
                    {t('pages.dashboard.conversionShort').replace('{{rate}}', conversionRate.toFixed(1))}
                  </span>
                }
              />
            </motion.div>

            <div className="flex flex-col gap-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm lg:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
                    {t('pages.dashboard.trendsTitle')}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.dashboard.trendsSubtitle')}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-primary" />
                    <span className="font-label-sm text-label-sm font-medium text-on-surface">
                      {t('pages.dashboard.billing')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-3 bg-secondary" />
                    <span className="font-label-sm text-label-sm font-medium text-secondary">
                      {t('pages.dashboard.closedOrders')}
                    </span>
                  </div>
                </div>
              </div>

              <TrendsChart data={trends?.data ?? []} />

              <div className="grid grid-cols-1 gap-4 rounded-xl bg-surface-container-low p-4 md:grid-cols-3">
                <div className="flex flex-col">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-secondary">
                    {t('pages.dashboard.volumePeriod')}
                  </span>
                  <span className="font-headline-md text-headline-md font-bold font-numeric-tabular text-on-surface">
                    {formatCurrency(sales?.totalRevenue ?? 0)}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.dashboard.volumeHint')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-secondary">
                    {t('pages.dashboard.averageDailySales')}
                  </span>
                  <span className="font-headline-md text-headline-md font-bold font-numeric-tabular text-on-surface">
                    {t('pages.dashboard.ordersCount').replace('{{count}}', formatNumber(averageDailyOrders))}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.dashboard.averageDailyHint')}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-secondary">
                    {t('pages.dashboard.checkoutEffectiveness')}
                  </span>
                  <span className="font-headline-md text-headline-md font-bold font-numeric-tabular text-on-surface">
                    {conversionRate.toFixed(1)}%
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.dashboard.checkoutHint')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
              <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm xl:col-span-7">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container">
                      <Icon name="receipt_long" className="text-[18px] text-on-surface" />
                    </div>
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {t('pages.dashboard.recentOrders')}
                    </h2>
                  </div>
                  <Link
                    href="/orders"
                    className="flex items-center gap-1 font-label-sm text-label-sm font-semibold text-secondary transition-colors hover:text-on-surface"
                  >
                    <span>
                      {t('pages.dashboard.viewAll').replace('{{count}}', formatNumber(metrics?.pendingOrders ?? 0))}
                    </span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                        <th className="rounded-l-lg px-3 py-3">{t('pages.dashboard.tableCustomer')}</th>
                        <th className="px-3 py-3">{t('pages.dashboard.tableStatus')}</th>
                        <th className="px-3 py-3">{t('pages.dashboard.tableTotal')}</th>
                        <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.dashboard.tableDate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(metrics?.recentOrders ?? []).map((order) => {
                        const status = ORDER_STATUS[order.status] ?? {
                          labelKey: '',
                          tone: 'neutral' as StatusTone,
                        };
                        return (
                          <tr key={order.id} className="group transition-colors hover:bg-surface-container-low">
                            <td className="px-3 py-3.5">
                              <div className="flex flex-col">
                                <span className="max-w-[200px] truncate font-body-sm text-body-sm font-semibold text-on-surface">
                                  {order.customerEmail}
                                </span>
                                <span className="font-label-sm text-label-sm font-numeric-tabular text-on-surface-variant">
                                  #{order.id.slice(0, 8)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3.5">
                              <StatusPill
                                label={status.labelKey ? t(status.labelKey) : order.status}
                                tone={status.tone}
                              />
                            </td>
                            <td className="px-3 py-3.5 font-numeric-tabular text-body-md font-semibold text-on-surface">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="px-3 py-3.5 text-right font-label-sm text-label-sm text-on-surface-variant">
                              {new Date(order.createdAt).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        );
                      })}
                      {(metrics?.recentOrders ?? []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
                            {t('pages.dashboard.recentEmpty')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm xl:col-span-5">
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container">
                      <Icon name="star" className="text-[18px] text-on-surface" />
                    </div>
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {t('pages.dashboard.topProducts')}
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm font-medium text-on-surface-variant">
                    {t('pages.dashboard.byRevenue')}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {(topProducts?.data ?? []).map((product) => (
                    <div key={product.productId} className="flex items-center gap-4 rounded-xl bg-surface-container-low p-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container-highest">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-secondary">
                            <Icon name="checkroom" className="text-[20px]" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-body-sm text-body-sm font-bold text-on-surface">{product.name}</span>
                          <span className="font-numeric-tabular text-body-sm font-bold text-on-surface">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {product.quantity === 1
                            ? t('pages.dashboard.unitSold').replace('{{count}}', String(product.quantity))
                            : t('pages.dashboard.unitsSold').replace('{{count}}', String(product.quantity))}
                        </span>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.round((product.revenue / maxProductRevenue) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(topProducts?.data ?? []).length === 0 && (
                    <p className="py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.dashboard.topProductsEmpty')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {t('pages.dashboard.quickLinksTitle')}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.dashboard.quickLinksSubtitle')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-all hover:bg-surface-container-low"
                  >
                    <div className="rounded-lg bg-surface-container p-2.5 text-on-surface transition-colors group-hover:bg-primary group-hover:text-on-primary">
                      <Icon name={item.icon} className="text-[20px]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-md text-body-md font-bold text-on-surface transition-colors group-hover:text-primary">
                        {t(item.titleKey)}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {item.designs && designsCount > 0
                          ? t('pages.dashboard.pendingApprovals').replace('{{count}}', String(designsCount))
                          : t(item.descriptionKey)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
