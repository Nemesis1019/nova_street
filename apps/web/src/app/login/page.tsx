'use client';

import { Button, Checkbox, Divider, Group, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AuthShell } from '../../components/auth-shell';
import { OAuthButtons } from '../../components/oauth-buttons';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useStoreConfig } from '../../providers/config-provider';
import { useAuthStore } from '../../store/auth-store';
import { useCartStore } from '../../store/cart-store';

export default function LoginPage() {
  const router = useRouter();
  const config = useStoreConfig();
  const setAuth = useAuthStore((state) => state.setAuth);
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const form = useForm({
    initialValues: { email: '', password: '', remember: false },
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
      if (error || !data) throw error ?? new Error('Login failed');
      return data as {
        accessToken: string;
        user: { emailVerified: boolean; acceptedTermsVersion?: string | null };
      };
    },
    onSuccess: async (data) => {
      setAuth(
        data.accessToken,
        form.values.email,
        data.user.emailVerified,
        form.values.remember,
        data.user.acceptedTermsVersion ?? null,
      );
      if (cartItems.length > 0) {
        const anonymousItems = cartItems.map((item) => ({
          type: item.type as 'STANDARD' | 'CUSTOM',
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        }));
        const { error } = await apiClient.POST('/cart/merge', {
          body: { anonymousItems: anonymousItems as never },
        });
        if (!error) {
          clearCart();
          notifySuccess({ title: 'Carrito sincronizado' });
        }
      }
      notifySuccess({ title: 'Bienvenido', message: `Sesión iniciada como ${form.values.email}` });
      router.push('/catalogo');
    },
    onError: (error) => {
      notifyError({ title: 'Error al iniciar sesión', message: getApiErrorMessage(error) });
    },
  });

  return (
    <AuthShell
      eyebrow={`${config.name} Urban Autonomy Series 01`}
      title={
        <>
          INGRESA A<br />TU ENERGÍA.
        </>
      }
      description="Accede a drops exclusivos, guarda tus direcciones y rastrea tus pedidos."
    >
      <Stack gap="lg">
                <Title order={3} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                  INICIAR SESIÓN
                </Title>
                <form onSubmit={form.onSubmit(({ email, password }) => login.mutate({ email, password }))}>
                  <Stack gap="md">
                    <TextInput label="Correo Electrónico" {...form.getInputProps('email')} />
                    <PasswordInput label="Contraseña" {...form.getInputProps('password')} />
                    <Group justify="space-between">
                      <Checkbox label="Recordarme" {...form.getInputProps('remember', { type: 'checkbox' })} />
                      <Link href="/forgot-password" style={{ fontSize: '12px', color: '#5f5f58' }}>
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </Group>
                    <Button
                      type="submit"
                      loading={login.isPending}
                      fullWidth
                      size="lg"
                      style={{
                        backgroundColor: '#0d0d0d',
                        color: '#fcf9f8',
                        fontFamily: 'var(--font-bebas-neue)',
                      }}
                    >
                      Entrar
                    </Button>
                  </Stack>
                </form>

                <Divider label="O continúa con" labelPosition="center" color="rgba(13,13,13,0.2)" />

                <OAuthButtons
                  googleEnabled={config.googleOAuthEnabled}
                  googleClientId={config.googleClientId}
                  appleEnabled={config.appleOAuthEnabled}
                  appleClientId={config.appleClientId}
                  rememberMe={form.values.remember}
                  onSuccess={() => {
                    notifySuccess({ title: 'Bienvenido', message: 'Sesión iniciada' });
                    router.push('/catalogo');
                  }}
                />

                <Text size="sm" ta="center">
                  ¿No tenés cuenta?{' '}
                  <Link href="/register" style={{ color: '#0d0d0d', fontWeight: 600 }}>
                    Crear cuenta
                  </Link>
                </Text>
      </Stack>
    </AuthShell>
  );
}
