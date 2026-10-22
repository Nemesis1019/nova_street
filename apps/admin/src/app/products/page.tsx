'use client';

import { Menu } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { Switch } from '../../components/ui/switch';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient, getAuthToken } from '../../lib/api';
import { createExternalAsset, deleteAsset, uploadAsset } from '../../lib/assets';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type ImageMode = 'file' | 'url';

interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  categoryId: string;
  imageMode: ImageMode;
  imageFile: File | null;
  imageUrl: string;
}

type ColumnKey = 'name' | 'slug' | 'category' | 'basePrice' | 'isActive' | 'actions';

const ALL_COLUMNS: { key: Exclude<ColumnKey, 'actions'>; labelKey: string; shortKey: string }[] = [
  { key: 'name', labelKey: 'pages.products.columnName', shortKey: 'pages.products.columnName' },
  { key: 'slug', labelKey: 'pages.products.columnSlug', shortKey: 'pages.products.columnSlug' },
  { key: 'category', labelKey: 'pages.products.columnCategory', shortKey: 'pages.products.columnCategory' },
  { key: 'basePrice', labelKey: 'pages.products.columnBasePrice', shortKey: 'pages.products.shortBasePrice' },
  { key: 'isActive', labelKey: 'pages.products.columnActive', shortKey: 'pages.products.columnActive' },
];

const SORT_OPTIONS = [
  { labelKey: 'pages.products.sortNewest', by: 'createdAt', order: 'desc' as const },
  { labelKey: 'pages.products.sortNameAsc', by: 'name', order: 'asc' as const },
  { labelKey: 'pages.products.sortPriceDesc', by: 'basePrice', order: 'desc' as const },
  { labelKey: 'pages.products.sortPriceAsc', by: 'basePrice', order: 'asc' as const },
];

