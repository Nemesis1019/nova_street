'use client';

import { Badge, Button, Group, Image, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ isApproved: '', search: '' });

  const filterForm = useForm({
    initialValues: { isApproved: '', search: '' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page, filters],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/reviews', {
        params: {
          query: {
            page: String(page),
            limit: '20',
            ...(filters.isApproved ? { isApproved: filters.isApproved } : {}),
            ...(filters.search ? { search: filters.search } : {}),
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/reviews/{id}/approve', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      notifySuccess({ title: 'Reseña aprobada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/reviews/{id}/reject', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      notifySuccess({ title: 'Reseña rechazada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/reviews/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      notifySuccess({ title: 'Reseña eliminada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const records = (data?.data ?? []) as Array<{
    id: string;
    user: { firstName: string; lastName: string };
    product: { name: string };
    rating: number;
    comment?: string;
    isApproved: boolean;
    createdAt: string;
    assets?: { id: string; thumbnailUrl: string }[];
  }>;

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Reseñas
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
                { value: 'true', label: 'Aprobadas' },
                { value: 'false', label: 'Pendientes' },
              ]}
              style={{ minWidth: 180 }}
              {...filterForm.getInputProps('isApproved')}
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
          {
            accessor: 'user',
            title: 'Usuario',
            render: (item) => `${item.user.firstName} ${item.user.lastName}`,
          },
          { accessor: 'product.name', title: 'Producto' },
          {
            accessor: 'assets',
            title: 'Fotos',
            render: (item) =>
              item.assets && item.assets.length > 0 ? (
                <Image
                  src={item.assets[0].thumbnailUrl}
                  alt="Foto de reseña"
                  radius={0}
                  width={48}
                  height={48}
                  fit="cover"
                />
              ) : (
                '-'
              ),
          },
          { accessor: 'rating', title: 'Estrellas' },
          {
            accessor: 'comment',
            title: 'Comentario',
            render: (item) => (
              <Text lineClamp={2} size="sm">
                {item.comment ?? '-'}
              </Text>
            ),
          },
          {
            accessor: 'isApproved',
            title: 'Estado',
            render: (item) =>
              item.isApproved ? (
                <Badge color="green">Aprobada</Badge>
              ) : (
                <Badge color="yellow">Pendiente</Badge>
              ),
          },
          {
            accessor: 'actions',
            title: 'Acciones',
            render: (item) => (
              <Group gap="xs">
                {!item.isApproved && (
                  <Button size="xs" onClick={() => approve.mutate(item.id)}>
                    Aprobar
                  </Button>
                )}
                {item.isApproved && (
                  <Button size="xs" variant="light" color="yellow" onClick={() => reject.mutate(item.id)}>
                    Rechazar
                  </Button>
                )}
                <Button size="xs" color="red" variant="light" onClick={() => remove.mutate(item.id)}>
                  Eliminar
                </Button>
              </Group>
            ),
          },
        ]}
        noRecordsText="No hay reseñas"
      />
    </AdminShell>
  );
}
