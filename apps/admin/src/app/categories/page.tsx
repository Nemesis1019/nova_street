'use client';

import type { components } from '@ecommerce/api-client';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChangeEvent, useMemo, useRef, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { fadeInUp, LAYOUT_SPRING, tableRowsContainer } from '../../components/ui/motion';
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

type Category = components['schemas']['CategoryResponseDto'];
type StatusFilter = 'all' | 'active' | 'inactive';

interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  parentId: string;
  isActive: boolean;
}

const PAGE_SIZE = 10;

/** El diseño asigna un icono por categoría, pero la API no expone ese campo: se resuelve por palabras clave. */
const CATEGORY_ICONS: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['accesorio', 'joya', 'billetera', 'bolso'], icon: 'watch' },
  { keywords: ['buzo', 'hoodie', 'abrigo', 'campera', 'sweater'], icon: 'dry_cleaning' },
  { keywords: ['gorra', 'sombrero'], icon: 'style' },
  { keywords: ['pantalon', 'jean', 'short'], icon: 'straighten' },
  { keywords: ['remera', 'camiseta', 'top'], icon: 'apparel' },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function categoryIcon(category: Category) {
  const haystack = normalize(`${category.name} ${category.slug}`);
  return CATEGORY_ICONS.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)))?.icon ?? 'category';
}

