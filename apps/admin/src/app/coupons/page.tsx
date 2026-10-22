'use client';

import type { components } from '@ecommerce/api-client';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChangeEvent, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { Switch } from '../../components/ui/switch';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { useClientPagination } from '../../hooks/use-client-pagination';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type Coupon = components['schemas']['CouponResponseDto'];
type AppliesTo = 'ALL' | 'CATEGORY' | 'PRODUCT';
type DiscountType = 'PERCENTAGE' | 'FIXED';
type ScopeTab = 'all' | 'active' | 'depleted' | 'inactive';
type TypeFilter = 'all' | DiscountType;
type NumericField = 'discountValue' | 'minOrderAmount' | 'maxUses' | 'maxUsesPerUser';

interface CouponFormValues {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  isActive: boolean;
  appliesTo: AppliesTo;
  categoryId: string;
  productId: string;
  minOrderAmount: number;
  maxUsesPerUser: number;
  isFirstPurchaseOnly: boolean;
}

const appliesToOptions = [
  { value: 'ALL', labelKey: 'pages.coupons.optionAll' },
  { value: 'CATEGORY', labelKey: 'pages.coupons.optionCategory' },
  { value: 'PRODUCT', labelKey: 'pages.coupons.optionProduct' },
];

const SCOPE_TABS: Array<{ id: ScopeTab; labelKey: string }> = [
  { id: 'all', labelKey: 'pages.coupons.tabAll' },
  { id: 'active', labelKey: 'pages.coupons.tabActive' },
  { id: 'depleted', labelKey: 'pages.coupons.tabDepleted' },
  { id: 'inactive', labelKey: 'pages.coupons.tabInactive' },
];

const PAGE_SIZE = 10;

