'use client';

import { useState } from 'react';

import { notifyError } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Icon } from '../ui/icon';
import { OtpInput } from '../ui/otp-input';

interface TwoFactorSetupStepProps {
  setup: {
    qrDataUrl: string;
    secret: string;
  };
  loading: boolean;
  onConfirm: (code: string, trustDevice: boolean) => void;
}

export function TwoFactorSetupStep({ setup, loading, onConfirm }: TwoFactorSetupStepProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      notifyError({ title: t('common.clipboardUnavailable') });
    }
  };

  const handleSubmit = () => {
    if (code.length !== 6) return;
    onConfirm(code, trustDevice);
  };

  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-pop sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
          {t('pages.auth.setupBreadcrumb')}
        </span>
        <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
          {t('pages.auth.setupBadge')}
        </span>
      </div>

      <h1 className="mt-4 font-headline-md text-headline-md text-on-surface">{t('pages.auth.setupTitle')}</h1>
      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{t('pages.auth.setupDescription')}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-full bg-primary px-3 py-1 font-label-sm text-label-sm text-on-primary">
          <span
            aria-hidden="true"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold"
          >
            1
          </span>
          {t('pages.auth.setupStepScan')}
        </span>
        <span className="flex items-center gap-2 rounded-full px-3 py-1 font-label-sm text-label-sm text-on-surface-variant">
          <span
            aria-hidden="true"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-container text-[10px] font-semibold"
          >
            2
          </span>
          {t('pages.auth.setupStepConfirm')}
        </span>
      </div>

      <div className="mt-5 flex justify-center">
        <div className="relative h-[200px] w-[200px] rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3">
          <img src={setup.qrDataUrl} alt={t('pages.auth.qrAlt')} className="h-full w-full object-contain" />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-primary"
          >
            <span className="font-label-md text-label-md font-bold text-on-primary">N</span>
          </span>
        </div>
      </div>

      <p className="mt-4 text-center font-label-sm text-label-sm text-on-surface-variant">
        {t('pages.auth.manualKeyLabel')}
      </p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <code className="rounded-lg bg-surface-container-low px-3 py-1.5 font-mono text-[13px] tracking-[0.08em] text-on-surface">
          {setup.secret.match(/.{1,4}/g)?.join('-') ?? setup.secret}
        </code>
        <button
          type="button"
          onClick={handleCopySecret}
          aria-label={copied ? t('common.copied') : t('common.copy')}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          <Icon name={copied ? 'check' : 'content_copy'} className="text-[16px]" />
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.auth.authCodeLabel')}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.auth.stepProgress')}</span>
        </div>
        <OtpInput
          value={code}
          onChange={setCode}
          disabled={loading}
          autoFocus
          label={t('pages.auth.authCodeLabel')}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Checkbox
          checked={trustDevice}
          onChange={() => setTrustDevice((current) => !current)}
          label={t('pages.auth.trustDevice')}
          disabled={loading}
        />
        <span className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.auth.trustDevice')}</span>
      </div>

      <Button
        type="button"
        className="mt-5 w-full py-2.5"
        disabled={loading || code.length !== 6}
        onClick={handleSubmit}
      >
        {t('pages.auth.setupSubmit')}
        <Icon
          name={loading ? 'progress_activity' : 'arrow_forward'}
          className={loading ? 'animate-spin text-[18px]' : 'text-[18px]'}
        />
      </Button>

      <p className="mt-4 text-center font-label-sm text-label-sm text-on-surface-variant">
        {t('pages.auth.setupFooter')}
      </p>
    </div>
  );
}
