'use client';

import { Button, Checkbox, Divider, Grid, GridCol, Group, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { StoreFooter } from '../../components/store-footer';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useStoreConfig } from '../../providers/config-provider';
import { useAuthStore } from '../../store/auth-store';
import { useCartStore } from '../../store/cart-store';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const config = useStoreConfig();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      terms: false,
      newsletter: false,
    },
    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value: string) =>
        /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value)
          ? null
          : 'Mínimo 8 caracteres con letras y números',
      firstName: (value: string) => (value.length < 1 ? 'Requerido' : null),
      lastName: (value: string) => (value.length < 1 ? 'Requerido' : null),
      terms: (value: boolean) => (value ? null : 'Debes aceptar los términos'),
    },
  });

  const register = useMutation({
    mutationFn: async (values: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      acceptedTerms: boolean;
    }) => {
      const { data, error } = await apiClient.POST('/auth/register', {
        body: values as never,
      });
      if (error || !data) throw error ?? new Error('Register failed');
      return data as { accessToken: string; refreshToken: string; user: { emailVerified: boolean } };
    },
    onSuccess: async (data) => {
      setAuth(data.accessToken, data.refreshToken, form.values.email, data.user.emailVerified);
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

      if (form.values.newsletter) {
        const { error: newsletterError } = await apiClient.POST('/newsletter/subscribe', {
          body: { email: form.values.email } as never,
        });
        if (!newsletterError) {
          notifySuccess({ title: 'Newsletter', message: 'Te suscribiste a nuestro newsletter' });
        }
      }

      notifySuccess({ title: 'Cuenta creada', message: `Bienvenido, ${form.values.firstName}` });
      if (data.user.emailVerified) {
        router.push('/catalogo');
      } else {
        router.push(`/verify-email?email=${encodeURIComponent(form.values.email)}`);
      }
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear cuenta', message: getApiErrorMessage(error) });
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
                CREA TU<br />PROPIA REGLA.
              </Title>
              <Text size="md" c="dimmed" maw={400}>
                Únete a la nueva era de expresión urbana. Sin límites, solo tu visión.
              </Text>
            </Stack>
          </GridCol>

          <GridCol span={{ base: 12, md: 6 }}>
            <div style={{ padding: '48px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
              <Stack gap="lg">
                <Title order={3} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                  REGÍSTRATE
                </Title>
                <form onSubmit={form.onSubmit(({ email, password, firstName, lastName, terms }) => register.mutate({ email, password, firstName, lastName, acceptedTerms: terms }))}>
                  <Stack gap="md">
                    <Group grow>
                      <TextInput label="Nombre" {...form.getInputProps('firstName')} />
                      <TextInput label="Apellido" {...form.getInputProps('lastName')} />
                    </Group>
                    <TextInput label="Correo Electrónico" {...form.getInputProps('email')} />
                    <PasswordInput label="Contraseña" {...form.getInputProps('password')} />
                    <Checkbox
                      label="Acepto los términos, condiciones y políticas de privacidad."
                      {...form.getInputProps('terms', { type: 'checkbox' })}
                    />
                    {config.enableNewsletter !== false && (
                      <Checkbox
                        label="Quiero recibir acceso exclusivo a drops y colaboraciones."
                        {...form.getInputProps('newsletter', { type: 'checkbox' })}
                      />
                    )}
                    <Button
                      type="submit"
                      loading={register.isPending}
                      fullWidth
                      size="lg"
                      style={{
                        backgroundColor: '#0d0d0d',
                        color: '#fcf9f8',
                        fontFamily: 'var(--font-bebas-neue)',
                      }}
                    >
                      Crear Cuenta
                    </Button>
                  </Stack>
                </form>

                <Divider label="O regístrate con" labelPosition="center" color="rgba(13,13,13,0.2)" />

                <Group grow>
                  <Button variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}>
                    Google
                  </Button>
                  <Button variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}>
                    Apple
                  </Button>
                </Group>

                <Text size="sm" ta="center">
                  ¿Ya tenés cuenta?{' '}
                  <Link href="/login" style={{ color: '#0d0d0d', fontWeight: 600 }}>
                    Iniciar sesión
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
