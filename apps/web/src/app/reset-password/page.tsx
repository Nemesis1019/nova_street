'use client';

import { isValidPassword, PASSWORD_POLICY_MESSAGE } from '@ecommerce/shared';
import { Button, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { AuthShell } from '../../components/auth-shell';
import { PasswordMatchHint, PasswordRequirements } from '../../components/password-requirements';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const form = useForm({
    initialValues: { password: '', confirmPassword: '' },
    validate: {
      password: (value: string) => (isValidPassword(value) ? null : PASSWORD_POLICY_MESSAGE),
      confirmPassword: (value: string, values) => (value === values.password ? null : 'Las contraseñas no coinciden'),
    },
  });

  // Las indicaciones se muestran solo mientras el campo tiene foco.
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const passwordProps = form.getInputProps('password');
  const confirmPasswordProps = form.getInputProps('confirmPassword');

  const reset = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await apiClient.POST('/auth/reset-password', {
        body: { token, password } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess({ title: 'Contraseña actualizada', message: 'Ya podés iniciar sesión con tu nueva contraseña.' });
      router.push('/login');
    },
    onError: (error) => {
      notifyError({ title: 'Error al restablecer', message: getApiErrorMessage(error) });
    },
  });

  return (
    <AuthShell
      eyebrow="Recuperar acceso"
      title={
        <>
          ELEGÍ TU NUEVA
          <br />
          CONTRASEÑA.
        </>
      }
      description="Definí una contraseña nueva y segura para volver a entrar a tu cuenta."
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            NUEVA CONTRASEÑA
          </Title>
              <Text size="sm" c="dimmed">
                {token
                  ? 'Ingresá tu nueva contraseña. Al guardar, se cerrarán tus sesiones activas.'
                  : 'El enlace es inválido o está incompleto. Solicitá uno nuevo desde la pantalla de login.'}
              </Text>
            </Stack>

            {token && (
              <form onSubmit={form.onSubmit((values) => reset.mutate(values.password))}>
                <Stack gap="md">
                  <PasswordInput
                    label="Nueva contraseña"
                    {...passwordProps}
                    onFocus={(event) => {
                      passwordProps.onFocus?.(event);
                      setPasswordFocused(true);
                    }}
                    onBlur={(event) => {
                      passwordProps.onBlur?.(event);
                      setPasswordFocused(false);
                    }}
                  />
                  {passwordFocused && <PasswordRequirements value={form.values.password} />}
                  <PasswordInput
                    label="Confirmar contraseña"
                    {...confirmPasswordProps}
                    onFocus={(event) => {
                      confirmPasswordProps.onFocus?.(event);
                      setConfirmFocused(true);
                    }}
                    onBlur={(event) => {
                      confirmPasswordProps.onBlur?.(event);
                      setConfirmFocused(false);
                    }}
                  />
                  {confirmFocused && (
                    <PasswordMatchHint
                      password={form.values.password}
                      confirmValue={form.values.confirmPassword}
                    />
                  )}
                  <Button
                    type="submit"
                    loading={reset.isPending}
                    fullWidth
                    size="lg"
                    style={{
                      backgroundColor: '#0d0d0d',
                      color: '#fcf9f8',
                      fontFamily: 'var(--font-bebas-neue)',
                    }}
                  >
                    Restablecer contraseña
                  </Button>
                </Stack>
              </form>
            )}

            <Text size="sm" ta="center">
              <Link href="/login" style={{ color: '#0d0d0d', fontWeight: 600 }}>
                Volver a iniciar sesión
              </Link>
            </Text>
      </Stack>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
