'use client';

import { useForm } from '@mantine/form';
import { useHotkeys } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, type SelectHTMLAttributes, useEffect, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Reveal } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { Switch } from '../../components/ui/switch';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useStoreConfig } from '../../providers/config-provider';
import { useTranslation } from '../../providers/i18n-provider';

const DEFAULT_PROMO_BAR_TEXT = 'ENVÍO GRATIS EN COMPRAS DESDE $150.000 — DROP 01 DISPONIBLE';

interface TemplateConfigFormValues {
  template: string;
  heroLayout: string;
  headerVariant: string;
  productCardVariant: string;
  showPromoBar: boolean;
  promoBarText: string;
  showMarquee: boolean;
  showIdentitySection: boolean;
  showWhatsappButton: boolean;
}

interface SelectOption {
  value: string;
  labelKey: string;
}

interface TemplateSelectOption extends SelectOption {
  disabled?: boolean;
}

const TEMPLATE_OPTIONS: TemplateSelectOption[] = [
  { value: 'storefront', labelKey: 'pages.templates.templateCurrent' },
  { value: 'minimal_editorial', labelKey: 'pages.templates.templateMinimalEditorial', disabled: true },
  { value: 'streetwear_drop', labelKey: 'pages.templates.templateStreetwearDrop', disabled: true },
  { value: 'brutalist_mono', labelKey: 'pages.templates.templateBrutalistMono', disabled: true },
];

const HERO_LAYOUT_OPTIONS: SelectOption[] = [
  { value: 'split', labelKey: 'pages.templates.heroSplit' },
  { value: 'full', labelKey: 'pages.templates.heroFull' },
  { value: 'minimal', labelKey: 'pages.templates.heroMinimal' },
];

const HERO_LAYOUT_HINTS: Record<string, string> = {
  split: 'pages.templates.hintSplit',
  full: 'pages.templates.hintFull',
  minimal: 'pages.templates.hintMinimal',
};

const HEADER_VARIANT_OPTIONS: SelectOption[] = [
  { value: 'default', labelKey: 'pages.templates.headerDefault' },
  { value: 'transparent', labelKey: 'pages.templates.headerTransparent' },
  { value: 'compact', labelKey: 'pages.templates.headerCompact' },
];

const PRODUCT_CARD_OPTIONS: SelectOption[] = [
  { value: 'default', labelKey: 'pages.templates.productCardDefault' },
  { value: 'editorial', labelKey: 'pages.templates.productCardEditorial' },
  { value: 'lookbook', labelKey: 'pages.templates.productCardLookbook' },
];

const LEGACY_VALUE_LABELS: Record<string, string> = {
  centered: 'pages.templates.legacyCentered',
  minimal: 'pages.templates.legacyMinimal',
};

const SELECT_BASE_CLASS =
  'w-full cursor-pointer appearance-none rounded-lg bg-surface-container-low px-4 pr-10 font-body-md text-body-md text-on-surface transition-colors hover:bg-surface-container focus:bg-surface-container-lowest focus:outline-none';

type ViewportId = 'desktop' | 'tablet' | 'mobile';

const VIEWPORTS: Array<{ id: ViewportId; icon: string; titleKey: string; labelKey: string; maxWidth: string }> = [
  {
    id: 'desktop',
    icon: 'desktop_windows',
    titleKey: 'pages.templates.viewportDesktop',
    labelKey: 'pages.templates.viewportDesktopLabel',
    maxWidth: '100%',
  },
  {
    id: 'tablet',
    icon: 'tablet_mac',
    titleKey: 'pages.templates.viewportTablet',
    labelKey: 'pages.templates.viewportTabletLabel',
    maxWidth: '768px',
  },
  {
    id: 'mobile',
    icon: 'smartphone',
    titleKey: 'pages.templates.viewportMobile',
    labelKey: 'pages.templates.viewportMobileLabel',
    maxWidth: '420px',
  },
];

const webUrl = process.env.NEXT_PUBLIC_WEB_URL;

