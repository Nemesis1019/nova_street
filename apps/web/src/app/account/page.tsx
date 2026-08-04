'use client';

import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import { AccountLayout } from '../../components/account-layout';
import { useAuthStore } from '../../store/auth-store';

export default function AccountPage() {
  const router = useRouter();
  const { email, logout } = useAuthStore();

  return (
    <AccountLayout>
      <Stack gap="xl">
        <Stack gap="xs">
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Mi Cuenta
          </Text>
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            GESTIONÁ TU ENERGÍA
          </Title>
        </Stack>

        <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <div>
                <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                  Email
                </Text>
                <Text size="lg">{email}</Text>
              </div>
              <Button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                leftSection={<IconLogout size={18} />}
                variant="outline"
                style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Cerrar sesión
              </Button>
            </Group>
          </Stack>
        </div>
      </Stack>
    </AccountLayout>
  );
}