function formatPrice(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [navigating, setNavigating] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<{ by: string; order: 'asc' | 'desc' }>({ by: 'createdAt', order: 'desc' });

  const form = useForm<ProductFormValues>({
    initialValues: {
      name: '',
      slug: '',
      description: '',
      basePrice: 0,
      categoryId: '',
      imageMode: 'file',
      imageFile: null,
      imageUrl: '',
    },
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (form.values.imageMode === 'file') {
      const file = form.values.imageFile;
      if (!file) {
        setPreviewUrl(null);
        return undefined;
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    const url = form.values.imageUrl.trim();
    setPreviewUrl(url || null);
    return undefined;
  }, [form.values.imageFile, form.values.imageUrl, form.values.imageMode]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<ColumnKey[]>({
    key: 'admin-products-visible-columns',
    defaultValue: ['name', 'slug', 'category', 'basePrice', 'isActive', 'actions'],
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const limit = 10;

  const { data: productsResponse, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-products', page, search, categoryFilter, statusFilter, sort],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/products', {
        params: {
          query: {
            page: String(page),
            limit: String(limit),
            search: search || undefined,
            categoryId: categoryFilter || undefined,
            isActive: statusFilter === 'all' ? undefined : String(statusFilter === 'active'),
            sortBy: sort.by,
            sortOrder: sort.order,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const products = productsResponse?.data ?? [];
  const total = productsResponse?.meta?.total ?? 0;
  const totalPages = total ? Math.ceil(total / limit) : 1;

  const { data: activeTotal = 0 } = useQuery({
    queryKey: ['admin-products-active-count'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/products', {
        params: { query: { limit: '1', isActive: 'true' } },
      });
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/categories');
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      let imageAssetId: string | undefined;
      if (values.imageMode === 'file' && values.imageFile) {
        const asset = await uploadAsset(values.imageFile);
        imageAssetId = asset.id;
      } else if (values.imageMode === 'url' && values.imageUrl.trim()) {
        const asset = await createExternalAsset(values.imageUrl.trim());
        imageAssetId = asset.id;
      }

      try {
        const { error } = await apiClient.POST('/admin/products', {
          body: {
            name: values.name,
            slug: values.slug,
            description: values.description,
            basePrice: values.basePrice,
            categoryId: values.categoryId || undefined,
            imageAssetId,
          } as never,
        });
        if (error) throw error;
      } catch (error) {
        if (imageAssetId) {
          await deleteAsset(imageAssetId).catch(() => undefined);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      notifySuccess({ title: t('pages.products.toastCreated') });
      close();
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.products.toastCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/products/{id}/toggle-active', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      notifySuccess({ title: t('pages.products.toastStatusUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.products.toastStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const bulk = useMutation({
    mutationFn: async ({ action, ids }: { action: 'activate' | 'deactivate' | 'delete'; ids: string[] }) => {
      const { error } = await apiClient.POST('/admin/products/bulk', {
        body: { action, ids } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds([]);
      notifySuccess({ title: t('pages.products.toastBulkApplied') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.products.toastBulkError'), message: getApiErrorMessage(error) });
    },
  });

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admin/products/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken() ?? ''}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('pages.products.importError'));
      }
      return response.json() as Promise<{ created: number; total: number; errors: Array<{ row: number; message: string }> }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setImportFile(null);
      const errorMsg = result.errors.length
        ? t('pages.products.importCompletedErrors').replace('{{count}}', String(result.errors.length))
        : '';
      notifySuccess({
        title: t('pages.products.importCompleted').replace('{{created}}', String(result.created)) + errorMsg,
      });
    },
    onError: (error) => {
      notifyError({ title: t('pages.products.importError'), message: getApiErrorMessage(error) });
    },
  });

  const categoryOptions = categories?.map((c) => ({ value: c.id, label: c.name })) ?? [];

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]));
  };

  const toggleAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const isVisible = (key: ColumnKey) => visibleColumns.includes(key);
  const visibleNonActionColumns = ALL_COLUMNS.filter((column) => isVisible(column.key));
  const hiddenColumns = ALL_COLUMNS.filter((column) => !isVisible(column.key));

  const currentSortLabel = SORT_OPTIONS.find((option) => option.by === sort.by && option.order === sort.order)?.labelKey;

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              {t('pages.products.title')}
              <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                {t('pages.products.registered').replace('{{count}}', String(total))}
              </span>
            </span>
          }
          subtitle={
            <span className="mt-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {t('pages.products.activeVisible').replace('{{count}}', String(activeTotal))}
            </span>
          }
          actions={
            <>
              <div className="hidden items-center gap-1.5 rounded-xl bg-surface-container-low p-1.5 xl:flex">
                <span className="px-2 font-label-uppercase text-label-uppercase text-on-surface-variant/70">
                  {t('pages.products.columnsLabel')}
                </span>
                {visibleNonActionColumns.map((column) => (
                  <span
                    key={column.key}
                    className="inline-flex items-center gap-1 rounded-lg bg-surface-container-lowest px-2 py-0.5 font-label-sm text-label-sm text-on-surface shadow-sm"
                  >
                    {t(column.shortKey)}
                    <button
                      type="button"
                      aria-label={t('pages.products.hideColumn').replace('{{name}}', t(column.labelKey))}
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
                        title={t('pages.products.addColumn')}
                        className="flex items-center rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-lowest hover:text-on-surface"
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

              <Button variant="secondary" icon="upload_file" onClick={() => setCsvOpen((value) => !value)}>
                {t('pages.products.importCsv')}
              </Button>
              <Button icon="add" onClick={open}>
                {t('pages.products.newProduct')}
              </Button>
            </>
          }
        />

        {csvOpen && (
          <Card className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="rounded-lg bg-surface-container p-2 text-on-surface">
                <Icon name="table_view" className="text-[20px]" />
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-on-surface">{t('pages.products.importTitle')}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.products.importDescription')}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low">
                <Icon name="attach_file" className="text-[18px]" />
                <span className="max-w-[220px] truncate">
                  {importFile ? importFile.name : t('pages.products.importFilePlaceholder')}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => setImportFile(event.currentTarget.files?.[0] ?? null)}
                />
              </label>
              <Button
                variant="secondary"
                onClick={() => importFile && importCsv.mutate(importFile)}
                disabled={!importFile || importCsv.isPending}
              >
                {importCsv.isPending ? t('pages.products.importing') : t('pages.products.importAction')}
              </Button>
              <a
                href="data:text/csv;charset=utf-8,name,slug,description,basePrice,categoryId,metaTitle,metaDescription,isActive\nEjemplo,ejemplo,Descripción,10000,ID_CATEGORIA,Meta,Meta,true"
                download="productos-plantilla.csv"
                className="inline-flex items-center gap-1.5 font-label-sm text-label-sm font-semibold text-secondary transition-colors hover:text-on-surface"
              >
                <Icon name="download" className="text-[16px]" />
                {t('pages.products.downloadTemplate')}
              </a>
            </div>
          </Card>
        )}

        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-outline-variant/30 p-4 lg:flex-row lg:items-center">
            <Input
              icon="search"
              variant="filled"
              placeholder={t('pages.products.searchPlaceholder')}
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              className="lg:max-w-md"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.currentTarget.value);
                  setPage(1);
                }}
                className="w-full sm:w-48"
              >
                <option value="">{t('pages.products.allCategories')}</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.currentTarget.value as 'all' | 'active' | 'inactive');
                  setPage(1);
                }}
                className="w-full sm:w-44"
              >
                <option value="all">{t('pages.products.statusAll')}</option>
                <option value="active">{t('pages.products.statusActive')}</option>
                <option value="inactive">{t('pages.products.statusInactive')}</option>
              </Select>
              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <button
                    type="button"
                    title={
                      currentSortLabel
                        ? t('pages.products.sortBy').replace('{{label}}', t(currentSortLabel))
                        : t('pages.products.sort')
                    }
                    className="flex items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                  >
                    <Icon name="sort" className="text-[18px]" />
                  </button>
                </Menu.Target>
                <Menu.Dropdown>
                  {SORT_OPTIONS.map((option) => (
                    <Menu.Item
                      key={`${option.by}-${option.order}`}
                      onClick={() => {
                        setSort({ by: option.by, order: option.order });
                        setPage(1);
                      }}
                    >
                      {t(option.labelKey)}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-inverse-surface px-4 py-3 text-inverse-on-surface">
              <span className="flex items-center gap-2 font-body-sm text-body-sm">
                <Icon name="check_circle" className="text-[18px]" />
                {t('pages.products.selectedCount').replace('{{count}}', String(selectedIds.length))}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => bulk.mutate({ action: 'activate', ids: selectedIds })}
                  className="rounded-lg border border-white/20 px-3 py-1.5 font-label-sm text-label-sm transition-colors hover:bg-white/10"
                >
                  {t('pages.products.activate')}
                </button>
                <button
                  type="button"
                  onClick={() => bulk.mutate({ action: 'deactivate', ids: selectedIds })}
                  className="rounded-lg border border-white/20 px-3 py-1.5 font-label-sm text-label-sm transition-colors hover:bg-white/10"
                >
                  {t('pages.products.deactivate')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        t('pages.products.confirmBulkDelete').replace('{{count}}', String(selectedIds.length)),
                      )
                    ) {
                      bulk.mutate({ action: 'delete', ids: selectedIds });
                    }
                  }}
                  className="rounded-lg bg-white px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-white/90"
                >
                  {t('pages.products.delete')}
                </button>
              </div>
            </div>
          )}

          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={10} columns={7} />
          ) : products.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title={t('pages.products.emptyTitle')}
              description={t('pages.products.emptyDescription')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <th className="w-12 rounded-l-lg px-3 py-3">
                      <Checkbox
                        checked={products.length > 0 && selectedIds.length === products.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < products.length}
                        onChange={toggleAll}
                        label={t('pages.products.selectAll')}
                      />
                    </th>
                    {isVisible('name') && <th className="px-3 py-3">{t('pages.products.tableProduct')}</th>}
                    {isVisible('slug') && <th className="px-3 py-3">{t('pages.products.columnSlug')}</th>}
                    {isVisible('category') && <th className="px-3 py-3">{t('pages.products.columnCategory')}</th>}
                    {isVisible('basePrice') && <th className="px-3 py-3">{t('pages.products.tableBasePrice')}</th>}
                    {isVisible('isActive') && (
                      <th className="px-3 py-3 text-center">{t('pages.products.columnActive')}</th>
                    )}
                    {isVisible('actions') && (
                      <th className="rounded-r-lg px-3 py-3 text-right">{t('pages.products.columnActions')}</th>
                    )}
                  </tr>
                </thead>
                <motion.tbody variants={tableRowsContainer} initial="hidden" animate="visible">
                  {products.map((product) => (
                    <motion.tr
                      variants={fadeInUp}
                      key={product.id}
                      className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="px-3 py-3.5">
                        <Checkbox
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelection(product.id)}
                          label={t('pages.products.selectProduct').replace('{{name}}', product.name)}
                        />
                      </td>
                      {isVisible('name') && (
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container-highest">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-secondary">
                                  <Icon name="checkroom" className="text-[20px]" />
                                </div>
                              )}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-body-sm text-body-sm font-semibold text-on-surface">
                                {product.name}
                              </span>
                              <span className="font-label-sm text-label-sm font-numeric-tabular text-on-surface-variant">
                                {product.variants?.[0]?.sku ?? t('pages.products.noSku')}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}
                      {isVisible('slug') && (
                        <td className="px-3 py-3.5">
                          <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-label-sm text-on-surface-variant">
                            {product.slug}
                          </span>
                        </td>
                      )}
                      {isVisible('category') && (
                        <td className="px-3 py-3.5">
                          {product.category ? (
                            <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                              {product.category.name}
                            </span>
                          ) : (
                            <span className="font-label-sm text-label-sm text-on-surface-variant/60">
                              {t('pages.products.noCategory')}
                            </span>
                          )}
                        </td>
                      )}
                      {isVisible('basePrice') && (
                        <td className="px-3 py-3.5 font-numeric-tabular text-body-sm font-semibold text-on-surface">
                          {formatPrice(product.basePrice)}
                        </td>
                      )}
                      {isVisible('isActive') && (
                        <td className="px-3 py-3.5 text-center">
                          <Switch
                            checked={product.isActive}
                            onChange={() => toggle.mutate(product.id)}
                            label={t('pages.products.productActiveLabel').replace('{{name}}', product.name)}
                          />
                        </td>
                      )}
                      {isVisible('actions') && (
                        <td className="px-3 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setNavigating(true);
                                router.push(`/products/${product.id}`);
                              }}
                              className="rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                            >
                              {t('common.edit')}
                            </button>
                            <Menu position="bottom-end" shadow="md">
                              <Menu.Target>
                                <button
                                  type="button"
                                  title={t('pages.products.moreActions')}
                                  className="flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                                >
                                  <Icon name="more_vert" className="text-[18px]" />
                                </button>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  onClick={() => {
                                    setNavigating(true);
                                    router.push(`/products/${product.id}`);
                                  }}
                                >
                                  {t('pages.products.editProduct')}
                                </Menu.Item>
                                <Menu.Item onClick={() => toggle.mutate(product.id)}>
                                  {product.isActive ? t('pages.products.deactivate') : t('pages.products.activate')}
                                </Menu.Item>
                                <Menu.Item
                                  color="red"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        t('pages.products.confirmDelete').replace('{{name}}', product.name),
                                      )
                                    ) {
                                      bulk.mutate({ action: 'delete', ids: [product.id] });
                                    }
                                  }}
                                >
                                  {t('pages.products.delete')}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {!isLoading && products.length > 0 && (
            <div className="border-t border-outline-variant/30 px-4 pb-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                summary={t('pages.products.paginationSummary')
                  .replace('{{start}}', String((page - 1) * limit + 1))
                  .replace('{{end}}', String(Math.min(page * limit, total)))
                  .replace('{{total}}', String(total))}
              />
            </div>
          )}
        </Card>
      </div>

      <AppModal
        opened={opened}
        onClose={close}
        title={t('pages.products.newProduct')}
        subtitle={t('pages.products.createSubtitle')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="check"
              onClick={() => form.onSubmit((values) => create.mutate(values))()}
              disabled={create.isPending}
            >
              {create.isPending ? t('common.saving') : t('pages.products.saveProduct')}
            </Button>
          </>
        }
      >
        <form onSubmit={form.onSubmit((values) => create.mutate(values))} className="flex flex-col gap-4">
          <Field label={t('pages.products.fieldName')} required>
            <Input placeholder={t('pages.products.fieldNamePlaceholder')} {...form.getInputProps('name')} />
          </Field>
          <Field
            label={t('pages.products.fieldSlug')}
            required
            tooltip={t('pages.products.tooltipSlug')}
          >
            <Input placeholder={t('pages.products.fieldSlugPlaceholder')} {...form.getInputProps('slug')} />
          </Field>
          <Field
            label={t('pages.products.fieldDescription')}
            tooltip={t('pages.products.tooltipDescription')}
          >
            <Textarea
              rows={3}
              placeholder={t('pages.products.fieldDescriptionPlaceholder')}
              {...form.getInputProps('description')}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t('pages.products.fieldBasePrice')}
              required
              tooltip={t('pages.products.tooltipBasePrice')}
            >
              <Input
                type="number"
                min={0}
                value={form.values.basePrice}
                onChange={(event) => form.setFieldValue('basePrice', Number(event.currentTarget.value))}
              />
            </Field>
            <Field
              label={t('pages.products.fieldCategory')}
              tooltip={t('pages.products.tooltipCategory')}
            >
              <Select {...form.getInputProps('categoryId')}>
                <option value="">{t('pages.products.noCategory')}</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label={t('pages.products.fieldImage')}
            tooltip={t('pages.products.tooltipImage')}
          >
            <div className="flex flex-col gap-3">
              <SegmentedTabs
                value={form.values.imageMode}
                options={[
                  { value: 'file', label: t('pages.products.imageModeFile') },
                  { value: 'url', label: t('pages.products.imageModeUrl') },
                ]}
                onChange={(value) => form.setFieldValue('imageMode', value)}
                layoutId="products-image-mode"
                className="w-fit"
              />

              {form.values.imageMode === 'file' ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-4 py-6 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container">
                  <Icon name="add_photo_alternate" className="text-[22px]" />
                  <span>
                    {form.values.imageFile ? form.values.imageFile.name : t('pages.products.dropHint')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => form.setFieldValue('imageFile', event.currentTarget.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <Input
                  placeholder={t('pages.products.imageUrlPlaceholder')}
                  value={form.values.imageUrl}
                  onChange={(event) => form.setFieldValue('imageUrl', event.currentTarget.value)}
                />
              )}

              {previewUrl && (
                <div className="overflow-hidden rounded-lg border border-outline-variant/40">
                  <img
                    src={previewUrl}
                    alt={t('pages.products.imagePreviewAlt')}
                    className="h-40 w-full object-contain"
                  />
                </div>
              )}
            </div>
          </Field>
        </form>
      </AppModal>

      {navigating && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/70">
          <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-3 font-body-sm text-body-sm text-on-surface shadow-pop">
            <Icon name="progress_activity" className="animate-spin text-[20px]" />
            {t('pages.products.openingProduct')}
          </div>
        </div>
      )}
    </>
  );
}
