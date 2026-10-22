'use client';

import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Textarea } from '../../components/ui/input';
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

interface PageFormValues {
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isVisible: boolean;
  sortOrder: number;
}

type PageTab = 'all' | 'published' | 'draft';

const PAGE_SIZE = 10;

const PAGE_TABS: Array<{ id: PageTab; labelKey: string }> = [
  { id: 'all', labelKey: 'pages.staticPages.tabAll' },
  { id: 'published', labelKey: 'pages.staticPages.tabPublished' },
  { id: 'draft', labelKey: 'pages.staticPages.tabDraft' },
];

const PAGE_ICON_RULES: Array<[string, string]> = [
  ['termino', 'gavel'],
  ['condicion', 'gavel'],
  ['pregunta', 'help_center'],
  ['faq', 'help_center'],
  ['envio', 'local_shipping'],
  ['devolucion', 'local_shipping'],
  ['nosotros', 'storefront'],
  ['sobre', 'storefront'],
  ['privacidad', 'shield'],
  ['politica', 'shield'],
  ['cookie', 'cookie'],
  ['contacto', 'support_agent'],
  ['blog', 'article'],
  ['guia', 'menu_book'],
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function pageIcon(slug: string) {
  const normalized = normalizeText(slug);
  const match = PAGE_ICON_RULES.find(([keyword]) => normalized.includes(keyword));
  return match?.[1] ?? 'description';
}

function excerpt(content: string, fallback: string) {
  const text = content.replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Documento para el iframe de vista previa: replica el layout del storefront
 * (título Bebas Neue + contenido) y se sirve con sandbox para bloquear scripts
 * embebidos en el HTML de la página.
 */
function buildPreviewDoc(title: string, content: string) {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #fcf9f8; color: #0d0d0d; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 48px 24px 64px; min-height: 60vh; }
  h1 { font-family: 'Bebas Neue', Impact, sans-serif; font-weight: 400; font-size: 44px; letter-spacing: 0.02em; margin: 0 0 28px; }
  .nova-content { line-height: 1.7; font-size: 15px; }
  .nova-content h2 { font-family: 'Bebas Neue', Impact, sans-serif; font-weight: 400; font-size: 26px; letter-spacing: 0.02em; margin: 28px 0 10px; }
  .nova-content h3 { font-size: 18px; font-weight: 600; margin: 22px 0 8px; }
  .nova-content p { margin: 0 0 14px; }
  .nova-content ul, .nova-content ol { margin: 0 0 14px; padding-left: 22px; }
  .nova-content li { margin-bottom: 6px; }
  .nova-content a { color: #6f7a4e; text-decoration: underline; }
  .nova-content strong { font-weight: 600; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${safeTitle}</h1>
    <div class="nova-content">${content}</div>
  </div>
</body>
</html>`;
}

function formatRelativeTime(value: string, t: (key: string) => string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return t('pages.staticPages.relativeJustNow');
  if (diffMinutes < 60) {
    const key =
      diffMinutes === 1 ? 'pages.staticPages.relativeMinutesSingular' : 'pages.staticPages.relativeMinutesPlural';
    return t(key).replace('{{count}}', String(diffMinutes));
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const key = diffHours === 1 ? 'pages.staticPages.relativeHoursSingular' : 'pages.staticPages.relativeHoursPlural';
    return t(key).replace('{{count}}', String(diffHours));
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    const key = diffDays === 1 ? 'pages.staticPages.relativeDaysSingular' : 'pages.staticPages.relativeDaysPlural';
    return t(key).replace('{{count}}', String(diffDays));
  }
  return formatDate(value);
}

function getStoreUrl() {
  const raw = process.env.NEXT_PUBLIC_WEB_URL;
  if (!raw) return 'http://localhost:3000';
  const cleaned = raw.replace(/^\[|\]$/g, '').split(',')[0].trim();
  return cleaned || 'http://localhost:3000';
}

export default function PagesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<PageTab>('all');
  const [previewTarget, setPreviewTarget] = useState<{
    title: string;
    content: string;
    slug: string;
    isVisible: boolean;
  } | null>(null);

  const form = useForm<PageFormValues>({
    initialValues: {
      slug: '',
      title: '',
      content: '',
      metaTitle: '',
      metaDescription: '',
      isVisible: true,
      sortOrder: 0,
    },
  });

  const draftKey = editing ? `page-draft-${editing}` : 'page-draft-new';

  useEffect(() => {
    setHasDraft(Boolean(localStorage.getItem(draftKey)));
  }, [draftKey, opened]);

  const [debouncedValues] = useDebouncedValue(form.values, 1000);

  useEffect(() => {
    if (opened) {
      localStorage.setItem(draftKey, JSON.stringify(debouncedValues));
    }
  }, [debouncedValues, draftKey, opened]);

  const restoreDraft = () => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      form.setValues(JSON.parse(saved) as PageFormValues);
      notifySuccess({ title: t('pages.staticPages.toastDraftRestored') });
    }
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  };

  const { data: pagesResponse, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/pages');
      if (error) throw error;
      return data;
    },
  });

  const pages = pagesResponse?.data ?? [];

  const totalCount = pages.length;
  const visibleCount = pages.filter((pageItem) => pageItem.isVisible).length;
  const draftCount = totalCount - visibleCount;
  const visibilityPercentage = totalCount > 0 ? Math.round((visibleCount / totalCount) * 100) : 0;

  const latestPage =
    pages.length > 0
      ? pages.reduce((latest, pageItem) =>
          new Date(pageItem.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? pageItem : latest,
        )
      : null;

  const previewPage = pages.find((pageItem) => pageItem.isVisible) ?? pages[0];
  const webUrl = getStoreUrl();
  const previewUrl = previewPage ? `${webUrl}/pagina/${previewPage.slug}` : null;

  const term = search.trim().toLowerCase();
  const filteredPages = pages.filter((pageItem) => {
    if (tab === 'published' && !pageItem.isVisible) return false;
    if (tab === 'draft' && pageItem.isVisible) return false;
    if (term && !pageItem.title.toLowerCase().includes(term) && !pageItem.slug.toLowerCase().includes(term)) {
      return false;
    }
    return true;
  });

  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: filteredPages,
    pageSize: PAGE_SIZE,
  });

  const firstShown = filteredPages.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, filteredPages.length);
  const paginationSummary = t('pages.staticPages.paginationSummary')
    .replace('{{start}}', String(firstShown))
    .replace('{{end}}', String(lastShown))
    .replace('{{total}}', String(filteredPages.length));

  const create = useMutation({
    mutationFn: async (values: PageFormValues) => {
      const { error } = await apiClient.POST('/admin/pages', {
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      localStorage.removeItem('page-draft-new');
      setHasDraft(false);
      notifySuccess({ title: t('pages.staticPages.toastCreated') });
      close();
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.staticPages.toastCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PageFormValues }) => {
      const { error } = await apiClient.PATCH('/admin/pages/{id}', {
        params: { path: { id } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      if (editing) {
        localStorage.removeItem(`page-draft-${editing}`);
      }
      setHasDraft(false);
      notifySuccess({ title: t('pages.staticPages.toastUpdated') });
      close();
      setEditing(null);
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.staticPages.toastUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const { error } = await apiClient.PATCH('/admin/pages/{id}', {
        params: { path: { id } },
        body: { isVisible } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      notifySuccess({ title: t('pages.staticPages.toastVisibilityUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.staticPages.toastVisibilityError'), message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/pages/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      notifySuccess({ title: t('pages.staticPages.toastDeleted') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.staticPages.toastDeleteError'), message: getApiErrorMessage(error) });
    },
  });

  const startEdit = (pageItem: (typeof pages)[number]) => {
    setEditing(pageItem.id);
    form.setValues({
      slug: pageItem.slug,
      title: pageItem.title,
      content: pageItem.content,
      metaTitle: pageItem.metaTitle ?? '',
      metaDescription: pageItem.metaDescription ?? '',
      isVisible: pageItem.isVisible,
      sortOrder: pageItem.sortOrder,
    });
    open();
  };

  const startCreate = () => {
    setEditing(null);
    form.reset();
    open();
  };

  const openPreview = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: t('pages.staticPages.breadcrumbStorefront') },
            { label: t('pages.staticPages.breadcrumbStaticPages') },
          ]}
          title={t('pages.staticPages.title')}
          subtitle={t('pages.staticPages.subtitle')}
          actions={
            <>
              <Button
                variant="secondary"
                icon="visibility"
                onClick={openPreview}
                disabled={!previewUrl}
                title={
                  previewUrl
                    ? t('pages.staticPages.previewTooltip')
                    : t('pages.staticPages.previewDisabledTooltip')
                }
              >
                {t('pages.staticPages.previewButton')}
              </Button>
              <Button icon="add" onClick={startCreate}>
                {t('pages.staticPages.newPage')}
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/80">
                {t('pages.staticPages.kpiActive')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="description" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                <AnimatedNumber value={visibleCount} />
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.staticPages.kpiActiveOf').replace('{{count}}', String(totalCount))}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-label-sm text-label-sm text-emerald-700">
                {t('pages.staticPages.kpiVisibility').replace(
                  '{{percent}}',
                  String(visibilityPercentage),
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/80">
                {t('pages.staticPages.kpiSeo')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="travel_explore" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface">100%</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.staticPages.kpiSeoHint')}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <Icon name="sync" className="text-[15px] text-on-surface-variant" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.staticPages.kpiSeoUpdated')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/80">
                {t('pages.staticPages.kpiUpdated')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="schedule" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                {latestPage ? formatRelativeTime(latestPage.updatedAt, t) : '—'}
              </span>
            </div>
            <div className="mt-2 truncate font-label-sm text-label-sm text-on-surface-variant">
              {latestPage ? latestPage.title : t('pages.staticPages.kpiNoPages')}
            </div>
          </div>

          <div
            className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm"
            title={t('common.comingSoon')}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant/80">
                {t('pages.staticPages.kpiMostVisited')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="trending_up" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-numeric-tabular text-numeric-tabular font-bold text-on-surface">—</span>
            </div>
            <div className="mt-2 truncate font-label-sm text-label-sm text-on-surface-variant">
              {t('common.comingSoon')}
            </div>
          </div>
        </div>

        {/* Tabla de páginas */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          {/* Buscador, tabs y filtros */}
          <div className="flex flex-col justify-between gap-4 border-b border-outline-variant/30 p-4 sm:p-5 md:flex-row md:items-center">
            <Input
              icon="search"
              variant="filled"
              placeholder={t('pages.staticPages.searchPlaceholder')}
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
              className="w-full md:w-96"
              inputClassName="bg-surface-container-low/70 focus:bg-surface-container-lowest"
            />
            <div className="flex items-center gap-2 self-start md:self-auto">
              <SegmentedTabs
                value={tab}
                options={PAGE_TABS.map((item) => {
                  const count =
                    item.id === 'all' ? totalCount : item.id === 'published' ? visibleCount : draftCount;
                  return { value: item.id, label: `${t(item.labelKey)} (${count})` };
                })}
                onChange={(value) => {
                  setTab(value);
                  setPage(1);
                }}
                layoutId="pages-tabs"
              />
              <button
                type="button"
                disabled
                title={t('common.comingSoon')}
                className="rounded-lg bg-surface-container-low p-2 text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="tune" className="text-[18px]" />
              </button>
            </div>
          </div>

          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[840px] text-left">
                  <thead>
                    <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                      <th className="rounded-l-lg px-3 py-3">{t('pages.staticPages.columnTitle')}</th>
                      <th className="px-3 py-3">{t('pages.staticPages.columnSlug')}</th>
                      <th className="px-3 py-3 text-center">{t('pages.staticPages.columnVisible')}</th>
                      <th className="px-3 py-3 text-center">{t('pages.staticPages.columnOrder')}</th>
                      <th className="px-3 py-3">{t('pages.staticPages.columnModified')}</th>
                      <th className="rounded-r-lg px-3 py-3 text-right">
                        {t('pages.staticPages.columnActions')}
                      </th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={tableRowsContainer}
                    initial="hidden"
                    animate="visible"
                    className="font-body-sm text-body-sm text-on-surface"
                  >
                    {paginatedData.map((pageItem) => (
                      <motion.tr
                        variants={fadeInUp}
                        key={pageItem.id}
                        className="group border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                      >
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors group-hover:bg-primary group-hover:text-on-primary">
                              <Icon name={pageIcon(pageItem.slug)} className="text-[20px]" />
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-headline-sm text-headline-sm font-semibold text-on-surface">
                                {pageItem.title}
                              </span>
                              <span className="max-w-xs truncate font-body-sm text-body-sm text-on-surface-variant">
                                {excerpt(pageItem.content, t('pages.staticPages.noExcerpt'))}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded bg-surface-container-low px-2.5 py-1 font-mono text-[12px] text-on-surface">
                            <span className="text-on-surface-variant/60">/</span>
                            {pageItem.slug}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <Switch
                            checked={pageItem.isVisible}
                            onChange={(checked) =>
                              toggleVisibility.mutate({ id: pageItem.id, isVisible: checked })
                            }
                            disabled={toggleVisibility.isPending && toggleVisibility.variables?.id === pageItem.id}
                            label={(pageItem.isVisible
                              ? t('pages.staticPages.actionHide')
                              : t('pages.staticPages.actionPublish')
                            ).replace('{{title}}', pageItem.title)}
                          />
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className="inline-block rounded-full bg-surface-container px-2.5 py-0.5 font-numeric-tabular text-numeric-tabular text-on-surface">
                            {pageItem.sortOrder}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 font-numeric-tabular text-numeric-tabular text-on-surface-variant">
                          {formatDate(pageItem.updatedAt)}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              title={t('pages.staticPages.previewRowTooltip')}
                              aria-label={t('pages.staticPages.previewRowTooltip')}
                              onClick={() =>
                                setPreviewTarget({
                                  title: pageItem.title,
                                  content: pageItem.content,
                                  slug: pageItem.slug,
                                  isVisible: pageItem.isVisible,
                                })
                              }
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                            >
                              <Icon name="visibility" className="text-[18px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(pageItem)}
                              className="rounded-lg bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => remove.mutate(pageItem.id)}
                              disabled={remove.isPending && remove.variables === pageItem.id}
                              className="rounded-lg bg-error-container/40 px-3 py-1.5 font-label-sm text-label-sm text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>

              {paginatedData.length === 0 && (
                <EmptyState
                  icon="description"
                  title={totalCount === 0 ? t('pages.staticPages.emptyTitle') : t('pages.staticPages.emptyResults')}
                  description={
                    totalCount === 0
                      ? t('pages.staticPages.emptyNoPagesDescription')
                      : t('pages.staticPages.emptyResultsDescription')
                  }
                />
              )}

              {filteredPages.length > 0 && (
                <div className="border-t border-outline-variant/30 px-6 pb-4">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={setPage}
                    summary={paginationSummary}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Banner SEO */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-surface-container-low/70 p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-primary">
              <Icon name="auto_fix_high" className="text-[22px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                {t('pages.staticPages.bannerTitle')}
              </span>
              <p className="mt-1 max-w-3xl font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.staticPages.bannerBody')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href={`${webUrl}/sitemap.xml`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-surface-container-lowest px-3.5 py-2 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-high"
            >
              <Icon name="code" className="text-[18px]" />
              <span>{t('pages.staticPages.viewSitemap')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Modal Nueva / Editar Página */}
      <AppModal
        opened={opened}
        onClose={close}
        title={editing ? t('pages.staticPages.modalEditTitle') : t('pages.staticPages.modalNewTitle')}
        subtitle={
          editing ? t('pages.staticPages.modalEditSubtitle') : t('pages.staticPages.modalNewSubtitle')
        }
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              icon="visibility"
              className="mr-auto"
              onClick={() =>
                setPreviewTarget({
                  title: form.values.title || t('pages.staticPages.modalNewTitle'),
                  content: form.values.content,
                  slug: form.values.slug,
                  isVisible: form.values.isVisible,
                })
              }
            >
              {t('pages.staticPages.previewInEditor')}
            </Button>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="page-form" icon="save" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? t('common.saving') : t('pages.staticPages.savePage')}
            </Button>
          </>
        }
      >
        <form
          id="page-form"
          className="flex flex-col gap-4"
          onSubmit={form.onSubmit((values) =>
            editing ? update.mutate({ id: editing, values }) : create.mutate(values),
          )}
        >
          <Field label={t('pages.staticPages.fieldSlug')} required hint={t('pages.staticPages.fieldSlugHint')}>
            <Input placeholder="faq" {...form.getInputProps('slug')} inputClassName="font-mono" />
          </Field>

          <Field label={t('pages.staticPages.fieldTitle')} required>
            <Input
              placeholder={t('pages.staticPages.fieldTitlePlaceholder')}
              {...form.getInputProps('title')}
            />
          </Field>

          <Field label={t('pages.staticPages.fieldContent')} required>
            <Textarea
              rows={8}
              placeholder={t('pages.staticPages.fieldContentPlaceholder')}
              {...form.getInputProps('content')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('pages.staticPages.fieldMetaTitle')}>
              <Input
                placeholder={t('pages.staticPages.fieldMetaTitlePlaceholder')}
                {...form.getInputProps('metaTitle')}
              />
            </Field>
            <Field label={t('pages.staticPages.fieldOrder')}>
              <Input
                type="number"
                min={0}
                value={form.values.sortOrder}
                onChange={(event) => form.setFieldValue('sortOrder', Number(event.currentTarget.value) || 0)}
                inputClassName="font-numeric-tabular"
              />
            </Field>
          </div>

          <Field label={t('pages.staticPages.fieldMetaDescription')}>
            <Input
              placeholder={t('pages.staticPages.fieldMetaDescriptionPlaceholder')}
              {...form.getInputProps('metaDescription')}
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">
                {t('pages.staticPages.visibleLabel')}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.staticPages.visibleHint')}
              </span>
            </div>
            <Switch
              checked={form.values.isVisible}
              onChange={(checked) => form.setFieldValue('isVisible', checked)}
              label={t('pages.staticPages.visibleLabel')}
            />
          </div>

          {hasDraft && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
              <div className="flex items-center gap-2">
                <Icon name="history" className="text-[18px] text-on-surface-variant" />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.staticPages.draftSaved')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={restoreDraft}>
                  {t('pages.staticPages.restoreDraft')}
                </Button>
                <Button variant="danger" onClick={discardDraft}>
                  {t('pages.staticPages.discardDraft')}
                </Button>
              </div>
            </div>
          )}
        </form>
      </AppModal>

      {/* Modal Vista Previa */}
      <AppModal
        opened={Boolean(previewTarget)}
        onClose={() => setPreviewTarget(null)}
        title={t('pages.staticPages.previewModalTitle')}
        subtitle={previewTarget ? `/${previewTarget.slug}` : undefined}
        size="xl"
        footer={
          <>
            {previewTarget && !previewTarget.isVisible && (
              <span className="mr-auto flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                <Icon name="visibility_off" className="text-[16px]" />
                {t('pages.staticPages.previewHiddenNotice')}
              </span>
            )}
            {previewTarget?.isVisible && (
              <Button
                variant="secondary"
                icon="open_in_new"
                iconClassName="text-[16px]"
                className="mr-auto"
                onClick={() =>
                  window.open(`${webUrl}/pagina/${previewTarget.slug}`, '_blank', 'noopener,noreferrer')
                }
              >
                {t('pages.staticPages.previewOpenStore')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setPreviewTarget(null)}>
              {t('common.close')}
            </Button>
          </>
        }
      >
        {previewTarget && (
          <iframe
            title={t('pages.staticPages.previewIframeTitle')}
            srcDoc={buildPreviewDoc(previewTarget.title, previewTarget.content)}
            sandbox=""
            className="h-[62vh] w-full rounded-xl border border-outline-variant/30 bg-[#fcf9f8]"
          />
        )}
      </AppModal>
    </>
  );
}
