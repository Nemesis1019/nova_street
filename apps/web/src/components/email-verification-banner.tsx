'use client';

import { Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';

import { apiClient } from '../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../lib/notifications';
import { useAuthStore } from '../store/auth-store';

export function EmailVerificationBanner() {
  const { isAuthenticated, isHydrated, emailVerified, email } = useAuthStore();

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

  if (!isHydrated || !isAuthenticated || emailVerified) {
    return null;
  }

  return (
    <Alert
      color="olive"
      radius={0}
      variant="filled"
      icon={<IconAlertCircle size={20} />}
      styles={{
        root: {
          backgroundColor: '#6f7a4e',
          color: '#fcf9f8',
          border: 'none',
        },
      }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm">
          Confirmá tu cuenta: te enviamos un link{email ? ` a ${email}` : ''}. Hasta confirmarla no vas a poder
          completar compras.
        </Text>
        <Group gap="xs">
          <Button
            component={Link}
            href="/verify-email"
            size="xs"
            variant="subtle"
            style={{ color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
          >
            Ver instrucciones
          </Button>
          <Button
            size="xs"
            variant="white"
            loading={resend.isPending}
            onClick={() => resend.mutate()}
            style={{ color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
          >
            Reenviar email
          </Button>
        </Group>
      </Group>
    </Alert>
  );
}
