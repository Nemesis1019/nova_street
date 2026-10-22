'use client';

import { Button, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { AuthShell } from '../../components/auth-shell';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError } from '../../lib/notifications';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const form = useForm({
    initialValues: { email: '' },
    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
    },
  });

  const forgot = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await apiClient.POST('/auth/forgot-password', {
        body: { email } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
    },
    onError: (error) => {
      notifyError({ title: 'Error', message: getApiErrorMessage(error) });
    },
  });

  return (
    <AuthShell
      eyebrow="Recuperar acceso"
      title={
        <>
          ¿OLVIDASTE TU
          <br />
          CONTRASEÑA?
        </>
      }
      description="Te enviamos un enlace para restablecerla y volver a entrar a tu cuenta."
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            RECUPERÁ TU CONTRASEÑA
          </Title>
              {sent ? (
                <Text size="sm" c="dimmed">
                  Si el email <strong>{form.values.email}</strong> está registrado, te enviamos un enlace para
                  restablecer tu contraseña. Revisá tu bandeja de entrada y spam.
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Ingresá el email de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
                </Text>
              )}
            </Stack>

            {!sent && (
              <form onSubmit={form.onSubmit((values) => forgot.mutate(values.email))}>
                <Stack gap="md">
                  <TextInput label="Correo Electrónico" {...form.getInputProps('email')} />
                  <Button
                    type="submit"
                    loading={forgot.isPending}
                    fullWidth
                    size="lg"
                    style={{
                      backgroundColor: '#0d0d0d',
                      color: '#fcf9f8',
                      fontFamily: 'var(--font-bebas-neue)',
                    }}
                  >
                    Enviar enlace
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
