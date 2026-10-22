'use client';

import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Textarea } from '../../components/ui/input';
import { AnimatedNumber, fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { Switch } from '../../components/ui/switch';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';
import { usePlatformSession } from '../../providers/platform-provider';

type ShippingOption = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  freeShippingThreshold?: number | null;
  coverageZones?: string[];
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

interface FormValues {
  name: string;
  description: string;
  price: number;
  estimatedDaysMin: number | '';
  estimatedDaysMax: number | '';
  freeShippingThreshold: number | '';
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

type ZoneFilter = 'ALL' | 'NACIONAL' | 'INTERNACIONAL' | 'PICKUP';

interface StoreConfigData {
  currencyCode?: string;
  freeShippingThreshold?: number | null;
  storefrontConfig?: unknown;
  updatedAt?: string;
}

interface FreeShippingNotice {
  enabled: boolean;
  message: string;
}

const DEFAULT_NOTICE_MESSAGE_KEY = 'pages.shippingOptions.defaultNoticeMessage';

const ZONE_FILTERS: { value: ZoneFilter; labelKey: string }[] = [
  { value: 'ALL', labelKey: 'pages.shippingOptions.zoneAll' },
  { value: 'NACIONAL', labelKey: 'pages.shippingOptions.zoneNational' },
  { value: 'INTERNACIONAL', labelKey: 'pages.shippingOptions.zoneInternational' },
  { value: 'PICKUP', labelKey: 'pages.shippingOptions.zonePickup' },
];

/** Transportistas del diseño: la API todavía no expone integraciones, se muestran como card estática. */
const CARRIERS: { initial: string; name: string; descriptionKey: string; status: 'connected' | 'paused' }[] = [
  {
    initial: 'A',
    name: 'Andreani Logística',
    descriptionKey: 'pages.shippingOptions.carrierTracking',
    status: 'connected',
  },
  { initial: 'D', name: 'DHL Express Global', descriptionKey: 'pages.shippingOptions.carrierWebhooks', status: 'connected' },
  {
    initial: 'P',
    name: 'Pickit Red de Puntos',
    descriptionKey: 'pages.shippingOptions.carrierLockers',
    status: 'paused',
  },
];

function formatPrice(amount: number) {
  return `$${amount.toLocaleString('es-CO')}`;
}

function formatDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDelivery(option: ShippingOption, t: (key: string) => string) {
  const min = option.estimatedDaysMin;
  const max = option.estimatedDaysMax;
  if (min != null && max != null) {
    return (max === 1 ? t('pages.shippingOptions.deliveryRangeSingular') : t('pages.shippingOptions.deliveryRangePlural'))
      .replace('{{min}}', String(min))
      .replace('{{max}}', String(max));
  }
  if (min != null) {
    return (min === 1 ? t('pages.shippingOptions.deliveryFromSingular') : t('pages.shippingOptions.deliveryFromPlural')).replace(
      '{{min}}',
      String(min),
    );
  }
  if (max != null) {
    return (max === 1 ? t('pages.shippingOptions.deliveryUntilSingular') : t('pages.shippingOptions.deliveryUntilPlural')).replace(
      '{{max}}',
      String(max),
    );
  }
  return '-';
}

function formatUpdatedAt(value: string | undefined, t: (key: string) => string) {
  if (!value) return t('pages.shippingOptions.noAvailable');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('pages.shippingOptions.noAvailable');
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * La API no tiene un campo de zona: se infiere por nombre/descripción para que los
 * filtros del diseño tengan un efecto razonable.
 */
/**
 * Zonas efectivas de la opción: usa `coverageZones` cuando está definido y, si no,
 * infiere por nombre/descripción para que los filtros del diseño tengan efecto.
 */
function getZoneTags(option: ShippingOption): Exclude<ZoneFilter, 'ALL'>[] {
  const zones = option.coverageZones ?? [];
  if (zones.length === 0) {
    return [getZone(option)];
  }
  const tags = new Set<Exclude<ZoneFilter, 'ALL'>>();
  zones.forEach((zone) => {
    const text = normalize(zone);
    if (/(internacional|international|global)/.test(text)) {
      tags.add('INTERNACIONAL');
    } else if (/(retiro|pickup|pick-up|showroom|locker)/.test(text)) {
      tags.add('PICKUP');
    } else {
      tags.add('NACIONAL');
    }
  });
  return [...tags];
}

function getZone(option: ShippingOption): Exclude<ZoneFilter, 'ALL'> {
  const text = normalize(`${option.name} ${option.description ?? ''}`);
  if (/(internacional|international|global|aduana|dhl|fedex|ups)/.test(text)) return 'INTERNACIONAL';
  if (/(retiro|pickup|pick-up|showroom|locker|punto de)/.test(text)) return 'PICKUP';
  return 'NACIONAL';
}

function getMethodIcon(option: ShippingOption) {
  const text = normalize(`${option.name} ${option.description ?? ''}`);
  if (/(express|urgente|prioritario|priority|same|moto|24\/48)/.test(text)) return 'bolt';
  if (/(internacional|international|global|aduana|dhl|fedex)/.test(text)) return 'flight_takeoff';
  if (/(retiro|pickup|pick-up|showroom|locker|punto de)/.test(text)) return 'store';
  return 'local_shipping';
}

/** El storefrontConfig llega como JSON (objeto o string); se preserva tal cual para no perder claves. */
function parseStorefrontConfig(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function extractNotice(config: Record<string, unknown>): FreeShippingNotice {
  const notice = config.freeShippingNotice;
  if (notice && typeof notice === 'object') {
    const record = notice as Record<string, unknown>;
    return {
      enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
      message:
        typeof record.message === 'string' && record.message ? record.message : DEFAULT_NOTICE_MESSAGE_KEY,
    };
  }
  return { enabled: true, message: DEFAULT_NOTICE_MESSAGE_KEY };
}

export default function ShippingOptionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user: platformUser } = usePlatformSession();
  // Las credenciales del carrier son sensibles: solo superadmins de plataforma.
  const canManageProviders = Boolean(platformUser);
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('ALL');

  const [threshold, setThreshold] = useState<number | ''>('');
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [noticeMessage, setNoticeMessage] = useState(t(DEFAULT_NOTICE_MESSAGE_KEY));
  const [ruleInitialized, setRuleInitialized] = useState(false);

  const [zonesOpened, { open: openZonesModal, close: closeZonesModal }] = useDisclosure(false);
  const [zoneDrafts, setZoneDrafts] = useState<Record<string, string[]>>({});
  const [zoneInputs, setZoneInputs] = useState<Record<string, string>>({});
  const [credentialsOpened, { open: openCredentialsModal, close: closeCredentialsModal }] = useDisclosure(false);
  const [credProvider, setCredProvider] = useState('flatRate');
  const [credApiUrl, setCredApiUrl] = useState('');
  const [credAccountId, setCredAccountId] = useState('');
  const [credApiKey, setCredApiKey] = useState('');
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      description: '',
      price: 0,
      estimatedDaysMin: '',
      estimatedDaysMax: '',
      freeShippingThreshold: '',
      isDefault: false,
      isActive: true,
      sortOrder: 0,
    },
  });

  const { data: options, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-shipping-options'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/shipping-options/admin');
      if (error) throw error;
      return (data ?? []) as ShippingOption[];
    },
  });

  const { data: storeConfig, isLoading: isStoreConfigLoading } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/store-config');
      return (data ?? null) as unknown as StoreConfigData | null;
    },
  });

  const { data: credentials } = useQuery({
    queryKey: ['admin-shipping-credentials'],
    enabled: credentialsOpened,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/shipping-options/admin/credentials');
      if (error) throw error;
      return data as unknown as {
        provider: string;
        apiUrl?: string | null;
        accountId?: string | null;
        hasApiKey: boolean;
        apiKeyLast4?: string | null;
      };
    },
  });

  useEffect(() => {
    if (credentials && !credentialsLoaded) {
      setCredProvider(credentials.provider ?? 'flatRate');
      setCredApiUrl(credentials.apiUrl ?? '');
      setCredAccountId(credentials.accountId ?? '');
      setCredApiKey('');
      setCredentialsLoaded(true);
    }
  }, [credentials, credentialsLoaded]);

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await apiClient.POST('/shipping-options/admin', {
        body: buildPayload(values) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      closeModal();
      notifySuccess({ title: t('pages.shippingOptions.toastCreated') });
    },
    onError: (error) => notifyError({ title: t('pages.shippingOptions.toastError'), message: getApiErrorMessage(error) }),
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FormValues }) => {
      const { error } = await apiClient.PATCH('/shipping-options/admin/{id}', {
        params: { path: { id } },
        body: buildPayload(values) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      closeModal();
      notifySuccess({ title: t('pages.shippingOptions.toastUpdated') });
    },
    onError: (error) => notifyError({ title: t('pages.shippingOptions.toastError'), message: getApiErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/shipping-options/admin/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      notifySuccess({ title: t('pages.shippingOptions.toastDeleted') });
    },
    onError: (error) => notifyError({ title: t('pages.shippingOptions.toastError'), message: getApiErrorMessage(error) }),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/shipping-options/admin/{id}', {
        params: { path: { id } },
        body: { isDefault: true } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      notifySuccess({ title: t('pages.shippingOptions.toastDefaultUpdated') });
    },
    onError: (error) => notifyError({ title: t('pages.shippingOptions.toastError'), message: getApiErrorMessage(error) }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await apiClient.PATCH('/shipping-options/admin/{id}', {
        params: { path: { id } },
        body: { isActive } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      notifySuccess({ title: t('pages.shippingOptions.toastStatusUpdated') });
    },
    onError: (error) => notifyError({ title: t('pages.shippingOptions.toastError'), message: getApiErrorMessage(error) }),
  });

  const saveFreeShippingRule = useMutation({
    mutationFn: async () => {
      if (typeof threshold !== 'number') {
        throw new Error(t('pages.shippingOptions.invalidThreshold'));
      }
      const storefrontConfig = parseStorefrontConfig(storeConfig?.storefrontConfig);
      const { error } = await apiClient.PATCH('/store-config', {
        body: {
          freeShippingThreshold: threshold,
          storefrontConfig: JSON.stringify({
            ...storefrontConfig,
            freeShippingNotice: {
              enabled: noticeEnabled,
              message: noticeMessage.trim() || t(DEFAULT_NOTICE_MESSAGE_KEY),
            },
          }),
        } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      notifySuccess({ title: t('pages.shippingOptions.toastRuleSaved') });
    },
    onError: (error) =>
      notifyError({ title: t('pages.shippingOptions.toastRuleError'), message: getApiErrorMessage(error) }),
  });

  const saveZones = useMutation({
    mutationFn: async ({ id, zones }: { id: string; zones: string[] }) => {
      const { error } = await apiClient.PATCH('/shipping-options/admin/{id}', {
        params: { path: { id } },
        body: { coverageZones: zones } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      notifySuccess({ title: t('pages.shippingOptions.zonesSaved') });
    },
    onError: (error) =>
      notifyError({ title: t('pages.shippingOptions.zonesError'), message: getApiErrorMessage(error) }),
  });

  const saveCredentials = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH('/shipping-options/admin/credentials', {
        body: {
          provider: credProvider.trim() || 'flatRate',
          apiUrl: credApiUrl.trim(),
          accountId: credAccountId.trim(),
          ...(credApiKey.trim() ? { apiKey: credApiKey.trim() } : {}),
        } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-credentials'] });
      setCredApiKey('');
      setCredentialsLoaded(false);
      notifySuccess({ title: t('pages.shippingOptions.credentialsSaved') });
    },
    onError: (error) =>
      notifyError({ title: t('pages.shippingOptions.credentialsError'), message: getApiErrorMessage(error) }),
  });

  const allOptions = useMemo(() => options ?? [], [options]);

  const openZones = () => {
    const drafts: Record<string, string[]> = {};
    const inputs: Record<string, string> = {};
    allOptions.forEach((option) => {
      drafts[option.id] = option.coverageZones ?? [];
      inputs[option.id] = '';
    });
    setZoneDrafts(drafts);
    setZoneInputs(inputs);
    openZonesModal();
  };

  const addZone = (id: string) => {
    const value = (zoneInputs[id] ?? '').trim();
    if (!value) return;
    setZoneDrafts((prev) => {
      const current = prev[id] ?? [];
      if (current.some((zone) => normalize(zone) === normalize(value))) return prev;
      return { ...prev, [id]: [...current, value] };
    });
    setZoneInputs((prev) => ({ ...prev, [id]: '' }));
  };

  const removeZone = (id: string, zone: string) => {
    setZoneDrafts((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((entry) => entry !== zone) }));
  };

  const openCredentials = () => {
    setCredentialsLoaded(false);
    queryClient.invalidateQueries({ queryKey: ['admin-shipping-credentials'] });
    openCredentialsModal();
  };

  const optionThresholdFallback = useMemo(() => {
    const values = allOptions
      .map((option) => option.freeShippingThreshold)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    return values.length > 0 ? Math.min(...values) : null;
  }, [allOptions]);

  useEffect(() => {
    if (ruleInitialized || isLoading || isStoreConfigLoading) return;
    const configThreshold = storeConfig?.freeShippingThreshold;
    setThreshold(typeof configThreshold === 'number' && configThreshold > 0 ? configThreshold : (optionThresholdFallback ?? ''));
    const notice = extractNotice(parseStorefrontConfig(storeConfig?.storefrontConfig));
    setNoticeEnabled(notice.enabled);
    setNoticeMessage(notice.message === DEFAULT_NOTICE_MESSAGE_KEY ? t(DEFAULT_NOTICE_MESSAGE_KEY) : notice.message);
    setRuleInitialized(true);
  }, [ruleInitialized, storeConfig, isLoading, isStoreConfigLoading, options, optionThresholdFallback, t]);

  const zoneCounts = useMemo(() => {
    const counts: Record<ZoneFilter, number> = { ALL: allOptions.length, NACIONAL: 0, INTERNACIONAL: 0, PICKUP: 0 };
    allOptions.forEach((option) => {
      getZoneTags(option).forEach((tag) => {
        counts[tag] += 1;
      });
    });
    return counts;
  }, [allOptions]);

  const filteredOptions = useMemo(() => {
    const query = normalize(search.trim());
    return allOptions.filter((option) => {
      const matchesSearch = !query || normalize(`${option.name} ${option.description ?? ''}`).includes(query);
      const matchesZone = zoneFilter === 'ALL' || getZoneTags(option).includes(zoneFilter);
      return matchesSearch && matchesZone;
    });
  }, [allOptions, search, zoneFilter]);

  const activeCount = allOptions.filter((option) => option.isActive).length;

  const freeShippingThresholdKpi =
    typeof storeConfig?.freeShippingThreshold === 'number' && storeConfig.freeShippingThreshold > 0
      ? storeConfig.freeShippingThreshold
      : optionThresholdFallback;

  const averageDays = useMemo(() => {
    const values = allOptions
      .map((option) => {
        const min = option.estimatedDaysMin;
        const max = option.estimatedDaysMax;
        if (min == null && max == null) return null;
        if (min != null && max != null) return (min + max) / 2;
        return (min ?? max) as number;
      })
      .filter((value): value is number => value != null);
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [allOptions]);

  const thresholdDisplay = threshold === '' ? '' : threshold.toLocaleString('es-CO');

  const handleThresholdChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setThreshold(digits === '' ? '' : Number(digits));
  };

  const closeModal = () => {
    setEditing(null);
    form.reset();
    close();
  };

  const handleCreate = () => {
    setEditing(null);
    form.reset();
    open();
  };

  const handleEdit = (option: ShippingOption) => {
    setEditing(option.id);
    form.setValues({
      name: option.name,
      description: option.description ?? '',
      price: option.price,
      estimatedDaysMin: option.estimatedDaysMin ?? '',
      estimatedDaysMax: option.estimatedDaysMax ?? '',
      freeShippingThreshold: option.freeShippingThreshold ?? '',
      isDefault: option.isDefault,
      isActive: option.isActive,
      sortOrder: option.sortOrder,
    });
    open();
  };

  const handleSubmit = (values: FormValues) => {
    if (editing) {
      update.mutate({ id: editing, values });
    } else {
      create.mutate(values);
    }
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        <PageHeader
          overline={
            <span className="flex items-center gap-2 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
              <span>{t('pages.shippingOptions.breadcrumbSales')}</span>
              <span className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="text-on-surface">{t('pages.shippingOptions.breadcrumbLogistics')}</span>
            </span>
          }
          title={t('pages.shippingOptions.title')}
          subtitle={t('pages.shippingOptions.subtitle')}
          actions={
            <>
              <button
                type="button"
                onClick={openZones}
                className="inline-flex items-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-2 font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-low"
              >
                <Icon name="public" className="text-[18px] text-on-surface-variant" />
                <span>{t('pages.shippingOptions.coverageZones')}</span>
              </button>
              <Button icon="add" onClick={handleCreate}>
                {t('pages.shippingOptions.newOption')}
              </Button>
            </>
          }
        />

        {/* Métricas superiores rápidas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.shippingOptions.kpiActiveMethods')}
              </span>
              <span className="rounded-lg bg-surface-container p-1.5 text-on-surface">
                <Icon name="local_shipping" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-numeric-tabular text-on-surface">
                  {activeCount === 1
                    ? t('pages.shippingOptions.activeMethodsSingular').replace('{{count}}', String(activeCount))
                    : t('pages.shippingOptions.activeMethodsPlural').replace('{{count}}', String(activeCount))}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary">
                {t('pages.shippingOptions.allIntegratedCheckout')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.shippingOptions.kpiFreeShippingThreshold')}
              </span>
              <span className="rounded-lg bg-surface-container-high p-1.5 text-on-surface">
                <Icon name="redeem" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-numeric-tabular text-on-surface">
                  {freeShippingThresholdKpi != null ? (
                    <AnimatedNumber value={freeShippingThresholdKpi} format={formatPrice} />
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary">
                {freeShippingThresholdKpi != null
                  ? t('pages.shippingOptions.activeOnStorefront')
                  : t('pages.shippingOptions.noThreshold')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.shippingOptions.kpiAverageTime')}
              </span>
              <span className="rounded-lg bg-surface-container p-1.5 text-on-surface">
                <Icon name="timelapse" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-numeric-tabular text-on-surface">
                  {averageDays != null
                    ? t('pages.shippingOptions.averageDays').replace('{{days}}', formatDays(averageDays))
                    : '—'}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary">
                {t('pages.shippingOptions.slaDoorToDoor')}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.shippingOptions.kpiMonthlyDispatches')}
              </span>
              <span className="rounded-lg bg-surface-container-high p-1.5 text-on-surface">
                <Icon name="package_2" className="text-[18px]" />
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg font-numeric-tabular text-on-surface">—</span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary">
                {t('pages.shippingOptions.noDispatchEndpoint')}
              </span>
            </div>
          </div>
        </div>

        {/* Controles y filtros */}
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm sm:flex-row">
          <div className="flex w-full max-w-md flex-1 items-center gap-3">
            <div className="relative flex w-full items-center">
              <Icon name="search" className="absolute left-3 text-[18px] text-on-surface-variant" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder={t('pages.shippingOptions.searchPlaceholder')}
                className="w-full rounded-lg bg-surface-container-low/50 py-2 pl-9 pr-4 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/70 transition-colors focus:bg-surface-container-lowest focus:outline-none"
              />
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2 overflow-x-auto sm:w-auto">
            <SegmentedTabs
              value={zoneFilter}
              options={ZONE_FILTERS.map((zone) => ({
                value: zone.value,
                label: (
                  <>
                    {t(zone.labelKey)}
                    {zone.value === 'ALL' ? ` (${zoneCounts.ALL})` : ''}
                  </>
                ),
              }))}
              onChange={(value) => setZoneFilter(value)}
              layoutId="shipping-zone-filter"
            />
            <button
              type="button"
              disabled
              title={t('common.comingSoon')}
              className="cursor-not-allowed rounded-lg bg-surface-container-low/50 p-2 text-on-surface opacity-60"
            >
              <Icon name="tune" className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : allOptions.length === 0 ? (
            <EmptyState
              icon="local_shipping"
              title={t('pages.shippingOptions.emptyTitle')}
              description={t('pages.shippingOptions.emptyDescription')}
            />
          ) : filteredOptions.length === 0 ? (
            <EmptyState
              icon="search_off"
              title={t('pages.shippingOptions.noResultsTitle')}
              description={t('pages.shippingOptions.noResultsDescription')}
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low/40">
                    <th className="rounded-l-lg px-6 py-3.5 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      {t('pages.shippingOptions.columnName')}
                    </th>
                    <th className="px-6 py-3.5 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      {t('pages.shippingOptions.columnPrice')}
                    </th>
                    <th className="px-6 py-3.5 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      {t('pages.shippingOptions.columnDelivery')}
                    </th>
                    <th className="px-6 py-3.5 font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      {t('pages.shippingOptions.columnFreeFrom')}
                    </th>
                    <th className="px-6 py-3.5 text-center font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      {t('pages.shippingOptions.columnDefault')}
                    </th>
                    <th className="px-6 py-3.5 text-center font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      {t('pages.shippingOptions.columnActive')}
                    </th>
                    <th className="rounded-r-lg px-6 py-3.5 text-right font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                      {t('pages.shippingOptions.columnActions')}
                    </th>
                  </tr>
                </thead>
                <motion.tbody variants={tableRowsContainer} initial="hidden" animate="visible">
                  {filteredOptions.map((option, index) => (
                    <motion.tr
                      variants={fadeInUp}
                      key={option.id}
                      className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              index % 2 === 0 ? 'bg-surface-container' : 'bg-surface-container-high'
                            } text-on-surface`}
                          >
                            <Icon name={getMethodIcon(option)} className="text-[18px]" />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-headline-sm text-headline-sm font-medium text-on-surface">
                              {option.name}
                            </span>
                            <span className="truncate font-body-sm text-body-sm text-on-surface-variant">
                              {option.description || t('pages.shippingOptions.noDescription')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-numeric-tabular text-numeric-tabular font-semibold text-on-surface">
                        {formatPrice(option.price)}
                        {option.price === 0 && (
                          <span className="ml-1 font-label-sm text-label-sm font-normal text-secondary">
                            {t('pages.shippingOptions.free')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-body-sm text-body-sm text-on-surface">
                        {option.estimatedDaysMin != null || option.estimatedDaysMax != null ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                            {formatDelivery(option, t)}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {option.freeShippingThreshold != null ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-secondary-fixed">
                            <span className="h-1.5 w-1.5 rounded-full bg-on-secondary-fixed" />
                            {formatPrice(option.freeShippingThreshold)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm font-medium text-on-surface">
                            {t('pages.shippingOptions.noMinimum')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <input
                            type="radio"
                            name="default_shipping"
                            aria-label={t('pages.shippingOptions.markAsDefault').replace('{{name}}', option.name)}
                            checked={option.isDefault}
                            onChange={() => {
                              if (!option.isDefault) setDefault.mutate(option.id);
                            }}
                            className="h-4 w-4 cursor-pointer accent-primary"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={option.isActive}
                            onChange={(checked) => toggleActive.mutate({ id: option.id, isActive: checked })}
                            label={t('pages.shippingOptions.activateOption').replace('{{name}}', option.name)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 font-label-md text-label-md">
                          <button
                            type="button"
                            onClick={() => handleEdit(option)}
                            className="font-medium tracking-wide text-on-surface transition-colors hover:text-on-surface-variant"
                          >
                            {t('pages.shippingOptions.actionEdit')}
                          </button>
                          <button
                            type="button"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(option.id)}
                            className="font-medium tracking-wide text-error transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t('pages.shippingOptions.actionRemove')}
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
            <div className="flex flex-col items-center justify-between gap-3 bg-surface-container-low/20 p-4 font-body-sm text-body-sm text-on-surface-variant sm:flex-row">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                <span>
                  {filteredOptions.length === 1
                    ? t('pages.shippingOptions.methodsSummarySingular')
                        .replace('{{count}}', String(filteredOptions.length))
                        .replace('{{currency}}', storeConfig?.currencyCode ?? 'COP')
                    : t('pages.shippingOptions.methodsSummaryPlural')
                        .replace('{{count}}', String(filteredOptions.length))
                        .replace('{{currency}}', storeConfig?.currencyCode ?? 'COP')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm">{t('pages.shippingOptions.ratesSyncHint')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Módulo inferior: reglas globales + transportistas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-between gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-7">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.shippingOptions.freeShippingRulesTitle')}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm font-semibold ${
                    threshold !== ''
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {threshold !== ''
                    ? t('pages.shippingOptions.ruleActive')
                    : t('pages.shippingOptions.ruleNotConfigured')}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.shippingOptions.freeShippingRulesBody')}
              </p>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 rounded-xl bg-surface-container-low/40 p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="free-shipping-threshold"
                  className="font-label-sm text-label-sm font-medium text-on-surface"
                >
                  {t('pages.shippingOptions.minCartAmount')}
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-numeric-tabular text-numeric-tabular text-on-surface-variant">
                    $
                  </span>
                  <input
                    id="free-shipping-threshold"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={thresholdDisplay}
                    onChange={(event) => handleThresholdChange(event.currentTarget.value)}
                    className="w-full rounded-lg bg-surface-container-lowest py-2 pl-7 pr-3 font-numeric-tabular text-numeric-tabular font-semibold text-on-surface focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-label-sm text-label-sm font-medium text-on-surface">
                  {t('pages.shippingOptions.headerNotice')}
                </span>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-lowest px-3 py-2">
                  <input
                    type="text"
                    value={noticeMessage}
                    disabled={!noticeEnabled}
                    placeholder={t(DEFAULT_NOTICE_MESSAGE_KEY)}
                    onChange={(event) => setNoticeMessage(event.currentTarget.value)}
                    className="min-w-0 flex-1 truncate bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none disabled:opacity-60"
                  />
                  <Switch
                    checked={noticeEnabled}
                    onChange={setNoticeEnabled}
                    label={t('pages.shippingOptions.headerNotice')}
                    className="shrink-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 pt-2 sm:flex-row sm:items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.shippingOptions.lastUpdatedBy').replace(
                  '{{date}}',
                  formatUpdatedAt(storeConfig?.updatedAt, t),
                )}
              </span>
              <button
                type="button"
                disabled={saveFreeShippingRule.isPending || threshold === ''}
                onClick={() => saveFreeShippingRule.mutate()}
                className="rounded-lg bg-surface-container px-3.5 py-1.5 font-label-md text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveFreeShippingRule.isPending
                  ? t('common.saving')
                  : t('pages.shippingOptions.saveChanges')}
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.shippingOptions.carriersTitle')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.shippingOptions.carriersSubtitle')}
                </span>
              </div>
              <Icon name="sync" className="text-[20px] text-on-surface-variant" />
            </div>

            <div className="flex flex-col gap-3">
              {CARRIERS.map((carrier) => (
                <div
                  key={carrier.name}
                  className="flex items-center justify-between rounded-lg bg-surface-container-low/40 p-3 transition-colors hover:bg-surface-container-low"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-container font-headline-sm text-headline-sm font-bold text-on-surface">
                      {carrier.initial}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-semibold text-on-surface">{carrier.name}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t(carrier.descriptionKey)}
                      </span>
                    </div>
                  </div>
                  {carrier.status === 'connected' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-label-sm text-label-sm font-medium text-on-surface">
                        {t('pages.shippingOptions.connected')}
                      </span>
                    </div>
                  ) : (
                    <span className="rounded bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                      {t('pages.shippingOptions.paused')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={openCredentials}
              disabled={!canManageProviders}
              title={!canManageProviders ? t('pages.storeConfig.providersLocked') : undefined}
              className="w-full rounded-lg bg-surface-container-low py-2 text-center font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('pages.shippingOptions.manageCredentials')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: zonas de cobertura */}
      <AppModal
        opened={zonesOpened}
        onClose={closeZonesModal}
        title={t('pages.shippingOptions.zonesTitle')}
        subtitle={t('pages.shippingOptions.zonesSubtitle')}
        size="lg"
        footer={
          <Button variant="secondary" onClick={closeZonesModal}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {allOptions.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.shippingOptions.zonesNoOptions')}
            </p>
          ) : (
            allOptions.map((option) => {
              const zones = zoneDrafts[option.id] ?? [];
              const input = zoneInputs[option.id] ?? '';
              const saving = saveZones.isPending && saveZones.variables?.id === option.id;
              return (
                <div
                  key={option.id}
                  className="flex flex-col gap-3 rounded-xl border border-outline-variant/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {option.name}
                    </span>
                    <Button
                      variant="secondary"
                      icon="save"
                      iconClassName="text-[16px]"
                      disabled={saving}
                      onClick={() => saveZones.mutate({ id: option.id, zones })}
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {zones.length === 0 ? (
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('pages.shippingOptions.zonesEmpty')}
                      </span>
                    ) : (
                      zones.map((zone) => (
                        <span
                          key={zone}
                          className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 font-label-sm text-label-sm text-on-surface"
                        >
                          {zone}
                          <button
                            type="button"
                            aria-label={t('pages.shippingOptions.zonesRemove').replace('{{zone}}', zone)}
                            onClick={() => removeZone(option.id, zone)}
                            className="rounded-full p-0.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                          >
                            <Icon name="close" className="text-[14px]" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      variant="filled"
                      value={input}
                      placeholder={t('pages.shippingOptions.zonesPlaceholder')}
                      onChange={(event) =>
                        setZoneInputs((prev) => ({ ...prev, [option.id]: event.currentTarget.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addZone(option.id);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      icon="add"
                      iconClassName="text-[16px]"
                      disabled={!input.trim()}
                      onClick={() => addZone(option.id)}
                    >
                      {t('pages.shippingOptions.zonesAdd')}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </AppModal>

      {/* Modal: credenciales API del carrier */}
      <AppModal
        opened={credentialsOpened}
        onClose={closeCredentialsModal}
        title={t('pages.shippingOptions.credentialsTitle')}
        subtitle={t('pages.shippingOptions.credentialsSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeCredentialsModal}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="save"
              disabled={saveCredentials.isPending}
              onClick={() => saveCredentials.mutate()}
            >
              {saveCredentials.isPending ? t('common.saving') : t('pages.shippingOptions.credentialsSave')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('pages.shippingOptions.credentialProvider')} required>
            <Input
              value={credProvider}
              placeholder="flatRate"
              onChange={(event) => setCredProvider(event.currentTarget.value)}
            />
          </Field>
          <Field label={t('pages.shippingOptions.credentialApiUrl')}>
            <Input
              value={credApiUrl}
              placeholder="https://api.carrier.com/v1"
              onChange={(event) => setCredApiUrl(event.currentTarget.value)}
            />
          </Field>
          <Field label={t('pages.shippingOptions.credentialAccountId')}>
            <Input
              value={credAccountId}
              onChange={(event) => setCredAccountId(event.currentTarget.value)}
            />
          </Field>
          <Field
            label={t('pages.shippingOptions.credentialApiKey')}
            hint={
              credentials?.hasApiKey
                ? t('pages.shippingOptions.credentialApiKeySet').replace(
                    '{{last4}}',
                    credentials.apiKeyLast4 ?? '****',
                  )
                : t('pages.shippingOptions.credentialApiKeyMissing')
            }
          >
            <Input
              type="password"
              value={credApiKey}
              placeholder={t('pages.shippingOptions.credentialApiKeyPlaceholder')}
              onChange={(event) => setCredApiKey(event.currentTarget.value)}
            />
          </Field>
        </div>
      </AppModal>

      <AppModal
        opened={opened}
        onClose={closeModal}
        title={
          editing ? t('pages.shippingOptions.editTitle') : t('pages.shippingOptions.createTitle')
        }
        subtitle={t('pages.shippingOptions.modalSubtitle')}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)} className="flex flex-col gap-4">
          <Field label={t('pages.shippingOptions.fieldName')} required>
            <Input
              required
              placeholder={t('pages.shippingOptions.fieldNamePlaceholder')}
              {...form.getInputProps('name')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('pages.shippingOptions.fieldPrice')} required>
              <Input
                type="number"
                min={0}
                required
                placeholder="12000"
                value={form.values.price}
                onChange={(event) =>
                  form.setFieldValue('price', event.currentTarget.value === '' ? 0 : Number(event.currentTarget.value))
                }
              />
            </Field>
            <Field label={t('pages.shippingOptions.fieldDeliveryTime')}>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder={t('pages.shippingOptions.minPlaceholder')}
                  aria-label={t('pages.shippingOptions.minDaysAria')}
                  value={form.values.estimatedDaysMin}
                  onChange={(event) =>
                    form.setFieldValue(
                      'estimatedDaysMin',
                      event.currentTarget.value === '' ? '' : Number(event.currentTarget.value),
                    )
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder={t('pages.shippingOptions.maxPlaceholder')}
                  aria-label={t('pages.shippingOptions.maxDaysAria')}
                  value={form.values.estimatedDaysMax}
                  onChange={(event) =>
                    form.setFieldValue(
                      'estimatedDaysMax',
                      event.currentTarget.value === '' ? '' : Number(event.currentTarget.value),
                    )
                  }
                />
              </div>
            </Field>
          </div>

          <Field label={t('pages.shippingOptions.fieldFreeFrom')}>
            <Input
              type="number"
              min={0}
              placeholder={t('pages.shippingOptions.freeFromPlaceholder')}
              value={form.values.freeShippingThreshold}
              onChange={(event) =>
                form.setFieldValue(
                  'freeShippingThreshold',
                  event.currentTarget.value === '' ? '' : Number(event.currentTarget.value),
                )
              }
            />
          </Field>

          <Field label={t('pages.shippingOptions.fieldDescription')}>
            <Textarea
              rows={2}
              placeholder={t('pages.shippingOptions.descriptionPlaceholder')}
              {...form.getInputProps('description')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('pages.shippingOptions.fieldOrder')}>
              <Input
                type="number"
                value={form.values.sortOrder}
                onChange={(event) =>
                  form.setFieldValue('sortOrder', event.currentTarget.value === '' ? 0 : Number(event.currentTarget.value))
                }
              />
            </Field>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2">
                <Switch
                  checked={form.values.isDefault}
                  onChange={(checked) => form.setFieldValue('isDefault', checked)}
                  label={t('pages.shippingOptions.defaultOption')}
                />
                <span className="font-label-sm text-label-sm text-on-surface">
                  {t('pages.shippingOptions.defaultOption')}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              checked={form.values.isActive}
              onChange={() => form.setFieldValue('isActive', !form.values.isActive)}
              label={t('pages.shippingOptions.activateImmediately')}
            />
            <label
              className="cursor-pointer font-label-sm text-label-sm text-on-surface"
              onClick={() => form.setFieldValue('isActive', !form.values.isActive)}
            >
              {t('pages.shippingOptions.activateImmediately')}
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending
                ? t('common.saving')
                : t('pages.shippingOptions.saveMethod')}
            </Button>
          </div>
        </form>
      </AppModal>
    </>
  );
}

function buildPayload(values: FormValues) {
  return {
    name: values.name,
    description: values.description || undefined,
    price: values.price,
    estimatedDaysMin: values.estimatedDaysMin === '' ? undefined : Number(values.estimatedDaysMin),
    estimatedDaysMax: values.estimatedDaysMax === '' ? undefined : Number(values.estimatedDaysMax),
    freeShippingThreshold: values.freeShippingThreshold === '' ? undefined : Number(values.freeShippingThreshold),
    isDefault: values.isDefault,
    isActive: values.isActive,
    sortOrder: values.sortOrder,
  };
}
