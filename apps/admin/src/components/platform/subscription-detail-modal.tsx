'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { platformRequest } from '../../lib/platform-auth';
import { useTranslation } from '../../providers/i18n-provider';
import { LoadingState } from '../loading-state';
import { AppModal } from '../ui/app-modal';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Field, Select } from '../ui/input';
import { QueryError } from '../ui/query-error';
import { StatusPill, type StatusTone } from '../ui/status-pill';

type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SUSPENDED';
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  periodDays: number;
  features: string[];
  isActive: boolean;
}

interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  planId: string | null;
  planName: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Overview {
  tenant: { id: string; slug: string; name: string };
  plan: Plan | null;
  plans: Plan[];
  status: SubscriptionStatus;
  paid: boolean;
  paidUntil: string | null;
  graceDays: number;
  suspendedAt: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  bold: { configured: boolean; sandbox: boolean };
  payments: Payment[];
}

const STATUS: Record<SubscriptionStatus, { key: string; tone: StatusTone }> = {
  TRIAL: { key: 'subscription.statusTrial', tone: 'info' },
  ACTIVE: { key: 'subscription.statusActive', tone: 'success' },
  PAST_DUE: { key: 'subscription.statusPastDue', tone: 'warning' },
  CANCELED: { key: 'subscription.statusCanceled', tone: 'neutral' },
  SUSPENDED: { key: 'subscription.statusSuspended', tone: 'danger' },
};

