'use client';

import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { FormEvent, useState } from 'react';

import packageJson from '../../../package.json';
import { useTranslation } from '../../providers/i18n-provider';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Icon } from '../ui/icon';
import { Input } from '../ui/input';

interface LoginStepProps {
  loading: boolean;
  onSubmit: (values: { email: string; password: string; remember: boolean }) => void;
}

interface LoginErrors {
  email?: string;
  password?: string;
}

export function LoginStep({ loading, onSubmit }: LoginStepProps) {
  const { t } = useTranslation();
  const shakeControls = useAnimationControls();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  const version = `v${packageJson.version.split('.').slice(0, 2).join('.')}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: LoginErrors = {};
    if (!/^\S+@\S+$/.test(email)) nextErrors.email = t('pages.auth.invalidEmail');
    if (password.length < 6) nextErrors.password = t('pages.auth.passwordMin');
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      void shakeControls.start({
        x: [0, -7, 7, -5, 5, -2, 0],
        transition: { duration: 0.4, ease: 'easeInOut' },
      });
      return;
    }
    onSubmit({ email, password, remember });
  };

  return (
    <motion.form
      noValidate
      animate={shakeControls}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-pop sm:p-8"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-label-uppercase text-label-uppercase uppercase tracking-[0.18em] text-on-surface">
          {t('pages.auth.adminLabel')}
        </span>
      </div>

      <h1 className="mt-6 font-headline-lg text-headline-lg text-on-surface">{t('pages.auth.loginTitle')}</h1>
      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{t('pages.auth.loginSubtitle')}</p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-email"
            className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant"
          >
            {t('pages.auth.emailLabel')}
          </label>
          <Input
            id="login-email"
            type="email"
            icon="mail"
            autoComplete="email"
            placeholder={t('pages.auth.emailPlaceholder')}
            value={email}
            disabled={loading}
            aria-invalid={Boolean(errors.email)}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          {errors.email && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="font-label-sm text-label-sm text-error"
            >
              {errors.email}
            </motion.span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-password"
            className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant"
          >
            {t('pages.auth.passwordLabel')}
          </label>
          <div className="relative flex w-full items-center">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              icon="lock"
              autoComplete="current-password"
              value={password}
              disabled={loading}
              className="w-full"
              inputClassName="pr-11"
              aria-invalid={Boolean(errors.password)}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
            <button
              type="button"
              disabled={loading}
              aria-label={showPassword ? t('pages.auth.hidePassword') : t('pages.auth.showPassword')}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={showPassword ? 'hide' : 'show'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  className="flex"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
          {errors.password && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="font-label-sm text-label-sm text-error"
            >
              {errors.password}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={remember}
            onChange={() => setRemember((current) => !current)}
            label={t('pages.auth.rememberSession')}
            disabled={loading}
          />
          <span className="font-body-sm text-body-sm text-on-surface-variant">{t('pages.auth.rememberSession')}</span>
        </div>

        <Button type="submit" className="w-full py-2.5" disabled={loading}>
          {t('pages.auth.loginSubmit')}
          <Icon
            name={loading ? 'progress_activity' : 'arrow_forward'}
            className={loading ? 'animate-spin text-[18px]' : 'text-[18px]'}
          />
        </Button>
      </div>

      <div className="mt-5 flex justify-center">
        <span className="rounded-full bg-surface-container px-2 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
          {version}
        </span>
      </div>
    </motion.form>
  );
}
