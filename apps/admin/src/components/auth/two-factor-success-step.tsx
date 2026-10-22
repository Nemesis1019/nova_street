'use client';

import { useMemo, useState } from 'react';

import { notifyError } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';

interface TwoFactorSuccessStepProps {
  recoveryCodes: string[];
  onContinue: () => void;
}

function detectBrowser(userAgent: string): string | null {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Chrome\//.test(userAgent)) return 'Chrome';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return null;
}

function detectOs(userAgent: string): string | null {
  if (/Windows/.test(userAgent)) return 'Windows';
  if (/Android/.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  if (/Mac OS X|Macintosh/.test(userAgent)) return 'macOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  return null;
}

export function TwoFactorSuccessStep({ recoveryCodes, onContinue }: TwoFactorSuccessStepProps) {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState(false);

  const client = useMemo(() => {
    const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    return {
      browser: detectBrowser(userAgent) ?? t('pages.auth.browserUnknown'),
      os: detectOs(userAgent) ?? t('pages.auth.osUnknown'),
    };
  }, [t]);

  const registeredAt = useMemo(() => {
    const language = typeof navigator === 'undefined' ? locale : navigator.language || locale;
    return new Date().toLocaleString(language);
  }, [locale]);

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      notifyError({ title: t('pages.auth.copyCodesError') });
    }
  };

  const handleDownloadCodes = () => {
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nova-2fa-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-pop sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
          {t('pages.auth.successBreadcrumb')}
        </span>
        <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
          {t('pages.auth.successBadge')}
        </span>
      </div>

      <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface">
        <Icon name="verified_user" filled className="text-[24px]" />
      </div>

      <h1 className="mt-4 font-headline-md text-headline-md text-on-surface">{t('pages.auth.successTitle')}</h1>
      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{t('pages.auth.successDescription')}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant/40 px-3 py-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.auth.linkedDevice')}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-label-sm text-label-sm font-medium text-emerald-700">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {t('pages.auth.activeTrusted')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-surface-container-low p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.auth.methodLabel')}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface">{t('pages.auth.methodValue')}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.auth.clientLabel')}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface">
            {client.browser} · {client.os}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.auth.sessionRegistered')}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface">{registeredAt}</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-outline-variant/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.auth.recoveryCodesTitle').replace('{{count}}', String(recoveryCodes.length))}
          </span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" onClick={handleCopyCodes}>
              <Icon name={copied ? 'check' : 'content_copy'} className="text-[16px]" />
              {copied ? t('common.copied') : t('common.copy')}
            </Button>
            <Button type="button" variant="ghost" onClick={handleDownloadCodes}>
              <Icon name="download" className="text-[16px]" />
              {t('pages.auth.downloadCodes')}
            </Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {recoveryCodes.map((item) => (
            <span
              key={item}
              className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2 py-1.5 text-center font-mono text-[13px] font-semibold tracking-wide text-on-surface"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="mt-3 font-label-sm text-label-sm text-on-surface-variant">{t('pages.auth.recoveryHint')}</p>
      </div>

      <Button type="button" className="mt-5 w-full py-2.5" onClick={onContinue}>
        {t('pages.auth.continueDashboard')}
        <Icon name="arrow_forward" className="text-[18px]" />
      </Button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="print" className="text-[16px]" />
          {t('pages.auth.printCodes')}
        </button>
        <span className="font-label-sm text-label-sm text-on-surface-variant/80">{t('pages.auth.manageLater')}</span>
      </div>
    </div>
  );
}
