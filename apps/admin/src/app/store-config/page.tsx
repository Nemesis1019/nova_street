'use client';

import { type StorefrontConfig, StorefrontConfigSchema } from '@ecommerce/shared';
import { useForm } from '@mantine/form';
import { useHotkeys } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Icon } from '../../components/ui/icon';
import { Reveal } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { StatusPill } from '../../components/ui/status-pill';
import { Switch } from '../../components/ui/switch';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useStoreConfig } from '../../providers/config-provider';
import { useTranslation } from '../../providers/i18n-provider';
import { usePlatformSession } from '../../providers/platform-provider';
import { StorefrontConfigSection } from './storefront-config-section';

interface StoreConfigFormValues {
  name: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  appearanceMode: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  borderColor: string;
  errorColor: string;
  successColor: string;
  warningColor: string;
  darkBackgroundColor: string;
  darkTextColor: string;
  heroImageUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  currencyCode: string;
  socialLinks: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  isActive: boolean;
  enableCustomDesigns: boolean;
  enableNewsletter: boolean;
  enableCatalogFilters: boolean;
  emailProvider: string;
  paymentProvider: string;
  boldApiKey: string;
  boldSecretKey: string;
  boldSandbox: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  smtpHost: string;
  smtpPort: number | '';
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  smtpFrom: string;
  resendApiKey: string;
  resendFrom: string;
  shippingProvider: string;
  shippingBaseCost: number;
  freeShippingThreshold: number | '';
  shippingDiscountPercentage: number | '';
  shippingDiscountFixedAmount: number | '';
  termsPageId: string;
  termsVersion: number;
  minOrderAmount: number | '';
  productionEstimateDays: number | '';
  deliveryEstimateDays: number | '';
  emailSenderName: string;
  emailSenderAddress: string;
  googleOAuthEnabled: boolean;
  googleClientId: string;
  appleOAuthEnabled: boolean;
  appleClientId: string;
  storefrontConfig: StorefrontConfig;
}

type TabId = 'general' | 'tema' | 'storefront' | 'catalogo' | 'logistica' | 'legal';

const TABS: Array<{ id: TabId; labelKey: string; icon: string }> = [
  { id: 'general', labelKey: 'pages.storeConfig.tabs.general', icon: 'domain' },
  { id: 'tema', labelKey: 'pages.storeConfig.tabs.theme', icon: 'palette' },
  { id: 'storefront', labelKey: 'pages.storeConfig.tabs.storefront', icon: 'view_quilt' },
  { id: 'catalogo', labelKey: 'pages.storeConfig.tabs.catalog', icon: 'shopping_bag' },
  { id: 'logistica', labelKey: 'pages.storeConfig.tabs.gateways', icon: 'account_balance_wallet' },
  { id: 'legal', labelKey: 'pages.storeConfig.tabs.notifications', icon: 'gavel' },
];

type ColorKey =
  | 'primaryColor'
  | 'secondaryColor'
  | 'backgroundColor'
  | 'textColor'
  | 'surfaceColor'
  | 'surfaceMutedColor'
  | 'borderColor'
  | 'errorColor'
  | 'successColor'
  | 'warningColor'
  | 'darkBackgroundColor'
  | 'darkTextColor';

const COLOR_FIELDS: Array<{ key: ColorKey; labelKey: string; hintKey: string; badge: string }> = [
  { key: 'primaryColor', labelKey: 'pages.storeConfig.colors.primary', hintKey: 'pages.storeConfig.colors.primaryHint', badge: 'P' },
  { key: 'secondaryColor', labelKey: 'pages.storeConfig.colors.secondary', hintKey: 'pages.storeConfig.colors.secondaryHint', badge: 'S' },
  { key: 'backgroundColor', labelKey: 'pages.storeConfig.colors.background', hintKey: 'pages.storeConfig.colors.backgroundHint', badge: 'F' },
  { key: 'textColor', labelKey: 'pages.storeConfig.colors.text', hintKey: 'pages.storeConfig.colors.textHint', badge: 'T' },
  { key: 'surfaceColor', labelKey: 'pages.storeConfig.colors.surface', hintKey: 'pages.storeConfig.colors.surfaceHint', badge: 'Sf' },
  { key: 'surfaceMutedColor', labelKey: 'pages.storeConfig.colors.surfaceMuted', hintKey: 'pages.storeConfig.colors.surfaceMutedHint', badge: 'Sm' },
  { key: 'borderColor', labelKey: 'pages.storeConfig.colors.border', hintKey: 'pages.storeConfig.colors.borderHint', badge: 'B' },
  { key: 'errorColor', labelKey: 'pages.storeConfig.colors.error', hintKey: 'pages.storeConfig.colors.errorHint', badge: '!' },
  { key: 'successColor', labelKey: 'pages.storeConfig.colors.success', hintKey: 'pages.storeConfig.colors.successHint', badge: '✓' },
  { key: 'warningColor', labelKey: 'pages.storeConfig.colors.warning', hintKey: 'pages.storeConfig.colors.warningHint', badge: '▲' },
];

const DARK_COLOR_FIELDS: Array<{ key: ColorKey; labelKey: string; hintKey: string; badge: string }> = [
  { key: 'darkBackgroundColor', labelKey: 'pages.storeConfig.colors.darkBackground', hintKey: 'pages.storeConfig.colors.darkBackgroundHint', badge: 'D' },
  { key: 'darkTextColor', labelKey: 'pages.storeConfig.colors.darkText', hintKey: 'pages.storeConfig.colors.darkTextHint', badge: 'T' },
];

const APPEARANCE_OPTIONS = [
  { value: 'LIGHT', labelKey: 'pages.storeConfig.appearance.light' },
  { value: 'DARK', labelKey: 'pages.storeConfig.appearance.dark' },
  { value: 'SYSTEM', labelKey: 'pages.storeConfig.appearance.system' },
];

const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'COP', label: 'COP - Peso Colombiano ($)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'USD', label: 'USD - Dólar Estadounidense ($)' },
  { value: 'MXN', label: 'MXN - Peso Mexicano ($)' },
];

const CARD_CLASS = 'flex flex-col gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm';
const LABEL_CLASS = 'font-label-md text-label-md font-medium text-on-surface';
const CONTROL_CLASS =
  'w-full rounded-lg border-none bg-surface-container-low px-3.5 py-2.5 font-body-md text-body-md text-on-surface shadow-sm transition-all focus:bg-surface-container-lowest focus:outline-none';
const CONTROL_SM_CLASS =
  'w-full rounded-lg border-none bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none';
const NUMBER_CLASS = `${CONTROL_CLASS} font-numeric-tabular`;

