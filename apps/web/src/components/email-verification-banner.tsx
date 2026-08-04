'use client';

import { Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';

import { useAuthStore } from '../store/auth-store';

export function EmailVerificationBanner() {
  const { isAuthenticated, isHydrated, emailVerified, email } = useAuthStore();

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
          Tu email no está verificado. Verificalo para poder realizar compras y acceder a todas las funciones.
        </Text>
        <Button
          component={Link}
          href={`/verify-email?email=${encodeURIComponent(email ?? '')}`}
          size="xs"
          variant="white"
          style={{ color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
        >
          Verificar email
        </Button>
      </Group>
    </Alert>
  );
}