function buildInitialValues(source: Record<string, unknown> | null | undefined): TemplateConfigFormValues {
  const templateConfig = (source?.templateConfig as Record<string, unknown> | null | undefined) ?? {};
  return {
    template: (source?.template as string) ?? 'storefront',
    heroLayout: (templateConfig.heroLayout as string) ?? 'split',
    headerVariant: (templateConfig.headerVariant as string) ?? 'default',
    productCardVariant: (templateConfig.productCardVariant as string) ?? 'default',
    showPromoBar: (templateConfig.showPromoBar as boolean) ?? true,
    promoBarText: (templateConfig.promoBarText as string) ?? DEFAULT_PROMO_BAR_TEXT,
    showMarquee: (templateConfig.showMarquee as boolean) ?? true,
    showIdentitySection: (templateConfig.showIdentitySection as boolean) ?? true,
    showWhatsappButton: (templateConfig.showWhatsappButton as boolean) ?? true,
  };
}

/** Mantiene visible el valor guardado si no pertenece al set de opciones del diseño. */
function withLegacyOption(options: SelectOption[], value: string): SelectOption[] {
  if (options.some((option) => option.value === value)) return options;
  return [{ value, labelKey: LEGACY_VALUE_LABELS[value] ?? value }, ...options];
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  large?: boolean;
  children: ReactNode;
}

