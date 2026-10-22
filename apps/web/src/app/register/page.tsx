'use client';

import { isValidPassword, PASSWORD_POLICY_MESSAGE } from '@ecommerce/shared';
import { Button, Checkbox, Divider, Group, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '../../components/auth-shell';
import { OAuthButtons } from '../../components/oauth-buttons';
import { PasswordMatchHint, PasswordRequirements } from '../../components/password-requirements';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess, notifyWarning } from '../../lib/notifications';
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
      confirmPassword: '',
      firstName: '',
      lastName: '',
      terms: false,
      newsletter: false,
    },
    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value: string) => (isValidPassword(value) ? null : PASSWORD_POLICY_MESSAGE),
      confirmPassword: (value: string, values: { password: string }) =>
        value === values.password ? null : 'Las contraseñas no coinciden',
      firstName: (value: string) => (value.length < 1 ? 'Requerido' : null),
      lastName: (value: string) => (value.length < 1 ? 'Requerido' : null),
      terms: (value: boolean) => (value ? null : 'Debes aceptar los términos'),
    },
  });

  // Las indicaciones de contraseña se muestran solo mientras el campo tiene foco.
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const passwordProps = form.getInputProps('password');
  const confirmPasswordProps = form.getInputProps('confirmPassword');

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
      return data as {
        accessToken: string;
        verificationEmailSent?: boolean;
        user: { emailVerified: boolean; acceptedTermsVersion?: string | null };
      };
    },
    onSuccess: async (data) => {
      setAuth(data.accessToken, form.values.email, data.user.emailVerified, false, data.user.acceptedTermsVersion ?? null);
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

      if (data.verificationEmailSent === false) {
        notifyWarning({
          title: 'Cuenta creada',
          message: `Bienvenido, ${form.values.firstName}. No pudimos enviar el email de confirmación a ${form.values.email}; podés reintentar desde el aviso superior.`,
        });
      } else {
        notifySuccess({
          title: 'Cuenta creada',
          message: `Bienvenido, ${form.values.firstName}. Te enviamos un email a ${form.values.email} para confirmar tu cuenta.`,
        });
      }
      // El usuario puede continuar navegando; el banner le recuerda confirmar el email.
      router.push('/catalogo');
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear cuenta', message: getApiErrorMessage(error) });
    },
  });

  return (
    <AuthShell
      eyebrow={`${config.name} Urban Autonomy Series 01`}
      title={
        <>
          CREA TU<br />PROPIA REGLA.
        </>
      }
      description="Únete a la nueva era de expresión urbana. Sin límites, solo tu visión."
    >
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
                    <PasswordInput
                      label="Contraseña"
                      {...passwordProps}
                      onFocus={(event) => {
                        passwordProps.onFocus?.(event);
                        setPasswordFocused(true);
                      }}
                      onBlur={(event) => {
                        passwordProps.onBlur?.(event);
                        setPasswordFocused(false);
                      }}
                    />
                    {passwordFocused && <PasswordRequirements value={form.values.password} />}
                    <PasswordInput
                      label="Repetir contraseña"
                      {...confirmPasswordProps}
                      onFocus={(event) => {
                        confirmPasswordProps.onFocus?.(event);
                        setConfirmFocused(true);
                      }}
                      onBlur={(event) => {
                        confirmPasswordProps.onBlur?.(event);
                        setConfirmFocused(false);
                      }}
                    />
                    {confirmFocused && (
                      <PasswordMatchHint
                        password={form.values.password}
                        confirmValue={form.values.confirmPassword}
                      />
                    )}
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

                <OAuthButtons
                  googleEnabled={config.googleOAuthEnabled}
                  googleClientId={config.googleClientId}
                  appleEnabled={config.appleOAuthEnabled}
                  appleClientId={config.appleClientId}
                  onSuccess={() => {
                    notifySuccess({ title: 'Cuenta creada', message: `Bienvenido a ${config.name}` });
                    router.push('/catalogo');
                  }}
                />

                <Text size="sm" ta="center">
                  ¿Ya tenés cuenta?{' '}
                  <Link href="/login" style={{ color: '#0d0d0d', fontWeight: 600 }}>
                    Iniciar sesión
                  </Link>
                </Text>
      </Stack>
    </AuthShell>
  );
}
