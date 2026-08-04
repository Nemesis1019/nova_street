'use client';

import { Button, Checkbox, Divider, Grid, GridCol, Group, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { StoreFooter } from '../../components/store-footer';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useAuthStore } from '../../store/auth-store';
import { useCartStore } from '../../store/cart-store';

export default function LoginPage() {
  const router = useRouter();
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
      return data as { accessToken: string; refreshToken: string; user: { emailVerified: boolean } };
    },
    onSuccess: async (data) => {
      setAuth(data.accessToken, data.refreshToken, form.values.email, data.user.emailVerified, form.values.remember);
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
        <Grid gap="xl" maw={1100} w="100%">
          <GridCol span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Text
                size="xs"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                NÖVA Urban Autonomy Series 01
              </Text>
              <Title
                order={1}
                style={{
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                  fontSize: 'clamp(48px, 8vw, 96px)',
                  lineHeight: 0.9,
                }}
              >
                INGRESA A<br />TU ENERGÍA.
              </Title>
              <Text size="md" c="dimmed" maw={400}>
                Accede a drops exclusivos, guarda tus direcciones y rastrea tus pedidos.
              </Text>
            </Stack>
          </GridCol>

          <GridCol span={{ base: 12, md: 6 }}>
            <div style={{ padding: '48px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
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
                      <Link href="#" style={{ fontSize: '12px', color: '#5f5f58' }}>
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

                <Group grow>
                  <Button variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}>
                    Google
                  </Button>
                  <Button variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}>
                    Apple
                  </Button>
                </Group>

                <Text size="sm" ta="center">
                  ¿No tenés cuenta?{' '}
                  <Link href="/register" style={{ color: '#0d0d0d', fontWeight: 600 }}>
                    Crear cuenta
                  </Link>
                </Text>
              </Stack>
            </div>
          </GridCol>
        </Grid>
      </main>
      <StoreFooter />
    </div>
  );
}
