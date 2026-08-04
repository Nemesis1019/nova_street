'use client';

import { Button, Container, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { StoreFooter } from '../../../components/store-footer';
import { StoreHeader } from '../../../components/store-header';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError } from '../../../lib/notifications';
import { useCartStore } from '../../../store/cart-store';

export default function GuestCheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const form = useForm({
    initialValues: {
      email: '',
      line1: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      line1: (value) => (value ? null : 'Requerido'),
      city: (value) => (value ? null : 'Requerido'),
      state: (value) => (value ? null : 'Requerido'),
      country: (value) => (value ? null : 'Requerido'),
      zipCode: (value) => (value ? null : 'Requerido'),
    },
  });

  const checkout = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const address = {
        label: 'Guest',
        line1: values.line1,
        city: values.city,
        state: values.state,
        country: values.country,
        zipCode: values.zipCode,
      };
      const { data, error } = await apiClient.POST('/checkout/guest/init', {
        body: {
          email: values.email,
          items: items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity })),
          shippingAddress: address,
          billingAddress: address,
        },
      });
      if (error || !data?.paymentIntent?.clientSecret) throw error ?? new Error('Checkout failed');
      if (!data.guestToken) throw new Error('Missing guest token');
      return data;
    },
    onSuccess: (data) => {
      clearCart();
      router.push(`/checkout/guest/orders/${data.guestToken}`);
    },
    onError: (error) => {
      notifyError({ title: 'Error en checkout', message: getApiErrorMessage(error) });
    },
  });

  if (items.length === 0) {
    return (
      <>
        <StoreHeader />
        <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
          <Container size="sm">
            <Title order={1}>Tu carrito está vacío</Title>
          </Container>
        </main>
        <StoreFooter />
      </>
    );
  }

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="sm">
          <Title order={1} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Checkout como invitado
          </Title>
          <form onSubmit={form.onSubmit((values) => checkout.mutate(values))}>
            <Stack>
              <TextInput label="Email" {...form.getInputProps('email')} />
              <TextInput label="Dirección" {...form.getInputProps('line1')} />
              <TextInput label="Ciudad" {...form.getInputProps('city')} />
              <TextInput label="Departamento / Estado" {...form.getInputProps('state')} />
              <TextInput label="País" {...form.getInputProps('country')} />
              <TextInput label="Código postal" {...form.getInputProps('zipCode')} />
              <Button
                type="submit"
                loading={checkout.isPending}
                fullWidth
                style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Continuar
              </Button>
            </Stack>
          </form>
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
