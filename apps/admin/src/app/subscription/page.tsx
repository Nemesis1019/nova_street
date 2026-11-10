'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { BoldSubscriptionButton, type BoldSubscriptionButtonConfig } from '../../components/bold-subscription-button';
import { LoadingState } from '../../components/loading-state';
import { Button } from '../../components/ui/button';
import { Icon } from '../../components/ui/icon';
import { fadeInUp, staggerContainer } from '../../components/ui/motion';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { StatusPill, type StatusTone } from '../../components/ui/status-pill';
import { platformRequest } from '../../lib/platform-auth';
import { useTranslation } from '../../providers/i18n-provider';

type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SUSPENDED';
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

interface SubscriptionPlan {
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

interface SubscriptionPayment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerTransactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  planId: string | null;
  planName: string | null;
}

interface SubscriptionOverview {
  tenant: { id: string; slug: string; name: string };
  plan: SubscriptionPlan | null;
  plans: SubscriptionPlan[];
  status: SubscriptionStatus;
  paid: boolean;
  paidUntil: string | null;
  graceDays: number;
  suspendedAt: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
  lastPaymentCurrency: string | null;
  bold: { configured: boolean; sandbox: boolean };
  payments: SubscriptionPayment[];
}

interface CheckoutConfig extends BoldSubscriptionButtonConfig {
  planId: string;
  planName: string;
  periodDays: number;
}

const STATUS: Record<SubscriptionStatus, { labelKey: string; tone: StatusTone }> = {
  TRIAL: { labelKey: 'subscription.statusTrial', tone: 'info' },
  ACTIVE: { labelKey: 'subscription.statusActive', tone: 'success' },
  PAST_DUE: { labelKey: 'subscription.statusPastDue', tone: 'warning' },
  CANCELED: { labelKey: 'subscription.statusCanceled', tone: 'neutral' },
  SUSPENDED: { labelKey: 'subscription.statusSuspended', tone: 'danger' },
};

const PAYMENT_STATUS: Record<PaymentStatus, { labelKey: string; tone: StatusTone }> = {
  PENDING: { labelKey: 'subscription.paymentPending', tone: 'warning' },
  PAID: { labelKey: 'subscription.paymentPaid', tone: 'success' },
  FAILED: { labelKey: 'subscription.paymentFailed', tone: 'danger' },
};

