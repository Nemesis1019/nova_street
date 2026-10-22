'use client';

import { Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { AuthShell } from '../../components/auth-shell';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useStoreConfig } from '../../providers/config-provider';
import { useAuthStore } from '../../store/auth-store';

type VerificationStatus = 'idle' | 'success' | 'error';

function VerifyEmailForm() {
  const config = useStoreConfig();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { isAuthenticated, email } = useAuthStore();
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const started = useRef(false);

  const verify = useMutation({
    mutationFn: async (value: string) => {
      const { data, error } = await apiClient.POST('/auth/verify-email', {
        body: { token: value } as never,
      });
      if (error || !data) throw error ?? new Error('Verification failed');
      return data as { user: { email: string; emailVerified: boolean } };
    },
  });

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    verify.mutate(token, {
      onSuccess: (data) => {
        setStatus('success');
        const auth = useAuthStore.getState();
        if (auth.isAuthenticated && auth.email && auth.email.toLowerCase() === data.user.email.toLowerCase()) {
          auth.setEmailVerified(true);
        }
      },
      onError: (error) => {
        setStatus('error');
        setErrorMessage(getApiErrorMessage(error));
      },
    });
  }, [token, verify]);

  const resend = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/auth/resend-verification', {
        body: {} as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess({
        title: 'Email reenviado',
        message: `Revisá tu bandeja de entrada${email ? ` (${email})` : ''}, incluido el spam.`,
      });
    },
    onError: (error) => {
      notifyError({ title: 'Error al reenviar', message: getApiErrorMessage(error) });
    },
  });

  const renderContent = () => {
    if (token && status === 'idle') {
      return (
        <Stack gap="lg" align="center">
          <Stack gap="xs" align="center">
            <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              CONFIRMANDO TU CUENTA
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              Estamos validando tu link de confirmación...
            </Text>
          </Stack>
          <Center>
            <Loader color="#0d0d0d" />
          </Center>
        </Stack>
      );
    }

    if (token && status === 'success') {
      return (
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              CUENTA CONFIRMADA
            </Title>
            <Text size="sm" c="dimmed">
              Tu email fue confirmado correctamente. Ya podés realizar compras y acceder a todas las funciones.
            </Text>
          </Stack>
          <Button
            component={Link}
            href={isAuthenticated ? '/catalogo' : '/login'}
            fullWidth
            size="lg"
            style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
          >
            {isAuthenticated ? 'Ir al catálogo' : 'Iniciar sesión'}
          </Button>
        </Stack>
      );
    }

    if (token && status === 'error') {
      return (
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              NO PUDIMOS CONFIRMAR TU CUENTA
            </Title>
            <Text size="sm" c="dimmed">
              {errorMessage || 'El link de confirmación es inválido o venció.'}
            </Text>
          </Stack>
          {isAuthenticated ? (
            <Button
              onClick={() => resend.mutate()}
              loading={resend.isPending}
              fullWidth
              size="lg"
              style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
            >
              Reenviar email
            </Button>
          ) : (
            <Button
              component={Link}
              href="/login"
              fullWidth
              size="lg"
              style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
            >
              Iniciar sesión para reenviar
            </Button>
          )}
        </Stack>
      );
    }

    return (
      <Stack gap="lg">
        <Stack gap="xs">
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            CONFIRMÁ TU CUENTA
          </Title>
          <Text size="sm" c="dimmed">
            {email ? (
              <>
                Te enviamos un link de confirmación a <strong>{email}</strong>. Revisá tu bandeja de entrada (y el
                spam) y hacé clic en el enlace.
              </>
            ) : (
              'Te enviamos un link de confirmación a tu correo. Revisá tu bandeja de entrada (y el spam) y hacé clic en el enlace.'
            )}
          </Text>
        </Stack>
        {isAuthenticated ? (
          <Button
            onClick={() => resend.mutate()}
            loading={resend.isPending}
            fullWidth
            size="lg"
            style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
          >
            Reenviar email
          </Button>
        ) : (
          <Button
            component={Link}
            href="/login"
            fullWidth
            size="lg"
            style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
          >
            Iniciar sesión
          </Button>
        )}
        <Text size="sm" ta="center">
          <Link href="/catalogo" style={{ color: '#0d0d0d', fontWeight: 600 }}>
            Volver al catálogo
          </Link>
        </Text>
      </Stack>
    );
  };

  return (
    <AuthShell
      eyebrow="Verificación de cuenta"
      title={
        <>
          CONFIRMÁ
          <br />
          TU CUENTA.
        </>
      }
      description={`Un último paso para activar todas las funciones de tu cuenta ${config.name}.`}
    >
      {renderContent()}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