function slugify(value: string) {
  return normalize(value)
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [reorderOpened, { open: openReorder, close: closeReorder }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reorderItems, setReorderItems] = useState<Category[]>([]);
  const slugTouchedRef = useRef(false);

  const form = useForm<CategoryFormValues>({
    initialValues: {
      name: '',
      slug: '',
      description: '',
      metaTitle: '',
      metaDescription: '',
      parentId: '',
      isActive: true,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : t('pages.categories.validationNameRequired')),
      slug: (value) => (value.trim().length > 0 ? null : t('pages.categories.validationSlugRequired')),
    },
  });

  const { data: categories, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/categories');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: totalProducts = 0 } = useQuery({
    queryKey: ['admin-products-total'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/products', { params: { query: { limit: '1' } } });
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const categoriesList = useMemo(() => categories ?? [], [categories]);
  const categoriesCount = categoriesList.length;
  const activeCount = categoriesList.filter((category) => category.isActive).length;
  const inactiveCount = categoriesCount - activeCount;

  const leadingCategory = useMemo(
    () =>
      categoriesList.reduce<Category | null>(
        (best, category) => ((category.productCount ?? 0) > (best?.productCount ?? -1) ? category : best),
        null,
      ),
    [categoriesList],
  );

  const leadingShare = totalProducts > 0 ? ((leadingCategory?.productCount ?? 0) / totalProducts) * 100 : 0;
  const onlineShare = categoriesCount > 0 ? Math.round((activeCount / categoriesCount) * 100) : 0;

  const filteredCategories = useMemo(() => {
    const term = normalize(search.trim());
    return categoriesList.filter((category) => {
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? category.isActive : !category.isActive);
      if (!matchesStatus) return false;
      if (!term) return true;
      return normalize(category.name).includes(term) || normalize(category.slug).includes(term);
    });
  }, [categoriesList, search, statusFilter]);

  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: filteredCategories,
    pageSize: PAGE_SIZE,
  });

  const rangeStart = filteredCategories.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredCategories.length);

  const create = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const { error } = await apiClient.POST('/admin/categories', {
        body: {
          name: values.name.trim(),
          slug: values.slug.trim(),
          description: values.description.trim() || undefined,
          parentId: values.parentId || undefined,
          isActive: values.isActive,
          metaTitle: values.metaTitle.trim() || undefined,
          metaDescription: values.metaDescription.trim() || undefined,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      notifySuccess({ title: t('pages.categories.toastCreated') });
      close();
      setEditing(null);
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.categories.toastCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CategoryFormValues }) => {
      const { error } = await apiClient.PATCH('/admin/categories/{id}', {
        params: { path: { id } },
        body: {
          name: values.name.trim(),
          slug: values.slug.trim(),
          description: values.description.trim() || undefined,
          parentId: values.parentId || null,
          isActive: values.isActive,
          metaTitle: values.metaTitle.trim() || undefined,
          metaDescription: values.metaDescription.trim() || undefined,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      notifySuccess({ title: t('pages.categories.toastUpdated') });
      close();
      setEditing(null);
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.categories.toastUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await apiClient.PATCH('/admin/categories/{id}', {
        params: { path: { id } },
        body: { isActive },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error) => {
      notifyError({ title: t('pages.categories.toastStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/categories/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      notifySuccess({ title: t('pages.categories.toastDeleted') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.categories.toastDeleteError'), message: getApiErrorMessage(error) });
    },
  });

  const reorder = useMutation({
    mutationFn: async (items: Category[]) => {
      const { error } = await apiClient.PATCH('/admin/categories/reorder', {
        body: {
          items: items.map((category, index) => ({ id: category.id, sortOrder: index })),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      notifySuccess({ title: t('pages.categories.toastReordered') });
      closeReorder();
    },
    onError: (error) => {
      notifyError({ title: t('pages.categories.toastReorderError'), message: getApiErrorMessage(error) });
    },
  });

  const editingCategory = categoriesList.find((category) => category.id === editing);
  const parentOptions = categoriesList.filter((category) => category.id !== editing);

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: t('pages.categories.allFilter').replace('{{count}}', String(categoriesCount)) },
    { value: 'active', label: t('pages.categories.activeFilter').replace('{{count}}', String(activeCount)) },
    { value: 'inactive', label: t('pages.categories.inactiveFilter').replace('{{count}}', String(inactiveCount)) },
  ];

  const startEdit = (category: Category) => {
    setEditing(category.id);
    slugTouchedRef.current = true;
    form.setValues({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      metaTitle: category.metaTitle ?? '',
      metaDescription: category.metaDescription ?? '',
      parentId: category.parentId ?? '',
      isActive: category.isActive,
    });
    open();
  };

  const startCreate = () => {
    setEditing(null);
    slugTouchedRef.current = false;
    form.reset();
    open();
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    form.setFieldValue('name', value);
    if (!slugTouchedRef.current) {
      form.setFieldValue('slug', slugify(value));
    }
  };

  const handleSubmit = (values: CategoryFormValues) => {
    if (editing) {
      update.mutate({ id: editing, values });
    } else {
      create.mutate(values);
    }
  };

  const confirmRemove = (category: Category) => {
    if (
      window.confirm(
        t('pages.categories.confirmRemove').replace('{{name}}', () => category.name),
      )
    ) {
      remove.mutate(category.id);
    }
  };

  const startReorder = () => {
    setReorderItems(
      [...categoriesList].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    );
    openReorder();
  };

  const moveReorderItem = (index: number, direction: -1 | 1) => {
    setReorderItems((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const exportCsv = () => {
    const rows: string[][] = [
      [
        t('pages.categories.columnName'),
        t('pages.categories.csvSlug'),
        t('pages.categories.csvDescription'),
        t('pages.categories.columnProducts'),
        t('pages.categories.csvActive'),
      ],
      ...categoriesList.map((category) => [
        category.name,
        category.slug,
        category.description ?? '',
        String(category.productCount ?? 0),
        category.isActive ? t('common.yes') : t('common.no'),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'categorias.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          overline={
            <div className="flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              <span>{t('pages.categories.breadcrumbCatalog')}</span>
              <span className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="font-medium text-primary">{t('pages.categories.breadcrumbStoreStructure')}</span>
            </div>
          }
          title={
            <span className="flex flex-wrap items-baseline gap-3">
              <span>{t('pages.categories.title')}</span>
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-md text-label-md text-on-surface-variant">
                {t('pages.categories.registeredCount')
                  .replace('{{total}}', String(categoriesCount))
                  .replace('{{active}}', String(activeCount))}
              </span>
            </span>
          }
          actions={
            <>
              <Button
                variant="secondary"
                icon="swap_vert"
                iconClassName="text-[18px] text-secondary"
                onClick={startReorder}
              >
                {t('pages.categories.reorderTree')}
              </Button>
              <Button
                variant="secondary"
                icon="download"
                iconClassName="text-[18px] text-secondary"
                onClick={exportCsv}
              >
                {t('pages.categories.export')}
              </Button>
              <Button icon="add" onClick={startCreate}>
                {t('pages.categories.newCategory')}
              </Button>
            </>
          }
        />

        {isError ? (
          <QueryError onRetry={() => refetch()} retrying={isFetching} />
        ) : isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : (
          <>
            {/* Quick Stats Bento */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-4 shadow-sm">
                <div className="flex flex-col">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/80">
                    {t('pages.categories.totalCatalog')}
                  </span>
                  <span className="mt-0.5 font-headline-md text-headline-md font-numeric-tabular text-on-surface">
                    {(totalProducts === 1
                      ? t('pages.categories.totalItemsSingular')
                      : t('pages.categories.totalItemsPlural')
                    ).replace('{{count}}', String(totalProducts))}
                  </span>
                  <span className="mt-0.5 font-label-sm text-label-sm text-secondary">
                    {(categoriesCount === 1
                      ? t('pages.categories.distributedSingular')
                      : t('pages.categories.distributedPlural')
                    ).replace('{{count}}', String(categoriesCount))}
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <Icon name="category" className="text-[22px]" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-4 shadow-sm">
                <div className="flex flex-col">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/80">
                    {t('pages.categories.leadingCategory')}
                  </span>
                  <span className="mt-0.5 font-headline-md text-headline-md text-on-surface">
                    {leadingCategory?.name ?? '—'}
                  </span>
                  <span className="mt-0.5 font-label-sm text-label-sm text-secondary">
                    {t('pages.categories.leadingProducts')
                      .replace('{{count}}', String(leadingCategory?.productCount ?? 0))
                      .replace('{{share}}', leadingShare.toFixed(1))}
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                  <Icon name="trending_up" className="text-[22px]" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-4 shadow-sm">
                <div className="flex flex-col">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/80">
                    {t('pages.categories.storefrontVisibility')}
                  </span>
                  <span className="mt-0.5 font-headline-md text-headline-md text-on-surface">
                    {t('pages.categories.onlineShare').replace('{{share}}', String(onlineShare))}
                  </span>
                  <span className="mt-0.5 font-label-sm text-label-sm text-secondary">
                    {inactiveCount === 0
                      ? t('pages.categories.noHiddenCategories')
                      : (inactiveCount === 1
                          ? t('pages.categories.hiddenSingular')
                          : t('pages.categories.hiddenPlural')
                        ).replace('{{count}}', String(inactiveCount))}
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-on-surface">
                  <Icon name="store" className="text-[22px]" />
                </div>
              </div>
            </div>

            {/* Filters & Table Container */}
            <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
              {/* Filter Bar */}
              <div className="flex flex-col items-stretch justify-between gap-3 border-b border-outline-variant/30 bg-surface-container-lowest p-4 sm:flex-row sm:items-center">
                <Input
                  icon="search"
                  variant="filled"
                  placeholder={t('pages.categories.searchPlaceholder')}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value);
                    setPage(1);
                  }}
                  className="flex-1 sm:max-w-md"
                />
                <SegmentedTabs
                  value={statusFilter}
                  options={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  layoutId="categories-status"
                  className="self-start sm:self-auto"
                />
              </div>

              {/* Category Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase text-on-surface-variant">
                      <th className="w-12 px-6 py-3 text-center">
                        <span className="sr-only">{t('pages.categories.columnIcon')}</span>
                      </th>
                      <th className="px-4 py-3">{t('pages.categories.columnName')}</th>
                      <th className="px-4 py-3">{t('pages.categories.columnSlug')}</th>
                      <th className="px-4 py-3">{t('pages.categories.columnProducts')}</th>
                      <th className="px-4 py-3">{t('pages.categories.columnDisplay')}</th>
                      <th className="px-6 py-3 text-center">{t('pages.categories.columnStatus')}</th>
                      <th className="px-6 py-3 text-right">{t('pages.categories.columnActions')}</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={tableRowsContainer}
                    initial="hidden"
                    animate="visible"
                    className="divide-y divide-surface-container-low"
                  >
                    {paginatedData.map((category) => {
                      const productCount = category.productCount ?? 0;
                      return (
                        <motion.tr
                          variants={fadeInUp}
                          key={category.id}
                          className="group transition-colors hover:bg-surface-container-low/60"
                        >
                          <td className="px-6 py-4 text-center">
                            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface">
                              <Icon name={categoryIcon(category)} className="text-[18px]" />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-headline-sm text-headline-sm leading-tight text-on-surface">
                                {category.name}
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant/80">
                                {category.description || t('pages.categories.noDescription')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-numeric-tabular text-body-sm text-secondary">
                            <span className="rounded bg-surface-container-low px-2 py-0.5 font-mono text-[12px] text-on-surface">
                              /coleccion/{category.slug}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 font-numeric-tabular text-label-sm text-on-surface">
                              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                              {(productCount === 1
                                ? t('pages.categories.productSingular')
                                : t('pages.categories.productPlural')
                              ).replace('{{count}}', String(productCount))}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {t('pages.categories.standardGrid')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Switch
                              checked={category.isActive}
                              onChange={(checked) => toggleActive.mutate({ id: category.id, isActive: checked })}
                              disabled={toggleActive.isPending && toggleActive.variables?.id === category.id}
                              label={(category.isActive ? t('pages.categories.deactivate') : t('pages.categories.activate')).replace(
                                '{{name}}',
                                () => category.name,
                              )}
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEdit(category)}
                                className="rounded bg-surface-container-low px-2.5 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                type="button"
                                title={t('pages.categories.deleteTitle')}
                                onClick={() => confirmRemove(category)}
                                className="rounded p-1 text-on-surface-variant transition-colors hover:bg-error-container/20 hover:text-error"
                              >
                                <Icon name="delete" className="text-[18px]" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </motion.tbody>
                </table>
              </div>

              {paginatedData.length === 0 && (
                <EmptyState
                  icon="category"
                  title={categoriesCount === 0 ? t('pages.categories.emptyTitle') : t('pages.categories.emptyResults')}
                  description={
                    categoriesCount === 0
                      ? t('pages.categories.emptyNoCategoriesDescription')
                      : t('pages.categories.emptyResultsDescription')
                  }
                />
              )}

              {filteredCategories.length > 0 && (
                <div className="border-t border-outline-variant/30 px-4 pb-2">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={setPage}
                    summary={t('pages.categories.paginationSummary')
                      .replace('{{start}}', String(rangeStart))
                      .replace('{{end}}', String(rangeEnd))
                      .replace('{{total}}', String(filteredCategories.length))}
                  />
                </div>
              )}
            </div>

            {/* Hierarchy & Organization Hint Banner */}
            <div className="flex items-start gap-4 rounded-xl bg-surface-container p-5 shadow-sm">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                <Icon name="info" className="text-[18px]" />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.categories.bannerTitle')}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.categories.bannerBody')}
                </p>
              </div>
              <Button variant="ghost" className="self-center whitespace-nowrap">
                {t('pages.categories.viewSeoDocs')}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Modal: Crear / Editar Categoría */}
      <AppModal
        opened={opened}
        onClose={close}
        title={
          editing
            ? t('pages.categories.modalEditTitle').replace(
                '{{name}}',
                editingCategory?.name ?? t('pages.categories.modalCategoryFallback'),
              )
            : t('pages.categories.newCategory')
        }
        subtitle={t('pages.categories.modalSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="check"
              onClick={() => form.onSubmit(handleSubmit)()}
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? t('common.saving') : t('pages.categories.saveCategory')}
            </Button>
          </>
        }
      >
        <form onSubmit={form.onSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field label={t('pages.categories.fieldName')} required>
            <Input
              placeholder={t('pages.categories.fieldNamePlaceholder')}
              {...form.getInputProps('name')}
              onChange={handleNameChange}
            />
            {form.errors.name && <span className="font-label-sm text-label-sm text-error">{form.errors.name}</span>}
          </Field>

          <Field
            label={t('pages.categories.fieldSlug')}
            required
            tooltip={t('pages.categories.tooltipSlug')}
          >
            <div className="flex items-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 transition-colors focus-within:border-primary">
              <span className="select-none font-body-sm text-body-sm text-on-surface-variant/70">
                nova.co/coleccion/
              </span>
              <input
                value={form.values.slug}
                onChange={(event) => {
                  slugTouchedRef.current = true;
                  form.setFieldValue('slug', event.currentTarget.value);
                }}
                placeholder={t('pages.categories.fieldSlugPlaceholder')}
                className="w-full bg-transparent font-mono text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
              />
            </div>
            {form.errors.slug && <span className="font-label-sm text-label-sm text-error">{form.errors.slug}</span>}
          </Field>

          <Field label={t('pages.categories.fieldDescription')}>
            <Textarea
              rows={2}
              placeholder={t('pages.categories.fieldDescriptionPlaceholder')}
              {...form.getInputProps('description')}
            />
          </Field>

          <div className="mt-1 flex items-center justify-between rounded-lg bg-surface-container-low p-3">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-medium text-on-surface">
                {t('pages.categories.publishImmediately')}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.categories.publishHint')}
              </span>
            </div>
            <Switch
              checked={form.values.isActive}
              onChange={(checked) => form.setFieldValue('isActive', checked)}
              label={t('pages.categories.publishImmediately')}
            />
          </div>

          <Field label={t('pages.categories.fieldParent')} hint={t('pages.categories.fieldParentHint')}>
            <Select {...form.getInputProps('parentId')}>
              <option value="">{t('pages.categories.parentNone')}</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </AppModal>

      {/* Modal: Reordenar árbol */}
      <AppModal
        opened={reorderOpened}
        onClose={closeReorder}
        title={t('pages.categories.reorderTree')}
        subtitle={t('pages.categories.reorderSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeReorder}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="save"
              onClick={() => reorder.mutate(reorderItems)}
              disabled={reorderItems.length === 0 || reorder.isPending}
            >
              {reorder.isPending ? t('common.saving') : t('pages.categories.save')}
            </Button>
          </>
        }
      >
        <motion.div layout transition={LAYOUT_SPRING} className="flex flex-col gap-2">
          {reorderItems.map((category, index) => (
            <motion.div
              layout
              transition={LAYOUT_SPRING}
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="font-numeric-tabular text-label-sm text-on-surface-variant">{index + 1}</span>
                <span className="truncate font-body-sm text-body-sm text-on-surface">{category.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title={t('pages.categories.moveUp').replace('{{name}}', () => category.name)}
                  disabled={index === 0}
                  onClick={() => moveReorderItem(index, -1)}
                  className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="keyboard_arrow_up" className="text-[18px]" />
                </button>
                <button
                  type="button"
                  title={t('pages.categories.moveDown').replace('{{name}}', () => category.name)}
                  disabled={index === reorderItems.length - 1}
                  onClick={() => moveReorderItem(index, 1)}
                  className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Icon name="keyboard_arrow_down" className="text-[18px]" />
                </button>
              </div>
            </motion.div>
          ))}

          {reorderItems.length === 0 && (
            <p className="py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.categories.reorderEmpty')}
            </p>
          )}
        </motion.div>
      </AppModal>
    </>
  );
}
