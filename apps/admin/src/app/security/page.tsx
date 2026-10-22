'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Icon } from '../../components/ui/icon';
import { OtpInput } from '../../components/ui/otp-input';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { StatusPill } from '../../components/ui/status-pill';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type CurrentUserInfo = {
  id: string;
  email: string;
  twoFactorEnabled?: boolean;
};

type TrustedDevice = {
  id: string;
  userAgent?: string | null;
  ip?: string | null;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
};

type SetupData = {
  qrDataUrl: string;
  secret: string;
};

function describeUserAgent(userAgent?: string | null) {
  if (!userAgent) return null;
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : null;
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(userAgent)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  const parts = [browser, os].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function SecurityPage() {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();

  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenCode, setRegenCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const {
    data: me,
    isLoading: meLoading,
    isError: meError,
    isFetching: meFetching,
    refetch: refetchMe,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/auth/me');
      if (error) throw error;
      return data as unknown as CurrentUserInfo;
    },
  });

  const twoFactorEnabled = Boolean(me?.twoFactorEnabled);

  const {
    data: devices = [],
    isLoading: devicesLoading,
    isError: devicesError,
    isFetching: devicesFetching,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['auth', '2fa-devices'],
    enabled: twoFactorEnabled,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/auth/2fa/devices');
      if (error) throw error;
      return (data ?? []) as unknown as TrustedDevice[];
    },
  });

  const invalidateSecurity = () => {
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    queryClient.invalidateQueries({ queryKey: ['auth', '2fa-devices'] });
  };

  const startSetup = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/auth/2fa/setup/current');
      if (error) throw error;
      return data as unknown as SetupData;
    },
    onSuccess: (data) => {
      setSetupCode('');
      setSetupData(data);
    },
    onError: (error) => {
      notifyError({ title: t('pages.security.setupError'), message: getApiErrorMessage(error) });
    },
  });

  const confirmSetup = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await apiClient.POST('/auth/2fa/setup/confirm/current', { body: { code } });
      if (error) throw error;
      return (data as unknown as { recoveryCodes: string[] }).recoveryCodes;
    },
    onSuccess: (codes) => {
      setSetupData(null);
      setSetupCode('');
      setRecoveryCodes(codes);
      invalidateSecurity();
      notifySuccess({ title: t('pages.security.setupDone') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.security.setupConfirmError'), message: getApiErrorMessage(error) });
    },
  });

  const disableTwoFactor = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await apiClient.POST('/auth/2fa/disable', { body: { code } });
      if (error) throw error;
    },
    onSuccess: () => {
      setDisableOpen(false);
      setDisableCode('');
      invalidateSecurity();
      notifySuccess({ title: t('pages.security.disabledToast') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.security.disableError'), message: getApiErrorMessage(error) });
    },
  });

  const regenerateCodes = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await apiClient.POST('/auth/2fa/recovery-codes', { body: { code } });
      if (error) throw error;
      return (data as unknown as { recoveryCodes: string[] }).recoveryCodes;
    },
    onSuccess: (codes) => {
      setRegenOpen(false);
      setRegenCode('');
      setRecoveryCodes(codes);
      notifySuccess({ title: t('pages.security.regenToast') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.security.regenError'), message: getApiErrorMessage(error) });
    },
  });

  const revokeDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/auth/2fa/devices/{id}', { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSecurity();
      notifySuccess({ title: t('pages.security.deviceRevoked') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.security.deviceRevokeError'), message: getApiErrorMessage(error) });
    },
  });

  const copyRecoveryCodes = async () => {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      notifySuccess({ title: t('common.copied') });
    } catch {
      notifyError({ title: t('common.clipboardUnavailable') });
    }
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nova-2fa-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-8">
        <PageHeader
          breadcrumb={[
            { label: t('pages.security.breadcrumbSettings') },
            { label: t('pages.security.breadcrumbSecurity') },
          ]}
          title={t('pages.security.title')}
          subtitle={t('pages.security.subtitle')}
        />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {/* Verificación en dos pasos */}
          <section className="flex flex-col gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <Icon name="shield_lock" className="text-[22px]" />
                </div>
                <div className="flex flex-col">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    {t('pages.security.twoFactorTitle')}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('pages.security.twoFactorDescription')}
                  </p>
                </div>
              </div>
              {meLoading ? (
                <StatusPill label={t('pages.security.statusLoading')} tone="neutral" />
              ) : (
                <StatusPill
                  label={twoFactorEnabled ? t('pages.security.statusEnabled') : t('pages.security.statusDisabled')}
                  tone={twoFactorEnabled ? 'success' : 'neutral'}
                />
              )}
            </div>

            {meError ? (
              <QueryError onRetry={() => refetchMe()} retrying={meFetching} />
            ) : (
              <>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {twoFactorEnabled ? t('pages.security.enabledHint') : t('pages.security.disabledHint')}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {twoFactorEnabled ? (
                    <>
                      <Button
                        variant="secondary"
                        icon="key"
                        iconClassName="text-[18px]"
                        onClick={() => {
                          setRegenCode('');
                          setRegenOpen(true);
                        }}
                      >
                        {t('pages.security.regenerate')}
                      </Button>
                      <Button
                        variant="danger"
                        icon="shield_off"
                        iconClassName="text-[18px]"
                        onClick={() => {
                          setDisableCode('');
                          setDisableOpen(true);
                        }}
                      >
                        {t('pages.security.disable')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      icon="shield_lock"
                      iconClassName="text-[18px]"
                      disabled={startSetup.isPending}
                      onClick={() => startSetup.mutate()}
                    >
                      {t('pages.security.enable')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Dispositivos confiables */}
          <section className="flex flex-col gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                <Icon name="devices" className="text-[22px]" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  {t('pages.security.devicesTitle')}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {t('pages.security.devicesDescription')}
                </p>
              </div>
            </div>

            {!twoFactorEnabled && !meLoading ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.security.devicesRequiresTwoFactor')}
              </p>
            ) : devicesError ? (
              <QueryError onRetry={() => refetchDevices()} retrying={devicesFetching} />
            ) : devicesLoading ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">{t('common.loading')}</p>
            ) : devices.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.security.devicesEmpty')}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-outline-variant/20">
                {devices.map((device) => (
                  <li key={device.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Icon name="laptop_mac" className="mt-0.5 text-[20px] text-on-surface-variant" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-body-md text-body-md font-medium text-on-surface">
                          {describeUserAgent(device.userAgent) ?? t('pages.security.unknownDevice')}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {device.ip ? `${device.ip} · ` : ''}
                          {t('pages.security.deviceLastUsed')}: {formatDate(device.lastUsedAt, locale)}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {t('pages.security.deviceExpires')}: {formatDate(device.expiresAt, locale)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      disabled={revokeDevice.isPending && revokeDevice.variables === device.id}
                      onClick={() => revokeDevice.mutate(device.id)}
                    >
                      <Icon name="delete" className="text-[16px]" />
                      {t('pages.security.deviceRevoke')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Modal: activar 2FA */}
      <AppModal
        opened={Boolean(setupData)}
        onClose={() => {
          setSetupData(null);
          setSetupCode('');
        }}
        title={t('pages.security.setupTitle')}
        subtitle={t('pages.security.setupSubtitle')}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setSetupData(null);
                setSetupCode('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              icon="check"
              iconClassName="text-[18px]"
              disabled={confirmSetup.isPending || setupCode.length !== 6}
              onClick={() => confirmSetup.mutate(setupCode)}
            >
              {t('pages.security.setupConfirm')}
            </Button>
          </>
        }
      >
        {setupData && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <div className="h-[200px] w-[200px] rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3">
                <img src={setupData.qrDataUrl} alt={t('pages.security.setupQrAlt')} className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.security.setupKeyLabel')}
              </span>
              <code className="rounded-lg bg-surface-container-low px-3 py-1.5 font-mono text-[13px] tracking-[0.08em] text-on-surface">
                {setupData.secret.match(/.{1,4}/g)?.join('-') ?? setupData.secret}
              </code>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                {t('pages.security.setupCodeLabel')}
              </span>
              <OtpInput
                value={setupCode}
                onChange={setSetupCode}
                disabled={confirmSetup.isPending}
                autoFocus
                label={t('pages.security.setupCodeLabel')}
              />
            </div>
          </div>
        )}
      </AppModal>

      {/* Modal: desactivar 2FA */}
      <AppModal
        opened={disableOpen}
        onClose={() => setDisableOpen(false)}
        title={t('pages.security.disableTitle')}
        subtitle={t('pages.security.disableSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisableOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={disableTwoFactor.isPending || disableCode.length !== 6}
              onClick={() => disableTwoFactor.mutate(disableCode)}
            >
              {t('pages.security.disableConfirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.security.disableWarning')}</p>
          <OtpInput
            value={disableCode}
            onChange={setDisableCode}
            disabled={disableTwoFactor.isPending}
            autoFocus
            label={t('pages.security.codeLabel')}
          />
        </div>
      </AppModal>

      {/* Modal: regenerar códigos */}
      <AppModal
        opened={regenOpen}
        onClose={() => setRegenOpen(false)}
        title={t('pages.security.regenTitle')}
        subtitle={t('pages.security.regenSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRegenOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="autorenew"
              iconClassName="text-[18px]"
              disabled={regenerateCodes.isPending || regenCode.length !== 6}
              onClick={() => regenerateCodes.mutate(regenCode)}
            >
              {t('pages.security.regenConfirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.security.regenWarning')}</p>
          <OtpInput
            value={regenCode}
            onChange={setRegenCode}
            disabled={regenerateCodes.isPending}
            autoFocus
            label={t('pages.security.codeLabel')}
          />
        </div>
      </AppModal>

      {/* Modal: códigos de recuperación */}
      <AppModal
        opened={Boolean(recoveryCodes)}
        onClose={() => setRecoveryCodes(null)}
        title={t('pages.security.recoveryTitle')}
        subtitle={t('pages.security.recoverySubtitle')}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setRecoveryCodes(null)}>
            {t('pages.security.recoveryClose')}
          </Button>
        }
      >
        {recoveryCodes && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" onClick={copyRecoveryCodes}>
                <Icon name="content_copy" className="text-[16px]" />
                {t('common.copy')}
              </Button>
              <Button variant="ghost" onClick={downloadRecoveryCodes}>
                <Icon name="download" className="text-[16px]" />
                {t('pages.security.download')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {recoveryCodes.map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-2 py-1.5 text-center font-mono text-[13px] font-semibold tracking-wide text-on-surface"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.security.recoveryHint')}</p>
          </div>
        )}
      </AppModal>
    </>
  );
}
