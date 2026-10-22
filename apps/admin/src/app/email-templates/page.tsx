'use client';

import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { fadeInUp, tableRowsContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { StatusPill } from '../../components/ui/status-pill';
import { Switch } from '../../components/ui/switch';
import { TableSkeleton } from '../../components/ui/table-skeleton';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

interface TemplateVariable {
  name: string;
  description: string;
  sample: string;
}

interface EmailTemplateListItem {
  key: string;
  name: string;
  description: string;
  subject: string;
  enabled: boolean;
  isCustomized: boolean;
  isCustom?: boolean;
  updatedAt: string | null;
  variables: TemplateVariable[];
}

interface EmailTemplateDetail extends EmailTemplateListItem {
  html: string;
  defaults: { subject: string; html: string };
}

interface EmailLayoutFormValues {
  headerHtml: string;
  footerHtml: string;
}

interface EmailLayoutResponse {
  headerHtml: string;
  footerHtml: string;
  defaults: EmailLayoutFormValues;
}

const EMAIL_HEADER_KEY = '__email-header__';
const EMAIL_FOOTER_KEY = '__email-footer__';
const DEFAULT_EMAIL_HEADER_HTML =
  '<h1 style="font-family:Bebas Neue,Impact,sans-serif;margin:0;letter-spacing:0.05em;">{{storeName}}</h1>';
const DEFAULT_EMAIL_FOOTER_HTML =
  '<p>© {{year}} {{storeName}}. Todos los derechos reservados.</p>';

type TemplateFilter = 'all' | 'custom' | 'default';

const TEMPLATE_ICONS: Record<string, string> = {
  welcome: 'waving_hand',
  'email-verification': 'verified',
  'password-reset': 'lock_reset',
  'newsletter-confirmation': 'unsubscribe',
  'order-created': 'shopping_bag',
  'order-status-update': 'sync_alt',
  'payment-confirmed': 'paid',
  'custom-design-approved': 'palette',
  'custom-design-rejected': 'edit_note',
  'production-status-update': 'precision_manufacturing',
  'shipment-update': 'local_shipping',
};

const EMAIL_PROVIDER_LABELS: Record<string, string> = {
  smtp: 'SMTP',
  resend: 'Resend',
};

function SubjectPreview({ subject }: { subject: string }) {
  const parts = subject.split(/(\{\{[^}]+\}\})/g);
  return (
    <div className="font-body-sm text-body-sm text-on-surface">
      {parts.map((part, index) =>
        /^\{\{[^}]+\}\}$/.test(part) ? (
          <span
            key={index}
            className="rounded bg-secondary-fixed px-1.5 py-0.5 font-mono text-[12px] font-medium text-on-secondary-fixed"
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </div>
  );
}

export default function EmailTemplatesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TemplateFilter>('all');
  const [testEmail, setTestEmail] = useState('admin@nova.co');
  const [testTemplateKey, setTestTemplateKey] = useState('');
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);
  const [tagsOpened, { open: openTags, close: closeTags }] = useDisclosure(false);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [layoutOpened, { open: openLayoutModal, close: closeLayoutModal }] = useDisclosure(false);
  /** Al cerrar el preview iniciado desde el layout, volver al editor. */
  const reopenLayoutAfterPreview = useRef(false);

  const { data: templates, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/email-templates');
      if (error) throw error;
      return (data ?? []) as EmailTemplateListItem[];
    },
  });

  const { data: storeConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/store-config');
      return data;
    },
    staleTime: 60_000,
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-email-template', editingKey],
    enabled: !!editingKey,
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/email-templates/{key}', {
        params: { path: { key: editingKey! } },
      });
      return data as unknown as EmailTemplateDetail;
    },
  });

  const { data: emailLayout, isLoading: layoutLoading } = useQuery({
    queryKey: ['admin-email-layout'],
    queryFn: async () => {
      const [header, footer] = await Promise.all([
        apiClient.GET('/admin/email-templates/{key}', {
          params: { path: { key: EMAIL_HEADER_KEY } },
        }),
        apiClient.GET('/admin/email-templates/{key}', {
          params: { path: { key: EMAIL_FOOTER_KEY } },
        }),
      ]);
      const headerData = header.data as unknown as EmailTemplateDetail | undefined;
      const footerData = footer.data as unknown as EmailTemplateDetail | undefined;
      return {
        headerHtml: headerData?.html ?? DEFAULT_EMAIL_HEADER_HTML,
        footerHtml: footerData?.html ?? DEFAULT_EMAIL_FOOTER_HTML,
        defaults: {
          headerHtml: DEFAULT_EMAIL_HEADER_HTML,
          footerHtml: DEFAULT_EMAIL_FOOTER_HTML,
        },
      } satisfies EmailLayoutResponse;
    },
    staleTime: 30_000,
  });

  const form = useForm({
    initialValues: { subject: '', html: '', enabled: true },
  });

  const layoutForm = useForm<EmailLayoutFormValues>({
    initialValues: {
      headerHtml: DEFAULT_EMAIL_HEADER_HTML,
      footerHtml: DEFAULT_EMAIL_FOOTER_HTML,
    },
  });

  const createForm = useForm({
    initialValues: { key: '', name: '', description: '', subject: '', html: '' },
    validate: {
      key: (value) => (/^[a-z0-9][a-z0-9-]*$/.test(value.trim()) ? null : t('pages.emailTemplates.createKeyInvalid')),
      name: (value) => (value.trim() ? null : t('pages.emailTemplates.createNameRequired')),
      subject: (value) => (value.trim() ? null : t('pages.emailTemplates.createSubjectRequired')),
      html: (value) => (value.trim() ? null : t('pages.emailTemplates.createHtmlRequired')),
    },
  });

  useEffect(() => {
    if (detail) {
      form.setValues({ subject: detail.subject, html: detail.html, enabled: detail.enabled });
    }
  }, [detail]);

  useEffect(() => {
    if (emailLayout) {
      layoutForm.setValues({
        headerHtml: emailLayout.headerHtml,
        footerHtml: emailLayout.footerHtml,
      });
    }
  }, [emailLayout]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
    queryClient.invalidateQueries({ queryKey: ['admin-email-template', editingKey] });
  };

  const save = useMutation({
    mutationFn: async (values: { subject: string; html: string; enabled: boolean }) => {
      const { error } = await apiClient.PUT('/admin/email-templates/{key}', {
        params: { path: { key: editingKey! } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      notifySuccess({ title: t('pages.emailTemplates.toastSaved') });
      closeEdit();
      setEditingKey(null);
    },
    onError: (error) => {
      notifyError({ title: t('pages.emailTemplates.toastSaveError'), message: getApiErrorMessage(error) });
    },
  });

  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/admin/email-templates/{key}/reset', {
        params: { path: { key: editingKey! } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      notifySuccess({ title: t('pages.emailTemplates.toastReset') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.emailTemplates.toastResetError'), message: getApiErrorMessage(error) });
    },
  });

  const preview = useMutation({
    mutationFn: async (input: {
      key: string;
      values?: { subject?: string; html?: string; headerHtml?: string; footerHtml?: string };
    }) => {
      // El preview solo renderiza subject/html y, opcionalmente, overrides del
      // layout. El formulario también tiene `enabled`, pero el DTO no lo acepta.
      const body = input.values
        ? {
            ...(input.values.subject !== undefined ? { subject: input.values.subject } : {}),
            ...(input.values.html !== undefined ? { html: input.values.html } : {}),
            ...(input.values.headerHtml !== undefined
              ? { headerHtml: input.values.headerHtml }
              : {}),
            ...(input.values.footerHtml !== undefined
              ? { footerHtml: input.values.footerHtml }
              : {}),
          }
        : {};
      const { data, error } = await apiClient.POST('/admin/email-templates/{key}/preview', {
        params: { path: { key: input.key } },
        body: body as never,
      });
      if (error) throw error;
      return data as { subject: string; html: string };
    },
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      openPreview();
    },
    onError: (error) => {
      notifyError({ title: t('pages.emailTemplates.toastPreviewError'), message: getApiErrorMessage(error) });
      if (reopenLayoutAfterPreview.current) {
        reopenLayoutAfterPreview.current = false;
        openLayoutModal();
      }
    },
  });

  const saveLayout = useMutation({
    mutationFn: async (values: EmailLayoutFormValues) => {
      const headerBody = {
        name: 'Header del email',
        subject: 'Header del email',
        html: values.headerHtml,
        enabled: true,
      };
      const footerBody = {
        name: 'Footer del email',
        subject: 'Footer del email',
        html: values.footerHtml,
        enabled: true,
      };
      const responses = await Promise.all([
        apiClient.PUT('/admin/email-templates/{key}', {
          params: { path: { key: EMAIL_HEADER_KEY } },
          body: headerBody as never,
        }),
        apiClient.PUT('/admin/email-templates/{key}', {
          params: { path: { key: EMAIL_FOOTER_KEY } },
          body: footerBody as never,
        }),
      ]);
      const [header, footer] = responses as unknown as Array<{ error?: unknown }>;
      if (header?.error) throw header.error;
      if (footer?.error) throw footer.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-layout'] });
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      notifySuccess({ title: t('pages.emailTemplates.layoutSaved') });
    },
    onError: (error) => {
      notifyError({
        title: t('pages.emailTemplates.layoutSaveError'),
        message: getApiErrorMessage(error),
      });
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (values: { key: string; name: string; description: string; subject: string; html: string }) => {
      const { error } = await apiClient.POST('/admin/email-templates', {
        body: {
          key: values.key.trim().toLowerCase(),
          name: values.name.trim(),
          ...(values.description.trim() ? { description: values.description.trim() } : {}),
          subject: values.subject,
          html: values.html,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      notifySuccess({ title: t('pages.emailTemplates.toastCreated') });
      closeCreate();
      createForm.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.emailTemplates.toastCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/admin/email-templates/{key}/test', {
        params: { path: { key: testTemplateValue } },
        body: { to: testEmail.trim() },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess({ title: t('pages.emailTemplates.toastTestSent'), message: testEmail.trim() });
    },
    onError: (error) => {
      notifyError({ title: t('pages.emailTemplates.toastTestError'), message: getApiErrorMessage(error) });
    },
  });

  const submitForm = form.onSubmit((values) => save.mutate(values));
  const submitCreate = createForm.onSubmit((values) => createTemplate.mutate(values));

  const closeEditor = () => {
    closeEdit();
    setEditingKey(null);
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    openEdit();
  };

  const handleOpenLayout = () => {
    if (emailLayout) {
      layoutForm.setValues({
        headerHtml: emailLayout.headerHtml,
        footerHtml: emailLayout.footerHtml,
      });
    }
    openLayoutModal();
  };

  const resetLayoutForm = () => {
    layoutForm.setValues(
      emailLayout?.defaults ?? {
        headerHtml: DEFAULT_EMAIL_HEADER_HTML,
        footerHtml: DEFAULT_EMAIL_FOOTER_HTML,
      },
    );
  };

  const previewLayout = () => {
    // Preview sin persistir: la API recibe los overrides del layout.
    // Cerramos el editor para que la vista previa no quede apilada detrás.
    reopenLayoutAfterPreview.current = true;
    closeLayoutModal();
    preview.mutate({
      key: 'welcome',
      values: {
        headerHtml: layoutForm.values.headerHtml,
        footerHtml: layoutForm.values.footerHtml,
      },
    });
  };

  const closePreviewAndRestoreLayout = () => {
    closePreview();
    if (reopenLayoutAfterPreview.current) {
      reopenLayoutAfterPreview.current = false;
      // Abrimos sin resetear el formulario para conservar los cambios.
      openLayoutModal();
    }
  };

  const copyTag = (name: string) => {
    const token = `{{${name}}}`;
    const feedback = () =>
      notifySuccess({ title: t('pages.emailTemplates.toastTokenCopied').replace('{{token}}', token) });

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(token)
        .then(feedback)
        .catch(() => notifyError({ title: t('pages.emailTemplates.toastCopyError') }));
    } else {
      notifyError({
        title: t('pages.emailTemplates.toastCopyError'),
        message: t('common.clipboardUnavailable'),
      });
    }
  };

  const templatesList = templates ?? [];
  const totalTemplates = templatesList.length;
  const activeTemplates = templatesList.filter((template) => template.enabled).length;
  const customizedCount = templatesList.filter((template) => template.isCustomized).length;
  const defaultCount = totalTemplates - customizedCount;
  const readinessPercentage =
    totalTemplates > 0 ? Math.round((activeTemplates / totalTemplates) * 100) : 0;

  const term = search.trim().toLowerCase();
  const filteredTemplates = templatesList.filter((template) => {
    if (typeFilter === 'custom' && !template.isCustomized) return false;
    if (typeFilter === 'default' && template.isCustomized) return false;
    if (!term) return true;
    return `${template.name} ${template.key} ${template.subject}`.toLowerCase().includes(term);
  });

  const globalVariables: TemplateVariable[] = [];
  const seenVariables = new Set<string>();
  templatesList.forEach((template) => {
    template.variables.forEach((variable) => {
      if (!seenVariables.has(variable.name)) {
        seenVariables.add(variable.name);
        globalVariables.push(variable);
      }
    });
  });

  const emailProvider = storeConfig?.emailProvider ?? '';
  const emailProviderLabel = emailProvider
    ? (EMAIL_PROVIDER_LABELS[emailProvider] ?? emailProvider.toUpperCase())
    : '—';
  const testTemplateValue =
    testTemplateKey ||
    templatesList.find((template) => template.key === 'order-created')?.key ||
    templatesList[0]?.key ||
    '';

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          breadcrumb={[
            { label: t('pages.emailTemplates.breadcrumbStorefront') },
            { label: t('pages.emailTemplates.breadcrumbTemplates') },
          ]}
          title={
            <span className="flex flex-wrap items-baseline gap-3">
              {t('pages.emailTemplates.title')}
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                {t('pages.emailTemplates.countBadge').replace('{{count}}', String(totalTemplates))}
              </span>
            </span>
          }
          subtitle={
            <>
              {t('pages.emailTemplates.subtitlePrefix')}{' '}
              <code className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[12px] font-semibold text-primary">
                {'{{variable}}'}
              </code>{' '}
              {t('pages.emailTemplates.subtitleSuffix')}
            </>
          }
          actions={
            <>
              {/* Sin endpoint de vista previa global: control deshabilitado a propósito. */}
              <Button variant="secondary" icon="code" onClick={handleOpenLayout}>
                {t('pages.emailTemplates.editLayout')}
              </Button>
              <Button variant="secondary" icon="visibility" disabled title={t('common.comingSoon')}>
                {t('pages.emailTemplates.globalPreview')}
              </Button>
              <Button icon="add" iconClassName="text-[18px]" onClick={openCreate}>
                {t('pages.emailTemplates.createTemplate')}
              </Button>
            </>
          }
        />

        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.emailTemplates.kpiActive')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="mark_email_read" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-numeric-tabular font-headline-lg text-headline-lg font-bold text-on-surface">
                {isLoading ? '— / —' : `${activeTemplates} / ${totalTemplates}`}
              </span>
              <span
                className={`flex items-center font-label-sm text-label-sm font-semibold ${
                  readinessPercentage === 100 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                <span
                  className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                    readinessPercentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {isLoading
                  ? '—'
                  : t('pages.emailTemplates.readyPercentage').replace(
                      '{{percent}}',
                      String(readinessPercentage),
                    )}
              </span>
            </div>
            <div className="mt-2 truncate font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.emailTemplates.kpiActiveHint')}
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.emailTemplates.kpiOpenRate')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="drafts" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface">—</span>
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm font-medium text-on-surface-variant">
                {t('common.comingSoon')}
              </span>
            </div>
            <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.emailTemplates.kpiOpenRateHint')}
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.emailTemplates.kpiProvider')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="bolt" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {emailProviderLabel}
              </span>
              <span className="rounded bg-surface-container px-1.5 py-0.5 font-numeric-tabular text-[12px] text-on-surface">
                {t('pages.emailTemplates.kpiProviderHint')}
              </span>
            </div>
            <div className="mt-2 truncate font-body-sm text-body-sm text-on-surface-variant">
              mail.nova.co (DKIM/SPF)
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {t('pages.emailTemplates.kpiVolume')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface">
                <Icon name="outbox" className="text-[18px]" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface">—</span>
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm font-medium text-on-surface-variant">
                {t('common.comingSoon')}
              </span>
            </div>
            <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.emailTemplates.kpiVolumeHint')}
            </div>
          </div>
        </div>

        {/* Controls Filter Bar */}
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm md:flex-row">
          <div className="w-full md:w-96">
            <Input
              icon="search"
              variant="filled"
              placeholder={t('pages.emailTemplates.searchPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto">
            <Select
              icon="filter_list"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.currentTarget.value as TemplateFilter)}
              className="w-full sm:w-56"
            >
              <option value="all">
                {t('pages.emailTemplates.filterAll').replace('{{count}}', String(totalTemplates))}
              </option>
              <option value="custom">
                {t('pages.emailTemplates.filterCustom').replace('{{count}}', String(customizedCount))}
              </option>
              <option value="default">
                {t('pages.emailTemplates.filterDefault').replace('{{count}}', String(defaultCount))}
              </option>
            </Select>
            <button
              type="button"
              onClick={openTags}
              className="flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 font-label-sm text-label-sm font-medium text-secondary transition-colors hover:bg-surface-container-low"
            >
              <Icon name="data_object" className="text-[16px]" />
              {t('pages.emailTemplates.tagsDictionary')}
            </button>
          </div>
        </div>

        {/* Primary Table Container */}
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          {isError ? (
            <QueryError onRetry={() => refetch()} retrying={isFetching} />
          ) : isLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              icon="mail_off"
              title={t('pages.emailTemplates.emptyTitle')}
              description={t('pages.emailTemplates.emptyDescription')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <th className="w-1/3 rounded-l-lg px-3 py-3 font-semibold">
                      {t('pages.emailTemplates.columnName')}
                    </th>
                    <th className="w-1/6 px-3 py-3 font-semibold">
                      {t('pages.emailTemplates.columnKey')}
                    </th>
                    <th className="w-1/3 px-3 py-3 font-semibold">
                      {t('pages.emailTemplates.columnSubject')}
                    </th>
                    <th className="px-3 py-3 text-center font-semibold">
                      {t('pages.emailTemplates.columnStatus')}
                    </th>
                    <th className="rounded-r-lg px-3 py-3 text-right font-semibold">
                      {t('pages.emailTemplates.columnActions')}
                    </th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={tableRowsContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm"
                >
                  {filteredTemplates.map((template) => (
                    <motion.tr
                      variants={fadeInUp}
                      key={template.key}
                      className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                    >
                      <td className="px-3 py-3.5 align-top">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container">
                            <Icon
                              name={TEMPLATE_ICONS[template.key] ?? 'mail'}
                              className="text-[18px] text-on-surface"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="block font-headline-sm text-headline-sm font-semibold text-on-surface">
                              {template.name}
                            </span>
                            <span className="mt-0.5 block font-body-sm text-body-sm text-on-surface-variant">
                              {template.description}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <code className="rounded bg-surface-container px-2 py-1 font-mono text-[12px] text-on-surface">
                          {template.key}
                        </code>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <SubjectPreview subject={template.subject} />
                      </td>
                      <td className="px-3 py-3.5 text-center align-top">
                        <div className="flex flex-col items-center justify-center gap-1.5 sm:flex-row">
                          {template.enabled ? (
                            <StatusPill
                              label={t('pages.emailTemplates.statusActive')}
                              tone="success"
                              className="uppercase tracking-wide"
                            />
                          ) : (
                            <StatusPill
                              label={t('pages.emailTemplates.statusInactive')}
                              tone="neutral"
                              className="uppercase tracking-wide"
                            />
                          )}
                          {template.isCustomized && (
                            <StatusPill
                              label={t('pages.emailTemplates.statusCustomized')}
                              tone="secondary"
                              withDot={false}
                              className="uppercase tracking-wide"
                            />
                          )}
                          {template.isCustom && (
                            <StatusPill
                              label={t('pages.emailTemplates.statusCustom')}
                              tone="info"
                              withDot={false}
                              className="uppercase tracking-wide"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(template.key)}
                            className="rounded-md px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            title={t('pages.emailTemplates.previewAction')}
                            onClick={() => preview.mutate({ key: template.key })}
                            className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                          >
                            <Icon name="visibility" className="text-[18px]" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>

        {/* Editorial Reference Section: Global Dynamic Tags & Diagnostics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="flex flex-col justify-between lg:col-span-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="code_blocks" className="text-[20px] text-primary" />
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {t('pages.emailTemplates.variablesTitle')}
                  </h2>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('pages.emailTemplates.variablesSubtitle')}
                </span>
              </div>
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.emailTemplates.variablesDescription')}
              </p>
              {globalVariables.length === 0 ? (
                <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
                  {isLoading
                    ? t('pages.emailTemplates.variablesLoading')
                    : t('pages.emailTemplates.variablesEmpty')}
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {globalVariables.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => copyTag(variable.name)}
                      className="group flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container"
                    >
                      <span className="flex min-w-0 flex-col">
                        <code className="font-mono text-[12px] font-semibold text-primary">
                          {`{{${variable.name}}}`}
                        </code>
                        <span className="mt-0.5 truncate font-label-sm text-label-sm text-on-surface-variant">
                          {variable.description}
                        </span>
                      </span>
                      <Icon
                        name="content_copy"
                        className="shrink-0 text-[16px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 font-label-sm text-label-sm text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t('pages.emailTemplates.variablesEngine')}
              </span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {t('pages.emailTemplates.testTitle')}
                </h3>
                <span className="rounded bg-surface-container px-2 py-0.5 text-[11px] font-semibold uppercase text-on-surface">
                  {t('pages.emailTemplates.testSandbox')}
                </span>
              </div>
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.emailTemplates.testDescription')}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Field label={t('pages.emailTemplates.testRecipient')}>
                  <Input
                    type="email"
                    placeholder="admin@nova.co"
                    value={testEmail}
                    onChange={(event) => setTestEmail(event.currentTarget.value)}
                  />
                </Field>
                <Field label={t('pages.emailTemplates.testTemplate')}>
                  <Select
                    value={testTemplateValue}
                    onChange={(event) => setTestTemplateKey(event.currentTarget.value)}
                  >
                    {templatesList.map((template) => (
                      <option key={template.key} value={template.key}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
            <div className="mt-6">
              <Button
                icon="send"
                className="w-full py-2.5"
                disabled={sendTest.isPending || !testTemplateValue || !testEmail.trim()}
                onClick={() => sendTest.mutate()}
              >
                {sendTest.isPending ? t('pages.emailTemplates.testSending') : t('pages.emailTemplates.testSend')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Crear plantilla */}
      <AppModal
        opened={createOpened}
        onClose={closeCreate}
        title={t('pages.emailTemplates.createTitle')}
        subtitle={t('pages.emailTemplates.createSubtitle')}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeCreate}>
              {t('common.cancel')}
            </Button>
            <Button icon="add" onClick={() => submitCreate()} disabled={createTemplate.isPending}>
              {createTemplate.isPending ? t('common.saving') : t('pages.emailTemplates.createSubmit')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitCreate} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={t('pages.emailTemplates.createKeyLabel')} required>
              <Input placeholder="promo-verano" {...createForm.getInputProps('key')} />
              {createForm.errors.key && (
                <span className="font-label-sm text-label-sm text-error">{createForm.errors.key}</span>
              )}
            </Field>
            <Field label={t('pages.emailTemplates.createNameLabel')} required>
              <Input {...createForm.getInputProps('name')} />
              {createForm.errors.name && (
                <span className="font-label-sm text-label-sm text-error">{createForm.errors.name}</span>
              )}
            </Field>
          </div>
          <Field label={t('pages.emailTemplates.createDescriptionLabel')}>
            <Input {...createForm.getInputProps('description')} />
          </Field>
          <Field label={t('pages.emailTemplates.createSubjectLabel')} required>
            <Input placeholder={'Hola {{firstName}}...'} {...createForm.getInputProps('subject')} />
            {createForm.errors.subject && (
              <span className="font-label-sm text-label-sm text-error">{createForm.errors.subject}</span>
            )}
          </Field>
          <Field label={t('pages.emailTemplates.createHtmlLabel')} required>
            <Textarea
              rows={10}
              className="font-mono text-[13px]"
              placeholder={'<p>Hola {{firstName}}, ...</p>'}
              {...createForm.getInputProps('html')}
            />
            {createForm.errors.html && (
              <span className="font-label-sm text-label-sm text-error">{createForm.errors.html}</span>
            )}
          </Field>
        </form>
      </AppModal>

      {/* Modal: Diccionario de Tags */}
      <AppModal
        opened={tagsOpened}
        onClose={closeTags}
        title={t('pages.emailTemplates.tagsTitle')}
        subtitle={t('pages.emailTemplates.tagsSubtitle')}
        size="lg"
        footer={
          <Button variant="secondary" icon="close" onClick={closeTags}>
            {t('common.close')}
          </Button>
        }
      >
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {t('pages.emailTemplates.tagsDescription')}
        </p>
        {globalVariables.length === 0 ? (
          <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
            {isLoading
              ? t('pages.emailTemplates.variablesLoading')
              : t('pages.emailTemplates.variablesEmpty')}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {globalVariables.map((variable) => (
              <button
                key={variable.name}
                type="button"
                onClick={() => copyTag(variable.name)}
                className="group flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container"
              >
                <span className="flex min-w-0 flex-col">
                  <code className="font-mono text-[12px] font-semibold text-primary">
                    {`{{${variable.name}}}`}
                  </code>
                  <span className="mt-0.5 truncate font-label-sm text-label-sm text-on-surface-variant">
                    {variable.description}
                  </span>
                </span>
                <Icon
                  name="content_copy"
                  className="shrink-0 text-[16px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                />
              </button>
            ))}
          </div>
        )}
      </AppModal>

      {/* Modal: Editor de plantilla */}
      <AppModal
        opened={editOpened}
        onClose={closeEditor}
        title={
          detail
            ? t('pages.emailTemplates.modalEditTitle').replace('{{name}}', detail.name)
            : t('pages.emailTemplates.modalEditTitleFallback')
        }
        subtitle={
          detail ? (
            <>
              {t('pages.emailTemplates.modalKeyLabel')} <code className="font-mono">{detail.key}</code>
            </>
          ) : undefined
        }
        size="xl"
        footer={
          <>
            <Button
              variant="secondary"
              icon="send_time_extension"
              className="mr-auto"
              onClick={() =>
                editingKey &&
                preview.mutate({
                  key: editingKey,
                  values: { subject: form.values.subject, html: form.values.html },
                })
              }
              disabled={preview.isPending}
            >
              {preview.isPending
                ? t('pages.emailTemplates.previewGenerating')
                : t('pages.emailTemplates.previewRender')}
            </Button>
            <Button
              variant="ghost"
              icon={detail?.isCustom ? 'delete' : 'restart_alt'}
              className="text-error"
              onClick={() => reset.mutate()}
              disabled={(!detail?.isCustomized && !detail?.isCustom) || reset.isPending}
            >
              {detail?.isCustom
                ? t('pages.emailTemplates.deleteCustom')
                : t('pages.emailTemplates.resetDefault')}
            </Button>
            <Button variant="ghost" onClick={closeEditor}>
              {t('common.cancel')}
            </Button>
            <Button icon="save" onClick={() => submitForm()} disabled={save.isPending}>
              {save.isPending ? t('common.saving') : t('pages.emailTemplates.saveChanges')}
            </Button>
          </>
        }
      >
        {detail ? (
          <form onSubmit={submitForm} className="flex flex-col gap-5">
            <Field label={t('pages.emailTemplates.fieldSubject')} required>
              <Input
                placeholder={t('pages.emailTemplates.fieldSubjectPlaceholder')}
                {...form.getInputProps('subject')}
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="email-template-html"
                  className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant"
                >
                  {t('pages.emailTemplates.fieldHtml')}
                </label>
                <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t('pages.emailTemplates.htmlValidator')}
                </div>
              </div>
              <div className="relative overflow-x-auto rounded-xl bg-surface-container-low p-4 font-mono text-[13px] leading-relaxed text-on-surface">
                <textarea
                  id="email-template-html"
                  required
                  rows={12}
                  className="w-full resize-none border-none bg-transparent font-mono text-[13px] leading-relaxed text-on-surface focus:outline-none"
                  {...form.getInputProps('html')}
                />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-medium text-on-surface">
                  {t('pages.emailTemplates.layoutSectionTitle')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.emailTemplates.layoutSectionHint')}
                </span>
              </div>
              <Button variant="secondary" icon="code" onClick={handleOpenLayout}>
                {t('pages.emailTemplates.editLayout')}
              </Button>
            </div>

            {detail.variables.length > 0 && (
              <div>
                <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                  {t('pages.emailTemplates.availableVariables')}
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {detail.variables.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      title={variable.description}
                      onClick={() => copyTag(variable.name)}
                      className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[12px] text-primary transition-colors hover:bg-surface-container-high"
                    >
                      {`{{${variable.name}}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-medium text-on-surface">
                  {t('pages.emailTemplates.toggleLabel')}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.emailTemplates.toggleHint')}
                </span>
              </div>
              <Switch
                checked={form.values.enabled}
                onChange={(checked) => form.setFieldValue('enabled', checked)}
                label={t('pages.emailTemplates.toggleLabel')}
              />
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-center gap-2 py-14 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[20px]" />
            {t('pages.emailTemplates.loadingTemplate')}
          </div>
        )}
      </AppModal>

      {/* Modal: Vista previa */}
      <AppModal
        opened={previewOpened}
        onClose={closePreviewAndRestoreLayout}
        title={t('pages.emailTemplates.previewTitle')}
        subtitle={t('pages.emailTemplates.previewSubtitle')}
        size="xl"
        footer={
          <Button variant="secondary" icon="close" onClick={closePreviewAndRestoreLayout}>
            {t('common.close')}
          </Button>
        }
      >
        {previewHtml ? (
          <iframe
            title={t('pages.emailTemplates.previewIframeTitle')}
            srcDoc={previewHtml}
            className="h-[480px] w-full rounded-lg border border-outline-variant/30 bg-white"
          />
        ) : (
          <div className="flex items-center justify-center gap-2 py-14 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[20px]" />
            {t('pages.emailTemplates.previewLoading')}
          </div>
        )}
      </AppModal>

      {/* Modal: Header/footer global */}
      <AppModal
        opened={layoutOpened}
        onClose={closeLayoutModal}
        title={t('pages.emailTemplates.layoutModalTitle')}
        subtitle={t('pages.emailTemplates.layoutModalSubtitle')}
        size="xl"
        footer={
          <>
            <Button
              variant="ghost"
              icon="restart_alt"
              className="mr-auto"
              onClick={resetLayoutForm}
              disabled={layoutLoading || saveLayout.isPending}
            >
              {t('pages.emailTemplates.layoutReset')}
            </Button>
            <Button
              variant="secondary"
              icon="visibility"
              onClick={previewLayout}
              disabled={layoutLoading || saveLayout.isPending}
            >
              {t('pages.emailTemplates.layoutSavePreview')}
            </Button>
            <Button
              icon="save"
              onClick={() => saveLayout.mutate(layoutForm.values)}
              disabled={layoutLoading || saveLayout.isPending}
            >
              {saveLayout.isPending ? t('common.saving') : t('pages.emailTemplates.layoutSave')}
            </Button>
          </>
        }
      >
        {layoutLoading ? (
          <div className="flex items-center justify-center gap-2 py-14 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[20px]" />
            {t('pages.emailTemplates.layoutLoading')}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.emailTemplates.layoutVariables')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['storeName', 'year', 'logoUrl'].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => copyTag(variable)}
                    className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[12px] text-primary transition-colors hover:bg-surface-container-high"
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.emailTemplates.layoutInfo')}
              </span>
              <code className="rounded bg-surface-container px-2 py-1 font-mono text-[11px] text-on-surface-variant">
                {t('pages.emailTemplates.layoutImageHint')}
              </code>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Field
                label={t('pages.emailTemplates.layoutHeaderLabel')}
                hint={t('pages.emailTemplates.layoutHeaderHint')}
              >
                <Textarea
                  rows={9}
                  className="font-mono text-[13px]"
                  {...layoutForm.getInputProps('headerHtml')}
                />
              </Field>
              <Field
                label={t('pages.emailTemplates.layoutFooterLabel')}
                hint={t('pages.emailTemplates.layoutFooterHint')}
              >
                <Textarea
                  rows={9}
                  className="font-mono text-[13px]"
                  {...layoutForm.getInputProps('footerHtml')}
                />
              </Field>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t('pages.emailTemplates.layoutPreviewHint')}
            </p>
          </div>
        )}
      </AppModal>
    </>
  );
}
