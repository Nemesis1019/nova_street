'use client';

import { Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AdminShell } from '../../../components/admin-shell';
import { EmptyState } from '../../../components/empty-state';
import { LoadingState } from '../../../components/loading-state';
import { apiClient } from '../../../lib/api';

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: ordersResponse, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['admin-user-orders', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await apiClient.GET('/admin/users/{id}/orders', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const orders = ordersResponse?.data ?? [];

  return (
    <AdminShell>
      <Group mb="md">
        <Button component={Link} href="/users" variant="outline">
          ← Volver
        </Button>
        <Title order={1}>Usuario</Title>
      </Group>

      {isLoadingUser ? (
        <LoadingState />
      ) : user ? (
        <>
          <Paper p="md" mb="xl">
            <Stack>
              <Text>
                <strong>Email:</strong> {user.email}
              </Text>
              <Text>
                <strong>Nombre:</strong> {[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}
              </Text>
              <Text>
                <strong>Rol:</strong> {user.role.name}
              </Text>
              <Text>
                <strong>Verificado:</strong> {user.emailVerified ? 'Sí' : 'No'}
              </Text>
              <Text>
                <strong>Activo:</strong> {user.isActive ? 'Sí' : 'No'}
              </Text>
              <Text>
                <strong>Creado:</strong> {new Date(user.createdAt).toLocaleString()}
              </Text>
            </Stack>
          </Paper>

          <Title order={3} mb="md">
            Historial de órdenes
          </Title>
          <Paper p="md">
            {isLoadingOrders ? (
              <LoadingState />
            ) : orders.length === 0 ? (
              <EmptyState title="Sin órdenes" description="Este usuario no tiene órdenes registradas." />
            ) : (
              <Table withTableBorder striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Pago</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {orders.map((order) => (
                    <Table.Tr key={order.id}>
                      <Table.Td>{order.status}</Table.Td>
                      <Table.Td>{order.paymentStatus}</Table.Td>
                      <Table.Td>${order.totalAmount.toLocaleString()}</Table.Td>
                      <Table.Td>{new Date(order.createdAt).toLocaleString()}</Table.Td>
                      <Table.Td>
                        <Button component={Link} href={`/orders/${order.id}`} size="xs" variant="outline">
                          Ver
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </>
      ) : null}
    </AdminShell>
  );
}