function buildInitialValues(config: Record<string, unknown> | null | undefined): StoreConfigFormValues {
  const socialLinks = config?.socialLinks as Record<string, unknown> | null | undefined;
  return {
    name: (config?.name as string) ?? '',
    description: (config?.description as string) ?? '',
    logoUrl: (config?.logoUrl as string) ?? '',
    faviconUrl: (config?.faviconUrl as string) ?? '',
    primaryColor: (config?.primaryColor as string) ?? '#228be6',
    secondaryColor: (config?.secondaryColor as string) ?? '#15aabf',
    backgroundColor: (config?.backgroundColor as string) ?? '#ffffff',
    textColor: (config?.textColor as string) ?? '#1a1a1a',
    appearanceMode: (config?.appearanceMode as string) ?? 'LIGHT',
    surfaceColor: (config?.surfaceColor as string) ?? '#ffffff',
    surfaceMutedColor: (config?.surfaceMutedColor as string) ?? '#f6f3f2',
    borderColor: (config?.borderColor as string) ?? '#0d0d0d',
    errorColor: (config?.errorColor as string) ?? '#e03131',
    successColor: (config?.successColor as string) ?? '#2f9e44',
    warningColor: (config?.warningColor as string) ?? '#f76707',
    darkBackgroundColor: (config?.darkBackgroundColor as string) ?? '#0d0d0d',
    darkTextColor: (config?.darkTextColor as string) ?? '#f5f5f5',
    heroImageUrl: (config?.heroImageUrl as string) ?? '',
    heroTitle: (config?.heroTitle as string) ?? '',
    heroSubtitle: (config?.heroSubtitle as string) ?? '',
    contactEmail: (config?.contactEmail as string) ?? '',
    contactPhone: (config?.contactPhone as string) ?? '',
    currencyCode: (config?.currencyCode as string) ?? 'COP',
    socialLinks:
      socialLinks && Object.keys(socialLinks).length > 0 ? JSON.stringify(socialLinks, null, 2) : '',
    maintenanceMode: (config?.maintenanceMode as boolean) ?? false,
    maintenanceMessage: (config?.maintenanceMessage as string) ?? '',
    isActive: (config?.isActive as boolean) ?? true,
    enableCustomDesigns: (config?.enableCustomDesigns as boolean) ?? true,
    enableNewsletter: (config?.enableNewsletter as boolean) ?? true,
    enableCatalogFilters: (config?.enableCatalogFilters as boolean) ?? true,
    emailProvider: (config?.emailProvider as string) ?? 'smtp',
    paymentProvider: (config?.paymentProvider as string) ?? 'stripe',
    boldApiKey: (config?.boldApiKey as string) ?? '',
    boldSecretKey: '',
    boldSandbox: (config?.boldSandbox as boolean) ?? false,
    stripePublishableKey: (config?.stripePublishableKey as string) ?? '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    smtpHost: (config?.smtpHost as string) ?? '',
    smtpPort: (config?.smtpPort as number) ?? '',
    smtpUser: (config?.smtpUser as string) ?? '',
    smtpPass: '',
    smtpSecure: (config?.smtpSecure as boolean) ?? false,
    smtpFrom: (config?.smtpFrom as string) ?? '',
    resendApiKey: '',
    resendFrom: (config?.resendFrom as string) ?? '',
    shippingProvider: (config?.shippingProvider as string) ?? 'flatRate',
    shippingBaseCost: (config?.shippingBaseCost as number) ?? 10_000,
    freeShippingThreshold: (config?.freeShippingThreshold as number) ?? '',
    shippingDiscountPercentage: (config?.shippingDiscountPercentage as number) ?? '',
    shippingDiscountFixedAmount: (config?.shippingDiscountFixedAmount as number) ?? '',
    termsPageId: (config?.termsPageId as string) ?? '',
    termsVersion: (config?.termsVersion as number) ?? 1,
    minOrderAmount: (config?.minOrderAmount as number) ?? '',
    productionEstimateDays: (config?.productionEstimateDays as number) ?? '',
    deliveryEstimateDays: (config?.deliveryEstimateDays as number) ?? '',
    emailSenderName: (config?.emailSenderName as string) ?? '',
    emailSenderAddress: (config?.emailSenderAddress as string) ?? '',
    googleOAuthEnabled: (config?.googleOAuthEnabled as boolean) ?? false,
    googleClientId: (config?.googleClientId as string) ?? '',
    appleOAuthEnabled: (config?.appleOAuthEnabled as boolean) ?? false,
    appleClientId: (config?.appleClientId as string) ?? '',
    storefrontConfig: StorefrontConfigSchema.parse(
      (config?.storefrontConfig as Record<string, unknown>) ?? {},
    ),
  };
}

function getContrastText(hex: string) {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const value = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(value)) return '#ffffff';
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#000000' : '#ffffff';
}

function getStoreUrl() {
  const raw = process.env.NEXT_PUBLIC_WEB_URL;
  if (!raw) return 'http://localhost:3000';
  const cleaned = raw.replace(/^\[|\]$/g, '').split(',')[0].trim();
  return cleaned || 'http://localhost:3000';
}