const PAYMENT: Record<PaymentStatus, { key: string; tone: StatusTone }> = {
  PENDING: { key: 'subscription.paymentPending', tone: 'warning' },
  PAID: { key: 'subscription.paymentPaid', tone: 'success' },
  FAILED: { key: 'subscription.paymentFailed', tone: 'danger' },
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMoney(value: number | null, currency: string | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency ?? 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PlatformSubscriptionModal({
  tenantId,
  tenantName,
  opened,
  onClose,
  onChanged,
}: {
  tenantId: string | null;
  tenantName: string | null;
  opened: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const key = ['platform', 'tenant-subscription', tenantId ?? 'none'];
  const detailQuery = useQuery({
    queryKey: key,
    queryFn: () => platformRequest<Overview>(`/platform/tenants/${tenantId}/subscription`),
    enabled: opened && Boolean(tenantId),
  });

  const detail = detailQuery.data;
  const status = detail ? STATUS[detail.status] : null;

  useEffect(() => {
    if (detail?.plan?.id) setSelectedPlanId(detail.plan.id);
  }, [detail?.plan?.id]);

  const refreshAll = async () => {
    await detailQuery.refetch();
    onChanged();
  };

  const planMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !selectedPlanId) return;
      await platformRequest(`/platform/tenants/${tenantId}/subscription`, {
        method: 'PATCH',
        body: { planId: selectedPlanId },
      });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      void refreshAll();
    },
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : t('pages.clients.subscriptionDetail.error')),
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      await platformRequest(`/platform/tenants/${tenantId}/subscription/suspend`, {
        method: 'POST',
        body: {},
      });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      void refreshAll();
    },
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : t('pages.clients.subscriptionDetail.error')),
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      await platformRequest(`/platform/tenants/${tenantId}/subscription/reactivate`, {
        method: 'POST',
        body: {},
      });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      void refreshAll();
    },
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : t('pages.clients.subscriptionDetail.error')),
  });

  const manualSuspension = Boolean(detail?.suspendedAt);
  const canReactivate = Boolean(
    manualSuspension && detail?.paidUntil && new Date(detail.paidUntil).getTime() > Date.now(),
  );

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={t('pages.clients.subscriptionDetail.title')}
      subtitle={tenantName ?? undefined}
      size="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {detailQuery.isLoading ? (
        <LoadingState />
      ) : detailQuery.isError || !detail || !status ? (
        <QueryError
          description={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
          onRetry={() => void detailQuery.refetch()}
          retrying={detailQuery.isFetching}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-headline-sm text-headline-sm text-on-surface">
                {detail.plan?.name ?? t('subscription.noPlan')}
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.clients.subscriptionDetail.tenant')} {detail.tenant.name} · {detail.tenant.slug}
              </div>
            </div>
            <StatusPill tone={status.tone} label={t(status.key)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-surface-container-low p-3">
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                {t('subscription.paidUntil')}
              </div>
              <div className="mt-1 font-label-md text-label-md text-on-surface">
                {formatDate(detail.paidUntil)}
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-3">
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                {t('subscription.lastPayment')}
              </div>
              <div className="mt-1 font-label-md text-label-md text-on-surface">
                {formatDate(detail.lastPaymentAt)}
              </div>
              {detail.lastPaymentAmount !== null ? (
                <div className="font-label-sm text-label-sm text-on-surface-variant">
                  {formatMoney(detail.lastPaymentAmount, detail.lastPaymentCurrency)}
                </div>
              ) : null}
            </div>
            <div className="rounded-xl bg-surface-container-low p-3">
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.clients.subscriptionDetail.planAmount')}
              </div>
              <div className="mt-1 font-label-md text-label-md text-on-surface">
                {detail.plan ? formatMoney(detail.plan.amount, detail.plan.currency) : '—'}
              </div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                {t('subscription.everyDays').replace('{{days}}', String(detail.plan?.periodDays ?? 30))}
              </div>
            </div>
          </div>

          {detail.status === 'SUSPENDED' ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
              <div className="flex items-start gap-2">
                <Icon name="block" className="mt-0.5 text-[20px]" />
                <div>
                  <p className="font-label-md text-label-md">
                    {t('pages.clients.subscriptionDetail.suspendedTitle')}
                  </p>
                  <p className="font-body-sm text-body-sm text-rose-800">
                    {manualSuspension
                      ? t('pages.clients.subscriptionDetail.suspendedManual')
                      : t('pages.clients.subscriptionDetail.suspendedPayment').replace(
                          '{{days}}',
                          String(detail.graceDays),
                        )}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-label-md text-label-md text-on-surface">
                  {t('pages.clients.subscriptionDetail.changePlan')}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.clients.subscriptionDetail.changePlanHint')}
                </p>
              </div>
              <Icon name="workspace_premium" className="text-[22px] text-secondary" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label={t('pages.clients.subscriptionDetail.plan')} className="flex-1">
                <Select
                  value={selectedPlanId}
                  onChange={(event) => setSelectedPlanId(event.currentTarget.value)}
                >
                  {detail.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {formatMoney(plan.amount, plan.currency)} / {plan.periodDays}d
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                icon="save"
                onClick={() => planMutation.mutate()}
                disabled={!selectedPlanId || planMutation.isPending || selectedPlanId === detail.plan?.id}
              >
                {planMutation.isPending
                  ? t('common.saving')
                  : t('pages.clients.subscriptionDetail.savePlan')}
              </Button>
            </div>
          </div>

          {actionError ? (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/40 px-4 py-3">
            <div>
              <p className="font-label-md text-label-md text-on-surface">
                {t('pages.clients.subscriptionDetail.suspension')}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.clients.subscriptionDetail.suspensionHint')}
              </p>
            </div>
            {detail.status === 'SUSPENDED' && canReactivate ? (
              <Button
                variant="secondary"
                icon="play_arrow"
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending || suspendMutation.isPending}
              >
                {t('pages.clients.subscriptionDetail.reactivate')}
              </Button>
            ) : detail.status === 'SUSPENDED' ? (
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.clients.subscriptionDetail.paymentRequired')}
              </span>
            ) : (
              <Button
                variant="danger"
                icon="pause"
                onClick={() => suspendMutation.mutate()}
                disabled={suspendMutation.isPending || reactivateMutation.isPending}
              >
                {t('pages.clients.subscriptionDetail.suspend')}
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant/40">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
              <span className="font-label-md text-label-md text-on-surface">
                {t('pages.clients.subscriptionDetail.history')}
              </span>
              <Icon name="receipt_long" className="text-[20px] text-secondary" />
            </div>
            {detail.payments.length === 0 ? (
              <p className="px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
                {t('subscription.noPayments')}
              </p>
            ) : (
              <div className="max-h-72 overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                    <tr>
                      <th className="px-4 py-2">{t('subscription.tableDate')}</th>
                      <th className="px-4 py-2">{t('subscription.tablePlan')}</th>
                      <th className="px-4 py-2">{t('subscription.tableAmount')}</th>
                      <th className="px-4 py-2">{t('subscription.tableStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm text-on-surface">
                    {detail.payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-outline-variant/20">
                        <td className="px-4 py-2 text-on-surface-variant">{formatDate(payment.createdAt)}</td>
                        <td className="px-4 py-2">{payment.planName ?? '—'}</td>
                        <td className="px-4 py-2 font-numeric-tabular">
                          {formatMoney(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 py-2">
                          <StatusPill tone={PAYMENT[payment.status].tone} label={t(PAYMENT[payment.status].key)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppModal>
  );
}
