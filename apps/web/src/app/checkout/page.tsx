'use client';

import {
  Button,
  Container,
  Grid,
  GridCol,
  Group,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowForward, IconLock } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { parseStorefrontConfig } from '../../lib/storefront-config';
import { useStoreConfig } from '../../providers/config-provider';
import { useCurrency } from '../../providers/currency-provider';
import { useAuthStore } from '../../store/auth-store';
import { useCartStore } from '../../store/cart-store';

interface CheckoutOrder {
  orderId: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
}

export default function CheckoutPage() {
  const { format } = useCurrency();
  const queryClient = useQueryClient();
  const { isAuthenticated, emailVerified } = useAuthStore();
  const { items: localItems } = useCartStore();
  const storeConfig = useStoreConfig();
  const storefrontConfig = parseStorefrontConfig(storeConfig.storefrontConfig);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [orderNotes, setOrderNotes] = useState('');
  const [shippingPreview, setShippingPreview] = useState<{ shippingCost: number; freeShippingThreshold?: number | null } | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/addresses');
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAuthenticated,
  });

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/cart');
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  const addressForm = useForm({
    initialValues: {
      label: 'Principal',
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: 'Paraguay',
      zipCode: '',
      phone: '',
      company: '',
    },
    validate: {
      line1: (value: string) => (value.length < 3 ? 'Requerido' : null),
      city: (value: string) => (value.length < 2 ? 'Requerido' : null),
      state: (value: string) => (value.length < 2 ? 'Requerido' : null),
      zipCode: (value: string) => (value.length < 3 ? 'Requerido' : null),
      phone: (value: string) => {
        if (!storefrontConfig.checkout.requirePhone) return null;
        const digits = value.replace(/\D/g, '');
        return digits.length < 7 ? 'Teléfono requerido' : null;
      },
    },
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const createAddress = useMutation({
    mutationFn: async (values: typeof addressForm.values) => {
      const { data, error } = await apiClient.POST('/addresses', {
        body: values as never,
      });
      if (error || !data) throw error ?? new Error('Create address failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      notifySuccess({ title: 'Dirección guardada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar dirección', message: getApiErrorMessage(error) });
    },
  });

  const initCheckout = useMutation({
    mutationFn: async ({ shippingAddressId, billingAddressId }: { shippingAddressId: string; billingAddressId: string }) => {
      const body: { shippingAddressId: string; billingAddressId: string; couponCode?: string; orderNotes?: string } = {
        shippingAddressId,
        billingAddressId,
      };
      if (orderNotes.trim()) {
        body.orderNotes = orderNotes.trim();
      }
      const { data, error } = await apiClient.POST('/checkout/init', { body: body as never });
      if (error || !data) throw error ?? new Error('Checkout failed');
      return data as CheckoutOrder;
    },
    onSuccess: (data) => {
      setOrder(data);
      notifySuccess({ title: 'Orden creada', message: `Total: ${format(data.totalAmount)}` });
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear orden', message: getApiErrorMessage(error) });
    },
  });

  const applyCoupon = useMutation({
    mutationFn: async (code: string) => {
      if (!order) throw new Error('No order');
      const { data, error } = await apiClient.POST('/checkout/{orderId}/apply-coupon', {
        params: { path: { orderId: order.orderId } },
        body: { couponCode: code } as never,
      });
      if (error || !data) throw error ?? new Error('Coupon failed');
      return data as CheckoutOrder;
    },
    onSuccess: (data) => {
      setOrder(data);
      notifySuccess({ title: 'Cupón aplicado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al aplicar cupón', message: getApiErrorMessage(error) });
    },
  });

  const createCheckoutSession = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error('No order');
      const { data, error } = await apiClient.POST('/payments/create-checkout-session/{orderId}', {
        params: { path: { orderId: order.orderId } },
      });
      if (error || !data?.url) throw error ?? new Error('Payment session failed');
      return data as { url: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      notifyError({ title: 'Error al iniciar pago', message: getApiErrorMessage(error) });
    },
  });

  if (!isAuthenticated) {
    return (
      <>
        <StoreHeader />
        <Container py="xl" maw={600}>
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Checkout
          </Title>
          <Text mt="md">Debes iniciar sesión para continuar.</Text>
          <Button component={Link} href="/login" mt="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Iniciar sesión
          </Button>
        </Container>
        <StoreFooter />
      </>
    );
  }

  if (!emailVerified) {
    return (
      <>
        <StoreHeader />
        <Container py="xl" maw={600}>
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Checkout
          </Title>
          <Text mt="md">
            Debés verificar tu email antes de realizar una compra. Te enviamos un código de verificación.
          </Text>
          <Button component={Link} href={`/verify-email?email=${encodeURIComponent(useAuthStore.getState().email ?? '')}`} mt="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Verificar email
          </Button>
        </Container>
        <StoreFooter />
      </>
    );
  }

  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const activeAddressId = selectedAddressId ?? defaultAddress?.id;

  useQuery({
    queryKey: ['shipping-cost', activeAddressId],
    queryFn: async () => {
      if (!activeAddressId) return null;
      const { data, error } = await apiClient.POST('/checkout/shipping-cost', {
        body: { shippingAddressId: activeAddressId } as never,
      });
      if (error) throw error;
      setShippingPreview(data ?? null);
      return data;
    },
    enabled: !!activeAddressId && !order,
  });

  const handleInitCheckout = () => {
    if (!activeAddressId) {
      notifyError({ title: 'Selecciona una dirección' });
      return;
    }
    initCheckout.mutate({ shippingAddressId: activeAddressId, billingAddressId: activeAddressId });
  };

  const cartItems = cart?.items ?? [];
  const cartTotal = cart?.total ?? 0;

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="xl" px={0}>
          <Group gap="xs" mb="xl">
            <IconLock size={20} />
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Checkout seguro
            </Text>
          </Group>

          {!order ? (
            <Grid gap="xl" align="flex-start">
              <GridCol span={{ base: 12, md: 7 }}>
                <Stack gap="xl">
                  <section>
                    <Title order={3} mb="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                      Dirección de envío
                    </Title>
                    {addresses && addresses.length > 0 && (
                      <Radio.Group value={selectedAddressId ?? defaultAddress?.id} onChange={setSelectedAddressId}>
                        <Stack>
                          {addresses.map((address) => (
                            <Radio
                              key={address.id}
                              value={address.id}
                              label={`${address.label} — ${address.line1}, ${address.city} (${address.isDefault ? 'predeterminada' : ''})`}
                              styles={{
                                radio: { borderRadius: 0, borderColor: '#0d0d0d' },
                              }}
                            />
                          ))}
                        </Stack>
                      </Radio.Group>
                    )}

                    <Title order={4} mt="xl" mb="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                      Agregar nueva dirección
                    </Title>
                    <form onSubmit={addressForm.onSubmit((values) => createAddress.mutate(values))}>
                      <Stack maw={500} gap="md">
                        <TextInput label="Nombre" {...addressForm.getInputProps('label')} />
                        <TextInput label="Dirección línea 1" {...addressForm.getInputProps('line1')} />
                        <TextInput label="Dirección línea 2" {...addressForm.getInputProps('line2')} />
                        <Group grow>
                          <TextInput label="Ciudad" {...addressForm.getInputProps('city')} />
                          <TextInput label="Departamento/Estado" {...addressForm.getInputProps('state')} />
                        </Group>
                        <Group grow>
                          <TextInput label="País" {...addressForm.getInputProps('country')} />
                          <TextInput label="Código postal" {...addressForm.getInputProps('zipCode')} />
                        </Group>
                        <TextInput
                          label={storefrontConfig.checkout.requirePhone ? 'Teléfono *' : 'Teléfono'}
                          {...addressForm.getInputProps('phone')}
                        />
                        {storefrontConfig.checkout.showCompanyField && (
                          <TextInput label="Empresa / Apartamento" {...addressForm.getInputProps('company')} />
                        )}
                        {storefrontConfig.checkout.showOrderNotes && (
                          <Textarea
                            label="Notas del pedido"
                            placeholder="Instrucciones de entrega, etc."
                            value={orderNotes}
                            onChange={(event) => setOrderNotes(event.currentTarget.value)}
                            minRows={3}
                          />
                        )}
                        <Button
                          type="submit"
                          loading={createAddress.isPending}
                          variant="outline"
                          style={{
                            borderColor: '#0d0d0d',
                            color: '#0d0d0d',
                            fontFamily: 'var(--font-bebas-neue)',
                          }}
                        >
                          Guardar dirección
                        </Button>
                      </Stack>
                    </form>
                  </section>

                  <section>
                    <Title order={3} mb="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                      Método de pago
                    </Title>
                    <Radio.Group value={paymentMethod} onChange={setPaymentMethod}>
                      <Stack>
                        <PaymentOption value="card" label="Tarjeta de crédito / débito" sublabel="Pago seguro con tarjeta" selected={paymentMethod === 'card'} />
                        <PaymentOption value="pse" label="Transferencia bancaria" sublabel="PSE o transferencia directa" selected={paymentMethod === 'pse'} />
                        <PaymentOption value="wallet" label="Billetera digital" sublabel="Mercado Pago, Bold u otro proveedor" selected={paymentMethod === 'wallet'} />
                      </Stack>
                    </Radio.Group>
                  </section>
                </Stack>
              </GridCol>

              <GridCol span={{ base: 12, md: 5 }}>
                <OrderSummaryPanel
                  items={cartItems}
                  localItems={localItems}
                  total={cartTotal}
                  shippingCost={shippingPreview?.shippingCost}
                  freeShippingThreshold={shippingPreview?.freeShippingThreshold}
                  onCreateOrder={handleInitCheckout}
                  loading={initCheckout.isPending}
                  disabled={!defaultAddress && !selectedAddressId}
                />
              </GridCol>
            </Grid>
          ) : (
            <Grid gap="xl" align="flex-start">
              <GridCol span={{ base: 12, md: 7 }}>
                <Stack gap="xl">
                  <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                    Orden #{order.orderId.slice(-6)}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {storefrontConfig.checkout.thankYouMessage}
                  </Text>
                  <Stack gap="xs" style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
                    <Group justify="space-between">
                      <Text>Subtotal</Text>
                      <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {format(order.subtotal)}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>Envío</Text>
                      <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {format(order.shippingCost)}
                      </Text>
                    </Group>
                    {order.discountAmount > 0 && (
                      <Group justify="space-between">
                        <Text>Descuento</Text>
                        <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          -{format(order.discountAmount)}
                        </Text>
                      </Group>
                    )}
                    <div style={{ borderTop: '1px solid #0d0d0d' }} />
                    <Group justify="space-between">
                      <Text size="xl" fw={700} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                        Total
                      </Text>
                      <Text size="xl" fw={700} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {format(order.totalAmount)}
                      </Text>
                    </Group>
                  </Stack>

                  <Group>
                    <TextInput
                      placeholder="Código de cupón"
                      aria-label="Código de cupón"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      onClick={() => applyCoupon.mutate(couponCode)}
                      loading={applyCoupon.isPending}
                      variant="outline"
                      style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
                    >
                      Aplicar
                    </Button>
                  </Group>

                  <Button
                    onClick={() => createCheckoutSession.mutate()}
                    loading={createCheckoutSession.isPending}
                    size="lg"
                    rightSection={<IconArrowForward size={18} />}
                    style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
                  >
                    Confirmar y pagar
                  </Button>
                </Stack>
              </GridCol>
              <GridCol span={{ base: 12, md: 5 }}>
                <div style={{ padding: '32px', border: '1px solid #0d0d0d' }}>
                  <Group gap="xs">
                    <IconLock size={16} />
                    <Text size="sm" c="dimmed">
                      Los pagos son seguros y encriptados.
                    </Text>
                  </Group>
                </div>
              </GridCol>
            </Grid>
          )}
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}