function localeFor(locale: string) {
  if (locale === 'en') return 'en-US';
  if (locale === 'pt') return 'pt-BR';
  return 'es-CO';
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(localeFor(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value: number | null, currency: string, locale: string) {
  if (value === null) return '—';
  return new Intl.NumberFormat(localeFor(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SubscriptionPage() {
  const { t, locale } = useTranslation();
  const [checkout, setCheckout] = useState<CheckoutConfig | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [returnedFromBold, setReturnedFromBold] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const checkoutAttempted = useRef(false);
  const selectedPlanIdRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnedFromBold(params.get('subscription') === 'return');
  }, []);

  const overviewQuery = useQuery({
    queryKey: ['admin-subscription'],
    queryFn: () => platformRequest<SubscriptionOverview>('/admin/subscription'),
    refetchOnWindowFocus: true,
    refetchInterval: returnedFromBold ? 5000 : false,
  });

  const overview = overviewQuery.data;
  selectedPlanIdRef.current = selectedPlanId;
  const status = overview ? STATUS[overview.status] : null;
  const selectedPlan =
    overview?.plans.find((plan) => plan.id === selectedPlanId) ??
    overview?.plan ??
    overview?.plans[0] ??
    null;

  useEffect(() => {
    if (!overview || selectedPlanId) return;
    setSelectedPlanId(overview.plan?.id ?? overview.plans[0]?.id ?? null);
  }, [overview, selectedPlanId]);

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      platformRequest<CheckoutConfig>('/admin/subscription/checkout', {
        method: 'POST',
        body: { planId },
      }),
    onSuccess: (data) => {
      if (data.planId !== selectedPlanIdRef.current) return;
      setCheckoutError(null);
      setCheckout(data);
    },
    onError: (error, planId) => {
      if (planId !== selectedPlanIdRef.current) return;
      setCheckoutError(error instanceof Error ? error.message : t('subscription.checkoutError'));
    },
  });

  const startCheckout = (planId = selectedPlanId) => {
    if (!planId) return;
    checkoutAttempted.current = true;
    setCheckoutError(null);
    checkoutMutation.mutate(planId);
  };

  const choosePlan = (planId: string) => {
    if (planId === selectedPlanId) return;
    setSelectedPlanId(planId);
    setCheckout(null);
    setCheckoutError(null);
    setRenewing(false);
    checkoutAttempted.current = false;
  };

  const shouldOfferInitialCheckout = Boolean(
    overview && !overview.paid && overview.bold.configured && selectedPlan,
  );

  useEffect(() => {
    if (
      !shouldOfferInitialCheckout ||
      checkout ||
      checkoutAttempted.current ||
      checkoutMutation.isPending ||
      !selectedPlanId
    ) {
      return;
    }
    checkoutAttempted.current = true;
    checkoutMutation.mutate(selectedPlanId);
    // El intento pendiente se reutiliza en el backend durante 30 minutos.
  }, [shouldOfferInitialCheckout, checkout, checkoutMutation, selectedPlanId]);

  // Si el webhook confirma el pago, ocultamos el botón de la renovación accidental.
  useEffect(() => {
    if (overview?.paid) {
      setRenewing(false);
      if (!returnedFromBold) setCheckout(null);
    }
  }, [overview?.paid, returnedFromBold]);

  const startRenewal = () => {
    setRenewing(true);
    startCheckout();
  };

  const amount = useMemo(
    () =>
      selectedPlan
        ? formatMoney(selectedPlan.amount, selectedPlan.currency, locale)
        : '—',
    [selectedPlan, locale],
  );

  const showBoldButton = Boolean(
    overview?.bold.configured && checkout && (!overview.paid || renewing),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[
          { label: t('sidebar.groups.settings'), href: '/store-config' },
          { label: t('subscription.title') },
        ]}
        title={t('subscription.title')}
        subtitle={t('subscription.subtitle')}
        actions={
          <Button
            variant="secondary"
            icon="refresh"
            onClick={() => void overviewQuery.refetch()}
            disabled={overviewQuery.isFetching}
          >
            {t('subscription.refresh')}
          </Button>
        }
      />

      {overviewQuery.isLoading ? (
        <LoadingState />
      ) : overviewQuery.isError || !overview || !status ? (
        <QueryError
          title={t('subscription.loadErrorTitle')}
          description={overviewQuery.error instanceof Error ? overviewQuery.error.message : undefined}
          onRetry={() => void overviewQuery.refetch()}
          retrying={overviewQuery.isFetching}
        />
      ) : (
        <>
          {overview.status === 'SUSPENDED' ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
              <Icon name="block" className="mt-0.5 text-[20px]" />
              <div className="flex flex-col gap-0.5">
                <p className="font-label-md text-label-md">{t('subscription.suspendedTitle')}</p>
                <p className="font-body-sm text-body-sm text-rose-800">
                  {t('subscription.suspendedDescription').replace(
                    '{{days}}',
                    String(overview.graceDays),
                  )}
                </p>
              </div>
            </div>
          ) : null}

          {returnedFromBold && !overview.paid ? (
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
              <Icon name="hourglass_top" className="mt-0.5 text-[20px]" />
              <div className="flex flex-col gap-0.5">
                <p className="font-label-md text-label-md">{t('subscription.confirmingTitle')}</p>
                <p className="font-body-sm text-body-sm text-sky-800">
                  {t('subscription.confirmingDescription')}
                </p>
              </div>
            </div>
          ) : null}

          <motion.section
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card"
          >
            <div className="flex flex-col gap-2 border-b border-outline-variant/40 p-6 lg:p-8">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-secondary">
                {t('subscription.choosePlan')}
              </span>
              <h2 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                {t('subscription.choosePlanTitle')}
              </h2>
              <p className="max-w-2xl font-body-sm text-body-sm text-on-surface-variant">
                {t('subscription.choosePlanDescription')}
              </p>
            </div>

            {overview.plans.length === 0 ? (
              <div className="p-6 font-body-sm text-body-sm text-on-surface-variant">
                {t('subscription.noPlans')}
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 lg:p-6">
                {overview.plans.map((plan) => {
                  const selected = selectedPlan?.id === plan.id;
                  const current = overview.plan?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => choosePlan(plan.id)}
                      className={`flex h-full flex-col rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-primary bg-primary/[0.03] shadow-sm ring-1 ring-primary'
                          : 'border-outline-variant/50 bg-surface-container-lowest hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-label-md text-label-md font-semibold text-on-surface">
                              {plan.name}
                            </span>
                            {current ? (
                              <span className="rounded bg-secondary-fixed px-1.5 py-0.5 font-label-sm text-[9px] text-on-secondary-fixed">
                                {t('subscription.currentBadge')}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                            {plan.description ?? t('subscription.noDescription')}
                          </p>
                        </div>
                        <Icon
                          name={selected ? 'check_circle' : 'radio_button_unchecked'}
                          className={`shrink-0 text-[20px] ${selected ? 'text-primary' : 'text-outline'}`}
                        />
                      </div>
                      <div className="mt-4 flex items-end gap-1">
                        <span className="font-headline-md text-headline-md text-on-surface">
                          {formatMoney(plan.amount, plan.currency, locale)}
                        </span>
                        <span className="pb-1 font-label-sm text-label-sm text-on-surface-variant">
                          / {plan.periodDays}d
                        </span>
                      </div>
                      <ul className="mt-3 flex flex-col gap-1.5 border-t border-outline-variant/30 pt-3">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant"
                          >
                            <Icon name="check" className="mt-0.5 text-[14px] text-secondary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.section>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]"
          >
            <motion.section
              variants={fadeInUp}
              className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card"
            >
              <div className="flex flex-col gap-6 p-6 lg:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-secondary">
                      {t('subscription.currentPlan')}
                    </span>
                    <h2 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                      {overview.plan?.name ?? selectedPlan?.name ?? t('subscription.noPlan')}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('subscription.tenantLabel')} {overview.tenant.name}
                    </p>
                  </div>
                  <StatusPill tone={status.tone} label={t(status.labelKey)} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-surface-container-low p-4">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Icon name="calendar_month" className="text-[18px]" />
                      <span className="font-label-sm text-label-sm">{t('subscription.paidUntil')}</span>
                    </div>
                    <p className="mt-2 font-headline-sm text-headline-sm text-on-surface">
                      {formatDate(overview.paidUntil, locale)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-4">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Icon name="payments" className="text-[18px]" />
                      <span className="font-label-sm text-label-sm">{t('subscription.planAmount')}</span>
                    </div>
                    <p className="mt-2 font-headline-sm text-headline-sm text-on-surface">{amount}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {t('subscription.everyDays').replace(
                        '{{days}}',
                        String(selectedPlan?.periodDays ?? 30),
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-4">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Icon name={overview.paid ? 'verified' : 'error'} className="text-[18px]" />
                      <span className="font-label-sm text-label-sm">{t('subscription.paymentState')}</span>
                    </div>
                    <p className={`mt-2 font-headline-sm text-headline-sm ${overview.paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {overview.paid ? t('subscription.paid') : t('subscription.notPaid')}
                    </p>
                    {!overview.paid ? (
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {t('subscription.graceDays').replace(
                          '{{days}}',
                          String(overview.graceDays),
                        )}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="h-px bg-outline-variant/40" />

                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">
                      {overview.paid
                        ? t('subscription.renewTitle')
                        : t('subscription.payTitle')}
                    </h3>
                    <p className="mt-1 max-w-xl font-body-sm text-body-sm text-on-surface-variant">
                      {overview.bold.configured
                        ? overview.paid
                          ? t('subscription.renewDescription')
                          : t('subscription.payDescription')
                        : t('subscription.boldUnavailable')}
                    </p>
                  </div>

                  {!overview.bold.configured ? (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                      <Icon name="info" className="mt-0.5 text-[20px]" />
                      <p className="font-body-sm text-body-sm">{t('subscription.boldUnavailableHint')}</p>
                    </div>
                  ) : showBoldButton && checkout ? (
                    <BoldSubscriptionButton config={checkout} />
                  ) : overview.paid ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        icon="autorenew"
                        onClick={startRenewal}
                        disabled={checkoutMutation.isPending || !selectedPlan}
                      >
                        {checkoutMutation.isPending
                          ? t('subscription.preparing')
                          : t('subscription.renewButton')}
                      </Button>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {t('subscription.renewHint')}
                      </span>
                    </div>
                  ) : checkoutError ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button icon="refresh" onClick={() => startCheckout()} variant="secondary">
                        {t('subscription.retryButton')}
                      </Button>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {t('subscription.retryHint')}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                      <Icon name="progress_activity" className="text-[18px] animate-spin" />
                      {t('subscription.preparing')}
                    </div>
                  )}

                  {checkoutError ? (
                    <p role="alert" className="rounded-lg bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
                      {checkoutError}
                    </p>
                  ) : null}

                  <p className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    <Icon name="lock" className="text-[15px]" />
                    {t('subscription.secureHint')}
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.aside variants={fadeInUp} className="flex flex-col gap-4">
              <div className="rounded-2xl bg-primary p-6 text-on-primary shadow-card">
                <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-on-primary/60">
                  {t('subscription.summaryTitle')}
                </span>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <span className="font-headline-lg text-headline-lg">{amount}</span>
                  <span className="pb-1 font-label-sm text-label-sm text-on-primary/60">
                    / {selectedPlan?.periodDays ?? 30}d
                  </span>
                </div>
                <div className="mt-6 flex flex-col gap-3 border-t border-on-primary/15 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-body-sm text-body-sm text-on-primary/70">{t('subscription.statusLabel')}</span>
                    <span className="font-label-md text-label-md">{t(status.labelKey)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-body-sm text-body-sm text-on-primary/70">{t('subscription.lastPayment')}</span>
                    <span className="font-label-md text-label-md">
                      {formatDate(overview.lastPaymentAt, locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-body-sm text-body-sm text-on-primary/70">{t('subscription.provider')}</span>
                    <span className="font-label-md text-label-md">Bold</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-card">
                <div className="flex items-center gap-2">
                  <Icon name="info" className="text-[20px] text-secondary" />
                  <h3 className="font-label-md text-label-md text-on-surface">
                    {t('subscription.helpTitle')}
                  </h3>
                </div>
                <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                  {t('subscription.helpDescription')}
                </p>
              </div>
            </motion.aside>
          </motion.div>

          <section className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-card">
            <div className="flex items-center justify-between gap-4 border-b border-outline-variant/40 px-6 py-4">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  {t('subscription.historyTitle')}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('subscription.historySubtitle')}
                </p>
              </div>
              <Icon name="receipt_long" className="text-[24px] text-secondary" />
            </div>

            {overview.payments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <Icon name="receipt_long" className="text-[32px] text-secondary" />
                <p className="font-label-md text-label-md text-on-surface">{t('subscription.noPayments')}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('subscription.noPaymentsHint')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                      <th className="px-6 py-3">{t('subscription.tableDate')}</th>
                      <th className="px-4 py-3">{t('subscription.tableReference')}</th>
                      <th className="px-4 py-3">{t('subscription.tablePlan')}</th>
                      <th className="px-4 py-3">{t('subscription.tableAmount')}</th>
                      <th className="px-4 py-3">{t('subscription.tableStatus')}</th>
                      <th className="rounded-r-lg px-6 py-3">{t('subscription.tablePaidAt')}</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm text-on-surface">
                    {overview.payments.map((payment) => {
                      const paymentStatus = PAYMENT_STATUS[payment.status];
                      return (
                        <tr key={payment.id} className="border-b border-outline-variant/20 last:border-b-0">
                          <td className="px-6 py-4 text-on-surface-variant">{formatDate(payment.createdAt, locale)}</td>
                          <td className="px-4 py-4">
                            <span className="font-numeric-tabular text-label-sm text-on-surface-variant" title={payment.reference}>
                              {payment.reference.slice(-14)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-on-surface">{payment.planName ?? '—'}</td>
                          <td className="px-4 py-4 font-numeric-tabular">
                            {formatMoney(payment.amount, payment.currency, locale)}
                          </td>
                          <td className="px-4 py-4">
                            <StatusPill tone={paymentStatus.tone} label={t(paymentStatus.labelKey)} />
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">{formatDate(payment.paidAt, locale)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
