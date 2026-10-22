'use client';

import type { components } from '@ecommerce/api-client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Input, Select } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { StatusPill } from '../../components/ui/status-pill';
import { TableSkeletonRows } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type Review = components['schemas']['ReviewResponseDto'];
type TabId = 'all' | 'pending' | 'approved';
type RatingFilter = 'all' | '5' | '4' | 'lte3';
type MediaFilter = 'all' | 'with' | 'text';

const PAGE_SIZE = 20;

const TABS: Array<{ id: TabId; labelKey: string }> = [
  { id: 'all', labelKey: 'pages.reviews.tabAll' },
  { id: 'pending', labelKey: 'pages.reviews.tabPending' },
  { id: 'approved', labelKey: 'pages.reviews.tabApproved' },
];

const AVATAR_STYLES = [
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-surface-container text-on-surface',
  'bg-secondary-container text-on-secondary-container',
];

function fullName(user: { firstName: string; lastName: string }, fallback: string) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || fallback;
}

function initials(user: { firstName: string; lastName: string }) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || '?';
}

function formatRelativeTime(value: string, t: (key: string) => string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return t('pages.reviews.relativeJustNow');
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return (minutes === 1 ? t('pages.reviews.relativeMinutesSingular') : t('pages.reviews.relativeMinutesPlural')).replace(
      '{{count}}',
      String(minutes),
    );
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return (hours === 1 ? t('pages.reviews.relativeHoursSingular') : t('pages.reviews.relativeHoursPlural')).replace(
      '{{count}}',
      String(hours),
    );
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return t('pages.reviews.yesterdayAt').replace(
      '{{time}}',
      date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
    );
  }
  if (days < 30) return t('pages.reviews.relativeDaysPlural').replace('{{count}}', String(days));
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ReviewsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === search) return;
      setSearch(next);
      setPage(1);
      setSelectedIds([]);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput, search]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-reviews', page, activeTab, search],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/reviews', {
        params: {
          query: {
            page: String(page),
            limit: String(PAGE_SIZE),
            ...(activeTab !== 'all' ? { isApproved: activeTab === 'approved' ? 'true' : 'false' } : {}),
            ...(search ? { search } : {}),
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-reviews', 'counts', search],
    queryFn: async () => {
      const baseQuery = { page: '1', limit: '20', ...(search ? { search } : {}) };
      const [allResponse, pendingResponse, approvedResponse] = await Promise.all([
        apiClient.GET('/admin/reviews', { params: { query: baseQuery } }),
        apiClient.GET('/admin/reviews', { params: { query: { ...baseQuery, limit: '1', isApproved: 'false' } } }),
        apiClient.GET('/admin/reviews', { params: { query: { ...baseQuery, limit: '1', isApproved: 'true' } } }),
      ]);
      const { data: allData, error: allError } = allResponse;
      const { data: pendingData, error: pendingError } = pendingResponse;
      const { data: approvedData, error: approvedError } = approvedResponse;
      if (allError) throw allError;
      if (pendingError) throw pendingError;
      if (approvedError) throw approvedError;
      const sample = allData?.data ?? [];
      return {
        all: allData?.meta.total ?? 0,
        pending: pendingData?.meta.total ?? 0,
        approved: approvedData?.meta.total ?? 0,
        average: sample.length > 0 ? sample.reduce((sum, review) => sum + review.rating, 0) / sample.length : 0,
      };
    },
  });

  const counts = stats ?? { all: 0, pending: 0, approved: 0, average: 0 };

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/reviews/{id}/approve', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      notifySuccess({ title: t('pages.reviews.toastApproved') });
    },
    onError: (error) => notifyError({ title: t('pages.reviews.toastError'), message: getApiErrorMessage(error) }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/reviews/{id}/reject', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      notifySuccess({ title: t('pages.reviews.toastRejected') });
    },
    onError: (error) => notifyError({ title: t('pages.reviews.toastError'), message: getApiErrorMessage(error) }),
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await apiClient.PATCH('/admin/reviews/bulk/approve', {
        body: { ids },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedIds([]);
      notifySuccess({ title: t('pages.reviews.toastBulkApproved') });
    },
    onError: (error) => notifyError({ title: t('pages.reviews.toastError'), message: getApiErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/reviews/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      notifySuccess({ title: t('pages.reviews.toastDeleted') });
    },
    onError: (error) => notifyError({ title: t('pages.reviews.toastError'), message: getApiErrorMessage(error) }),
  });

  const reviews: Review[] = data?.data ?? [];
  const filteredReviews = reviews.filter((review) => {
    if (ratingFilter === '5' && review.rating !== 5) return false;
    if (ratingFilter === '4' && review.rating !== 4) return false;
    if (ratingFilter === 'lte3' && review.rating > 3) return false;
    const photos = review.assets?.length ?? 0;
    if (mediaFilter === 'with' && photos === 0) return false;
    if (mediaFilter === 'text' && photos > 0) return false;
    return true;
  });

  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const tabNoun =
    activeTab === 'pending'
      ? t('pages.reviews.nounPending')
      : activeTab === 'approved'
        ? t('pages.reviews.nounApproved')
        : t('pages.reviews.nounAll');
  const resultsLabel =
    activeTab === 'pending'
      ? t('pages.reviews.resultsPending')
      : activeTab === 'approved'
        ? t('pages.reviews.resultsApproved')
        : t('pages.reviews.resultsAll');

  const moderated = counts.pending + counts.approved;
  const satisfaction = moderated > 0 ? (counts.approved / moderated) * 100 : 0;

  const visibleIds = filteredReviews.map((review) => review.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    );
  };

  const toggleAll = () => {
    setSelectedIds((previous) =>
      allSelected ? previous.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...previous, ...visibleIds])),
    );
  };

  const changeTab = (tab: TabId) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedIds([]);
  };

  const changePage = (nextPage: number) => {
    setPage(nextPage);
    setSelectedIds([]);
  };

  const exportCsv = () => {
    const rows: string[][] = [
      [
        t('pages.reviews.csvCustomer'),
        t('pages.reviews.csvProduct'),
        t('pages.reviews.csvRating'),
        t('pages.reviews.csvComment'),
        t('pages.reviews.csvPhotos'),
        t('pages.reviews.csvStatus'),
        t('pages.reviews.csvVerifiedBuyer'),
        t('pages.reviews.csvDate'),
      ],
      ...filteredReviews.map((review) => [
        fullName(review.user, t('pages.reviews.userFallback')),
        review.product.name,
        String(review.rating),
        review.comment ?? '',
        String(review.assets?.length ?? 0),
        review.isApproved ? t('pages.reviews.statusApproved') : t('pages.reviews.statusPending'),
        review.orderId ? t('common.yes') : t('common.no'),
        new Date(review.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resenas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess({ title: t('pages.reviews.toastExported') });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: t('pages.reviews.breadcrumbCustomers') },
            { label: t('pages.reviews.breadcrumbReviews') },
          ]}
          title={t('pages.reviews.title')}
          subtitle={t('pages.reviews.subtitle')}
          actions={
            <>
              <Button variant="secondary" icon="file_download" iconClassName="text-[18px]" onClick={exportCsv}>
                {t('pages.reviews.exportCsv')}
              </Button>
              <Button
                icon="done_all"
                disabled={selectedIds.length === 0 || bulkApprove.isPending}
                onClick={() => bulkApprove.mutate(selectedIds)}
              >
                {t('pages.reviews.approveSelected')}
              </Button>
            </>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.reviews.kpiAverage')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface">
                <Icon name="star" filled className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-semibold text-on-surface">
                <AnimatedNumber value={counts.average} format={(value) => value.toFixed(1)} />
              </span>
              <span className="font-headline-md text-headline-md text-amber-500">★</span>
              <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">/ 5.0</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface">
                {t('pages.reviews.ratingsCount').replace('{{count}}', String(counts.all))}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.reviews.basedOnCurrentPage')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.reviews.kpiPendingModeration')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Icon name="pending_actions" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-headline-xl text-headline-xl font-semibold text-on-surface">
                <AnimatedNumber value={counts.pending} />
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-label-sm text-label-sm font-medium text-amber-800">
                {t('pages.reviews.needsReview')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.reviews.kpiApprovedVisible')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Icon name="verified" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-semibold text-on-surface">
                <AnimatedNumber value={counts.approved} />
              </span>
              <span className="font-numeric-tabular text-body-md font-medium text-emerald-700">
                {t('pages.reviews.satisfactionPercent').replace('{{percent}}', satisfaction.toFixed(0))}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: `${satisfaction}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.reviews.kpiRejectedSpam')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                <Icon name="block" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-semibold text-on-surface">
                <AnimatedNumber value={0} />
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.reviews.volumePercent')}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="font-body-sm text-body-sm text-rose-700">{t('pages.reviews.rejectedApiHint')}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SegmentedTabs
              value={activeTab}
              options={TABS.map((tab) => {
                const active = activeTab === tab.id;
                const tabCount = tab.id === 'pending' ? counts.pending : tab.id === 'approved' ? counts.approved : counts.all;
                return {
                  value: tab.id,
                  label: (
                    <span className="flex items-center gap-1.5">
                      {t(tab.labelKey)}
                      {tab.id === 'pending' ? (
                        <span className="rounded-full bg-amber-200/70 px-1.5 py-0.5 font-label-sm text-label-sm font-semibold text-amber-900">
                          {tabCount}
                        </span>
                      ) : (
                        <span
                          className={`ml-1 font-numeric-tabular ${active ? 'text-on-surface-variant' : 'text-on-surface-variant/80'}`}
                        >
                          {tabCount}
                        </span>
                      )}
                    </span>
                  ),
                };
              })}
              onChange={(value) => changeTab(value)}
              size="md"
              layoutId="reviews-tabs"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Select
                aria-label={t('pages.reviews.filterRatingAria')}
                value={ratingFilter}
                onChange={(event) => {
                  setRatingFilter(event.currentTarget.value as RatingFilter);
                  setPage(1);
                  setSelectedIds([]);
                }}
                className="min-w-[220px]"
                inputClassName="border-0 bg-surface-container-low py-1.5 focus:bg-surface-container"
              >
                <option value="all">{t('pages.reviews.ratingAll')}</option>
                <option value="5">{t('pages.reviews.rating5')}</option>
                <option value="4">{t('pages.reviews.rating4')}</option>
                <option value="lte3">{t('pages.reviews.ratingLte3')}</option>
              </Select>
              <Select
                aria-label={t('pages.reviews.filterMediaAria')}
                value={mediaFilter}
                onChange={(event) => {
                  setMediaFilter(event.currentTarget.value as MediaFilter);
                  setPage(1);
                  setSelectedIds([]);
                }}
                className="min-w-[210px]"
                inputClassName="border-0 bg-surface-container-low py-1.5 focus:bg-surface-container"
              >
                <option value="all">{t('pages.reviews.mediaAll')}</option>
                <option value="with">{t('pages.reviews.mediaWith')}</option>
                <option value="text">{t('pages.reviews.mediaText')}</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              icon="search"
              variant="filled"
              placeholder={t('pages.reviews.searchPlaceholder')}
              value={searchInput}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
              className="min-w-[280px] flex-1"
              inputClassName="border-0 bg-surface-container-low focus:bg-surface-container-lowest"
            />
            <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <span>
                {t('pages.reviews.resultsShowing')
                  .replace('{{count}}', String(filteredReviews.length))
                  .replace('{{label}}', resultsLabel)}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low/60 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                  <th className="w-12 px-4 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleAll}
                        label={t('pages.reviews.selectAll')}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3.5 font-semibold">{t('pages.reviews.columnUser')}</th>
                  <th className="px-4 py-3.5 font-semibold">{t('pages.reviews.columnProduct')}</th>
                  <th className="px-4 py-3.5 text-center font-semibold">{t('pages.reviews.columnPhotos')}</th>
                  <th className="px-4 py-3.5 font-semibold">{t('pages.reviews.columnRating')}</th>
                  <th className="min-w-[320px] px-4 py-3.5 font-semibold">{t('pages.reviews.columnComment')}</th>
                  <th className="px-4 py-3.5 font-semibold">{t('pages.reviews.columnStatus')}</th>
                  <th className="px-4 py-3.5 text-right font-semibold">{t('pages.reviews.columnActions')}</th>
                </tr>
              </thead>
              <motion.tbody
                variants={tableRowsContainer}
                initial="hidden"
                animate="visible"
                className="font-body-sm text-body-sm text-on-surface"
              >
                {isError ? (
                  <tr>
                    <td colSpan={8}>
                      <QueryError onRetry={() => refetch()} retrying={isFetching} />
                    </td>
                  </tr>
                ) : isLoading ? (
                  <TableSkeletonRows rows={8} columns={8} />
                ) : filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon="rate_review"
                        title={t('pages.reviews.emptyTitle')}
                        description={t('pages.reviews.emptyDescription')}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review, index) => (
                    <motion.tr
                      variants={fadeInUp}
                      key={review.id}
                      className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low/40"
                    >
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={selectedIds.includes(review.id)}
                            onChange={() => toggleSelection(review.id)}
                            label={t('pages.reviews.selectItem').replace(
                              '{{name}}',
                              fullName(review.user, t('pages.reviews.userFallback')),
                            )}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full font-label-md text-label-md font-semibold ${
                              AVATAR_STYLES[index % AVATAR_STYLES.length]
                            }`}
                          >
                            {initials(review.user)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md font-medium text-on-surface">
                              {fullName(review.user, t('pages.reviews.userFallback'))}
                            </span>
                            {review.orderId && (
                              <span className="flex items-center gap-1 font-label-sm text-label-sm text-emerald-700">
                                <Icon name="verified" className="text-[13px]" />
                                {t('pages.reviews.verifiedBuyer')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container text-on-surface-variant">
                            <Icon name="checkroom" className="text-[18px]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-md text-label-md font-medium text-on-surface">
                              {review.product.name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-center">
                        {review.assets.length > 0 ? (
                          <div className="relative inline-block">
                            <a
                              href={review.assets[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t('pages.reviews.viewPhotoTooltip')}
                              className="mx-auto block h-8 w-8 overflow-hidden rounded-md bg-surface-container shadow-sm"
                            >
                              <img
                                src={review.assets[0].thumbnailUrl}
                                alt={t('pages.reviews.photoAlt')}
                                className="h-full w-full object-cover"
                              />
                            </a>
                            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary font-numeric-tabular text-[9px] text-on-primary">
                              {review.assets.length}
                            </span>
                          </div>
                        ) : (
                          <span className="font-numeric-tabular text-on-surface-variant/40">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center text-[14px] text-amber-500">
                            {Array.from({ length: 5 }, (_, starIndex) => (
                              <Icon
                                key={starIndex}
                                name="star"
                                filled
                                className={`text-[16px] ${
                                  starIndex < review.rating ? 'text-amber-500' : 'text-surface-container-highest'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-numeric-tabular text-label-sm text-on-surface-variant">
                            {t('pages.reviews.ratingOutOf').replace('{{rating}}', review.rating.toFixed(1))}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="leading-relaxed text-on-surface">
                          {review.comment?.trim() || t('pages.reviews.noComment')}
                        </p>
                        <span className="mt-1 inline-block font-label-sm text-label-sm text-on-surface-variant/70">
                          {formatRelativeTime(review.createdAt, t)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {review.isApproved ? (
                          <StatusPill label={t('pages.reviews.statusApproved')} tone="success" />
                        ) : (
                          <StatusPill label={t('pages.reviews.statusPending')} tone="warning" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!review.isApproved ? (
                            <>
                              <button
                                type="button"
                                onClick={() => approve.mutate(review.id)}
                                title={t('pages.reviews.approveTooltip')}
                                className="rounded-lg bg-primary px-3 py-1.5 font-label-sm text-label-sm font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-container"
                              >
                                {t('pages.reviews.approve')}
                              </button>
                              <button
                                type="button"
                                onClick={() => reject.mutate(review.id)}
                                title={t('pages.reviews.rejectTooltip')}
                                className="rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                              >
                                {t('pages.reviews.reject')}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => reject.mutate(review.id)}
                              title={t('pages.reviews.hideTooltip')}
                              className="rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                            >
                              {t('pages.reviews.hide')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => remove.mutate(review.id)}
                            title={t('pages.reviews.deleteTooltip')}
                            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-error-container/20 hover:text-error"
                          >
                            <Icon name="delete" className="text-[18px]" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            </table>
          </div>

          <div className="bg-surface-container-low/30 px-6 py-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={changePage}
              summary={t('pages.reviews.paginationSummary')
                .replace('{{start}}', String(start))
                .replace('{{end}}', String(end))
                .replace('{{total}}', String(total))
                .replace('{{noun}}', tabNoun)
                .replace('{{all}}', String(counts.all))}
            />
          </div>
        </div>

        {/* Policy */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-on-secondary-fixed">
              <Icon name="policy" className="text-[20px]" />
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.reviews.policyTitle')}</h2>
              <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.reviews.policyBody')}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <button
              type="button"
              disabled
              title={t('common.comingSoon')}
              className="cursor-not-allowed rounded-lg bg-surface-container-low px-3.5 py-2 font-label-md text-label-md text-on-surface opacity-60"
            >
              {t('pages.reviews.moderationSettings')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