function PaymentOption({
  value,
  label,
  sublabel,
  selected,
}: {
  value: string;
  label: string;
  sublabel: string;
  selected: boolean;
}) {
  return (
    <Radio
      value={value}
      label={
        <Stack gap={0}>
          <Text size="sm" fw={500}>
            {label}
          </Text>
          <Text size="xs" c="dimmed">
            {sublabel}
          </Text>
        </Stack>
      }
      styles={{
        radio: { borderRadius: 0, borderColor: '#0d0d0d' },
        body: {
          padding: '16px',
          border: '1px solid #0d0d0d',
          backgroundColor: selected ? '#f6f3f2' : 'transparent',
        },
      }}
    />
  );
}

function OrderSummaryPanel({
  items,
  localItems,
  total,
  shippingCost,
  freeShippingThreshold,
  onCreateOrder,
  loading,
  disabled,
}: {
  items: { id: string; productVariantId: string | null; quantity: number; unitPrice: number; name?: string; type?: string }[];
  localItems: { productVariantId: string; quantity: number; price?: number; name?: string }[];
  total: number;
  shippingCost?: number;
  freeShippingThreshold?: number | null;
  onCreateOrder: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  const { format } = useCurrency();
  return (
    <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
      <Stack gap="lg">
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Resumen de orden
        </Text>

        {items.length > 0 ? (
          items.map((item) => (
            <Group key={item.id} justify="space-between" py="xs" style={{ borderBottom: '1px solid rgba(13,13,13,0.1)' }}>
              <Text size="sm">
                  {item.name ?? item.productVariantId ?? item.type} x {item.quantity}
              </Text>
              <Text size="sm" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                {format(item.unitPrice * item.quantity)}
              </Text>
            </Group>
          ))
        ) : localItems.length > 0 ? (
          <Text size="sm" c="dimmed">
            Tu carrito local tiene productos, pero debes iniciar sesión y sincronizarlo.
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            Tu carrito está vacío.
          </Text>
        )}

        <Group justify="space-between">
          <Text c="dimmed">Subtotal</Text>
          <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{format(total)}</Text>
        </Group>
        <Group justify="space-between" align="flex-start">
          <Stack gap={0}>
            <Text c="dimmed">Envío</Text>
            {typeof shippingCost === 'number' && shippingCost === 0 && freeShippingThreshold && total >= freeShippingThreshold && (
              <Text size="xs" c="green">
                Envío gratis
              </Text>
            )}
            {typeof shippingCost === 'number' && shippingCost > 0 && freeShippingThreshold && total < freeShippingThreshold && (
              <Text size="xs" c="dimmed">
                Gratis desde {format(freeShippingThreshold)}
              </Text>
            )}
          </Stack>
          <Text size="sm" c="dimmed" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {typeof shippingCost === 'number' ? format(shippingCost) : 'Calculado al pagar'}
          </Text>
        </Group>
        <div style={{ borderTop: '1px solid #0d0d0d' }} />
        <Group justify="space-between">
          <Text size="xl" fw={700} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Total
          </Text>
          <Text size="xl" fw={700} style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {format(total)}
          </Text>
        </Group>

        <Button
          onClick={onCreateOrder}
          loading={loading}
          disabled={disabled}
          fullWidth
          size="lg"
          rightSection={<IconArrowForward size={18} />}
          style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
        >
          Crear orden
        </Button>
      </Stack>
    </div>
  );
}
