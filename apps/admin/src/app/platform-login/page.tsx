'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '../../components/ui/button';
import { Icon } from '../../components/ui/icon';
import { setAdminTenantSlug, setPlatformMode } from '../../lib/tenant';
import { useTranslation } from '../../providers/i18n-provider';
import { usePlatformSession } from '../../providers/platform-provider';

/**
 * Login transversal del super admin: entra con la cuenta de plataforma y abre
 * el cliente por defecto (o el primero activo) con una sesión impersonada.
 * Luego puede cambiar de cliente desde el selector del header.
 */
export default function PlatformLoginPage() {
  const { t } = useTranslation();
  const { login, verifyTwoFactor } = usePlatformSession();
  const [form, setForm] = useState({ email: '', password: '', code: '' });
  const [challenge, setChallenge] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const enterPlatformPanel = () => {
    // El panel transversal usa la config del tenant por defecto como home.
    setAdminTenantSlug(process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'nova');
    setPlatformMode(true);
    window.location.href = '/clients';
  };

  const submit = async () => {
    setError(null);
    setPending(true);
    try {
      if (challenge) {
        const user = await verifyTwoFactor(challenge, form.code);
        if (!user) throw new Error(t('pages.clients.platformLoginError'));
      } else {
        const result = await login(form.email, form.password, form.code || undefined);
        if (result.twoFactorRequired) {
          setChallenge(result.challengeToken ?? null);
          return;
        }
        if (!result.user) throw new Error(t('pages.clients.platformLoginError'));
      }
      enterPlatformPanel();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : t('pages.clients.platformLoginError'),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-surface-container-lowest p-7 shadow-card">
        <div className="flex flex-col gap-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary">
            <Icon name="shield_person" className="text-[22px]" />
          </span>
          <h1 className="mt-2 font-headline-sm text-headline-sm font-bold text-on-surface">
            {t('pages.clients.platformLoginTitle')}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t('pages.clients.platformLoginSubtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {challenge ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="platform-login-code" className="font-label-md text-label-md text-on-surface">
                {t('pages.clients.platformCode')}
              </label>
              <input
                id="platform-login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={form.code}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((prev) => ({ ...prev, code: value }));
                }}
                placeholder="123456"
                className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface focus:bg-surface-container focus:outline-none"
              />
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {t('pages.clients.platformCodeHint')}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="platform-login-email" className="font-label-md text-label-md text-on-surface">
                  {t('pages.clients.platformEmail')}
                </label>
                <input
                  id="platform-login-email"
                  type="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, email: value }));
                  }}
                  placeholder="owner@nova.app"
                  className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="platform-login-password" className="font-label-md text-label-md text-on-surface">
                  {t('pages.clients.platformPassword')}
                </label>
                <input
                  id="platform-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setForm((prev) => ({ ...prev, password: value }));
                  }}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-surface-container-low px-3.5 py-2.5 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container focus:outline-none"
                />
              </div>
            </>
          )}

          {error ? (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">
              {error}
            </p>
          ) : null}

          <Button icon="login" onClick={() => void submit()} disabled={pending}>
            {pending ? t('pages.clients.platformSigningIn') : t('pages.clients.platformSignIn')}
          </Button>

          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {t('pages.clients.platformLoginHint')}
          </p>
        </div>

        <Link
          href="/"
          className="text-center font-label-md text-label-md text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline"
        >
          {t('pages.clients.platformBackToLogin')}
        </Link>
      </div>
    </main>
  );
}