function formatPrice(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

function formatNumber(value: number) {
  return value.toLocaleString('es-CO');
}

function isDepleted(coupon: Coupon) {
  return typeof coupon.maxUses === 'number' && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses;
}

function usagePercentage(coupon: Coupon) {
  if (!coupon.maxUses || coupon.maxUses <= 0) return 0;
  return Math.min(100, (coupon.usedCount / coupon.maxUses) * 100);
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function CouponsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Coupon | null>(null);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<ScopeTab>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const form = useForm<CouponFormValues>({
    initialValues: {
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      maxUses: 100,
      isActive: true,
      appliesTo: 'ALL',
      categoryId: '',
      productId: '',
      minOrderAmount: 0,
      maxUsesPerUser: 0,
      isFirstPurchaseOnly: false,
    },
  });

  const { data: coupons, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/coupons');
      if (error) throw error;
      return data?.data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories-select'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/categories');
      return data ?? [];
    },
  });

  const { data: productsResponse } = useQuery({
    queryKey: ['admin-products-select'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/products');
      return data;
    },
  });

  const products = productsResponse?.data ?? [];

  const categoryOptions = categories?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const productOptions = products?.map((p) => ({ value: p.id, label: p.name })) ?? [];

  const create = useMutation({
    mutationFn: async (values: CouponFormValues) => {
      const payload = buildPayload(values);
      const { error } = await apiClient.POST('/admin/coupons', {
        body: payload as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: t('pages.coupons.toastCreated') });
      close();
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.coupons.toastCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CouponFormValues }) => {
      const payload = buildPayload(values);
      const { error } = await apiClient.PATCH('/admin/coupons/{id}', {
        params: { path: { id } },
        body: payload as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: t('pages.coupons.toastUpdated') });
      close();
      setEditing(null);
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.coupons.toastUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/coupons/{id}/toggle-active', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: t('pages.coupons.toastStatusUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.coupons.toastStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/coupons/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: t('pages.coupons.toastDeleted') });
      closeConfirm();
      setPendingDelete(null);
    },
    onError: (error) => {
      notifyError({ title: t('pages.coupons.toastDeleteError'), message: getApiErrorMessage(error) });
    },
  });

  const startEdit = (coupon: Coupon) => {
    setEditing(coupon.id);
    form.setValues({
      code: coupon.code,
      discountType: coupon.discountType as DiscountType,
      discountValue: coupon.discountValue,
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil?.split('T')[0] ?? '',
      maxUses: coupon.maxUses ?? 0,
      isActive: coupon.isActive,
      appliesTo: (coupon.appliesTo as AppliesTo) ?? 'ALL',
      categoryId: coupon.categoryId ?? '',
      productId: coupon.productId ?? '',
      minOrderAmount: coupon.minOrderAmount ?? 0,
      maxUsesPerUser: coupon.maxUsesPerUser ?? 0,
      isFirstPurchaseOnly: coupon.isFirstPurchaseOnly ?? false,
    });
    open();
  };

  const startCreate = () => {
    setEditing(null);
    form.reset();
    open();
  };

  const openDelete = (coupon: Coupon) => {
    setPendingDelete(coupon);
    openConfirm();
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      remove.mutate(pendingDelete.id);
    }
  };

  const copyCode = (code: string) => {
    const feedback = () => {
      setCopiedCode(code);
      window.setTimeout(() => {
        setCopiedCode((current) => (current === code ? null : current));
      }, 1500);
      notifySuccess({ title: t('pages.coupons.toastCopied').replace('{{code}}', () => code) });
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(code)
        .then(feedback)
        .catch(() => notifyError({ title: t('pages.coupons.toastCopyError') }));
    } else {
      notifyError({
        title: t('pages.coupons.toastCopyError'),
        message: t('pages.coupons.toastClipboardUnavailable'),
      });
    }
  };

  const couponsList = coupons ?? [];
  const totalCoupons = couponsList.length;
  const activeCoupons = couponsList.filter((coupon) => coupon.isActive).length;
  const totalRedemptions = couponsList.reduce((total, coupon) => total + coupon.usedCount, 0);
  const percentageCoupons = couponsList.filter((coupon) => coupon.discountType === 'PERCENTAGE');
  const averageDiscount =
    percentageCoupons.length > 0
      ? percentageCoupons.reduce((total, coupon) => total + coupon.discountValue, 0) / percentageCoupons.length
      : 0;
  const topCoupon = couponsList.reduce<Coupon | null>(
    (top, coupon) => (top === null || coupon.usedCount > top.usedCount ? coupon : top),
    null,
  );
  const topShare = topCoupon && totalRedemptions > 0 ? (topCoupon.usedCount / totalRedemptions) * 100 : 0;

  const scopeCounts: Record<ScopeTab, number> = {
    all: totalCoupons,
    active: activeCoupons,
    depleted: couponsList.filter(isDepleted).length,
    inactive: couponsList.filter((coupon) => !coupon.isActive).length,
  };

  const term = search.trim().toLowerCase();
  const filteredCoupons = couponsList.filter((coupon) => {
    if (scope === 'active' && !coupon.isActive) return false;
    if (scope === 'inactive' && coupon.isActive) return false;
    if (scope === 'depleted' && !isDepleted(coupon)) return false;
    if (typeFilter !== 'all' && coupon.discountType !== typeFilter) return false;
    if (term && !coupon.code.toLowerCase().includes(term)) return false;
    return true;
  });

  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: filteredCoupons,
    pageSize: PAGE_SIZE,
  });

  const firstShown = filteredCoupons.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, filteredCoupons.length);
  const paginationSummary = t('pages.coupons.paginationSummary')
    .replace('{{start}}', String(firstShown))
    .replace('{{end}}', String(lastShown))
    .replace('{{total}}', String(filteredCoupons.length));

  const appliesTo = form.values.appliesTo;

  const numberInputProps = (field: NumericField) => ({
    type: 'number' as const,
    min: 0,
    value: form.values[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      form.setFieldValue(field, Number(event.currentTarget.value) || 0),
  });

  const exportCsv = () => {
    const rows: string[][] = [
      [
        t('pages.coupons.columnCode'),
        t('pages.coupons.columnType'),
        t('pages.coupons.csvValue'),
        t('pages.coupons.columnAppliesTo'),
        t('pages.coupons.csvMinimum'),
        t('pages.coupons.csvUses'),
        t('pages.coupons.csvLimit'),
        t('pages.coupons.csvMaxPerUser'),
        t('pages.coupons.csvFirstPurchase'),
        t('pages.coupons.csvValidFrom'),
        t('pages.coupons.csvValidUntil'),
        t('pages.coupons.columnActive'),
      ],
      ...couponsList.map((coupon) => [
        coupon.code,
        coupon.discountType === 'PERCENTAGE' ? t('pages.coupons.typePercentage') : t('pages.coupons.typeFixed'),
        String(coupon.discountValue),
        coupon.appliesTo === 'CATEGORY'
          ? t('pages.coupons.appliesToCategory').replace('{{name}}', () => coupon.category?.name ?? coupon.categoryId ?? '')
          : coupon.appliesTo === 'PRODUCT'
            ? t('pages.coupons.appliesToProduct').replace('{{name}}', () => coupon.product?.name ?? coupon.productId ?? '')
            : t('pages.coupons.allCatalog'),
        coupon.minOrderAmount ? String(coupon.minOrderAmount) : '',
        String(coupon.usedCount),
        coupon.maxUses ? String(coupon.maxUses) : t('pages.coupons.unlimited'),
        coupon.maxUsesPerUser ? String(coupon.maxUsesPerUser) : '',
        coupon.isFirstPurchaseOnly ? t('common.yes') : t('common.no'),
        coupon.validFrom.split('T')[0],
        coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
        coupon.isActive ? t('common.yes') : t('common.no'),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cupones-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess({ title: t('pages.coupons.toastExported') });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          overline={
            <div className="flex items-center gap-2 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
              <span>{t('pages.coupons.breadcrumbSales')}</span>
              <span className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="font-semibold text-primary">{t('pages.coupons.breadcrumbPromotions')}</span>
            </div>
          }
          title={t('pages.coupons.title')}
          subtitle={t('pages.coupons.subtitle')}
          actions={
            <>
              <Button
                variant="secondary"
                icon="file_download"
                iconClassName="text-[18px] text-on-surface-variant"
                onClick={exportCsv}
              >
                {t('pages.coupons.exportList')}
              </Button>
              <Button icon="add" onClick={startCreate}>
                {t('pages.coupons.newCoupon')}
              </Button>
            </>
          }
        />

        {/* KPIs calculados client-side sobre la lista completa */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.coupons.kpiActive')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="confirmation_number" className="text-[18px]" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-headline-xl text-headline-xl font-numeric-tabular text-on-surface">
                <AnimatedNumber value={activeCoupons} format={formatNumber} />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t('pages.coupons.kpiHealthy')}
              </span>
            </div>
            <div className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <span>
                {t('pages.coupons.kpiActiveOf')
                  .replace('{{active}}', String(activeCoupons))
                  .replace('{{total}}', String(totalCoupons))}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.coupons.kpiRedemptions')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="shopping_bag" className="text-[18px]" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-headline-xl text-headline-xl font-numeric-tabular text-on-surface">
                <AnimatedNumber value={totalRedemptions} format={formatNumber} />
              </span>
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm font-medium text-on-surface">
                <Icon name="trending_up" className="text-[16px]" />
                +14%
              </span>
            </div>
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              <span>{t('pages.coupons.kpiVsLastMonth').replace('{{count}}', '1,245')}</span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.coupons.kpiAverageDiscount')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="percent" className="text-[18px]" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-headline-xl text-headline-xl font-numeric-tabular text-on-surface">
                {averageDiscount.toFixed(1)}%
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.coupons.kpiMarginOk')}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, averageDiscount))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.coupons.kpiTopRedemption')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="military_tech" className="text-[18px]" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono font-headline-sm text-headline-sm tracking-wider text-primary">
                {topCoupon?.code ?? '—'}
              </span>
              <span className="font-numeric-tabular font-headline-sm text-headline-sm font-semibold text-on-surface">
                {t('pages.coupons.kpiUses').replace('{{count}}', String(topCoupon?.usedCount ?? 0))}
              </span>
            </div>
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              <span>
                {topCoupon
                  ? t('pages.coupons.kpiTopShare').replace('{{share}}', topShare.toFixed(0))
                  : t('pages.coupons.kpiNoRedemptions')}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm lg:flex-row lg:items-center">
          <Input
            icon="search"
            variant="filled"
            placeholder={t('pages.coupons.searchPlaceholder')}
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
            className="flex-1 lg:min-w-[280px]"
            inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
            <SegmentedTabs
              value={scope}
              options={SCOPE_TABS.map((tab) => ({
                value: tab.id,
                label: `${t(tab.labelKey)} (${scopeCounts[tab.id]})`,
              }))}
              onChange={(value) => {
                setScope(value);
                setPage(1);
              }}
              variant="primary"
              layoutId="coupons-scope"
            />
            <Select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.currentTarget.value as TypeFilter);
                setPage(1);
              }}
              inputClassName="bg-surface-container-low py-2 pl-3 font-label-sm"
            >
              <option value="all">{t('pages.coupons.typeAll')}</option>
              <option value="PERCENTAGE">{t('pages.coupons.typePercentage')}</option>
              <option value="FIXED">{t('pages.coupons.typeFixed')}</option>
            </Select>
          </div>
        </div>

        {/* Tabla de cupones */}
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : filteredCoupons.length === 0 ? (
            <EmptyState
              icon="confirmation_number"
              title={t('pages.coupons.emptyTitle')}
              description={t('pages.coupons.emptyDescription')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <th className="rounded-l-lg px-3 py-3">{t('pages.coupons.columnCode')}</th>
                    <th className="px-3 py-3">{t('pages.coupons.columnType')}</th>
                    <th className="px-3 py-3">{t('pages.coupons.columnAppliesTo')}</th>
                    <th className="px-3 py-3">{t('pages.coupons.columnUsage')}</th>
                    <th className="px-3 py-3 text-center">{t('pages.coupons.columnActive')}</th>
                    <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.coupons.columnActions')}</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableRowsContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm text-on-surface"
                >
                  {paginatedData.map((coupon) => (
                    <motion.tr
                      variants={fadeInUp}
                      key={coupon.id}
                      className={`border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low ${
                        coupon.isActive ? '' : 'opacity-75'
                      }`}
                    >
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2.5 py-1 font-mono font-numeric-tabular text-label-sm font-semibold tracking-wider ${
                              !coupon.isActive
                                ? 'bg-surface-container-low text-on-surface'
                                : topCoupon && topCoupon.usedCount > 0 && coupon.id === topCoupon.id
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-surface-container-high text-on-surface'
                            }`}
                          >
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            title={t('pages.coupons.copyCode')}
                            onClick={() => copyCode(coupon.code)}
                            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                          >
                            <Icon
                              name={copiedCode === coupon.code ? 'done' : 'content_copy'}
                              className={`text-[16px] ${copiedCode === coupon.code ? 'text-emerald-600' : ''}`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <DiscountTypePill coupon={coupon} />
                      </td>
                      <td
                        className={`px-3 py-3.5 ${coupon.isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}
                      >
                        <AppliesToContent coupon={coupon} />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex min-w-[160px] flex-col gap-1.5">
                          <div
                            className={`flex items-center justify-between font-numeric-tabular text-label-sm ${
                              coupon.isActive ? '' : 'text-on-surface-variant'
                            }`}
                          >
                            <span>
                              {coupon.usedCount} / {coupon.maxUses ?? '∞'}
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              {coupon.maxUses
                                ? coupon.maxUsesPerUser
                                  ? t('pages.coupons.maxPerUser').replace(
                                      '{{count}}',
                                      String(coupon.maxUsesPerUser),
                                    )
                                  : ''
                                : t('pages.coupons.unlimited')}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-low">
                            <div
                              className={`h-full rounded-full ${coupon.isActive ? 'bg-primary' : 'bg-outline-variant'}`}
                              style={{ width: `${usagePercentage(coupon).toFixed(1)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <Switch
                          checked={coupon.isActive}
                          onChange={() => toggle.mutate(coupon.id)}
                          disabled={toggle.isPending}
                          label={(coupon.isActive
                            ? t('pages.coupons.deactivateCoupon')
                            : t('pages.coupons.activateCoupon')
                          ).replace('{{code}}', () => coupon.code)}
                        />
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(coupon)}
                            className="rounded bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => openDelete(coupon)}
                            className="rounded px-2 py-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-error-container/20 hover:text-error"
                          >
                            {t('pages.coupons.delete')}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {!isLoading && (
            <div className="bg-surface-container-low px-4 pb-4">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} summary={paginationSummary} />
            </div>
          )}
        </div>

        {/* Card informativa */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
              <Icon name="info" className="text-[22px]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {t('pages.coupons.infoTitle')}
              </span>
              <p className="max-w-3xl font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.coupons.infoBody')}
              </p>
            </div>
          </div>
          <button
            type="button"
            title={t('pages.coupons.viewDocs')}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
          >
            <span>{t('pages.coupons.viewDocs')}</span>
            <Icon name="arrow_forward" className="text-[16px]" />
          </button>
        </div>
      </div>

      {/* Modal Nuevo / Editar Cupón */}
      <AppModal
        opened={opened}
        onClose={close}
        title={
          <span className="flex items-center gap-2">
            <Icon name="confirmation_number" className="text-[22px] text-primary" />
            {editing ? t('pages.coupons.modalEditTitle') : t('pages.coupons.modalNewTitle')}
          </span>
        }
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="coupon-form" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? t('common.saving') : t('pages.coupons.saveCoupon')}
            </Button>
          </>
        }
      >
        <form
          id="coupon-form"
          className="flex flex-col gap-4"
          onSubmit={form.onSubmit((values) =>
            editing ? update.mutate({ id: editing, values }) : create.mutate(values),
          )}
        >
          <Field label={t('pages.coupons.fieldCode')} required>
            <Input
              placeholder={t('pages.coupons.fieldCodePlaceholder')}
              value={form.values.code}
              onChange={(event) => form.setFieldValue('code', event.currentTarget.value.toUpperCase())}
              inputClassName="font-mono uppercase tracking-wider"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('pages.coupons.fieldDiscountType')}>
              <Select
                value={form.values.discountType}
                onChange={(event) => form.setFieldValue('discountType', event.currentTarget.value as DiscountType)}
              >
                <option value="PERCENTAGE">{t('pages.coupons.optionPercentage')}</option>
                <option value="FIXED">{t('pages.coupons.optionFixed')}</option>
              </Select>
            </Field>
            <Field label={t('pages.coupons.fieldValue')} required>
              <Input
                placeholder={t('pages.coupons.fieldValuePlaceholder')}
                {...numberInputProps('discountValue')}
                inputClassName="font-numeric-tabular"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('pages.coupons.fieldMinOrder')}>
              <Input
                placeholder={t('pages.coupons.fieldMinOrderPlaceholder')}
                {...numberInputProps('minOrderAmount')}
                inputClassName="font-numeric-tabular"
              />
            </Field>
            <Field label={t('pages.coupons.fieldMaxUses')}>
              <Input
                placeholder={t('pages.coupons.fieldMaxUsesPlaceholder')}
                {...numberInputProps('maxUses')}
                inputClassName="font-numeric-tabular"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">{t('pages.coupons.activateImmediately')}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.coupons.activateHint')}</span>
            </div>
            <Switch
              checked={form.values.isActive}
              onChange={(checked) => form.setFieldValue('isActive', checked)}
              label={t('pages.coupons.activateImmediately')}
            />
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 p-4">
            <div className="flex items-center gap-2">
              <Icon name="tune" className="text-[18px] text-primary" />
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  {t('pages.coupons.advancedRules')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.coupons.advancedRulesHint')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t('pages.coupons.fieldValidFrom')} required>
                <Input type="date" {...form.getInputProps('validFrom')} required />
              </Field>
              <Field label={t('pages.coupons.fieldValidUntil')}>
                <Input type="date" {...form.getInputProps('validUntil')} />
              </Field>
            </div>

            <Field label={t('pages.coupons.fieldAppliesTo')}>
              <Select {...form.getInputProps('appliesTo')}>
                {appliesToOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </Select>
            </Field>

            {appliesTo === 'CATEGORY' && (
              <Field label={t('pages.coupons.fieldCategory')}>
                <Select {...form.getInputProps('categoryId')}>
                  <option value="">{t('pages.coupons.selectCategory')}</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {appliesTo === 'PRODUCT' && (
              <Field label={t('pages.coupons.fieldProduct')}>
                <Select {...form.getInputProps('productId')}>
                  <option value="">{t('pages.coupons.selectProduct')}</option>
                  {productOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field
              label={t('pages.coupons.fieldMaxUsesPerUser')}
              hint={t('pages.coupons.fieldMaxUsesPerUserHint')}
            >
              <Input {...numberInputProps('maxUsesPerUser')} inputClassName="font-numeric-tabular" />
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface">{t('pages.coupons.firstPurchaseOnly')}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.coupons.firstPurchaseHint')}
                </span>
              </div>
              <Switch
                checked={form.values.isFirstPurchaseOnly}
                onChange={(checked) => form.setFieldValue('isFirstPurchaseOnly', checked)}
                label={t('pages.coupons.firstPurchaseOnly')}
              />
            </div>
          </div>
        </form>
      </AppModal>

      {/* Confirmación de eliminación */}
      <AppModal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={t('pages.coupons.confirmTitle')}
        subtitle={t('pages.coupons.confirmSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={remove.isPending}>
              {remove.isPending ? t('pages.coupons.deleting') : t('pages.coupons.delete')}
            </Button>
          </>
        }
      >
        <p className="font-body-sm text-body-sm text-on-surface">
          {t('pages.coupons.confirmPrefix')}{' '}
          <span className="font-mono font-semibold">{pendingDelete?.code}</span>
          {t('pages.coupons.confirmSuffix')}
        </p>
      </AppModal>
    </>
  );
}

function DiscountTypePill({ coupon }: { coupon: Coupon }) {
  const { t } = useTranslation();
  const isPercentage = coupon.discountType === 'PERCENTAGE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm ${
        !coupon.isActive
          ? 'bg-surface-container-low text-on-surface-variant'
          : isPercentage
            ? 'bg-surface-container-high text-on-surface'
            : 'bg-secondary-container text-on-secondary-container'
      }`}
    >
      <Icon name={isPercentage ? 'percent' : 'attach_money'} className="text-[14px]" />
      <span>
        {isPercentage
          ? t('pages.coupons.pillPercentage').replace('{{value}}', String(coupon.discountValue))
          : t('pages.coupons.pillFixed').replace('{{amount}}', () => formatPrice(coupon.discountValue))}
      </span>
    </span>
  );
}

function AppliesToContent({ coupon }: { coupon: Coupon }) {
  const { t } = useTranslation();
  const minimumAmount = coupon.minOrderAmount;
  const minimum = minimumAmount
    ? t('pages.coupons.minimum').replace('{{amount}}', () => formatPrice(minimumAmount))
    : null;

  if (coupon.appliesTo === 'CATEGORY') {
    return (
      <div className="flex flex-col">
        <span className="font-body-sm text-body-sm">
          {coupon.category?.name
            ? t('pages.coupons.appliesToCategory').replace('{{name}}', () => coupon.category?.name ?? '')
            : t('pages.coupons.appliesToCategoryFallback')}
        </span>
        {minimum && <span className="font-label-sm text-label-sm text-on-surface-variant">{minimum}</span>}
      </div>
    );
  }

  if (coupon.appliesTo === 'PRODUCT') {
    return (
      <div className="flex flex-col">
        <span className="font-body-sm text-body-sm">
          {coupon.product?.name
            ? t('pages.coupons.appliesToProduct').replace('{{name}}', () => coupon.product?.name ?? '')
            : t('pages.coupons.appliesToProductFallback')}
        </span>
        {minimum && <span className="font-label-sm text-label-sm text-on-surface-variant">{minimum}</span>}
      </div>
    );
  }

  return <span className="font-body-sm text-body-sm">{minimum ?? t('pages.coupons.allCatalog')}</span>;
}

function buildPayload(values: CouponFormValues) {
  return {
    code: values.code,
    discountType: values.discountType,
    discountValue: values.discountValue,
    validFrom: values.validFrom,
    validUntil: values.validUntil || undefined,
    maxUses: values.maxUses || undefined,
    isActive: values.isActive,
    appliesTo: values.appliesTo,
    categoryId: values.appliesTo === 'CATEGORY' ? values.categoryId || undefined : undefined,
    productId: values.appliesTo === 'PRODUCT' ? values.productId || undefined : undefined,
    minOrderAmount: values.minOrderAmount || undefined,
    maxUsesPerUser: values.maxUsesPerUser || undefined,
    isFirstPurchaseOnly: values.isFirstPurchaseOnly,
  };
}
