'use client';

import { Button, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';

import { AccountLayout } from '../../../components/account-layout';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SecurityPage() {
  const form = useForm<PasswordFormValues>({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validate: {
      currentPassword: (value) => (value.length > 0 ? null : 'Ingresá tu contraseña actual'),
      newPassword: (value) => (value.length >= 6 ? null : 'Mínimo 6 caracteres'),
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : 'Las contraseñas no coinciden',
    },
  });

  const changePassword = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      const { error } = await apiClient.PATCH('/auth/change-password', {
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notifySuccess({ title: 'Contraseña actualizada', message: 'Volvé a iniciar sesión con la nueva contraseña.' });
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al cambiar contraseña', message: getApiErrorMessage(error) });
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
            Seguridad
          </Text>
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            CAMBIAR CONTRASEÑA
          </Title>
        </Stack>

        <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <form onSubmit={form.onSubmit((values) => changePassword.mutate(values))}>
            <Stack gap="md" maw={500}>
              <PasswordInput
                label="Contraseña actual"
                {...form.getInputProps('currentPassword')}
                styles={{ input: inputStyles }}
              />
              <PasswordInput
                label="Nueva contraseña"
                {...form.getInputProps('newPassword')}
                styles={{ input: inputStyles }}
              />
              <PasswordInput
                label="Confirmar nueva contraseña"
                {...form.getInputProps('confirmPassword')}
                styles={{ input: inputStyles }}
              />
              <Button
                type="submit"
                loading={changePassword.isPending}
                style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Actualizar contraseña
              </Button>
            </Stack>
          </form>
        </div>
      </Stack>
    </AccountLayout>
  );
}

const inputStyles = {
  borderRadius: 0,
  borderColor: '#0d0d0d',
  backgroundColor: 'transparent',
};
