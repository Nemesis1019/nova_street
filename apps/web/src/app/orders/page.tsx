'use client';

import { Badge, Button, Stack, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { AccountLayout } from '../../components/account-layout';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { apiClient } from '../../lib/api';
import { useCurrency } from '../../providers/currency-provider';

export default function OrdersPage() {
  const { format } = useCurrency();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/orders');
      if (error) throw error;
      return data ?? [];
    },
  });

  const statusLabel: Record<string, string> = {
    PENDING_PAYMENT: 'Pendiente de pago',
    PAID: 'Pagado',
    IN_PRODUCTION: 'En producción',
    READY_TO_SHIP: 'Listo para enviar',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
  };

  return (
    <AccountLayout>
      <Stack gap="xl">
        <Stack gap="xs">
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Pedidos
          </Text>
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            HISTORIAL DE ENVÍOS
          </Title>
        </Stack>

        {isLoading ? (
          <LoadingState message="Cargando pedidos..." />
        ) : !orders || orders.length === 0 ? (
          <EmptyState title="Sin pedidos" description="Todavía no realizaste ningún pedido." />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Pedido</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {orders.map((order) => (
                <Table.Tr key={order.id}>
                  <Table.Td style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>#{order.id.slice(-6)}</Table.Td>
                  <Table.Td>{new Date(order.createdAt).toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Badge color="dark" radius={0}>
                      {statusLabel[order.status] ?? order.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {format(order.totalAmount)}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      component={Link}
                      href={`/orders/${order.id}`}
                      variant="subtle"
                      size="xs"
                      style={{ fontFamily: 'var(--font-bebas-neue)' }}
                    >
                      Ver detalle
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </AccountLayout>
  );
}
