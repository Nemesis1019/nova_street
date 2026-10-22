'use client';

import { Button, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconArrowForward, IconCircleCheck, IconClockHour4, IconX } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { StoreFooter } from '../../../components/store-footer';
import { StoreHeader } from '../../../components/store-header';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError } from '../../../lib/notifications';
import { useCurrency } from '../../../providers/currency-provider';
import { useAuthStore } from '../../../store/auth-store';

interface OrderStatusInfo {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { format } = useCurrency();
  const { isAuthenticated } = useAuthStore();

  const orderId = searchParams.get('order') ?? '';
  const boldStatus = searchParams.get('bold-tx-status');

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['order-confirmation', orderId],
    enabled: Boolean(orderId) && isAuthenticated,
    retry: false,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/orders/{id}', {
        params: { path: { id: orderId } },
      });
      if (error || !data) throw error ?? new Error('Order fetch failed');
      return data as unknown as OrderStatusInfo;
    },
    refetchInterval: (query) => {
      const data = query.state.data as OrderStatusInfo | undefined;
      return data && data.paymentStatus === 'PAID' ? false : 5000;
    },
  });

  const retryPayment = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/orders/{id}/retry-payment', {
        params: { path: { id: orderId } },
      });
      if (error || !data) throw error ?? new Error('Retry payment failed');
      return data as unknown as { paymentUrl: string };
    },
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (error) => {
      notifyError({ title: 'No se pudo reintentar el pago', message: getApiErrorMessage(error) });
    },
  });

  const paid = order?.paymentStatus === 'PAID';
  const rejected = boldStatus === 'rejected' || order?.paymentStatus === 'FAILED';

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg" align="center" style={{ textAlign: 'center' }}>
        {paid ? (
          <IconCircleCheck size={56} stroke={1.5} color="#2f7d32" />
        ) : rejected ? (
          <IconX size={56} stroke={1.5} color="#b3261e" />
        ) : (
          <IconClockHour4 size={56} stroke={1.5} color="#8a6d1d" />
        )}

        <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
          {paid ? 'Pago confirmado' : rejected ? 'Pago rechazado' : 'Estamos confirmando tu pago'}
        </Title>

        {isLoading && !order ? <Loader color="dark" /> : null}

        {!isAuthenticated ? (
          <>
            <Text c="dimmed">Iniciá sesión para ver el estado de tu orden.</Text>
            <Button component={Link} href="/login" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Iniciar sesión
            </Button>
          </>
        ) : isError && !order ? (
          <>
            <Text c="dimmed">
              No pudimos cargar la orden. Si el pago se realizó, la confirmación puede demorar unos minutos.
            </Text>
            <Button
              component={Link}
              href="/orders"
              rightSection={<IconArrowForward size={16} />}
              style={{ fontFamily: 'var(--font-bebas-neue)' }}
            >
              Ver mis pedidos
            </Button>
          </>
        ) : order ? (
          <>
            <Text c="dimmed">
              Orden #{order.id.slice(-6)} · Total {format(order.totalAmount)}
            </Text>
            {paid ? (
              <Text c="dimmed">
                Recibimos tu pago correctamente. Te enviamos la confirmación por email y ya podés seguir el estado de
                tu pedido.
              </Text>
            ) : rejected ? (
              <Text c="dimmed">
                El pago no se completó. Podés intentarlo nuevamente con otro medio de pago.
              </Text>
            ) : (
              <Text c="dimmed">
                Bold está procesando la transacción. La confirmación puede demorar hasta 10 minutos; esta página se
                actualiza automáticamente.
              </Text>
            )}

            <Group>
              <Button
                component={Link}
                href={`/orders/${order.id}`}
                variant="outline"
                style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Ver detalle de la orden
              </Button>
              {!paid ? (
                <Button
                  onClick={() => retryPayment.mutate()}
                  loading={retryPayment.isPending}
                  rightSection={<IconArrowForward size={16} />}
                  style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
                >
                  Reintentar pago
                </Button>
              ) : (
                <Button
                  component={Link}
                  href="/catalogo"
                  rightSection={<IconArrowForward size={16} />}
                  style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
                >
                  Seguir comprando
                </Button>
              )}
            </Group>
          </>
        ) : null}
      </Stack>
    </Container>
  );
}

export default function ConfirmationPage() {
  return (
    <>
      <StoreHeader />
      <Suspense
        fallback={
          <Container size="sm" py="xl">
            <Loader color="dark" />
          </Container>
        }
      >
        <ConfirmationContent />
      </Suspense>
      <StoreFooter />
    </>
  );
}
