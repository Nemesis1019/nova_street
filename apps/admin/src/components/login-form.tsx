'use client';

import { Button, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { apiClient, setAuthToken } from '../lib/api';
import { setAccessToken } from '../lib/auth';
import { getApiErrorMessage, notifyError } from '../lib/notifications';

interface LoginFormProps {
  onLogin?: () => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const router = useRouter();
  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value: string) => (value.length < 6 ? 'Mínimo 6 caracteres' : null),
    },
  });

  const login = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      const { data, error } = await apiClient.POST('/auth/login', {
        body: values as never,
      });
      if (error || !data) throw new Error('Login failed');
      return data as { accessToken: string };
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setAuthToken(data.accessToken);
      onLogin?.();
      router.push('/');
    },
    onError: (error) => {
      notifyError({ title: 'Error al iniciar sesión', message: getApiErrorMessage(error) });
    },
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
      }}
    >
      <Paper
        radius="md"
        p="xl"
        withBorder
        style={{ width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF' }}
      >
        <form onSubmit={form.onSubmit((values) => login.mutate(values))}>
          <Stack>
            <Title order={2} ta="center" style={{ letterSpacing: '-0.02em' }}>
              Iniciar sesión
            </Title>
            <TextInput label="Email" {...form.getInputProps('email')} />
            <PasswordInput label="Contraseña" {...form.getInputProps('password')} />
            <Button type="submit" loading={login.isPending} fullWidth>
              Entrar
            </Button>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
