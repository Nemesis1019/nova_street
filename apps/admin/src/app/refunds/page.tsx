'use client';

import { Badge, Button, Group, Select, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { apiClient } from '../../lib/api';

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
};

export default function RefundsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const filterForm = useForm({
    initialValues: { status: '', search: '' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-refunds', page, filters],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/refunds', {
        params: {
          query: {
            page: String(page),
            limit: '20',
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.search ? { search: filters.search } : {}),
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const records = (data?.data ?? []) as Array<{
    id: string;
    orderId: string;
    amount: number;
    reason: string;
    status: string;
    providerRefundId?: string;
    createdAt: string;
    createdBy?: { firstName: string; lastName: string; email: string } | null;
  }>;

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Reembolsos
      </Title>

      <Stack mb="md">
        <form
          onSubmit={filterForm.onSubmit((values) => {
            setPage(1);
            setFilters(values);
          })}
        >
          <Group align="flex-end">
            <Select
              label="Estado"
              data={[
                { value: '', label: 'Todos' },
                { value: 'PENDING', label: 'Pendiente' },
                { value: 'COMPLETED', label: 'Completado' },
                { value: 'FAILED', label: 'Fallido' },
              ]}
              style={{ minWidth: 180 }}
              {...filterForm.getInputProps('status')}
            />
            <TextInput label="Buscar" {...filterForm.getInputProps('search')} />
            <Button type="submit">Filtrar</Button>
          </Group>
        </form>
      </Stack>

      <DataTable
        records={records}
        fetching={isLoading}
        page={page}
        onPageChange={setPage}
        recordsPerPage={20}
        totalRecords={(data?.meta as { total?: number } | undefined)?.total ?? 0}
        columns={[
          { accessor: 'orderId', title: 'Orden', render: (item) => `#${item.orderId.slice(-6)}` },
          {
            accessor: 'amount',
            title: 'Monto',
            render: (item) => item.amount.toLocaleString(),
          },
          { accessor: 'reason', title: 'Motivo' },
          {
            accessor: 'status',
            title: 'Estado',
            render: (item) => (
              <Badge
                color={item.status === 'COMPLETED' ? 'green' : item.status === 'FAILED' ? 'red' : 'yellow'}
                radius={0}
              >
                {statusLabels[item.status] ?? item.status}
              </Badge>
            ),
          },
          {
            accessor: 'providerRefundId',
            title: 'ID proveedor',
            render: (item) => item.providerRefundId ?? '-',
          },
          {
            accessor: 'createdBy',
            title: 'Creado por',
            render: (item) =>
              item.createdBy
                ? `${item.createdBy.firstName} ${item.createdBy.lastName} (${item.createdBy.email})`
                : '-',
          },
          {
            accessor: 'createdAt',
            title: 'Fecha',
            render: (item) => new Date(item.createdAt).toLocaleString(),
          },
        ]}
        noRecordsText="No hay reembolsos registrados"
      />
    </AdminShell>
  );
}
