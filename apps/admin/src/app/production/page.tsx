'use client';

import { Button, Group, Select, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

const statusLabels: Record<string, string> = {
  PENDING_PRODUCTION: 'Pendiente',
  IN_PRODUCTION: 'En producción',
  QUALITY_CHECK: 'Control de calidad',
  READY_TO_SHIP: 'Listo para envío',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

export default function ProductionPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '', assignedToId: '' });

  const filterForm = useForm({
    initialValues: { status: '', search: '', assignedToId: '' },
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users-select'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users', {
        params: { query: { page: '1', limit: '100' } },
      });
      if (error) throw error;
      return data?.data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['production-queue', page, filters],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/production', {
        params: {
          query: {
            page: String(page),
            limit: '20',
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.search ? { search: filters.search } : {}),
            ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await apiClient.PATCH('/admin/production/items/{id}/status', {
        params: { path: { id } },
        body: { status: status as never },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      notifySuccess({ title: 'Estado actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar estado', message: getApiErrorMessage(error) });
    },
  });

  const assignItem = useMutation({
    mutationFn: async ({ id, assignedToId }: { id: string; assignedToId: string | null }) => {
      const { error } = await apiClient.PATCH('/admin/production/items/{id}/assign', {
        params: { path: { id } },
        body: { assignedToId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      notifySuccess({ title: 'Responsable actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al asignar responsable', message: getApiErrorMessage(error) });
    },
  });

  const records = (data?.data ?? []) as Array<{
    id: string;
    orderId: string;
    productName?: string;
    designTemplateName?: string;
    variantLabel?: string;
    quantity: number;
    productionStatus: string;
    assignedToId?: string;
    assignedTo?: { id: string; name: string; email: string };
  }>;

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Cola de producción
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
              data={[{ value: '', label: 'Todos' }, ...statusOptions]}
              style={{ minWidth: 220 }}
              {...filterForm.getInputProps('status')}
            />
            <TextInput label="Buscar" {...filterForm.getInputProps('search')} />
            <Select
              label="Responsable"
              data={[
                { value: '', label: 'Todos' },
                { value: 'null', label: 'Sin asignar' },
                ...((users ?? []).map((u) => ({
                  value: u.id,
                  label: `${u.firstName} ${u.lastName} (${u.email})`,
                })) as { value: string; label: string }[]),
              ]}
              style={{ minWidth: 240 }}
              {...filterForm.getInputProps('assignedToId')}
            />
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
            accessor: 'name',
            title: 'Producto',
            render: (item) =>
              item.productName ?? item.designTemplateName ?? 'Personalizado',
          },
          { accessor: 'variantLabel', title: 'Variante' },
          { accessor: 'quantity', title: 'Cantidad' },
          {
            accessor: 'productionStatus',
            title: 'Estado',
            render: (item) => statusLabels[item.productionStatus] ?? item.productionStatus,
          },
          {
            accessor: 'assignedTo',
            title: 'Responsable',
            render: (item) => (
              <Select
                data={[
                  { value: 'null', label: 'Sin asignar' },
                  ...((users ?? []).map((u) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName} (${u.email})`,
                  })) as { value: string; label: string }[]),
                ]}
                value={item.assignedToId ?? 'null'}
                onChange={(value) => {
                  if (value === undefined) return;
                  assignItem.mutate({ id: item.id, assignedToId: value === 'null' ? null : value });
                }}
                style={{ minWidth: 220 }}
                disabled={assignItem.isPending}
              />
            ),
          },
          {
            accessor: 'actions',
            title: 'Acciones',
            render: (item) => (
              <Select
                data={statusOptions}
                value={item.productionStatus}
                onChange={(value) => {
                  if (value && value !== item.productionStatus) {
                    updateStatus.mutate({ id: item.id, status: value });
                  }
                }}
                style={{ minWidth: 180 }}
              />
            ),
          },
        ]}
        noRecordsText="No hay ítems en producción"
      />
    </AdminShell>
  );
}
