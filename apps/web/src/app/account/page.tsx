'use client';

import { Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconLogout } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { AccountLayout } from '../../components/account-layout';
import { LoadingState } from '../../components/loading-state';
import { apiClient, logoutSession } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useAuthStore } from '../../store/auth-store';

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  document: string;
}

const inputStyles = {
  border: '1px solid #0d0d0d',
  borderRadius: 0,
  backgroundColor: 'transparent',
};

export default function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { email } = useAuthStore();

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/auth/me');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ProfileFormValues>({
    initialValues: { firstName: '', lastName: '', phone: '', document: '' },
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    // `form` cambia de identidad en cada render; inicializamos una sola vez
    // (form.initialize llama internamente a clearErrors → setState).
    if (!me || initializedRef.current) return;
    initializedRef.current = true;
    form.initialize({
      firstName: me.firstName ?? '',
      lastName: me.lastName ?? '',
      phone: me.phone ?? '',
      document: me.document ?? '',
    });
  }, [me, form]);

  const save = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { error } = await apiClient.PATCH('/users/me', { body: values as never });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      notifySuccess({ title: 'Datos actualizados' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar', message: getApiErrorMessage(error) });
    },
  });

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
          <Group justify="space-between" wrap="wrap">
            <div>
              <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                Email
              </Text>
              <Text size="lg">{email}</Text>
            </div>
            <Button
              onClick={async () => {
                await logoutSession();
                router.push('/');
              }}
              leftSection={<IconLogout size={18} />}
              variant="outline"
              style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
            >
              Cerrar sesión
            </Button>
          </Group>
        </div>

        <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <Text size="sm" fw={500} mb="md" style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 18 }}>
            Tus datos
          </Text>

          {isLoading ? (
            <LoadingState message="Cargando tus datos..." />
          ) : (
            <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
              <Stack gap="md">
                <Group grow>
                  <TextInput
                    label="Nombre"
                    placeholder="Tu nombre"
                    {...form.getInputProps('firstName')}
                    styles={{ input: inputStyles }}
                  />
                  <TextInput
                    label="Apellido"
                    placeholder="Tu apellido"
                    {...form.getInputProps('lastName')}
                    styles={{ input: inputStyles }}
                  />
                </Group>
                <Group grow>
                  <TextInput
                    label="Teléfono"
                    placeholder="+57 300 123 4567"
                    {...form.getInputProps('phone')}
                    styles={{ input: inputStyles }}
                  />
                  <TextInput
                    label="Documento"
                    placeholder="Cédula / Pasaporte"
                    {...form.getInputProps('document')}
                    styles={{ input: inputStyles }}
                  />
                </Group>
                <Button
                  type="submit"
                  loading={save.isPending}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: '#0d0d0d',
                    color: '#fcf9f8',
                    fontFamily: 'var(--font-bebas-neue)',
                  }}
                >
                  Guardar cambios
                </Button>
              </Stack>
            </form>
          )}
        </div>
      </Stack>
    </AccountLayout>
  );
}