function SelectField({ label, hint, large = false, children, ...selectProps }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center justify-between font-label-md text-label-md font-medium text-on-surface">
        <span>{label}</span>
        {hint && <span className="font-label-sm text-label-sm text-on-surface-variant">{hint}</span>}
      </label>
      <div className="relative">
        <select className={`${SELECT_BASE_CLASS} ${large ? 'py-3' : 'py-2.5'}`} {...selectProps}>
          {children}
        </select>
        <Icon
          name="unfold_more"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
        />
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-3 transition-colors hover:bg-surface-container">
      <div className="flex flex-col pr-4">
        <span className="font-label-md text-label-md font-medium text-on-surface">{title}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">{description}</span>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export default function TemplatesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const config = useStoreConfig();

  const { data: freshConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/store-config');
      return data;
    },
    initialData: config as unknown as Record<string, unknown>,
  });

  const templateConfig = (freshConfig?.templateConfig as Record<string, unknown>) ?? {};

  const form = useForm<TemplateConfigFormValues>({
    initialValues: buildInitialValues((freshConfig ?? config) as unknown as Record<string, unknown>),
  });

  const [previewKey, setPreviewKey] = useState(0);
  const [viewport, setViewport] = useState<ViewportId>('desktop');
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!reloading) return;
    const timer = window.setTimeout(() => setReloading(false), 500);
    return () => window.clearTimeout(timer);
  }, [reloading]);

  const update = useMutation({
    mutationFn: async (values: TemplateConfigFormValues) => {
      const { error } = await apiClient.PATCH('/store-config', {
        body: {
          template: values.template,
          templateConfig: JSON.stringify({
            ...templateConfig,
            heroLayout: values.heroLayout,
            headerVariant: values.headerVariant,
            productCardVariant: values.productCardVariant,
            showPromoBar: values.showPromoBar,
            promoBarText: values.promoBarText,
            showMarquee: values.showMarquee,
            showIdentitySection: values.showIdentitySection,
            showWhatsappButton: values.showWhatsappButton,
          }),
        } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      setPreviewKey((k) => k + 1);
      notifySuccess({ title: t('pages.templates.toastSaved') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.templates.toastSaveError'), message: getApiErrorMessage(error) });
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    if (!update.isPending) update.mutate(values);
  });

  useHotkeys([
    [
      'mod+S',
      (event) => {
        event.preventDefault();
        handleSubmit();
      },
    ],
  ]);

  const discardChanges = () => {
    const loaded = buildInitialValues((freshConfig ?? config) as unknown as Record<string, unknown>);
    form.setValues(loaded);
    form.resetDirty(loaded);
    form.resetTouched();
  };

  const templateOptions: TemplateSelectOption[] = TEMPLATE_OPTIONS.some(
    (option) => option.value === form.values.template,
  )
    ? TEMPLATE_OPTIONS
    : [{ value: form.values.template, labelKey: form.values.template }, ...TEMPLATE_OPTIONS];

  const heroLayoutOptions = withLegacyOption(HERO_LAYOUT_OPTIONS, form.values.heroLayout);
  const headerVariantOptions = withLegacyOption(HEADER_VARIANT_OPTIONS, form.values.headerVariant);
  const productCardOptions = withLegacyOption(PRODUCT_CARD_OPTIONS, form.values.productCardVariant);

  const activeViewport = VIEWPORTS.find((option) => option.id === viewport) ?? VIEWPORTS[0];

  const reloadPreview = () => {
    setPreviewKey((k) => k + 1);
    setReloading(true);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-[1720px] flex-col gap-6"
      >
        <PageHeader
          breadcrumb={[
            { label: t('pages.templates.breadcrumbStorefront') },
            { label: t('pages.templates.title') },
          ]}
          title={
            <span className="flex flex-wrap items-center gap-3">
              <span>{t('pages.templates.title')}</span>
              <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-secondary-fixed">
                {t('pages.templates.versionBadge')}
              </span>
            </span>
          }
          subtitle={t('pages.templates.subtitle')}
          actions={
            <>
              <Button variant="secondary" icon="undo" onClick={discardChanges}>
                {t('pages.templates.discardChanges')}
              </Button>
              <Button type="submit" icon="bolt" disabled={update.isPending}>
                {t('pages.templates.publishChanges')}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-12">
          {/* Columna izquierda: panel de configuración */}
          <div className="flex flex-col gap-6 xl:col-span-5">
            <Reveal>
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-headline-sm text-headline-sm text-on-surface">
                  <Icon name="palette" className="text-[20px] text-secondary" />
                  <span>{t('pages.templates.activeTemplate')}</span>
                </span>
                <span className="rounded-md bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.templates.productionBadge')}
                </span>
              </div>
              <p className="-mt-2 font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.templates.activeTemplateHint')}
              </p>
              <div className="relative">
                <select className={`${SELECT_BASE_CLASS} py-3`} {...form.getInputProps('template')}>
                  {templateOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
                <Icon
                  name="unfold_more"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
                />
              </div>
            </Card>
            </Reveal>

            <Reveal>
            <Card className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-surface-container-high/40 pb-2">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    {t('pages.templates.layoutTitle')}
                  </h2>
                  <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.templates.layoutSubtitle')}
                  </p>
                </div>
                <span className="h-2 w-2 rounded-full bg-secondary" />
              </div>

              <SelectField
                label={t('pages.templates.heroLayoutLabel')}
                hint={t(HERO_LAYOUT_HINTS[form.values.heroLayout] ?? form.values.heroLayout)}
                {...form.getInputProps('heroLayout')}
              >
                {heroLayoutOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </SelectField>

              <SelectField label={t('pages.templates.headerVariantLabel')} {...form.getInputProps('headerVariant')}>
                {headerVariantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label={t('pages.templates.productCardLabel')}
                {...form.getInputProps('productCardVariant')}
              >
                {productCardOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </SelectField>

              <div className="flex flex-col gap-4 pt-2">
                <div className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                  {t('pages.templates.optionalModules')}
                </div>

                <ToggleRow
                  title={t('pages.templates.promoBarTitle')}
                  description={t('pages.templates.promoBarDescription')}
                  checked={form.values.showPromoBar}
                  onChange={(checked) => form.setFieldValue('showPromoBar', checked)}
                />
                <div className="-mt-2 flex flex-col gap-1.5 pl-3">
                  <input
                    type="text"
                    className="w-full rounded-lg bg-surface-container-low px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none"
                    {...form.getInputProps('promoBarText')}
                  />
                </div>

                <ToggleRow
                  title={t('pages.templates.marqueeTitle')}
                  description={t('pages.templates.marqueeDescription')}
                  checked={form.values.showMarquee}
                  onChange={(checked) => form.setFieldValue('showMarquee', checked)}
                />

                <ToggleRow
                  title={t('pages.templates.identityTitle')}
                  description={t('pages.templates.identityDescription')}
                  checked={form.values.showIdentitySection}
                  onChange={(checked) => form.setFieldValue('showIdentitySection', checked)}
                />

                <ToggleRow
                  title={t('pages.templates.whatsappTitle')}
                  description={t('pages.templates.whatsappDescription')}
                  checked={form.values.showWhatsappButton}
                  onChange={(checked) => form.setFieldValue('showWhatsappButton', checked)}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={update.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 font-headline-sm text-headline-sm tracking-tight text-on-primary shadow-md transition-all hover:bg-surface-tint active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon
                    name={update.isPending ? 'progress_activity' : 'save'}
                    className={`text-[20px] ${update.isPending ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {update.isPending ? t('pages.templates.savingChanges') : t('pages.templates.saveChanges')}
                  </span>
                  <kbd className="ml-2 rounded bg-surface-container-high/30 px-1.5 py-0.5 font-label-sm text-label-sm">
                    ⌘S
                  </kbd>
                </button>
              </div>
            </Card>
            </Reveal>

            <Reveal>
            <div className="flex items-start gap-4 rounded-xl bg-surface-container-low p-5 shadow-sm">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                <Icon name="speed" className="text-[20px]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  {t('pages.templates.themeCompilationTitle')}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.templates.themeCompilationBody')}
                </p>
              </div>
            </div>
            </Reveal>
          </div>

          {/* Columna derecha: vista previa en vivo */}
          <Reveal className="flex flex-col gap-3 xl:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.templates.livePreview')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SegmentedTabs
                  value={viewport}
                  options={VIEWPORTS.map((option) => ({
                    value: option.id,
                    label: (
                      <span title={t(option.titleKey)} className="flex items-center">
                        <Icon name={option.icon} className="text-[18px]" />
                      </span>
                    ),
                  }))}
                  onChange={(value) => setViewport(value)}
                  variant="primary"
                  size="md"
                  layoutId="templates-viewport"
                />
                <button
                  type="button"
                  onClick={reloadPreview}
                  className="flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-md text-label-md text-on-surface shadow-sm transition-all hover:bg-surface-container"
                >
                  <Icon
                    name="refresh"
                    className={`text-[16px] text-on-surface-variant ${reloading ? 'animate-spin' : ''}`}
                  />
                  <span className="font-semibold text-label-sm">{t('pages.templates.reload')}</span>
                </button>
              </div>
            </div>

            <div className="flex w-full justify-center transition-all duration-300">
              <div
                className={`flex w-full flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl transition-all duration-300 ${
                  reloading ? 'opacity-50' : ''
                }`}
                style={{ maxWidth: activeViewport.maxWidth }}
              >
                <div className="flex select-none items-center justify-between gap-3 bg-surface-container-low px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-md bg-surface-container-lowest px-4 py-1 font-body-sm text-body-sm text-on-surface-variant shadow-sm">
                    <Icon name="lock" className="text-[14px] text-emerald-600" />
                    <span className="truncate font-numeric-tabular text-[12px]">https://tienda.nova.co</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Icon name="share" className="text-[16px]" />
                    <Icon name="visibility" className="text-[16px]" />
                  </div>
                </div>

                {webUrl ? (
                  <iframe
                    key={previewKey}
                    src={`${webUrl}?preview=${previewKey}`}
                    title={t('pages.templates.previewFrameTitle')}
                    className="w-full flex-1 border-0 bg-white"
                    style={{ minHeight: '70vh' }}
                  />
                ) : (
                  <div className="flex items-center justify-center px-6 py-16">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('pages.templates.previewConfigPrefix')} <code>NEXT_PUBLIC_WEB_URL</code>{' '}
                      {t('pages.templates.previewConfigSuffix')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-2 font-label-sm text-label-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                <Icon name="touch_app" className="text-[16px]" />
                <span>{t('pages.templates.previewHint')}</span>
              </div>
              <span className="font-numeric-tabular">
                {t('pages.templates.activeResolution')}{' '}
                <strong className="text-on-surface">{t(activeViewport.labelKey)}</strong>
              </span>
            </div>
          </Reveal>
        </div>
      </form>
    </>
  );
}
