'use client';

import { Button, PinInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { StoreFooter } from '../../components/store-footer';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useAuthStore } from '../../store/auth-store';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const { isAuthenticated, setEmailVerified } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const form = useForm({
    initialValues: { code: '' },
    validate: {
      code: (value: string) => (value.length === 6 ? null : 'Ingresá el código de 6 dígitos'),
    },
  });

  const verify = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await apiClient.POST('/auth/verify-email', {
        body: { code } as never,
      });
      if (error || !data) throw error ?? new Error('Verification failed');
      return data as { user: { emailVerified: boolean } };
    },
    onSuccess: (data) => {
      if (data.user.emailVerified) {
        setEmailVerified(true);
        notifySuccess({ title: 'Email verificado', message: 'Ya podés realizar compras.' });
        router.push('/catalogo');
      }
    },
    onError: (error) => {
      notifyError({ title: 'Código inválido', message: getApiErrorMessage(error) });
    },
  });

  const resend = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/auth/resend-verification', {
        body: {} as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess({ title: 'Código reenviado', message: `Revisá tu bandeja de entrada (${email}).` });
    },
    onError: (error) => {
      notifyError({ title: 'Error al reenviar', message: getApiErrorMessage(error) });
    },
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fcf9f8' }}>
      <header style={{ borderBottom: '1px solid #0d0d0d', padding: '16px 64px' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: '28px',
            letterSpacing: '0.05em',
            color: '#0d0d0d',
            textDecoration: 'none',
          }}
        >
          NÖVA
        </Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
        <div style={{ padding: '48px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2', maxWidth: 480, width: '100%' }}>
          <Stack gap="lg">
            <Stack gap="xs">
              <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                VERIFICÁ TU EMAIL
              </Title>
              <Text size="sm" c="dimmed">
                Te enviamos un código de 6 dígitos a <strong>{email}</strong>. Ingresalo abajo para activar tu cuenta y poder comprar.
              </Text>
            </Stack>

            <form onSubmit={form.onSubmit((values) => verify.mutate(values.code))}>
              <Stack gap="md" align="center">
                <PinInput
                  {...form.getInputProps('code')}
                  length={6}
                  type="number"
                  size="lg"
                  styles={{
                    input: {
                      border: '1px solid #0d0d0d',
                      borderRadius: 0,
                      backgroundColor: '#fcf9f8',
                    },
                  }}
                />
                {form.errors.code && (
                  <Text size="sm" c="red">
                    {form.errors.code}
                  </Text>
                )}
                <Button
                  type="submit"
                  loading={verify.isPending}
                  fullWidth
                  size="lg"
                  style={{
                    backgroundColor: '#0d0d0d',
                    color: '#fcf9f8',
                    fontFamily: 'var(--font-bebas-neue)',
                  }}
                >
                  Verificar
                </Button>
              </Stack>
            </form>

            <Button
              variant="subtle"
              onClick={() => resend.mutate()}
              loading={resend.isPending}
              fullWidth
              style={{ color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
            >
              Reenviar código
            </Button>
          </Stack>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
