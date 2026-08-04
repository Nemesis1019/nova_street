'use client';

import { Paper, SimpleGrid, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { apiClient } from '../lib/api';
import { AdminShell } from './admin-shell';
import { AnalyticsSection } from './analytics-section';
import { LoadingState } from './loading-state';
import { TrendsChart } from './trends-chart';

export function DashboardView() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/dashboard/metrics');
      if (error) throw error;
      return data;
    },
  });

  const { data: trends } = useQuery({
    queryKey: ['admin-dashboard-trends'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/dashboard/trends');
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminShell>
      <Title order={1} mb="lg">
        Panel de administración
      </Title>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} mb="xl">
            <MetricCard label="Órdenes totales" value={metrics?.totalOrders ?? 0} />
            <MetricCard label="Ingresos (pagados)" value={`$${(metrics?.totalRevenue ?? 0).toLocaleString()}`} />
            <MetricCard label="Órdenes hoy" value={metrics?.ordersToday ?? 0} />
            <MetricCard label="Órdenes pendientes" value={metrics?.pendingOrders ?? 0} />
            <MetricCard label="Usuarios" value={metrics?.totalUsers ?? 0} />
            <MetricCard label="Stock bajo" value={metrics?.lowStockCount ?? 0} />
          </SimpleGrid>

          {trends && <TrendsChart data={trends.data as Array<{ date: string; orders: number; revenue: number }>} />}

          <Title order={3} mb="md" mt="xl">
            Órdenes recientes
          </Title>
          <Paper p="md">
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cliente</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(metrics?.recentOrders ?? []).map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td>{order.customerEmail}</Table.Td>
                    <Table.Td>{order.status}</Table.Td>
                    <Table.Td>${order.totalAmount.toLocaleString()}</Table.Td>
                    <Table.Td>{new Date(order.createdAt).toLocaleString()}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>

          <AnalyticsSection />

          <Title order={3} mb="md" mt="xl">
            Secciones
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            <DashboardCard href="/products" title="Productos" description="Gestionar productos y variantes" />
            <DashboardCard href="/categories" title="Categorías" description="Gestionar categorías" />
            <DashboardCard href="/inventory" title="Stock" description="Modos de stock e inventario" />
            <DashboardCard href="/coupons" title="Cupones" description="Códigos de descuento" />
            <DashboardCard href="/orders" title="Órdenes" description="Gestión de pedidos" />
            <DashboardCard href="/users" title="Usuarios" description="Clientes y roles" />
            <DashboardCard href="/custom-designs" title="Diseños" description="Moderar diseños personalizados" />
            <DashboardCard href="/store-config" title="Configuración" description="Branding y datos de la tienda" />
          </SimpleGrid>
        </>
      )}
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text size="2xl" fw={700} mt="xs">
        {value}
      </Text>
    </Paper>
  );
}

function DashboardCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Paper
        withBorder
        p="md"
        radius="md"
        style={{ cursor: 'pointer', transition: 'border-color 150ms ease' }}
        className="dashboard-card"
      >
        <Title order={4}>{title}</Title>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Paper>
    </Link>
  );
}
