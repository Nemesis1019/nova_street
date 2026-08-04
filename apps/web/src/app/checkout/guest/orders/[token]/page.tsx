'use client';

import { Container, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { ErrorState } from '../../../../../components/error-state';
import { LoadingState } from '../../../../../components/loading-state';
import { StoreFooter } from '../../../../../components/store-footer';
import { StoreHeader } from '../../../../../components/store-header';
import { apiClient } from '../../../../../lib/api';

export default function GuestOrderPage() {
  const params = useParams();
  const token = params.token as string;

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['guest-order', token],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/checkout/guest/orders/{token}', {
        params: { path: { token } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(token),
  });

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="sm">
          <Title order={1} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Detalle del pedido
          </Title>

          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState title="No se pudo cargar el pedido" reset={refetch} />
          ) : (
            <Stack>
              <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                Pedido #{order?.id?.slice(-6)}
              </Text>
              <Text>Estado: {order?.status}</Text>
              <Text>Total: ${order?.totalAmount?.toLocaleString()}</Text>
              <Text size="sm" c="dimmed">
                Guardá este enlace para consultar tu pedido más tarde.
              </Text>
            </Stack>
          )}
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
