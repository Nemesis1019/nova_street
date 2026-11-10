'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { platformRequest } from '../lib/platform-auth';
import { useTranslation } from '../providers/i18n-provider';
import { Icon } from './ui/icon';

interface SubscriptionOverview {
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SUSPENDED';
  paid: boolean;
  paidUntil: string | null;
  plan: { name: string };
  bold: { configured: boolean };
}

/**
 * Recordatorio operativo para admins de tienda. El pago real vive en
 * `/subscription`; acá sólo mostramos el estado y el acceso directo.
 */
export function SubscriptionBanner() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['admin-subscription'],
    queryFn: () => platformRequest<SubscriptionOverview>('/admin/subscription'),
    staleTime: 60_000,
    retry: false,
  });

  if (!data || data.paid) return null;

  const suspended = data.status === 'SUSPENDED';
  const overdue = data.status === 'PAST_DUE' || suspended;
  const paidUntil = data.paidUntil
    ? new Date(data.paidUntil).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        suspended
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : overdue
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-sky-200 bg-sky-50 text-sky-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon name={overdue ? 'warning' : 'workspace_premium'} className="mt-0.5 text-[20px]" />
        <div className="flex flex-col gap-0.5">
          <p className="font-label-md text-label-md">
            {suspended
              ? t('subscription.bannerSuspendedTitle')
              : overdue
                ? t('subscription.bannerOverdueTitle')
                : t('subscription.bannerPendingTitle')}
          </p>
          <p className="font-body-sm text-body-sm opacity-80">
            {paidUntil
              ? t('subscription.bannerPaidUntil').replace('{{date}}', paidUntil)
              : t('subscription.bannerPendingDescription')}
          </p>
        </div>
      </div>
      <Link
        href="/subscription"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-label-md text-label-md text-on-primary transition-colors hover:bg-primary/90"
      >
        <Icon name="payments" className="text-[18px]" />
        {data.bold.configured
          ? t('subscription.bannerPay')
          : t('subscription.bannerView')}
      </Link>
    </div>
  );
}
