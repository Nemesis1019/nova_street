'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ReactNode, useEffect, useMemo, useState } from 'react';

import { LoginForm } from '../../components/login-form';
import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { Pagination } from '../../components/ui/pagination';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { StatusPill } from '../../components/ui/status-pill';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getAccessToken } from '../../lib/auth';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type DesignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
type TabStatus = 'ALL' | DesignStatus;

/**
 * Tipos locales del admin: la respuesta real de `/custom-designs/admin/all` incluye
 * `designTemplate` y `user` (relations del include de Prisma) aunque el OpenAPI
 * generado todavía no los declare.
 */
interface AdminDesignTemplate {
  id: string;
  name: string;
  garmentType?: string | null;
  basePrice?: number;
}

interface AdminDesignUser {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface AdminDesignElement {
  id: string;
  type: string;
  assetUrl?: string | null;
  textContent?: string | null;
}

interface AdminDesign {
  id: string;
  userId: string;
  designTemplateId: string;
  status: DesignStatus;
  color?: string | null;
  size?: string | null;
  previewImageUrl?: string | null;
  finalPrintFileUrl?: string | null;
  surcharge: number;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  elements: AdminDesignElement[];
  designTemplate?: AdminDesignTemplate | null;
  user?: AdminDesignUser | null;
}

interface AdminDesignList {
  data: AdminDesign[];
  meta: { page: number; limit: number; total: number };
}

const PAGE_SIZE = 10;

const STATUS_META = {
  DRAFT: { labelKey: 'pages.customDesigns.statusDraft', tone: 'neutral', pulse: false },
  PENDING_REVIEW: { labelKey: 'pages.customDesigns.statusPending', tone: 'warning', pulse: true },
  APPROVED: { labelKey: 'pages.customDesigns.statusApproved', tone: 'success', pulse: false },
  REJECTED: { labelKey: 'pages.customDesigns.statusRejected', tone: 'danger', pulse: false },
} as const;

const PRODUCTION_REQUIREMENTS = [
  {
    labelKey: 'pages.customDesigns.requirementResolutionLabel',
    valueKey: 'pages.customDesigns.requirementResolutionValue',
    hintKey: 'pages.customDesigns.requirementResolutionHint',
  },
  {
    labelKey: 'pages.customDesigns.requirementColorLabel',
    valueKey: 'pages.customDesigns.requirementColorValue',
    hintKey: 'pages.customDesigns.requirementColorHint',
  },
  {
    labelKey: 'pages.customDesigns.requirementSlaLabel',
    valueKey: 'pages.customDesigns.requirementSlaValue',
    hintKey: 'pages.customDesigns.requirementSlaHint',
  },
];

const REJECTION_TEMPLATE_KEYS = [
  'pages.customDesigns.rejectionTemplateVector',
  'pages.customDesigns.rejectionTemplateBackground',
  'pages.customDesigns.rejectionTemplateLowRes',
];

async function fetchAdminDesigns(params: {
  page?: number;
  limit: number;
  status?: DesignStatus;
}): Promise<AdminDesignList> {
  const { data, error } = await apiClient.GET('/custom-designs/admin/all', {
    params: {
      query: {
        page: params.page ? String(params.page) : undefined,
        limit: String(params.limit),
        status: params.status,
      },
    },
  });
  if (error) throw error;
  return (
    (data as unknown as AdminDesignList | undefined) ?? {
      data: [],
      meta: { page: 1, limit: params.limit, total: 0 },
    }
  );
}

function orderCode(id: string) {
  return `#${id.slice(0, 6)}`;
}

function userLabel(design: AdminDesign, fallback: string) {
  const name = [design.user?.firstName, design.user?.lastName].filter(Boolean).join(' ').trim();
  return name || design.user?.email || fallback;
}

function formatSurcharge(value: number) {
  return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatSurchargeCompact(value: number) {
  return `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function formatZeroPad(value: number) {
  return String(Math.round(value)).padStart(2, '0');
}

function formatDateTime(value: string, suffix: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: '—', time: '—' };
  }
  return {
    day: date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: `${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} ${suffix}`,
  };
}

function getFileName(url?: string | null) {
  if (!url) return null;
  const clean = url.split('?')[0].split('#')[0];
  const name = clean.split('/').filter(Boolean).pop();
  if (!name) return null;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/**
 * La API no expone la técnica de estampa (DTG/Bordado/etc.). Como aproximación
 * visual se resume la composición del arte a partir de `elements[].type`.
 */
function getArtBadgeLabel(elements: AdminDesignElement[]) {
  const types = new Set(elements.map((element) => element.type));
  if (types.has('UPLOADED_IMAGE')) return 'IMG';
  if (types.has('CLIPART')) return 'VEC';
  if (types.has('TEXT')) return 'TXT';
  return null;
}

function DesignStatusPill({ status }: { status: DesignStatus }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status];
  return <StatusPill label={t(meta.labelKey)} tone={meta.tone} pulse={meta.pulse} />;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-surface-container-low px-3 py-2">
      <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">{label}</span>
      <span className="font-body-sm text-body-sm text-on-surface">{children}</span>
    </div>
  );
}

export default function CustomDesignsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TabStatus>('ALL');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [garmentFilter, setGarmentFilter] = useState('');

  const [previewDesign, setPreviewDesign] = useState<AdminDesign | null>(null);
  const [previewOpened, setPreviewOpened] = useState(false);

  const [bulkOpened, setBulkOpened] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);

  const [rejectOpened, setRejectOpened] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminDesign | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Tabla paginada en servidor por estado (la API no expone búsqueda ni prenda).
  const listQuery = useQuery({
    queryKey: ['admin-custom-designs', 'list', statusFilter, page],
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchAdminDesigns({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  // Conteos exactos por estado para tabs y KPIs (meta.total con limit=1).
  const countsQuery = useQuery({
    queryKey: ['admin-custom-designs', 'counts'],
    queryFn: async () => {
      const [all, pending, approved, rejected] = await Promise.all([
        fetchAdminDesigns({ limit: 1 }),
        fetchAdminDesigns({ limit: 1, status: 'PENDING_REVIEW' }),
        fetchAdminDesigns({ limit: 1, status: 'APPROVED' }),
        fetchAdminDesigns({ limit: 1, status: 'REJECTED' }),
      ]);
      return {
        ALL: all.meta.total,
        PENDING_REVIEW: pending.meta.total,
        APPROVED: approved.meta.total,
        REJECTED: rejected.meta.total,
        DRAFT: Math.max(0, all.meta.total - pending.meta.total - approved.meta.total - rejected.meta.total),
      };
    },
    staleTime: 30_000,
  });

  // Muestra amplia (100 más recientes) para KPIs aproximados: la API no expone
  // filtros por fecha ni agregados de recargo, así que se calculan sobre la muestra.
  const sampleQuery = useQuery({
    queryKey: ['admin-custom-designs', 'sample'],
    queryFn: () => fetchAdminDesigns({ limit: 100 }),
    staleTime: 30_000,
  });

  // Pendientes para el modal de aprobación masiva y las plantillas de rechazo.
  const pendingQuery = useQuery({
    queryKey: ['admin-custom-designs', 'pending'],
    queryFn: () => fetchAdminDesigns({ limit: 100, status: 'PENDING_REVIEW' }),
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: DesignStatus;
      reason?: string;
    }) => {
      const { error } = await apiClient.PATCH('/custom-designs/admin/{id}/status', {
        params: { path: { id } },
        body: { status, rejectionReason: reason },
      });
      if (error) throw error;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-designs'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-count-designs'] });
      const titles: Record<DesignStatus, string> = {
        DRAFT: t('pages.customDesigns.toastDraft'),
        PENDING_REVIEW: t('pages.customDesigns.toastReopened'),
        APPROVED: t('pages.customDesigns.toastApproved'),
        REJECTED: t('pages.customDesigns.toastRejected'),
      };
      notifySuccess({ title: titles[variables.status] });
      closeRejectModal();
    },
    onError: (error) => {
      notifyError({ title: t('pages.customDesigns.toastStatusError'), message: getApiErrorMessage(error) });
    },
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await apiClient.PATCH('/custom-designs/admin/bulk-status', {
        body: { ids, status: 'APPROVED' },
      });
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-designs'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-count-designs'] });
      notifySuccess({
        title: t('pages.customDesigns.toastBulkApproved'),
        message: t('pages.customDesigns.toastBulkApprovedCount').replace('{{count}}', String(count)),
      });
      setBulkSelected([]);
      setBulkOpened(false);
    },
    onError: (error) => {
      notifyError({ title: t('pages.customDesigns.toastBulkError'), message: getApiErrorMessage(error) });
    },
  });

  const designList = listQuery.data?.data ?? [];
  const pendingDesigns = pendingQuery.data?.data ?? [];
  const sample = sampleQuery.data?.data ?? [];

  const garmentOptions = useMemo(() => {
    const values = new Set<string>();
    [...sample, ...pendingDesigns, ...designList].forEach((design) => {
      const garment = design.designTemplate?.garmentType;
      if (garment) values.add(garment);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [designList, pendingDesigns, sample]);

  const filteredDesigns = useMemo(() => {
    const term = search.trim().toLowerCase();
    return designList.filter((design) => {
      if (garmentFilter && design.designTemplate?.garmentType !== garmentFilter) return false;
      if (!term) return true;
      const haystack = [
        design.id,
        orderCode(design.id),
        userLabel(design, t('pages.customDesigns.clientNoData')),
        design.user?.email,
        design.designTemplate?.name,
        getFileName(design.finalPrintFileUrl),
        getFileName(design.previewImageUrl),
        design.rejectionReason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [designList, garmentFilter, search]);

  const counts = countsQuery.data;
  const total = listQuery.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const kpis = useMemo(() => {
    const now = new Date();
    // Aproximado: "este mes" se calcula sobre la muestra de los 100 más recientes.
    const thisMonth = sample.filter((design) => {
      const created = new Date(design.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });
    const approvedThisMonth = thisMonth.filter((design) => design.status === 'APPROVED').length;
    const approvalRate = thisMonth.length ? Math.round((approvedThisMonth / thisMonth.length) * 100) : 0;
    // Aproximado: promedio de recargos > 0 dentro de la muestra (la API no expone agregados).
    const surcharges = sample.filter((design) => design.surcharge > 0);
    const averageSurcharge = surcharges.length
      ? Math.round(surcharges.reduce((sum, design) => sum + design.surcharge, 0) / surcharges.length)
      : 0;
    return {
      pendingTotal: counts?.PENDING_REVIEW ?? 0,
      approvedThisMonth,
      approvalRate,
      rejectedTotal: counts?.REJECTED ?? 0,
      averageSurcharge,
    };
  }, [counts, sample]);

  const tabs: Array<{ value: TabStatus; label: string; count: number; countClassName: string }> = [
    {
      value: 'ALL',
      label: t('pages.customDesigns.tabAll'),
      count: counts?.ALL ?? 0,
      countClassName: 'bg-surface-container-highest text-on-surface',
    },
    {
      value: 'PENDING_REVIEW',
      label: t('pages.customDesigns.tabPending'),
      count: counts?.PENDING_REVIEW ?? 0,
      countClassName: 'bg-amber-500/20 text-amber-800',
    },
    {
      value: 'APPROVED',
      label: t('pages.customDesigns.tabApproved'),
      count: counts?.APPROVED ?? 0,
      countClassName: 'bg-surface-container-high text-on-surface-variant',
    },
    {
      value: 'REJECTED',
      label: t('pages.customDesigns.tabRejected'),
      count: counts?.REJECTED ?? 0,
      countClassName: 'bg-error-container text-on-error-container',
    },
  ];

  const allPendingSelected = pendingDesigns.length > 0 && bulkSelected.length === pendingDesigns.length;
  const somePendingSelected = bulkSelected.length > 0 && !allPendingSelected;

  const toggleBulkSelection = (id: string) => {
    setBulkSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAllPending = () => {
    setBulkSelected(allPendingSelected ? [] : pendingDesigns.map((design) => design.id));
  };

  const showPreview = (design: AdminDesign) => {
    setPreviewDesign(design);
    setPreviewOpened(true);
  };

  const closePreview = () => {
    setPreviewOpened(false);
    setPreviewDesign(null);
  };

  const openBulk = () => {
    setBulkSelected([]);
    setBulkOpened(true);
  };

  const closeBulk = () => {
    setBulkOpened(false);
    setBulkSelected([]);
  };

  const openRejectModal = (design?: AdminDesign, presetReason?: string) => {
    setRejectTarget(design ?? null);
    setRejectTargetId(design?.id ?? '');
    setRejectionReason(presetReason ?? '');
    setRejectOpened(true);
  };

  const closeRejectModal = () => {
    setRejectOpened(false);
    setRejectTarget(null);
    setRejectTargetId('');
    setRejectionReason('');
  };

  const rejectCandidate =
    rejectTarget ?? pendingDesigns.find((design) => design.id === rejectTargetId) ?? null;

  const confirmReject = () => {
    if (!rejectCandidate || !rejectionReason.trim()) return;
    updateStatus.mutate({ id: rejectCandidate.id, status: 'REJECTED', reason: rejectionReason.trim() });
  };

  const clearFilters = () => {
    setSearch('');
    setGarmentFilter('');
    setPage(1);
  };

  if (!isClient) {
    return null;
  }

  if (!getAccessToken()) {
    return <LoginForm />;
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={[
            { label: t('pages.customDesigns.breadcrumbCatalog'), href: '/products' },
            { label: t('pages.customDesigns.breadcrumbDesigns') },
          ]}
          title={
            <span className="flex flex-wrap items-baseline gap-3">
              {t('pages.customDesigns.title')}
              <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                {t('pages.customDesigns.queueBadge')}
              </span>
            </span>
          }
          subtitle={t('pages.customDesigns.subtitle')}
          actions={
            <>
              {/* Sin endpoint disponible: deshabilitado a propósito. */}
              <Button variant="secondary" icon="tune" disabled title={t('common.comingSoon')}>
                {t('pages.customDesigns.configurePrints')}
              </Button>
              <Button icon="verified" onClick={openBulk}>
                {t('pages.customDesigns.bulkApproval')}
              </Button>
            </>
          }
        />

        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-on-surface-variant">
                {t('pages.customDesigns.kpiPendingReview')}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-label-sm text-label-sm text-amber-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />
                {t('pages.customDesigns.urgent')}
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-numeric-tabular font-headline-xl text-headline-xl text-on-surface">
                <AnimatedNumber value={kpis.pendingTotal} format={formatZeroPad} />
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.customDesigns.responseGoal')}
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full w-[25%] rounded-full bg-amber-600" />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-on-surface-variant">
                {t('pages.customDesigns.kpiApprovedMonth')}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-numeric-tabular font-label-sm text-label-sm text-emerald-800">
                <Icon name="trending_up" className="text-[14px]" />
                {t('pages.customDesigns.approvalRate').replace('{{rate}}', String(kpis.approvalRate))}
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-numeric-tabular font-headline-xl text-headline-xl text-on-surface">
                <AnimatedNumber value={kpis.approvedThisMonth} format={formatZeroPad} />
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.customDesigns.readyForPlotter')}
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full w-[80%] rounded-full bg-primary" />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-on-surface-variant">
                {t('pages.customDesigns.kpiRejectedFile')}
              </span>
              <span className="rounded-full bg-error-container px-2 py-0.5 font-numeric-tabular font-label-sm text-label-sm text-on-error-container">
                {t('pages.customDesigns.incidents').replace('{{count}}', String(kpis.rejectedTotal))}
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-numeric-tabular font-headline-xl text-headline-xl text-error">
                <AnimatedNumber value={kpis.rejectedTotal} format={formatZeroPad} />
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.customDesigns.lowResVector')}
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full w-[20%] rounded-full bg-error" />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-on-surface-variant">
                {t('pages.customDesigns.kpiAverageSurcharge')}
              </span>
              <span className="rounded-md bg-surface-container-high p-1 text-on-surface">
                <Icon name="price_change" className="text-[16px]" />
              </span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-numeric-tabular font-headline-xl text-headline-xl text-on-surface">
                <AnimatedNumber value={kpis.averageSurcharge} format={formatSurchargeCompact} />{' '}
                <span className="font-body-sm text-body-sm text-on-surface-variant">ARS</span>
              </span>
              {/* Comparativa estática del diseño: no hay histórico de recargos en la API. */}
              <span className="font-numeric-tabular font-label-sm text-label-sm text-emerald-800">
                {t('pages.customDesigns.trendVsAugust')}
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full w-[65%] rounded-full bg-secondary" />
            </div>
          </div>
        </div>

        {/* Main Module: Filter Bar + Table Container */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center">
            <SegmentedTabs
              value={statusFilter}
              options={tabs.map((tab) => ({
                value: tab.value,
                label: (
                  <span className="flex items-center gap-1.5">
                    <span>{tab.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 font-numeric-tabular text-label-sm ${tab.countClassName}`}>
                      {tab.count}
                    </span>
                  </span>
                ),
              }))}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              size="md"
              layoutId="custom-designs-status"
              className="overflow-x-auto"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Input
                icon="search"
                variant="filled"
                placeholder={t('pages.customDesigns.searchPlaceholder')}
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setPage(1);
                }}
                className="min-w-[240px] flex-1 sm:flex-initial"
              />
              <div className="flex items-center gap-2">
                {/* Técnica: la API no expone ese campo (no se renderiza el select). */}
                {garmentOptions.length > 0 && (
                  <Select
                    value={garmentFilter}
                    onChange={(event) => {
                      setGarmentFilter(event.currentTarget.value);
                      setPage(1);
                    }}
                    className="w-full cursor-pointer sm:w-auto"
                  >
                    <option value="">{t('pages.customDesigns.garmentAll')}</option>
                    {garmentOptions.map((garment) => (
                      <option key={garment} value={garment}>
                        {garment}
                      </option>
                    ))}
                  </Select>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  title={t('pages.customDesigns.clearFilters')}
                  className="rounded-lg bg-surface-container-low p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  <Icon name="filter_alt_off" className="text-[18px]" />
                </button>
              </div>
            </div>
          </div>

          {listQuery.isError ? (
            <QueryError onRetry={() => listQuery.refetch()} retrying={listQuery.isFetching} />
          ) : listQuery.isLoading ? (
            <TableSkeleton rows={8} columns={8} />
          ) : filteredDesigns.length === 0 ? (
            <EmptyState
              icon="palette"
              title={t('pages.customDesigns.emptyTitle')}
              description={t('pages.customDesigns.emptyDescription')}
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low/70 font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                    <th className="w-20 px-5 py-3">{t('pages.customDesigns.columnPreview')}</th>
                    <th className="px-4 py-3">{t('pages.customDesigns.columnOrderCustomer')}</th>
                    <th className="px-4 py-3">{t('pages.customDesigns.columnStatus')}</th>
                    <th className="px-4 py-3">{t('pages.customDesigns.columnGarmentArt')}</th>
                    <th className="px-4 py-3">{t('pages.customDesigns.columnResolutionReason')}</th>
                    <th className="px-4 py-3 text-right">{t('pages.customDesigns.columnSurcharge')}</th>
                    <th className="px-4 py-3">{t('pages.customDesigns.columnDate')}</th>
                    <th className="px-5 py-3 text-right">{t('pages.customDesigns.columnActions')}</th>
                  </tr>
                </thead>
                <motion.tbody variants={tableRowsContainer} initial="hidden" animate="visible">
                  {filteredDesigns.map((design) => {
                    const date = formatDateTime(design.createdAt, t('pages.customDesigns.timeSuffix'));
                    const fileName = getFileName(design.finalPrintFileUrl);
                    const artBadge = getArtBadgeLabel(design.elements);
                    const isRejected = design.status === 'REJECTED';
                    const isApproved = design.status === 'APPROVED';
                    const isPending = design.status === 'PENDING_REVIEW' || design.status === 'DRAFT';

                    return (
                      <motion.tr
                        variants={fadeInUp}
                        key={design.id}
                        className={`transition-colors hover:bg-surface-container-low/40 ${
                          isRejected ? 'bg-error-container/5' : 'bg-surface-container-lowest'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => showPreview(design)}
                            title={t('pages.customDesigns.viewPreview')}
                            className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-surface-container shadow-sm"
                          >
                            {design.previewImageUrl ? (
                              <img
                                src={design.previewImageUrl}
                                alt={t('pages.customDesigns.previewTitle')}
                                className="h-full w-full rounded object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <Icon name="image" className="text-[22px] text-on-surface-variant" />
                            )}
                            {artBadge && (
                              <span
                                title={t('pages.customDesigns.artComposition')}
                                className="absolute bottom-1 right-1 rounded bg-primary/90 px-1 py-0.5 font-numeric-tabular text-[9px] tracking-tight text-on-primary"
                              >
                                {artBadge}
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => showPreview(design)}
                              title={t('pages.customDesigns.viewDetail')}
                              className="flex items-center gap-1.5 font-numeric-tabular text-body-md font-semibold text-on-surface hover:underline"
                            >
                              {orderCode(design.id)}
                              <Icon name="open_in_new" className="text-[14px] text-on-surface-variant" />
                            </button>
                            <span className="font-body-sm text-body-sm font-medium text-on-surface">
                              {userLabel(design, t('pages.customDesigns.clientNoData'))}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {design.user?.email ?? '—'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <DesignStatusPill status={design.status} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-body-sm text-body-sm font-medium text-on-surface">
                              {design.designTemplate?.name ?? t('pages.customDesigns.templateNoName')}
                              {design.size
                                ? ` ${t('pages.customDesigns.templateSize').replace('{{size}}', design.size)}`
                                : ''}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {design.color
                                ? t('pages.customDesigns.colorPrefix').replace('{{color}}', design.color)
                                : design.elements.length === 1
                                  ? t('pages.customDesigns.artifactElementsSingular').replace(
                                      '{{count}}',
                                      String(design.elements.length),
                                    )
                                  : t('pages.customDesigns.artifactElementsPlural').replace(
                                      '{{count}}',
                                      String(design.elements.length),
                                    )}
                            </span>
                            {fileName && design.finalPrintFileUrl && (
                              <a
                                href={design.finalPrintFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-0.5 flex items-center gap-1 font-numeric-tabular text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
                              >
                                <Icon name="attach_file" className="text-[13px]" />
                                {fileName}
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="max-w-xs px-4 py-4">
                          {design.rejectionReason ? (
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1 font-label-sm text-label-sm font-medium text-error">
                                <Icon name="warning" className="text-[15px]" />
                                {t('pages.customDesigns.rejectedByFile')}
                              </span>
                              <span
                                title={design.rejectionReason}
                                className="mt-0.5 line-clamp-1 font-label-sm text-label-sm text-on-surface-variant"
                              >
                                {design.rejectionReason}
                              </span>
                            </div>
                          ) : (
                            <span className="font-label-sm text-label-sm text-on-surface-variant">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end">
                            {isRejected && design.surcharge === 0 ? (
                              <>
                                <span className="font-numeric-tabular text-body-md font-semibold text-on-surface-variant line-through">
                                  {formatSurcharge(0)}
                                </span>
                                <span className="font-label-sm text-label-sm text-error">
                                  {t('pages.customDesigns.noCharge')}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-numeric-tabular text-body-md font-semibold text-on-surface">
                                  {formatSurcharge(design.surcharge)}
                                </span>
                                <span className="font-label-sm text-label-sm text-on-surface-variant">ARS</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-numeric-tabular text-body-sm text-on-surface">{date.day}</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{date.time}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                {design.finalPrintFileUrl ? (
                                  <a
                                    href={design.finalPrintFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={t('pages.customDesigns.downloadOriginal')}
                                    className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
                                  >
                                    <Icon name="download" className="text-[16px]" />
                                    <span className="hidden xl:inline">HD</span>
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    title={t('pages.customDesigns.noFinalFile')}
                                    className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface-variant opacity-50"
                                  >
                                    <Icon name="download" className="text-[16px]" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={updateStatus.isPending}
                                  onClick={() => updateStatus.mutate({ id: design.id, status: 'APPROVED' })}
                                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-surface-container-highest hover:text-on-surface disabled:opacity-50"
                                >
                                  <Icon name="done" className="text-[15px]" />
                                  {t('pages.customDesigns.approve')}
                                </button>
                                <button
                                  type="button"
                                  disabled={updateStatus.isPending}
                                  onClick={() => openRejectModal(design)}
                                  title={t('pages.customDesigns.rejectAndNotify')}
                                  className="flex items-center gap-1 rounded-lg bg-error-container/40 px-2.5 py-1.5 font-label-sm text-label-sm text-on-error-container transition-colors hover:bg-error-container disabled:opacity-50"
                                >
                                  <Icon name="close" className="text-[16px]" />
                                  <span className="hidden xl:inline">{t('pages.customDesigns.reject')}</span>
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <>
                                <span className="flex items-center gap-1 rounded-md bg-surface-container px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant">
                                  <Icon name="factory" className="text-[14px]" />
                                  {t('pages.customDesigns.inProduction')}
                                </span>
                                {design.finalPrintFileUrl ? (
                                  <a
                                    href={design.finalPrintFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={t('pages.customDesigns.downloadFinal')}
                                    className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                                  >
                                    <Icon name="download" className="text-[18px]" />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    title={t('pages.customDesigns.noFinalFile')}
                                    className="rounded-lg p-1.5 text-on-surface-variant opacity-40"
                                  >
                                    <Icon name="download" className="text-[18px]" />
                                  </button>
                                )}
                              </>
                            )}

                            {isRejected && (
                              <>
                                <button
                                  type="button"
                                  disabled={updateStatus.isPending}
                                  onClick={() => updateStatus.mutate({ id: design.id, status: 'PENDING_REVIEW' })}
                                  className="flex items-center gap-1 rounded-lg bg-surface-container-lowest px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface shadow-sm transition-colors hover:bg-surface-container-low disabled:opacity-50"
                                >
                                  <Icon name="refresh" className="text-[15px]" />
                                  {t('pages.customDesigns.reopen')}
                                </button>
                                {/* Sin endpoint de notas: botón deshabilitado. */}
                                <button
                                  type="button"
                                  disabled
                                  title={t('common.comingSoon')}
                                  className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Icon name="mail" className="text-[15px]" />
                                  <span className="hidden xl:inline">{t('pages.customDesigns.note')}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}

          <div className="px-4 pb-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              summary={t('pages.customDesigns.paginationSummary')
                .replace('{{start}}', String(rangeStart))
                .replace('{{end}}', String(rangeEnd))
                .replace('{{total}}', String(total))}
            />
          </div>
        </div>

        {/* Workshop Technical Specs & Quality Control Blueprint */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="flex flex-col justify-between lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface">
                <Icon name="precision_manufacturing" className="text-[22px]" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.customDesigns.requirementsTitle')}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t('pages.customDesigns.requirementsBody')}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
              {PRODUCTION_REQUIREMENTS.map((requirement) => (
                <div key={requirement.labelKey} className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3.5">
                  <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                    {t(requirement.labelKey)}
                  </span>
                  <span className="font-numeric-tabular text-headline-sm font-semibold text-on-surface">
                    {t(requirement.valueKey)}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{t(requirement.hintKey)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.customDesigns.supportTitle')}
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {t('pages.customDesigns.rejectionTemplateTitle')}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.customDesigns.rejectionTemplateBody')}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              {REJECTION_TEMPLATE_KEYS.map((templateKey) => (
                <button
                  key={templateKey}
                  type="button"
                  onClick={() => openRejectModal(undefined, t(templateKey))}
                  className="flex w-full items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  <span>
                    {t('pages.customDesigns.rejectionTemplateLabel').replace('{{template}}', t(templateKey))}
                  </span>
                  <Icon name="send" className="text-[16px] text-on-surface-variant" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de aprobación masiva */}
      <AppModal
        opened={bulkOpened}
        onClose={closeBulk}
        title={t('pages.customDesigns.bulkModalTitle')}
        subtitle={t('pages.customDesigns.bulkModalSubtitle')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeBulk}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="verified"
              onClick={() => bulkApprove.mutate(bulkSelected)}
              disabled={bulkSelected.length === 0 || bulkApprove.isPending}
            >
              {bulkApprove.isPending
                ? t('pages.customDesigns.approving')
                : t('pages.customDesigns.approveSelectedCount').replace('{{count}}', String(bulkSelected.length))}
            </Button>
          </>
        }
      >
        {pendingQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[20px]" />
            {t('pages.customDesigns.loadingPending')}
          </div>
        ) : pendingDesigns.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title={t('pages.customDesigns.noPendingTitle')}
            description={t('pages.customDesigns.noPendingDescription')}
          />
        ) : (
          <div className="flex flex-col">
            <div className="mb-3 flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2">
              <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface">
                <Checkbox
                  checked={allPendingSelected}
                  indeterminate={somePendingSelected}
                  onChange={toggleAllPending}
                  label={t('pages.customDesigns.selectAll')}
                />
                {t('pages.customDesigns.selectAll')}
              </label>
              <span className="font-numeric-tabular text-label-sm text-on-surface-variant">
                {t('pages.customDesigns.selectedCount').replace('{{count}}', String(bulkSelected.length))}
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-outline-variant/20">
              {pendingDesigns.map((design) => (
                <li key={design.id} className="flex items-center gap-3 py-3">
                  <Checkbox
                    checked={bulkSelected.includes(design.id)}
                    onChange={() => toggleBulkSelection(design.id)}
                    label={t('pages.customDesigns.selectDesign').replace('{{order}}', orderCode(design.id))}
                  />
                  {design.previewImageUrl ? (
                    <img
                      src={design.previewImageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                      <Icon name="image" className="text-[18px]" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-numeric-tabular text-body-sm font-semibold text-on-surface">
                      {orderCode(design.id)} · {userLabel(design, t('pages.customDesigns.clientNoData'))}
                    </span>
                    <span className="truncate font-label-sm text-label-sm text-on-surface-variant">
                      {design.designTemplate?.name ?? t('pages.customDesigns.templateNoName')} ·{' '}
                      {formatDateTime(design.createdAt, t('pages.customDesigns.timeSuffix')).day}
                    </span>
                  </div>
                  <span className="font-numeric-tabular text-body-sm font-semibold text-on-surface">
                    {formatSurcharge(design.surcharge)}
                  </span>
                </li>
              ))}
            </ul>
            {(pendingQuery.data?.meta?.total ?? 0) > pendingDesigns.length && (
              <p className="mt-3 font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.customDesigns.pendingLimit')
                  .replace('{{shown}}', String(pendingDesigns.length))
                  .replace('{{total}}', String(pendingQuery.data?.meta?.total ?? 0))}
              </p>
            )}
          </div>
        )}
      </AppModal>

      {/* Modal de rechazo con motivo */}
      <AppModal
        opened={rejectOpened}
        onClose={closeRejectModal}
        title={t('pages.customDesigns.rejectModalTitle')}
        subtitle={t('pages.customDesigns.rejectModalSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeRejectModal}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              icon="close"
              onClick={confirmReject}
              disabled={!rejectCandidate || !rejectionReason.trim() || updateStatus.isPending}
            >
              {updateStatus.isPending ? t('pages.customDesigns.rejecting') : t('pages.customDesigns.rejectDesign')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!rejectTarget && (
            <Field label={t('pages.customDesigns.rejectTargetLabel')} required>
              <Select
                value={rejectTargetId}
                onChange={(event) => setRejectTargetId(event.currentTarget.value)}
              >
                <option value="">{t('pages.customDesigns.rejectTargetPlaceholder')}</option>
                {pendingDesigns.map((design) => (
                  <option key={design.id} value={design.id}>
                    {orderCode(design.id)} · {userLabel(design, t('pages.customDesigns.clientNoData'))} ·{' '}
                    {design.designTemplate?.name ?? t('pages.customDesigns.templateFallback')}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {rejectTarget && (
            <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
              {rejectTarget.previewImageUrl ? (
                <img src={rejectTarget.previewImageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                  <Icon name="image" className="text-[20px]" />
                </div>
              )}
              <div className="flex min-w-0 flex-col">
                <span className="font-numeric-tabular text-body-sm font-semibold text-on-surface">
                  {orderCode(rejectTarget.id)} · {userLabel(rejectTarget, t('pages.customDesigns.clientNoData'))}
                </span>
                <span className="truncate font-label-sm text-label-sm text-on-surface-variant">
                  {rejectTarget.designTemplate?.name ?? t('pages.customDesigns.templateNoName')}
                  {rejectTarget.size
                    ? ` · ${t('pages.customDesigns.sizeInline').replace('{{size}}', rejectTarget.size)}`
                    : ''}
                </span>
              </div>
            </div>
          )}

          <Field label={t('pages.customDesigns.rejectionReasonLabel')} required>
            <Textarea
              placeholder={t('pages.customDesigns.rejectionReasonPlaceholder')}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.currentTarget.value)}
              rows={3}
            />
          </Field>
        </div>
      </AppModal>

      {/* Modal de vista previa */}
      <AppModal
        opened={previewOpened}
        onClose={closePreview}
        title={t('pages.customDesigns.previewTitle')}
        subtitle={
          previewDesign
            ? `${orderCode(previewDesign.id)} · ${userLabel(previewDesign, t('pages.customDesigns.clientNoData'))}`
            : undefined
        }
        size="lg"
      >
        {previewDesign && (
          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-low">
              {previewDesign.previewImageUrl ? (
                <img
                  src={previewDesign.previewImageUrl}
                  alt={t('pages.customDesigns.previewTitle')}
                  className="max-h-[420px] w-full object-contain"
                />
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  <Icon name="image" className="text-[32px]" />
                  {t('pages.customDesigns.noPreview')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailRow label={t('pages.customDesigns.detailClient')}>
                {userLabel(previewDesign, t('pages.customDesigns.clientNoData'))}
              </DetailRow>
              <DetailRow label={t('pages.customDesigns.detailEmail')}>{previewDesign.user?.email ?? '—'}</DetailRow>
              <DetailRow label={t('pages.customDesigns.columnStatus')}>
                <DesignStatusPill status={previewDesign.status} />
              </DetailRow>
              <DetailRow label={t('pages.customDesigns.detailGarment')}>
                {previewDesign.designTemplate?.name ?? '—'}
              </DetailRow>
              <DetailRow label={t('pages.customDesigns.detailColorSize')}>
                {[previewDesign.color, previewDesign.size
                  ? t('pages.customDesigns.sizeInline').replace('{{size}}', previewDesign.size)
                  : null]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </DetailRow>
              <DetailRow label={t('pages.customDesigns.columnSurcharge')}>
                {formatSurcharge(previewDesign.surcharge)}
              </DetailRow>
              <DetailRow label={t('pages.customDesigns.detailRegistered')}>
                {formatDateTime(previewDesign.createdAt, t('pages.customDesigns.timeSuffix')).day} ·{' '}
                {formatDateTime(previewDesign.createdAt, t('pages.customDesigns.timeSuffix')).time}
              </DetailRow>
              <DetailRow label={t('pages.customDesigns.detailElements')}>
                {previewDesign.elements.length === 1
                  ? t('pages.customDesigns.artifactElementsSingular').replace(
                      '{{count}}',
                      String(previewDesign.elements.length),
                    )
                  : t('pages.customDesigns.artifactElementsPlural').replace(
                      '{{count}}',
                      String(previewDesign.elements.length),
                    )}
              </DetailRow>
            </div>

            {previewDesign.rejectionReason && (
              <div className="rounded-lg bg-error-container/40 px-3 py-2">
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-error-container">
                  {t('pages.customDesigns.rejectionReason')}
                </span>
                <p className="font-body-sm text-body-sm text-on-error-container">{previewDesign.rejectionReason}</p>
              </div>
            )}

            {previewDesign.finalPrintFileUrl && (
              <a
                href={previewDesign.finalPrintFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="attach_file" className="text-[18px]" />
                {getFileName(previewDesign.finalPrintFileUrl) ?? t('pages.customDesigns.viewFinalFile')}
              </a>
            )}
          </div>
        )}
      </AppModal>
    </>
  );
}