function FieldShell({
  label,
  description,
  className = '',
  children,
}: {
  label: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className={LABEL_CLASS}>{label}</span>
      {children}
      {description && (
        <span className="font-label-sm text-label-sm text-on-surface-variant/80">{description}</span>
      )}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3">
      <div>
        <span className={`${LABEL_CLASS} block`}>{title}</span>
        <p className="font-body-sm text-[12px] text-on-surface-variant">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

export default function StoreConfigPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const config = useStoreConfig();
  const { user: platformUser } = usePlatformSession();
  // Solo los superadmins de plataforma gestionan API keys/proveedores.
  const canManageProviders = Boolean(platformUser);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  const { data: freshConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/store-config');
      return data;
    },
    initialData: config as unknown as Record<string, unknown>,
  });

  const { data: pages } = useQuery({
    queryKey: ['admin-pages-for-terms'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/pages');
      return (data?.data ?? []) as Array<{ id: string; title: string; slug: string }>;
    },
  });

  const { data: activeProducts = 0 } = useQuery({
    queryKey: ['admin-products-active-count'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/products', {
        params: { query: { limit: '1', isActive: 'true' } },
      });
      return data?.meta?.total ?? 0;
    },
    staleTime: 60_000,
  });

  // Operadores de paquetería: credenciales del carrier (solo Super Admin).
  const { data: shippingCredentials } = useQuery({
    queryKey: ['admin-shipping-credentials'],
    enabled: canManageProviders,
    staleTime: 60_000,
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

  const carrierLabel = (() => {
    const provider = shippingCredentials?.provider?.trim();
    if (!provider) return t('pages.storeConfig.carrierNone');
    const internal = ['flatrate', 'freethreshold', 'storeconfig'];
    return internal.includes(provider.toLowerCase()) ? t('pages.storeConfig.carrierInternal') : provider;
  })();

  const form = useForm<StoreConfigFormValues>({
    initialValues: buildInitialValues(freshConfig as unknown as Record<string, unknown> | undefined),
  });

  const update = useMutation({
    mutationFn: async (values: StoreConfigFormValues) => {
      const { storefrontConfig, ...rest } = values;
      const body = {
        ...rest,
        freeShippingThreshold: values.freeShippingThreshold === '' ? undefined : values.freeShippingThreshold,
        shippingDiscountPercentage:
          values.shippingDiscountPercentage === '' ? undefined : values.shippingDiscountPercentage,
        shippingDiscountFixedAmount:
          values.shippingDiscountFixedAmount === '' ? undefined : values.shippingDiscountFixedAmount,
        termsPageId: values.termsPageId || undefined,
        socialLinks: values.socialLinks.trim() === '' ? undefined : values.socialLinks,
        minOrderAmount: values.minOrderAmount === '' ? undefined : values.minOrderAmount,
        productionEstimateDays: values.productionEstimateDays === '' ? undefined : values.productionEstimateDays,
        deliveryEstimateDays: values.deliveryEstimateDays === '' ? undefined : values.deliveryEstimateDays,
        smtpPort: values.smtpPort === '' ? undefined : values.smtpPort,
        storefrontConfig: JSON.stringify(storefrontConfig),
      };
      const { error } = await apiClient.PATCH('/store-config', {
        body: body as never,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      form.resetDirty(variables);
      notifySuccess({ title: t('pages.storeConfig.toastSaved') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.storeConfig.toastSaveError'), message: getApiErrorMessage(error) });
    },
  });

  const submit = () => {
    form.onSubmit((values) => update.mutate(values))();
  };

  useHotkeys([
    [
      'mod+S',
      (event) => {
        event.preventDefault();
        submit();
      },
    ],
  ]);

  const resetToLoaded = () => {
    const loaded = buildInitialValues(freshConfig as unknown as Record<string, unknown> | undefined);
    form.setValues(loaded);
    form.resetDirty(loaded);
    form.resetTouched();
  };

  const isDirty = form.isDirty();
  const selectedTermsPage = (pages ?? []).find((page) => page.id === form.values.termsPageId);
  const currencyOptions = CURRENCY_OPTIONS.some((option) => option.value === form.values.currencyCode)
    ? CURRENCY_OPTIONS
    : [
        { value: form.values.currencyCode, label: form.values.currencyCode },
        ...CURRENCY_OPTIONS,
      ];

  return (
    <>
      <form
        onSubmit={form.onSubmit((values) => update.mutate(values))}
        className="mx-auto flex w-full max-w-7xl flex-col gap-8"
      >
        <PageHeader
          breadcrumb={[{ label: t('pages.storeConfig.breadcrumbSettings') }, { label: t('pages.storeConfig.breadcrumbStoreConfig') }]}
          title={
            <span className="flex flex-wrap items-baseline gap-3">
              <span>{t('pages.storeConfig.title')}</span>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.storeConfig.versionBadge')}
              </span>
            </span>
          }
          subtitle={t('pages.storeConfig.subtitle')}
          actions={
            <>
              <Button variant="secondary" icon="history" onClick={resetToLoaded}>
                {t('pages.storeConfig.discard')}
              </Button>
              <Button
                icon="save"
                className="px-5"
                onClick={submit}
                disabled={update.isPending}
              >
                <span>{update.isPending ? t('common.saving') : t('pages.storeConfig.saveChanges')}</span>
                <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 font-label-sm text-[10px]">⌘S</kbd>
              </Button>
            </>
          }
        />

        {/* Pestañas horizontales */}
        <SegmentedTabs
          value={activeTab}
          options={TABS.map((tab) => ({
            value: tab.id,
            label: (
              <span className="flex items-center gap-2">
                <Icon name={tab.icon} className="text-[18px]" />
                <span>{t(tab.labelKey)}</span>
              </span>
            ),
          }))}
          onChange={(value) => setActiveTab(value)}
          variant="primary"
          size="md"
          layoutId="store-config-sections"
          className="w-full overflow-x-auto"
        />

        <div className={`flex flex-col gap-8 ${isDirty ? 'pb-28' : ''}`}>
          {/* TAB 1: GENERAL & MARCA */}
          {activeTab === 'general' && (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-8">
                <Reveal>
                <div className={CARD_CLASS}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.brandDataTitle')}</h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('pages.storeConfig.brandDataSubtitle')}
                      </p>
                    </div>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-uppercase text-label-uppercase text-on-surface">
                      {t('pages.storeConfig.publicBadge')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldShell label={t('pages.storeConfig.storeName')} className="md:col-span-2">
                      <input type="text" className={CONTROL_CLASS} {...form.getInputProps('name')} />
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.storeDescription')} className="md:col-span-2">
                      <textarea rows={3} className={`${CONTROL_CLASS} resize-none`} {...form.getInputProps('description')} />
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.contactEmail')}>
                      <div className="relative flex items-center">
                        <Icon
                          name="mail"
                          className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant"
                        />
                        <input type="email" className={`${CONTROL_SM_CLASS} pl-9`} {...form.getInputProps('contactEmail')} />
                      </div>
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.contactPhone')}>
                      <div className="relative flex items-center">
                        <Icon
                          name="call"
                          className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant"
                        />
                        <input type="tel" className={`${CONTROL_SM_CLASS} pl-9`} {...form.getInputProps('contactPhone')} />
                      </div>
                    </FieldShell>
                  </div>
                </div>
                </Reveal>

                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.storeConfig.imageAssetsTitle')}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.imageAssetsSubtitle')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          {t('pages.storeConfig.mainLogo')}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.storeConfig.logoSpec')}</span>
                      </div>
                      <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                        {form.values.logoUrl ? (
                          <img
                            src={form.values.logoUrl}
                            alt={t('pages.storeConfig.logoAlt')}
                            className="max-h-12 w-auto object-contain"
                          />
                        ) : (
                          <Icon name="image" className="text-[32px] text-on-surface-variant" />
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="https://.../logo.webp"
                        className="w-full truncate rounded-lg border-none bg-surface-container-lowest px-3 py-1.5 font-body-sm text-[12px] text-on-surface-variant focus:outline-none"
                        {...form.getInputProps('logoUrl')}
                      />
                    </div>
                    <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          {t('pages.storeConfig.favicon')}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.storeConfig.faviconSpec')}</span>
                      </div>
                      <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                        {form.values.faviconUrl ? (
                          <img
                            src={form.values.faviconUrl}
                            alt={t('pages.storeConfig.faviconAlt')}
                            className="h-12 w-12 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary font-headline-sm text-headline-sm text-on-primary">
                            {(form.values.name.trim().charAt(0) || 'N').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="https://.../favicon.png"
                        className="w-full truncate rounded-lg border-none bg-surface-container-lowest px-3 py-1.5 font-body-sm text-[12px] text-on-surface-variant focus:outline-none"
                        {...form.getInputProps('faviconUrl')}
                      />
                    </div>
                  </div>
                </div>
                </Reveal>

                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.storeStatusTitle')}</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.storeStatusSubtitle')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3.5">
                    <ToggleRow
                      title={t('pages.storeConfig.storeActive')}
                      description={t('pages.storeConfig.storeActiveHint')}
                      checked={form.values.isActive}
                      onChange={(checked) => form.setFieldValue('isActive', checked)}
                    />
                    <ToggleRow
                      title={t('pages.storeConfig.maintenanceMode')}
                      description={t('pages.storeConfig.maintenanceModeHint')}
                      checked={form.values.maintenanceMode}
                      onChange={(checked) => form.setFieldValue('maintenanceMode', checked)}
                    />
                  </div>
                  {form.values.maintenanceMode && (
                    <FieldShell label={t('pages.storeConfig.maintenanceMessage')}>
                      <textarea
                        rows={2}
                        placeholder={t('pages.storeConfig.maintenancePlaceholder')}
                        className={`${CONTROL_CLASS} resize-none`}
                        {...form.getInputProps('maintenanceMessage')}
                      />
                    </FieldShell>
                  )}
                </div>
                </Reveal>
              </div>

              <div className="flex flex-col gap-6 lg:col-span-4">
                <Reveal>
                <div className={CARD_CLASS}>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.currencyLocation')}</h3>
                  <div className="flex flex-col gap-4">
                    <FieldShell label={t('pages.storeConfig.mainCurrency')}>
                      <select className={CONTROL_CLASS} {...form.getInputProps('currencyCode')}>
                        {currencyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FieldShell>
                    <FieldShell
                      label={t('pages.storeConfig.commercialTimezone')}
                      description={t('pages.storeConfig.commercialTimezoneHint')}
                    >
                      <select
                        className={`${CONTROL_CLASS} cursor-not-allowed opacity-60`}
                        disabled
                        title={t('common.comingSoon')}
                        value=""
                        onChange={() => undefined}
                      >
                        <option value="">{t('pages.storeConfig.unsupportedApi')}</option>
                      </select>
                    </FieldShell>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-surface-container-low p-4">
                    <div className="flex flex-col">
                      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                        {t('pages.storeConfig.catalogStatus')}
                      </span>
                      <span className="font-numeric-tabular text-numeric-tabular font-bold text-on-surface">
                        {t('pages.storeConfig.activeSkus').replace('{{count}}', String(activeProducts))}
                      </span>
                    </div>
                    <span className="h-3 w-3 rounded-full bg-secondary-fixed-dim" />
                  </div>
                </div>
                </Reveal>

                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.socialLinksTitle')}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.socialLinksHint')}
                    </p>
                  </div>
                  <textarea
                    rows={5}
                    placeholder={'{\n  "instagram": "https://instagram.com/..."\n}'}
                    className={`${CONTROL_CLASS} resize-none font-mono text-[12px]`}
                    {...form.getInputProps('socialLinks')}
                  />
                </div>
                </Reveal>

                <Reveal>
                <div className="flex flex-col gap-3 rounded-xl bg-surface-container-high/40 p-6">
                  <div className="flex items-center gap-2 text-on-surface">
                    <Icon name="verified" className="text-[20px]" />
                    <span className="font-label-md text-label-md font-semibold">{t('pages.storeConfig.verifiedInstance')}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.storeConfig.verifiedInstanceBody')}
                  </p>
                </div>
                </Reveal>
              </div>
            </section>
          )}

          {/* TAB 2: TEMA & APARIENCIA */}
          {activeTab === 'tema' && (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-8">
                <Reveal>
                <div className={CARD_CLASS}>
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        {t('pages.storeConfig.appearanceTitle')}
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('pages.storeConfig.appearanceSubtitle')}
                      </p>
                    </div>
                    <SegmentedTabs
                      value={form.values.appearanceMode}
                      options={APPEARANCE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                      onChange={(value) => form.setFieldValue('appearanceMode', value)}
                      size="md"
                      layoutId="store-config-appearance"
                      className="w-fit"
                    />
                  </div>

                  <div className="flex flex-col gap-4 pt-2">
                    <span className="font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                      {t('pages.storeConfig.semanticPalette')}
                    </span>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {COLOR_FIELDS.map((field) => {
                        const value = form.values[field.key];
                        return (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3.5"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold shadow-sm"
                                style={{ backgroundColor: value, color: getContrastText(value) }}
                              >
                                {field.badge}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-label-md text-label-md font-medium text-on-surface">
                                  {t(field.labelKey)}
                                </span>
                                <span className="font-body-sm text-[12px] text-on-surface-variant">{t(field.hintKey)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-numeric-tabular text-[13px] text-on-surface">
                                {value.toUpperCase()}
                              </span>
                              <input
                                type="color"
                                value={value}
                                onChange={(event) => form.setFieldValue(field.key, event.currentTarget.value)}
                                className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-2">
                    <span className="font-label-uppercase text-label-uppercase tracking-wider text-on-surface-variant">
                      {t('pages.storeConfig.darkMode')}
                    </span>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {DARK_COLOR_FIELDS.map((field) => {
                        const value = form.values[field.key];
                        return (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3.5"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold shadow-sm"
                                style={{ backgroundColor: value, color: getContrastText(value) }}
                              >
                                {field.badge}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-label-md text-label-md font-medium text-on-surface">
                                  {t(field.labelKey)}
                                </span>
                                <span className="font-body-sm text-[12px] text-on-surface-variant">{t(field.hintKey)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-numeric-tabular text-[13px] text-on-surface">
                                {value.toUpperCase()}
                              </span>
                              <input
                                type="color"
                                value={value}
                                onChange={(event) => form.setFieldValue(field.key, event.currentTarget.value)}
                                className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="rounded-lg bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.storeConfig.fontsNotice')}
                  </p>
                </div>
                </Reveal>
              </div>

              <div className="flex flex-col gap-6 lg:col-span-4">
                <Reveal>
                <div className={CARD_CLASS}>
                  <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                    {t('pages.storeConfig.sandboxTitle')}
                  </span>
                  <div
                    className="flex flex-col gap-4 rounded-xl p-4"
                    style={{ backgroundColor: form.values.surfaceMutedColor }}
                  >
                    <div
                      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg"
                      style={{ backgroundColor: form.values.backgroundColor }}
                    >
                      <Icon
                        name="checkroom"
                        className="text-[64px]"
                        style={{ color: form.values.textColor }}
                      />
                      <span
                        className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 font-label-uppercase text-[10px]"
                        style={{
                          backgroundColor: form.values.primaryColor,
                          color: getContrastText(form.values.primaryColor),
                        }}
                      >
                        DROP 01
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-headline-sm text-headline-sm" style={{ color: form.values.textColor }}>
                        Kimono Hybrid Jacket
                      </span>
                      <span className="font-numeric-tabular text-body-md opacity-70" style={{ color: form.values.textColor }}>
                        $480.000 COP
                      </span>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-lg py-2 font-label-md text-label-md shadow-sm"
                      style={{
                        backgroundColor: form.values.primaryColor,
                        color: getContrastText(form.values.primaryColor),
                      }}
                    >
                      {t('pages.storeConfig.sandboxAddToCart')}
                    </button>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant">
                    {t('pages.storeConfig.sandboxHint')}
                  </p>
                </div>
                </Reveal>
              </div>
            </section>
          )}

          {/* TAB 3: STOREFRONT & LAYOUT */}
          {activeTab === 'storefront' && (
            <section className="flex flex-col gap-6">
              <Reveal>
              <div className={CARD_CLASS}>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.heroTitle')}</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.storeConfig.heroSubtitle')}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FieldShell label={t('pages.storeConfig.heroImageUrl')} className="md:col-span-3">
                    <input type="text" className={CONTROL_CLASS} {...form.getInputProps('heroImageUrl')} />
                  </FieldShell>
                  <FieldShell label={t('pages.storeConfig.heroHeading')}>
                    <input type="text" className={CONTROL_CLASS} {...form.getInputProps('heroTitle')} />
                  </FieldShell>
                  <FieldShell label={t('pages.storeConfig.heroSubheading')} className="md:col-span-2">
                    <input type="text" className={CONTROL_CLASS} {...form.getInputProps('heroSubtitle')} />
                  </FieldShell>
                </div>
              </div>
              </Reveal>

              <Reveal>
              <div className={CARD_CLASS}>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.builderTitle')}</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.storeConfig.builderSubtitle')}
                  </p>
                </div>
                <StorefrontConfigSection form={form as never} />
              </div>
              </Reveal>
            </section>
          )}

          {/* TAB 4: CATÁLOGO & CHECKOUT */}
          {activeTab === 'catalogo' && (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Reveal>
              <div className={CARD_CLASS}>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.catalogFeaturesTitle')}</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.storeConfig.catalogFeaturesSubtitle')}
                  </p>
                </div>
                <div className="flex flex-col gap-3.5">
                  <ToggleRow
                    title={t('pages.storeConfig.enableCatalogFilters')}
                    description={t('pages.storeConfig.enableCatalogFiltersHint')}
                    checked={form.values.enableCatalogFilters}
                    onChange={(checked) => form.setFieldValue('enableCatalogFilters', checked)}
                  />
                  <ToggleRow
                    title={t('pages.storeConfig.enableCustomizer')}
                    description={t('pages.storeConfig.enableCustomizerHint')}
                    checked={form.values.enableCustomDesigns}
                    onChange={(checked) => form.setFieldValue('enableCustomDesigns', checked)}
                  />
                  <ToggleRow
                    title={t('pages.storeConfig.enableNewsletter')}
                    description={t('pages.storeConfig.enableNewsletterHint')}
                    checked={form.values.enableNewsletter}
                    onChange={(checked) => form.setFieldValue('enableNewsletter', checked)}
                  />
                </div>
                <p className="rounded-lg bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.storeConfig.catalogCardsNotice')}
                </p>
              </div>
              </Reveal>

              <Reveal>
              <div className={CARD_CLASS}>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.checkoutTitle')}</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.storeConfig.checkoutSubtitle')}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldShell label={t('pages.storeConfig.minOrderAmount')} description={t('pages.storeConfig.minOrderAmountHint')} className="md:col-span-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      className={NUMBER_CLASS}
                      value={form.values.minOrderAmount}
                      onChange={(event) => {
                        const raw = event.currentTarget.value;
                        form.setFieldValue('minOrderAmount', raw === '' ? '' : Number(raw));
                      }}
                    />
                  </FieldShell>
                  <FieldShell label={t('pages.storeConfig.productionDays')}>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="—"
                      className={NUMBER_CLASS}
                      value={form.values.productionEstimateDays}
                      onChange={(event) => {
                        const raw = event.currentTarget.value;
                        form.setFieldValue('productionEstimateDays', raw === '' ? '' : Number(raw));
                      }}
                    />
                  </FieldShell>
                  <FieldShell label={t('pages.storeConfig.deliveryDays')}>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="—"
                      className={NUMBER_CLASS}
                      value={form.values.deliveryEstimateDays}
                      onChange={(event) => {
                        const raw = event.currentTarget.value;
                        form.setFieldValue('deliveryEstimateDays', raw === '' ? '' : Number(raw));
                      }}
                    />
                  </FieldShell>
                </div>
                <p className="rounded-lg bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.storeConfig.checkoutNotice')}
                </p>
              </div>
              </Reveal>
            </section>
          )}

          {/* TAB 5: PASARELAS & LOGÍSTICA */}
          {activeTab === 'logistica' && (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-8">
                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.gatewaysTitle')}</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.gatewaysSubtitle')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-lowest text-xl font-bold shadow-sm" style={{ color: '#635BFF' }}>
                          S
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md text-label-md font-semibold text-on-surface">
                              Stripe
                            </span>
                            <StatusPill
                              label={
                                form.values.paymentProvider === 'stripe'
                                  ? (freshConfig as { stripeSecretConfigured?: boolean } | undefined)?.stripeSecretConfigured
                                    ? t('pages.storeConfig.connected')
                                    : t('pages.storeConfig.pendingConfig')
                                  : t('pages.storeConfig.disconnected')
                              }
                              tone={form.values.paymentProvider === 'stripe' ? 'success' : 'neutral'}
                            />
                          </div>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">
                            {t('pages.storeConfig.stripeDescription')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => form.setFieldValue('paymentProvider', 'stripe')}
                        disabled={form.values.paymentProvider === 'stripe' || !canManageProviders}
                        title={!canManageProviders ? t('pages.storeConfig.providersLocked') : undefined}
                        className="rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm text-on-surface shadow-sm transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {form.values.paymentProvider === 'stripe'
                          ? t('pages.storeConfig.stripeActive')
                          : t('pages.storeConfig.stripeUse')}
                      </button>
                    </div>

                    {!canManageProviders && (
                      <p className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        <Icon name="lock" className="text-[14px]" />
                        {t('pages.storeConfig.providersLocked')}
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FieldShell
                        label={t('pages.storeConfig.stripePublishableKey')}
                        description={t('pages.storeConfig.stripePublishableKeyHint')}
                      >
                        <input
                          type="text"
                          className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                          placeholder={t('pages.storeConfig.stripePublishableKeyPlaceholder')}
                          disabled={!canManageProviders}
                          {...form.getInputProps('stripePublishableKey')}
                        />
                      </FieldShell>
                      <FieldShell
                        label={t('pages.storeConfig.stripeSecretKey')}
                        description={
                          (freshConfig as { stripeSecretConfigured?: boolean } | undefined)?.stripeSecretConfigured
                            ? t('pages.storeConfig.stripeSecretConfigured')
                            : t('pages.storeConfig.stripeSecretHint')
                        }
                      >
                        <input
                          type="password"
                          className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                          placeholder={t('pages.storeConfig.stripeSecretPlaceholder')}
                          disabled={!canManageProviders}
                          {...form.getInputProps('stripeSecretKey')}
                        />
                      </FieldShell>
                      <FieldShell
                        label={t('pages.storeConfig.stripeWebhookSecret')}
                        description={
                          (freshConfig as { stripeWebhookConfigured?: boolean } | undefined)?.stripeWebhookConfigured
                            ? t('pages.storeConfig.stripeWebhookConfigured')
                            : t('pages.storeConfig.stripeWebhookHint')
                        }
                        className="sm:col-span-2"
                      >
                        <input
                          type="password"
                          className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                          placeholder={t('pages.storeConfig.stripeWebhookPlaceholder')}
                          disabled={!canManageProviders}
                          {...form.getInputProps('stripeWebhookSecret')}
                        />
                      </FieldShell>
                    </div>
                  </div>

                  {/* Bold (Colombia) — botón de pagos */}
                  <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-lowest text-xl font-bold shadow-sm"
                          style={{ color: '#121212' }}
                        >
                          B
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md text-label-md font-semibold text-on-surface">
                              {t('pages.storeConfig.boldTitle')}
                            </span>
                            <StatusPill
                              label={
                                form.values.paymentProvider === 'bold'
                                  ? form.values.boldApiKey
                                    ? t('pages.storeConfig.connected')
                                    : t('pages.storeConfig.pendingConfig')
                                  : t('pages.storeConfig.disconnected')
                              }
                              tone={form.values.paymentProvider === 'bold' ? 'success' : 'neutral'}
                            />
                          </div>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">
                            {t('pages.storeConfig.boldDescription')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => form.setFieldValue('paymentProvider', 'bold')}
                        disabled={form.values.paymentProvider === 'bold' || !canManageProviders}
                        title={!canManageProviders ? t('pages.storeConfig.providersLocked') : undefined}
                        className="rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm text-on-surface shadow-sm transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {form.values.paymentProvider === 'bold'
                          ? t('pages.storeConfig.boldActive')
                          : t('pages.storeConfig.boldUse')}
                      </button>
                    </div>

                    {!canManageProviders && (
                      <p className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        <Icon name="lock" className="text-[14px]" />
                        {t('pages.storeConfig.providersLocked')}
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FieldShell
                        label={t('pages.storeConfig.boldApiKey')}
                        description={t('pages.storeConfig.boldApiKeyHint')}
                      >
                        <input
                          type="text"
                          className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                          placeholder={t('pages.storeConfig.boldApiKeyPlaceholder')}
                          disabled={!canManageProviders}
                          {...form.getInputProps('boldApiKey')}
                        />
                      </FieldShell>
                      <FieldShell
                        label={t('pages.storeConfig.boldSecretKey')}
                        description={
                          (freshConfig as { boldSecretConfigured?: boolean } | undefined)?.boldSecretConfigured
                            ? t('pages.storeConfig.boldSecretConfigured')
                            : t('pages.storeConfig.boldSecretHint')
                        }
                      >
                        <input
                          type="password"
                          className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                          placeholder={t('pages.storeConfig.boldSecretPlaceholder')}
                          disabled={!canManageProviders}
                          {...form.getInputProps('boldSecretKey')}
                        />
                      </FieldShell>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.values.boldSandbox}
                        onChange={() => form.setFieldValue('boldSandbox', !form.values.boldSandbox)}
                        label={t('pages.storeConfig.boldSandbox')}
                        disabled={!canManageProviders}
                      />
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('pages.storeConfig.boldSandbox')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-lowest shadow-sm">
                        <Icon name="payments" className="text-[22px] text-on-surface-variant" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-label-md text-label-md font-semibold text-on-surface">
                            {t('pages.storeConfig.cashOnDelivery')}
                          </span>
                          <StatusPill
                            label={form.values.paymentProvider === 'cash' ? t('pages.storeConfig.connected') : t('pages.storeConfig.unavailable')}
                            tone={form.values.paymentProvider === 'cash' ? 'success' : 'neutral'}
                          />
                        </div>
                        <span className="font-body-sm text-[12px] text-on-surface-variant">
                          {t('pages.storeConfig.cashNoCredentials')}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      title={t('common.comingSoon')}
                      className="cursor-not-allowed rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm text-on-surface opacity-60 shadow-sm"
                    >
                      {t('pages.storeConfig.configureApi')}
                    </button>
                  </div>

                  <FieldShell label={t('pages.storeConfig.activeGateway')}>
                    <select
                      className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                      disabled={!canManageProviders}
                      {...form.getInputProps('paymentProvider')}
                    >
                      {form.values.paymentProvider !== 'stripe' && form.values.paymentProvider !== 'bold' && (
                        <option value={form.values.paymentProvider}>{form.values.paymentProvider}</option>
                      )}
                      <option value="stripe">Stripe</option>
                      <option value="bold">Bold (Botón de pagos)</option>
                    </select>
                    {!canManageProviders && (
                      <p className="mt-1 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        <Icon name="lock" className="text-[14px]" />
                        {t('pages.storeConfig.providersLocked')}
                      </p>
                    )}
                  </FieldShell>
                </div>
                </Reveal>

                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.storeConfig.ratesTitle')}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.ratesSubtitle')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldShell label={t('pages.storeConfig.shippingPolicy')} className="md:col-span-2">
                      <select className={CONTROL_CLASS} {...form.getInputProps('shippingProvider')}>
                        <option value="flatRate">{t('pages.storeConfig.shippingFlatRate')}</option>
                        <option value="freeThreshold">{t('pages.storeConfig.shippingFreeThreshold')}</option>
                        <option value="discount">{t('pages.storeConfig.shippingDiscount')}</option>
                      </select>
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.shippingBaseCost')}>
                      <input
                        type="number"
                        min={0}
                        className={NUMBER_CLASS}
                        value={form.values.shippingBaseCost}
                        onChange={(event) =>
                          form.setFieldValue(
                            'shippingBaseCost',
                            event.currentTarget.value === '' ? 0 : Number(event.currentTarget.value),
                          )
                        }
                      />
                    </FieldShell>
                    {form.values.shippingProvider !== 'flatRate' && (
                      <FieldShell label={t('pages.storeConfig.freeShippingThreshold')}>
                        <input
                          type="number"
                          min={0}
                          className={NUMBER_CLASS}
                          value={form.values.freeShippingThreshold}
                          onChange={(event) => {
                            const raw = event.currentTarget.value;
                            form.setFieldValue('freeShippingThreshold', raw === '' ? '' : Number(raw));
                          }}
                        />
                      </FieldShell>
                    )}
                    {form.values.shippingProvider === 'discount' && (
                      <>
                        <FieldShell label={t('pages.storeConfig.shippingDiscountPercentage')}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className={NUMBER_CLASS}
                            value={form.values.shippingDiscountPercentage}
                            onChange={(event) => {
                              const raw = event.currentTarget.value;
                              form.setFieldValue('shippingDiscountPercentage', raw === '' ? '' : Number(raw));
                            }}
                          />
                        </FieldShell>
                        <FieldShell label={t('pages.storeConfig.shippingDiscountFixed')}>
                          <input
                            type="number"
                            min={0}
                            className={NUMBER_CLASS}
                            value={form.values.shippingDiscountFixedAmount}
                            onChange={(event) => {
                              const raw = event.currentTarget.value;
                              form.setFieldValue('shippingDiscountFixedAmount', raw === '' ? '' : Number(raw));
                            }}
                          />
                        </FieldShell>
                      </>
                    )}
                  </div>
                  <p className="rounded-lg bg-surface-container-low p-3 font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.storeConfig.logisticsNotice')}
                  </p>
                </div>
                </Reveal>
              </div>

              <div className="flex flex-col gap-6 lg:col-span-4">
                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.storeConfig.oauthTitle')}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.oauthSubtitle')}
                    </p>
                  </div>
                  <ToggleRow
                    title={t('pages.storeConfig.googleSignIn')}
                    description={t('pages.storeConfig.googleSignInHint')}
                    checked={form.values.googleOAuthEnabled}
                    onChange={(checked) => form.setFieldValue('googleOAuthEnabled', checked)}
                    disabled={!canManageProviders}
                  />
                  {form.values.googleOAuthEnabled && (
                    <FieldShell label={t('pages.storeConfig.googleClientId')}>
                      <input
                        type="text"
                        placeholder="xxxxx.apps.googleusercontent.com"
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('googleClientId')}
                      />
                    </FieldShell>
                  )}
                  <ToggleRow
                    title={t('pages.storeConfig.appleSignIn')}
                    description={t('pages.storeConfig.appleSignInHint')}
                    checked={form.values.appleOAuthEnabled}
                    onChange={(checked) => form.setFieldValue('appleOAuthEnabled', checked)}
                    disabled={!canManageProviders}
                  />
                  {form.values.appleOAuthEnabled && (
                    <FieldShell label={t('pages.storeConfig.appleServiceId')}>
                      <input
                        type="text"
                        placeholder="com.tienda.web"
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('appleClientId')}
                      />
                    </FieldShell>
                  )}
                </div>
                </Reveal>

                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.storeConfig.carriersTitle')}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.carriersSubtitle')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          {carrierLabel}
                        </span>
                        <span className="font-body-sm text-[12px] text-on-surface-variant">
                          {shippingCredentials?.accountId
                            ? `${t('pages.storeConfig.carrierAccount')}: ${shippingCredentials.accountId}`
                            : t('pages.storeConfig.carrierNoAccount')}
                        </span>
                      </div>
                      <StatusPill
                        label={
                          shippingCredentials?.hasApiKey
                            ? t('pages.storeConfig.carrierApiActive')
                            : t('pages.storeConfig.carrierManual')
                        }
                        tone={shippingCredentials?.hasApiKey ? 'success' : 'neutral'}
                      />
                    </div>
                    {canManageProviders ? (
                      <Link
                        href="/shipping-options"
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm text-on-surface shadow-sm transition-colors hover:bg-surface-container"
                      >
                        <Icon name="key" className="text-[16px]" />
                        {t('pages.storeConfig.carrierManage')}
                      </Link>
                    ) : (
                      <p className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                        <Icon name="lock" className="text-[14px]" />
                        {t('pages.storeConfig.providersLocked')}
                      </p>
                    )}
                  </div>
                </div>
                </Reveal>
              </div>
            </section>
          )}

          {/* TAB 6: NOTIFICACIONES & LEGAL */}
          {activeTab === 'legal' && (
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="flex flex-col gap-6 lg:col-span-8">
                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.storeConfig.notificationsTitle')}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.notificationsSubtitle')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldShell label={t('pages.storeConfig.emailProvider')} className="md:col-span-2">
                      <select
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('emailProvider')}
                      >
                        <option value="smtp">SMTP (Mailgun, Gmail, etc.)</option>
                        <option value="resend">Resend</option>
                      </select>
                      {!canManageProviders && (
                        <p className="mt-1 flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                          <Icon name="lock" className="text-[14px]" />
                          {t('pages.storeConfig.providersLocked')}
                        </p>
                      )}
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.senderName')}>
                      <input
                        type="text"
                        placeholder="NÖVA"
                        className={CONTROL_CLASS}
                        {...form.getInputProps('emailSenderName')}
                      />
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.senderEmail')}>
                      <input
                        type="email"
                        placeholder="noreply@tienda.com"
                        className={CONTROL_CLASS}
                        {...form.getInputProps('emailSenderAddress')}
                      />
                    </FieldShell>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-outline-variant/30 pt-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                        {t('pages.storeConfig.smtpTitle')}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('pages.storeConfig.smtpSubtitle')}
                      </p>
                    </div>
                    <FieldShell label={t('pages.storeConfig.smtpHost')}>
                      <input
                        type="text"
                        placeholder={t('pages.storeConfig.smtpHostPlaceholder')}
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('smtpHost')}
                      />
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.smtpPort')}>
                      <input
                        type="number"
                        min={1}
                        max={65535}
                        className={`${NUMBER_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        value={form.values.smtpPort}
                        onChange={(event) =>
                          form.setFieldValue(
                            'smtpPort',
                            event.currentTarget.value === '' ? '' : Number(event.currentTarget.value),
                          )
                        }
                      />
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.smtpUser')}>
                      <input
                        type="text"
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('smtpUser')}
                      />
                    </FieldShell>
                    <FieldShell
                      label={t('pages.storeConfig.smtpPass')}
                      description={
                        (freshConfig as { smtpPassConfigured?: boolean } | undefined)?.smtpPassConfigured
                          ? t('pages.storeConfig.smtpPassConfigured')
                          : undefined
                      }
                    >
                      <input
                        type="password"
                        placeholder={t('pages.storeConfig.smtpPassPlaceholder')}
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('smtpPass')}
                      />
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.smtpFrom')}>
                      <input
                        type="email"
                        placeholder={t('pages.storeConfig.smtpFromPlaceholder')}
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('smtpFrom')}
                      />
                    </FieldShell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.values.smtpSecure}
                        onChange={() => form.setFieldValue('smtpSecure', !form.values.smtpSecure)}
                        label={t('pages.storeConfig.smtpSecure')}
                        disabled={!canManageProviders}
                      />
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t('pages.storeConfig.smtpSecure')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-outline-variant/30 pt-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                        {t('pages.storeConfig.resendTitle')}
                      </h3>
                    </div>
                    <FieldShell
                      label={t('pages.storeConfig.resendApiKey')}
                      description={
                        (freshConfig as { resendApiKeyConfigured?: boolean } | undefined)?.resendApiKeyConfigured
                          ? t('pages.storeConfig.resendApiKeyConfigured')
                          : undefined
                      }
                    >
                      <input
                        type="password"
                        placeholder={t('pages.storeConfig.resendApiKeyPlaceholder')}
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('resendApiKey')}
                      />
                    </FieldShell>
                    <FieldShell label={t('pages.storeConfig.resendFrom')}>
                      <input
                        type="email"
                        placeholder={t('pages.storeConfig.resendFromPlaceholder')}
                        className={`${CONTROL_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
                        disabled={!canManageProviders}
                        {...form.getInputProps('resendFrom')}
                      />
                    </FieldShell>
                  </div>
                </div>
                </Reveal>

                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.storeConfig.legalDocsTitle')}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.legalDocsSubtitle')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={LABEL_CLASS}>{t('pages.storeConfig.termsPage')}</span>
                      {selectedTermsPage ? (
                        <a
                          href={`${getStoreUrl()}/pagina/${selectedTermsPage.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-label-sm text-label-sm text-primary hover:underline"
                        >
                          {t('pages.storeConfig.viewCurrentPage')}
                        </a>
                      ) : (
                        <span className="font-label-sm text-label-sm text-on-surface-variant/70">
                          {t('pages.storeConfig.noPageSelected')}
                        </span>
                      )}
                    </div>
                    <select className={CONTROL_CLASS} {...form.getInputProps('termsPageId')}>
                      <option value="">{t('pages.storeConfig.noPageSelected')}</option>
                      {(pages ?? []).map((page) => (
                        <option key={page.id} value={page.id}>
                          {`${page.title} (/pagina/${page.slug})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                </Reveal>
              </div>

              <div className="flex flex-col gap-6 lg:col-span-4">
                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">{t('pages.storeConfig.termsVersionTitle')}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.termsVersionSubtitle')}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    className={NUMBER_CLASS}
                    value={form.values.termsVersion}
                    onChange={(event) =>
                      form.setFieldValue(
                        'termsVersion',
                        event.currentTarget.value === '' ? 1 : Number(event.currentTarget.value),
                      )
                    }
                  />
                  <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4">
                    <div className="flex flex-col">
                      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                        {t('pages.storeConfig.transactionalServer')}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface">
                        {form.values.emailProvider === 'resend' ? 'Resend Transactional Mailer' : 'SMTP'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">
                        {t('pages.storeConfig.senderLabel')}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface">
                        {form.values.emailSenderName || form.values.emailSenderAddress
                          ? `${form.values.emailSenderName || t('pages.storeConfig.noName')} · ${
                              form.values.emailSenderAddress || t('pages.storeConfig.noEmail')
                            }`
                          : t('pages.storeConfig.noSenderConfigured')}
                      </span>
                    </div>
                  </div>
                </div>
                </Reveal>

                <Reveal>
                <div className={CARD_CLASS}>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {t('pages.storeConfig.legalFiscalTitle')}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.storeConfig.legalFiscalSubtitle')}
                    </p>
                  </div>
                  <FieldShell label={t('pages.storeConfig.legalName')}>
                    <input
                      type="text"
                      className={CONTROL_CLASS}
                      placeholder={t('pages.storeConfig.legalNamePlaceholder')}
                      {...form.getInputProps('storefrontConfig.legal.legalName')}
                    />
                  </FieldShell>
                  <FieldShell label={t('pages.storeConfig.taxId')}>
                    <input
                      type="text"
                      className={CONTROL_CLASS}
                      placeholder={t('pages.storeConfig.taxIdPlaceholder')}
                      {...form.getInputProps('storefrontConfig.legal.taxId')}
                    />
                  </FieldShell>
                </div>
                </Reveal>
              </div>
            </section>
          )}
        </div>

        {/* Barra flotante de persistencia */}
        {isDirty && (
          <aside className="fixed bottom-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-inverse-surface px-6 py-3.5 text-inverse-on-surface shadow-xl backdrop-blur-md lg:bottom-6 lg:left-80 lg:right-8">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
              <span className="font-body-sm text-body-sm">
                {t('pages.storeConfig.unsavedNotice')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetToLoaded}
                className="rounded-lg px-3 py-1.5 font-label-md text-label-md text-inverse-on-surface/80 transition-colors hover:bg-white/10 hover:text-inverse-on-surface"
              >
                {t('pages.storeConfig.reset')}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={update.isPending}
                className="flex items-center gap-2 rounded-lg bg-white px-5 py-1.5 font-label-md text-label-md font-semibold text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Icon name="check" className="text-[18px]" />
                <span>{update.isPending ? t('common.saving') : t('pages.storeConfig.saveChangesCaps')}</span>
              </button>
            </div>
          </aside>
        )}
      </form>
    </>
  );
}
