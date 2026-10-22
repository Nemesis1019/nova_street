'use client';

import type { components } from '@ecommerce/api-client';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Select } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { useClientPagination } from '../../hooks/use-client-pagination';
import { apiClient } from '../../lib/api';
import { getAccessToken } from '../../lib/auth';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type InventoryItem = Omit<components['schemas']['InventoryListItemDto'], 'product'> & {
  product?: components['schemas']['InventoryProductSummaryDto'] & { imageUrl?: string };
};

type ModeFilter = 'ALL' | 'TRACKED' | 'MADE_TO_ORDER';
type LevelFilter = 'ALL' | 'LOW' | 'OUT' | 'AVAILABLE';

const PAGE_SIZE = 10;

/** La API no expone un umbral de stock crítico: se usa 5 unidades como referencia visual del diseño. */
const LOW_STOCK_THRESHOLD = 5;

const MOVEMENT_REASON_KEYS = [
  'pages.inventory.reasonSupplier',
  'pages.inventory.reasonProduction',
  'pages.inventory.reasonPhysicalAdjustment',
  'pages.inventory.reasonReturn',
  'pages.inventory.reasonTare',
];

/** Mapa orientativo nombre→color: la API entrega el color como texto libre. */
const COLOR_SWATCHES: Record<string, string> = {
  negro: '#111111',
  black: '#111111',
  blanco: '#ffffff',
  white: '#ffffff',
  crema: '#f5f2eb',
  cream: '#f5f2eb',
  beige: '#e8e0d0',
  gris: '#9ca3af',
  grey: '#9ca3af',
  gray: '#9ca3af',
  azul: '#3b82f6',
  blue: '#3b82f6',
  navy: '#1e3a8a',
  verde: '#22c55e',
  green: '#22c55e',
  rojo: '#ef4444',
  red: '#ef4444',
  amarillo: '#eab308',
  yellow: '#eab308',
  marron: '#92400e',
  brown: '#92400e',
  rosa: '#ec4899',
  pink: '#ec4899',
  morado: '#8b5cf6',
  purple: '#8b5cf6',
  violeta: '#8b5cf6',
  naranja: '#f97316',
  orange: '#f97316',
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function quantityOf(variant: InventoryItem) {
  return variant.inventory?.quantity ?? 0;
}

function isOutOfStock(variant: InventoryItem) {
  return variant.stockMode === 'TRACKED' && quantityOf(variant) === 0;
}

function isLowStock(variant: InventoryItem) {
  const quantity = quantityOf(variant);
  return variant.stockMode === 'TRACKED' && quantity > 0 && quantity <= LOW_STOCK_THRESHOLD;
}

function isAvailable(variant: InventoryItem) {
  return variant.stockMode === 'TRACKED' && quantityOf(variant) > LOW_STOCK_THRESHOLD;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function ColorDot({ color }: { color?: string }) {
  const key = color ? normalize(color) : '';
  if (key.includes('mix')) {
    return <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-neutral-800 to-neutral-200" />;
  }
  const swatch = Object.entries(COLOR_SWATCHES).find(([name]) => key.includes(name))?.[1];
  if (swatch) {
    return <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/50" style={{ backgroundColor: swatch }} />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-surface-container-high ring-1 ring-outline-variant/30" />;
}

export default function InventoryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ALL');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(25);
  const [movementReason, setMovementReason] = useState(MOVEMENT_REASON_KEYS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: inventoryResponse, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/inventory', { params: { query: { limit: '100' } } });
      if (error) throw error;
      return data;
    },
  });

  const inventory: InventoryItem[] = inventoryResponse?.data ?? [];
  const totalCatalog = inventoryResponse?.meta?.total ?? inventory.length;

  // KPIs aproximados: la API no expone métricas de inventario, así que se calculan sobre
  // las referencias cargadas (limit=100) y meta.total. Con más de 100 SKUs los porcentajes
  // solo reflejan la página cargada.
  const loadedCount = inventory.length;
  const catalogadasCount = inventory.filter((variant) => Boolean(variant.sku)).length;
  const catalogadasPct = loadedCount ? (catalogadasCount / loadedCount) * 100 : 0;
  const mtoCount = inventory.filter((variant) => variant.stockMode === 'MADE_TO_ORDER').length;
  const mtoPct = loadedCount ? (mtoCount / loadedCount) * 100 : 0;
  const lowStockCount = inventory.filter(isLowStock).length;
  const outOfStockCount = inventory.filter(isOutOfStock).length;
  const trackedCount = inventory.filter((variant) => variant.stockMode === 'TRACKED').length;
  const lowStockPct = trackedCount ? (lowStockCount / trackedCount) * 100 : 0;
  const outOfStockPct = trackedCount ? (outOfStockCount / trackedCount) * 100 : 0;

  const filteredInventory = useMemo(() => {
    const term = normalize(search.trim());
    return inventory.filter((variant) => {
      const matchesSearch =
        !term ||
        [variant.product?.name, variant.sku, variant.size, variant.color].some((field) =>
          normalize(String(field ?? '')).includes(term),
        );
      const matchesMode = modeFilter === 'ALL' || variant.stockMode === modeFilter;
      const matchesLevel =
        levelFilter === 'ALL' ||
        (levelFilter === 'LOW' && isLowStock(variant)) ||
        (levelFilter === 'OUT' && isOutOfStock(variant)) ||
        (levelFilter === 'AVAILABLE' && isAvailable(variant));
      return matchesSearch && matchesMode && matchesLevel;
    });
  }, [inventory, search, modeFilter, levelFilter]);

  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: filteredInventory,
    pageSize: PAGE_SIZE,
  });

  const trackedVariants = inventory.filter((variant) => variant.stockMode === 'TRACKED');
  const selectedVariant = inventory.find((variant) => variant.id === selectedVariantId) ?? null;

  const updateStockMode = useMutation({
    mutationFn: async ({ id, stockMode }: { id: string; stockMode: 'MADE_TO_ORDER' | 'TRACKED' }) => {
      const { error } = await apiClient.PATCH('/admin/variants/{id}/stock-mode', {
        params: { path: { id } },
        body: { stockMode },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      notifySuccess({ title: t('pages.inventory.toastModeUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.inventory.toastModeError'), message: getApiErrorMessage(error) });
    },
  });

  const addStock = useMutation({
    mutationFn: async ({
      id,
      quantity,
      reason,
    }: {
      id: string;
      quantity: number;
      reason: string;
    }) => {
      const formData = new FormData();
      formData.append('quantity', String(quantity));
      formData.append('reason', reason);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/admin/variants/${id}/add-stock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken() ?? ''}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: t('pages.inventory.unknownError') }));
        throw new Error(body.message ?? t('pages.inventory.httpError').replace('{{status}}', String(res.status)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      setImageFile(null);
      notifySuccess({ title: t('pages.inventory.toastUpdated') });
      close();
    },
    onError: (error) => {
      notifyError({ title: t('pages.inventory.toastSaveError'), message: getApiErrorMessage(error) });
    },
  });

  const resetFilters = () => {
    setSearch('');
    setModeFilter('ALL');
    setLevelFilter('ALL');
    setPage(1);
  };

  const openAdjustment = (variantId?: string) => {
    const tracked = inventory.filter((variant) => variant.stockMode === 'TRACKED');
    if (tracked.length === 0) {
      notifyError({
        title: t('pages.inventory.toastNoVariantsTitle'),
        message: t('pages.inventory.toastNoVariantsMessage'),
      });
      return;
    }
    const initialId = variantId && tracked.some((variant) => variant.id === variantId) ? variantId : tracked[0].id;
    setSelectedVariantId(initialId);
    setAdjustmentQuantity(25);
    setMovementReason(MOVEMENT_REASON_KEYS[0]);
    setImageFile(null);
    open();
  };

  const adjustCounter = (delta: number) => {
    setAdjustmentQuantity((current) => Math.max(0, current + delta));
  };

  const saveAdjustment = () => {
    if (!selectedVariantId || adjustmentQuantity < 1 || addStock.isPending) return;
    addStock.mutate({ id: selectedVariantId, quantity: adjustmentQuantity, reason: t(movementReason) });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          overline={
            <div className="flex items-center gap-2">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-secondary">
                {t('pages.inventory.breadcrumbCatalog')}
              </span>
              <span className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="font-label-sm text-label-sm text-secondary">
                {t('pages.inventory.warehouseMadrid')}
              </span>
            </div>
          }
          title={t('pages.inventory.title')}
          actions={
            <>
              <button
                type="button"
                disabled
                title={t('common.comingSoon')}
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-2.5 font-label-md text-label-md text-on-surface opacity-60 shadow-sm"
              >
                <Icon name="file_upload" className="text-[18px] text-secondary" />
                <span>{t('pages.inventory.updateCsv')}</span>
              </button>
              <Button icon="add_circle" onClick={() => openAdjustment()} className="px-4 py-2.5">
                {t('pages.inventory.newAdjustment')}
              </Button>
            </>
          }
        />

        {/* KPIs aproximados sobre las referencias cargadas (limit=100) y meta.total */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                {t('pages.inventory.kpiTotalSkus')}
              </span>
              <span className="rounded-lg bg-surface-container p-2 text-on-surface">
                <Icon name="barcode_scanner" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-on-surface">
                <AnimatedNumber value={totalCatalog} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-secondary">
                <span>
                  {t('pages.inventory.catalogedPercent').replace('{{percent}}', formatPercent(catalogadasPct))}
                </span>
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, catalogadasPct)}%` }} />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                {t('pages.inventory.kpiMto')}
              </span>
              <span className="rounded-lg bg-surface-container-high p-2 text-on-surface">
                <Icon name="precision_manufacturing" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-on-surface">
                <AnimatedNumber value={mtoCount} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-low px-2 py-0.5 font-label-sm text-label-sm text-secondary">
                <span>{t('pages.inventory.catalogPercent').replace('{{percent}}', formatPercent(mtoPct))}</span>
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, mtoPct)}%` }} />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                {t('pages.inventory.kpiLowStock')}
              </span>
              <span className="rounded-lg bg-secondary-container p-2 text-on-secondary-container">
                <Icon name="warning" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-on-surface">
                <AnimatedNumber value={lowStockCount} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary-container/40 px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-container">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>{t('pages.inventory.requiresReorder')}</span>
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, lowStockPct)}%` }} />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                {t('pages.inventory.kpiOutOfStock')}
              </span>
              <span className="rounded-lg bg-error-container p-2 text-on-error-container">
                <Icon name="error" className="text-[18px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-headline-xl text-headline-xl font-semibold tracking-tight text-error">
                <AnimatedNumber value={outOfStockCount} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-error-container/50 px-2 py-0.5 font-label-sm text-label-sm text-on-error-container">
                <span className="h-1.5 w-1.5 rounded-full bg-error" />
                <span>{t('pages.inventory.zeroStock')}</span>
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full rounded-full bg-error" style={{ width: `${Math.min(100, outOfStockPct)}%` }} />
            </div>
          </div>
        </div>

        {/* Tabla de inventario */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex flex-col items-stretch justify-between gap-4 bg-surface-container-lowest p-4 sm:p-5 lg:flex-row lg:items-center">
            <div className="relative min-w-[280px] flex-1">
              <Icon
                name="search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-secondary"
              />
              <input
                type="text"
                placeholder={t('pages.inventory.searchPlaceholder')}
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setPage(1);
                }}
                className="w-full rounded-lg bg-surface-container-low py-2.5 pl-10 pr-4 font-body-sm text-body-sm text-on-surface shadow-sm transition-all placeholder:text-on-surface-variant/50 focus:bg-surface-container-lowest focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SegmentedTabs
                value={modeFilter}
                options={[
                  { value: 'ALL', label: t('pages.inventory.modeAll') },
                  { value: 'TRACKED', label: t('pages.inventory.modeTracked') },
                  { value: 'MADE_TO_ORDER', label: t('pages.inventory.modeMadeToOrder') },
                ]}
                onChange={(value) => {
                  setModeFilter(value);
                  setPage(1);
                }}
                layoutId="inventory-mode"
              />

              <div className="hidden h-6 w-[1px] bg-surface-container-high sm:block" />

              <div className="flex items-center gap-2">
                <select
                  value={levelFilter}
                  onChange={(event) => {
                    setLevelFilter(event.currentTarget.value as LevelFilter);
                    setPage(1);
                  }}
                  className="cursor-pointer rounded-lg bg-surface-container-low px-3 py-2 font-label-sm text-label-sm text-on-surface focus:outline-none"
                >
                  <option value="ALL">{t('pages.inventory.levelAll')}</option>
                  <option value="LOW">{t('pages.inventory.levelLow')}</option>
                  <option value="OUT">{t('pages.inventory.levelOut')}</option>
                  <option value="AVAILABLE">{t('pages.inventory.levelAvailable')}</option>
                </select>
                <button
                  type="button"
                  onClick={resetFilters}
                  title={t('pages.inventory.resetFilters')}
                  className="rounded-lg bg-surface-container-low p-2 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <Icon name="restart_alt" className="text-[18px]" />
                </button>
              </div>
            </div>
          </div>

          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={10} columns={7} />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase tracking-wider text-secondary">
                    <th className="py-3 px-6 font-semibold">{t('pages.inventory.columnProduct')}</th>
                    <th className="py-3 px-4 font-semibold">{t('pages.inventory.columnSku')}</th>
                    <th className="py-3 px-4 font-semibold">{t('pages.inventory.columnSizeColor')}</th>
                    <th className="py-3 px-4 font-semibold">{t('pages.inventory.columnStockMode')}</th>
                    <th className="py-3 px-6 font-semibold">{t('pages.inventory.columnAvailable')}</th>
                    <th className="py-3 px-6 text-right font-semibold">{t('pages.inventory.columnActions')}</th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableRowsContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm"
                >
                  {paginatedData.map((variant) => {
                    const available = quantityOf(variant);
                    const reserved = variant.inventory?.reservedQuantity ?? 0;
                    const isMto = variant.stockMode === 'MADE_TO_ORDER';
                    const outOfStock = isOutOfStock(variant);

                    return (
                      <motion.tr
                        variants={fadeInUp}
                        key={variant.id}
                        className={`group transition-colors hover:bg-surface-container-low/60 ${
                          outOfStock ? 'bg-error-container/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-high text-secondary shadow-sm">
                              {variant.product?.imageUrl ? (
                                <img
                                  src={variant.product.imageUrl}
                                  alt={variant.product.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Icon name="checkroom" className="text-[20px]" />
                              )}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-headline-sm text-headline-sm text-on-surface">
                                {variant.product?.name ?? t('pages.inventory.productNoName')}
                              </span>
                              <span className="font-label-sm text-label-sm text-secondary">
                                {variant.garmentType || variant.product?.slug || t('pages.inventory.noCategory')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block rounded bg-surface-container-low px-2 py-0.5 font-mono text-label-sm font-semibold tracking-wider text-on-surface">
                            {variant.sku}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm font-medium text-on-surface">
                              {variant.size || t('pages.inventory.sizeFallback')}
                            </span>
                            <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary">
                              <ColorDot color={variant.color} />
                              <span>{variant.color || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {isMto ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface">
                              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                              MADE_TO_ORDER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm font-semibold tracking-wider text-on-surface">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              TRACKED
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-numeric-tabular text-numeric-tabular">
                          {isMto ? (
                            <div className="flex items-center gap-2 text-secondary">
                              <Icon name="all_inclusive" className="text-[16px]" />
                              <span>{t('pages.inventory.noLimitOnDemand')}</span>
                            </div>
                          ) : outOfStock ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-error-container px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container">
                                <span className="h-1.5 w-1.5 rounded-full bg-error animate-pulse" />
                                {t('pages.inventory.outOfStockUnits')}
                              </span>
                              <span className="font-label-sm text-label-sm text-secondary">
                                {t('pages.inventory.reservedUnits').replace('{{count}}', String(reserved))}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-body-md font-semibold text-on-surface">
                                {t('pages.inventory.availableUnits').replace('{{count}}', String(available))}
                              </span>
                              <span className="font-label-sm text-label-sm text-secondary">
                                {t('pages.inventory.reservedUnits').replace('{{count}}', String(reserved))}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              title={
                                isMto
                                  ? t('pages.inventory.changeToTracked')
                                  : t('pages.inventory.changeToMadeToOrder')
                              }
                              onClick={() =>
                                updateStockMode.mutate({
                                  id: variant.id,
                                  stockMode: isMto ? 'TRACKED' : 'MADE_TO_ORDER',
                                })
                              }
                              disabled={updateStockMode.isPending}
                              className="rounded-lg bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-all hover:bg-surface-container disabled:pointer-events-none disabled:opacity-50"
                            >
                              {t('pages.inventory.modeButton')}
                            </button>
                            {!isMto && (
                              <button
                                type="button"
                                onClick={() => openAdjustment(variant.id)}
                                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-label-sm text-label-sm font-semibold shadow-sm transition-all ${
                                  outOfStock
                                    ? 'bg-primary text-on-primary hover:opacity-90'
                                    : 'bg-surface-container text-on-surface hover:bg-primary hover:text-on-primary'
                                }`}
                              >
                                <Icon name="add" className="text-[15px]" />
                                <span>{t('pages.inventory.addStock')}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled
                              title={t('common.comingSoon')}
                              aria-label={t('pages.inventory.moreOptions')}
                              className="cursor-not-allowed rounded-lg p-1.5 text-secondary opacity-40"
                            >
                              <Icon name="more_vert" className="text-[18px]" />
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

          {!isLoading && paginatedData.length === 0 && (
            <EmptyState
              icon="inventory_2"
              title={t('pages.inventory.emptyTitle')}
              description={t('pages.inventory.emptyDescription')}
            />
          )}

          {!isLoading && filteredInventory.length > 0 && (
            <div className="bg-surface-container-low px-4 pb-4 sm:px-5 sm:pb-5">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                summary={t('pages.inventory.paginationSummary')
                  .replace('{{shown}}', String(filteredInventory.length))
                  .replace('{{total}}', String(totalCatalog))}
              />
            </div>
          )}
        </div>
      </div>

      <AppModal
        opened={opened}
        onClose={close}
        size="md"
        title={
          <span className="flex flex-col gap-1">
            <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
              {t('pages.inventory.adjustmentOverline')}
            </span>
            <span className="font-headline-md text-headline-md font-semibold text-on-surface">
              {t('pages.inventory.adjustmentTitle')}
            </span>
          </span>
        }
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="save"
              onClick={saveAdjustment}
              disabled={addStock.isPending || !selectedVariantId || adjustmentQuantity < 1}
            >
              {addStock.isPending ? t('common.saving') : t('pages.inventory.saveAdjustment')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('pages.inventory.variantLabel')}>
            <Select
              value={selectedVariantId ?? ''}
              onChange={(event) => setSelectedVariantId(event.currentTarget.value || null)}
              disabled={trackedVariants.length === 0}
            >
              {trackedVariants.length === 0 && (
                <option value="">{t('pages.inventory.noTrackedVariants')}</option>
              )}
              {trackedVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.product?.name ?? t('pages.inventory.productNoName')} — {variant.sku}
                </option>
              ))}
            </Select>
          </Field>

          {selectedVariant && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {selectedVariant.product?.name ?? t('pages.inventory.productNoName')}
                </span>
                <span className="font-numeric-tabular text-label-sm font-medium text-secondary">
                  SKU: {selectedVariant.sku}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-label-uppercase text-label-uppercase uppercase text-secondary">
                  {t('pages.inventory.currentStock')}
                </span>
                <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {t('pages.inventory.availableUnits').replace('{{count}}', String(quantityOf(selectedVariant)))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="stock-increment"
              className="font-label-sm text-label-sm font-semibold text-secondary"
            >
              {t('pages.inventory.quantityLabel')}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustCounter(-5)}
                className="h-10 w-10 rounded-lg bg-surface-container font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => adjustCounter(-1)}
                className="h-10 w-10 rounded-lg bg-surface-container font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                -1
              </button>
              <input
                id="stock-increment"
                type="number"
                min={0}
                value={adjustmentQuantity}
                onChange={(event) =>
                  setAdjustmentQuantity(Math.max(0, Math.floor(Number(event.currentTarget.value) || 0)))
                }
                className="min-w-0 flex-1 rounded-lg bg-surface-container-low py-2 text-center font-headline-sm text-headline-sm font-semibold text-on-surface shadow-sm focus:bg-surface-container-lowest focus:outline-none"
              />
              <button
                type="button"
                onClick={() => adjustCounter(1)}
                className="h-10 w-10 rounded-lg bg-surface-container font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => adjustCounter(5)}
                className="h-10 w-10 rounded-lg bg-surface-container font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                +5
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="movement-reason" className="font-label-sm text-label-sm font-semibold text-secondary">
              {t('pages.inventory.movementReasonLabel')}
            </label>
            <select
              id="movement-reason"
              value={movementReason}
              onChange={(event) => setMovementReason(event.currentTarget.value)}
              className="w-full cursor-pointer rounded-lg bg-surface-container-low p-2.5 font-body-sm text-body-sm text-on-surface focus:outline-none"
            >
              {MOVEMENT_REASON_KEYS.map((option) => (
                <option key={option} value={option}>
                  {t(option)}
                </option>
              ))}
            </select>
          </div>

          <details className="rounded-xl bg-surface-container-low px-3 py-2.5">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-label-sm text-label-sm font-semibold text-secondary">
              <Icon name="image" className="text-[16px]" />
              {t('pages.inventory.stockImageSummary')}
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-4 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container">
                <Icon name="add_photo_alternate" className="text-[20px]" />
                <span className="max-w-[260px] truncate">
                  {imageFile ? imageFile.name : t('pages.inventory.selectImage')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setImageFile(event.currentTarget.files?.[0] ?? null)}
                />
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="self-start font-label-sm text-label-sm text-secondary transition-colors hover:text-error"
                >
                  {t('pages.inventory.removeImage')}
                </button>
              )}
            </div>
          </details>
        </div>
      </AppModal>
    </>
  );
}
