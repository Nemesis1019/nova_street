'use client';

import {
  Anchor,
  Badge,
  Button,
  Container,
  Grid,
  GridCol,
  Group,
  Stack,
  Stepper,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconPackage, IconTruck } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { LoadingState } from '../../../components/loading-state';
import { StoreFooter } from '../../../components/store-footer';
import { StoreHeader } from '../../../components/store-header';
import { apiClient } from '../../../lib/api';
import { notifyError } from '../../../lib/notifications';
import { getCarrierTrackingUrl } from '../../../lib/tracking';
import { useCurrency } from '../../../providers/currency-provider';
import { useAuthStore } from '../../../store/auth-store';

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Pagado',
  IN_PRODUCTION: 'En producción',
  READY_TO_SHIP: 'Listo para enviar',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const statusIndex: Record<string, number> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  IN_PRODUCTION: 1,
  READY_TO_SHIP: 2,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: 0,
};

export default function OrderDetailPage() {
  const { format } = useCurrency();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { isAuthenticated, isHydrated } = useAuthStore();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/orders/{id}', {
        params: { path: { id: orderId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && Boolean(orderId),
  });

  const retryPayment = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/orders/{id}/retry-payment', {
        params: { path: { id: orderId } },
      });
      if (error || !data?.paymentUrl) throw error ?? new Error('Retry failed');
      return data as { paymentUrl: string };
    },
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: () => {
      notifyError({ title: 'No se pudo reintentar el pago' });
    },
  });

  if (!isHydrated) {
    return (
      <>
        <StoreHeader />
        <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
          <Container size="xl" px={0}>
            <LoadingState />
          </Container>
        </main>
        <StoreFooter />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StoreHeader />
        <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
          <Container size="xl" px={0}>
            <EmptyState
              title="Iniciá sesión"
              description="Para ver el detalle de tu pedido necesitás iniciar sesión."
              action={{ label: 'Iniciar sesión', href: '/login' }}
            />
          </Container>
        </main>
        <StoreFooter />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <StoreHeader />
        <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
          <Container size="xl" px={0}>
            <LoadingState message="Cargando pedido..." />
          </Container>
        </main>
        <StoreFooter />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <StoreHeader />
        <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
          <Container size="xl" px={0}>
            <ErrorState
              title="No se pudo cargar el pedido"
              description="El pedido no existe o no tenés permiso para verlo."
              reset={refetch}
            />
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
        <Container size="xl" px={0}>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => router.push('/orders')}
            mb="xl"
            style={{ color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
          >
            Volver a pedidos
          </Button>

          <Stack gap="xs" mb="xl">
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Estado de tu envío
            </Text>
            <Title order={1} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              PEDIDO #{order.id.slice(-6)}
            </Title>
            <Text c="dimmed">
              ORDEN REALIZADA:{' '}
              {new Date(order.createdAt)
                .toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                .toUpperCase()}
            </Text>
          </Stack>

          <Grid gap="xl" align="flex-start">
            <GridCol span={{ base: 12, md: 8 }}>
              <Stack gap="xl">
                <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
                  <Text
                    size="xs"
                    mb="md"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Rastreo de Pedido
                  </Text>
                  <Stepper active={statusIndex[order.status] ?? 0} color="dark" radius={0}>
                    <Stepper.Step label="Pedido Recibido" icon={<IconPackage size={16} />} />
                    <Stepper.Step label="En Preparación" icon={<IconPackage size={16} />} />
                    <Stepper.Step label="En Camino" icon={<IconTruck size={16} />} />
                    <Stepper.Step label="Entregado" icon={<IconPackage size={16} />} />
                  </Stepper>
                </div>

                <div style={{ padding: '32px', border: '1px solid #0d0d0d' }}>
                  <Title order={3} mb="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                    Items
                  </Title>
                  <Stack gap="md">
                    {order.items.map((item) => (
                      <Group
                        key={item.id}
                        justify="space-between"
                        style={{ borderBottom: '1px solid rgba(13,13,13,0.1)', paddingBottom: 12 }}
                      >
                        <div>
                          <Text fw={500}>{item.name ?? item.type}</Text>
                          <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                            CANTIDAD: {item.quantity}
                          </Text>
                        </div>
                        <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                          {format(item.unitPrice * item.quantity)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </div>
              </Stack>
            </GridCol>

            <GridCol span={{ base: 12, md: 4 }}>
              <Stack gap="xl">
                <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
                  <Title order={4} mb="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                    Resumen
                  </Title>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text c="dimmed">Subtotal</Text>
                      <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {format(order.subtotal)}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text c="dimmed">Envío</Text>
                      <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {format(order.shippingCost)}
                      </Text>
                    </Group>
                    {order.discountAmount > 0 && (
                      <Group justify="space-between">
                        <Text c="dimmed">Descuento</Text>
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
                </div>

                <div style={{ padding: '32px', border: '1px solid #0d0d0d' }}>
                  <Title order={4} mb="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                    Estado
                  </Title>
                  <Badge color="dark" radius={0} size="lg">
                    {statusLabel[order.status] ?? order.status}
                  </Badge>
                  {order.estimatedDeliveryDate && (
                    <Group mt="md">
                      <Text size="sm" c="dimmed">
                        Entrega estimada:
                      </Text>
                      <Text size="sm" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </Group>
                  )}
                  {order.shipments && order.shipments.length > 0 && (
                    <Stack gap="xs" mt="md">
                      <Text size="sm" c="dimmed">
                        Envíos
                      </Text>
                      {order.shipments.map((shipment) => (
                        <Stack key={shipment.id} gap={2}>
                          <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }} size="sm">
                            {shipment.trackingNumber} — {shipment.carrier}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Estado: {shipment.status}
                            {shipment.deliveredAt
                              ? ` · Entregado el ${new Date(shipment.deliveredAt).toLocaleDateString()}`
                              : ''}
                          </Text>
                          <Anchor
                            href={
                              shipment.trackingUrl ??
                              getCarrierTrackingUrl(shipment.carrier ?? '', shipment.trackingNumber)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            size="sm"
                            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                          >
                            Seguir envío →
                          </Anchor>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                  <Group mt="md">
                    <Text size="sm" c="dimmed">
                      Pago:
                    </Text>
                    <Badge color={order.paymentStatus === 'PAID' ? 'green' : 'yellow'} radius={0}>
                      {order.paymentStatus}
                    </Badge>
                  </Group>
                  {order.status === 'PENDING_PAYMENT' && (
                    <Button
                      mt="md"
                      fullWidth
                      loading={retryPayment.isPending}
                      onClick={() => retryPayment.mutate()}
                      style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
                    >
                      Reintentar pago
                    </Button>
                  )}
                </div>
              </Stack>
            </GridCol>
          </Grid>
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
