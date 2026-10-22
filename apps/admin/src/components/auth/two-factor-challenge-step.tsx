'use client';

import { useState } from 'react';

import { notifyError } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Icon } from '../ui/icon';
import { Input } from '../ui/input';
import { OtpInput } from '../ui/otp-input';

interface TwoFactorChallengeStepProps {
  email: string;
  loading: boolean;
  onVerify: (values: { code: string; backup: boolean; trustDevice: boolean }) => void;
  onChangeAccount: () => void;
}

export function TwoFactorChallengeStep({ email, loading, onVerify, onChangeAccount }: TwoFactorChallengeStepProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [backupMode, setBackupMode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);

  const handlePaste = async () => {
    if (!navigator.clipboard?.readText) {
      notifyError({ title: t('common.clipboardUnavailable') });
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (backupMode) {
        setBackupCode(text.trim().replace(/\s/g, '').slice(0, 9));
        return;
      }
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits) setCode(digits);
    } catch {
      notifyError({ title: t('pages.auth.pasteError') });
    }
  };

  const canSubmit = backupMode ? backupCode.replace(/\D/g, '').length === 8 : code.length === 6;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onVerify({ code: backupMode ? backupCode.trim() : code, backup: backupMode, trustDevice });
  };

  const handleToggleBackup = () => {
    setBackupMode((current) => !current);
    setCode('');
    setBackupCode('');
  };

  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-pop sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
          {t('pages.auth.challengeBreadcrumb')}
        </span>
        <span className="rounded-full border border-outline-variant/40 bg-surface-container-low px-2.5 py-1 font-label-uppercase text-label-uppercase text-on-surface-variant">
          {t('pages.auth.challengeBadge')}
        </span>
      </div>

      <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface">
        <Icon name="shield" className="text-[20px]" />
      </div>

      <p className="mt-4 font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
        {t('pages.auth.challengeOverline')}
      </p>
      <h1 className="mt-1 font-headline-md text-headline-md text-on-surface">{t('pages.auth.challengeTitle')}</h1>
      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{t('pages.auth.challengeDescription')}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-low px-3 py-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {t('pages.auth.pendingSession')} <span className="text-on-surface">{email}</span>
        </span>
        <button
          type="button"
          onClick={onChangeAccount}
          className="font-label-sm text-label-sm font-medium text-on-surface underline decoration-outline-variant underline-offset-4 transition-colors hover:decoration-on-surface"
        >
          {t('pages.auth.notYou')} {t('pages.auth.change')}
        </button>
      </div>

      {backupMode ? (
        <div className="mt-5 flex flex-col gap-2">
          <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.auth.backupLabel')}
          </span>
          <Input
            id="backup-code"
            icon="key"
            autoComplete="one-time-code"
            placeholder="1234-5678"
            value={backupCode}
            disabled={loading}
            inputClassName="font-mono tracking-[0.2em]"
            onChange={(event) => setBackupCode(event.currentTarget.value.slice(0, 9))}
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
            {t('pages.auth.securityCodeLabel')}
          </span>
          <OtpInput
            value={code}
            onChange={setCode}
            disabled={loading}
            autoFocus
            label={t('pages.auth.securityCodeLabel')}
          />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" disabled={loading} onClick={handlePaste}>
              <Icon name="content_paste" className="text-[16px]" />
              {t('pages.auth.pasteCode')}
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggleBackup}
        className="mt-4 flex items-center gap-1.5 font-label-sm text-label-sm font-medium text-on-surface transition-colors hover:opacity-80"
      >
        <Icon name="shield" className="text-[14px]" />
        <span className="underline decoration-outline-variant underline-offset-4">
          {backupMode ? t('pages.auth.backupToggleBack') : t('pages.auth.backupToggle')}
        </span>
      </button>

      <div className="mt-4 flex items-start gap-2">
        <Checkbox
          checked={trustDevice}
          onChange={() => setTrustDevice((current) => !current)}
          label={t('pages.auth.rememberDevice')}
          disabled={loading}
        />
        <div className="flex flex-col">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.auth.rememberDevice')}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant/80">
            {t('pages.auth.rememberDeviceHint')}
          </span>
        </div>
      </div>

      <Button type="button" className="mt-5 w-full py-2.5" disabled={loading || !canSubmit} onClick={handleSubmit}>
        {t('pages.auth.challengeSubmit')}
        <Icon
          name={loading ? 'progress_activity' : 'arrow_forward'}
          className={loading ? 'animate-spin text-[18px]' : 'text-[18px]'}
        />
      </Button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/30 pt-4">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.auth.itSupport')}</span>
        <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant/80">
          <Icon name="lock" className="text-[12px]" />
          {t('pages.auth.securityFooter')}
        </span>
      </div>
    </div>
  );
}
