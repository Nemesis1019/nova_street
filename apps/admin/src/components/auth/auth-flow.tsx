'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiClient, setAuthToken } from '../../lib/api';
import { setAccessToken } from '../../lib/auth';
import { getApiErrorMessage, notifyError } from '../../lib/notifications';
import { setPlatformMode } from '../../lib/tenant';
import { useTranslation } from '../../providers/i18n-provider';
import { fadeInUp, MOTION_DURATION, MOTION_EASE, popIn } from '../ui/motion';
import { AuthLayout } from './auth-layout';
import { LoginStep } from './login-step';
import { TwoFactorChallengeStep } from './two-factor-challenge-step';
import { TwoFactorSetupStep } from './two-factor-setup-step';
import { TwoFactorSuccessStep } from './two-factor-success-step';

type AuthStep = 'login' | 'setup' | 'challenge' | 'success';

interface SetupData {
  challengeToken: string;
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}

const stepExit = {
  opacity: 0,
  y: -8,
  transition: { duration: MOTION_DURATION, ease: MOTION_EASE },
};

/**
 * Máquina de estados del flujo de autenticación:
 * login → (setup → success) | (challenge) → sesión iniciada.
 */
export function AuthFlow() {
  const router = useRouter();
  const { t } = useTranslation();

  const [step, setStep] = useState<AuthStep>('login');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [pendingAccessToken, setPendingAccessToken] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const persistSession = (accessToken: string) => {
    // El access token queda solo en memoria; la sesión persistente la controla
    // la cookie httpOnly de refresh (según "recordarme" al iniciar sesión).
    setAccessToken(accessToken);
    setAuthToken(accessToken);
    setPlatformMode(false);
    window.dispatchEvent(new Event('admin-auth-change'));
    router.push('/');
  };

  const handleLogin = async (values: { email: string; password: string; remember: boolean }) => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.POST('/auth/login', {
        body: { email: values.email, password: values.password, remember: values.remember } as never,
      });
      if (error) throw error;
      if (!data) throw new Error(t('pages.auth.unexpectedResponse'));

      setPendingEmail(values.email);

      if (data.accessToken) {
        persistSession(data.accessToken);
        return;
      }

      if (data.twoFactorRequired && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        if (data.twoFactorSetupRequired) {
          const { data: setupResponse, error: setupError } = await apiClient.POST('/auth/2fa/setup', {
            body: { challengeToken: data.challengeToken },
          });
          if (setupError) throw setupError;
          if (!setupResponse) throw new Error(t('pages.auth.unexpectedResponse'));
          setSetupData({ ...setupResponse, challengeToken: data.challengeToken });
          setStep('setup');
          return;
        }
        setStep('challenge');
        return;
      }

      throw new Error(t('pages.auth.unexpectedResponse'));
    } catch (requestError) {
      notifyError({ title: t('pages.auth.loginErrorTitle'), message: getApiErrorMessage(requestError) });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupConfirm = async (code: string, trustDevice: boolean) => {
    if (!setupData) return;
    setLoading(true);
    try {
      const { data, error } = await apiClient.POST('/auth/2fa/setup/confirm', {
        body: { challengeToken: setupData.challengeToken, code, trustDevice },
      });
      if (error) throw error;
      if (!data?.accessToken) throw new Error(t('pages.auth.unexpectedResponse'));

      // Los tokens se persisten recién al continuar desde la pantalla de éxito.
      setPendingAccessToken(data.accessToken);
      setRecoveryCodes(data.recoveryCodes ?? []);
      setStep('success');
    } catch (requestError) {
      notifyError({ title: t('pages.auth.setupErrorTitle'), message: getApiErrorMessage(requestError) });
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeVerify = async (values: { code: string; backup: boolean; trustDevice: boolean }) => {
    setLoading(true);
    try {
      const { data, error } = await apiClient.POST('/auth/2fa/verify', {
        body: {
          challengeToken,
          code: values.code,
          backup: values.backup,
          trustDevice: values.trustDevice,
        },
      });
      if (error) throw error;
      if (!data?.accessToken) throw new Error(t('pages.auth.unexpectedResponse'));
      persistSession(data.accessToken);
    } catch (requestError) {
      notifyError({ title: t('pages.auth.challengeErrorTitle'), message: getApiErrorMessage(requestError) });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAccount = () => {
    setChallengeToken('');
    setSetupData(null);
    setStep('login');
  };

  const handleContinueToDashboard = () => {
    if (!pendingAccessToken) return;
    persistSession(pendingAccessToken);
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'login' && (
          <motion.div key="login" variants={fadeInUp} initial="hidden" animate="visible" exit={stepExit}>
            <LoginStep loading={loading} onSubmit={handleLogin} />
            <Link
              href="/platform-login"
              className="mt-4 flex items-center justify-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">shield_person</span>
              {t('pages.clients.platformLogin')}
            </Link>
          </motion.div>
        )}

        {step === 'setup' && setupData && (
          <motion.div key="setup" variants={fadeInUp} initial="hidden" animate="visible" exit={stepExit}>
            <TwoFactorSetupStep setup={setupData} loading={loading} onConfirm={handleSetupConfirm} />
          </motion.div>
        )}

        {step === 'challenge' && (
          <motion.div key="challenge" variants={fadeInUp} initial="hidden" animate="visible" exit={stepExit}>
            <TwoFactorChallengeStep
              email={pendingEmail}
              loading={loading}
              onVerify={handleChallengeVerify}
              onChangeAccount={handleChangeAccount}
            />
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" variants={popIn} initial="hidden" animate="visible" exit="exit">
            <TwoFactorSuccessStep recoveryCodes={recoveryCodes} onContinue={handleContinueToDashboard} />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
