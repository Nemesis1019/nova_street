'use client';

import { Button, Group, NumberInput, Stack, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';

import { AdminShell } from '../../components/admin-shell';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function CurrenciesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-currencies'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/currencies');
      if (error) throw error;
      return (data ?? []) as Currency[];
    },
  });

  const form = useForm({
    initialValues: {
      code: '',
      name: '',
      symbol: '',
      exchangeRate: 1,
      isDefault: false,
      isActive: true,
      sortOrder: 0,
    },
  });

  const create = useMutation({
    mutationFn: async (values: typeof form.values) => {
      const { error } = await apiClient.POST('/admin/currencies', { body: values as never });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      form.reset();
      notifySuccess({ title: 'Moneda creada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const update = useMutation({
    mutationFn: async ({ code, values }: { code: string; values: Partial<Currency> }) => {
      const { error } = await apiClient.PATCH('/admin/currencies/{code}', {
        params: { path: { code } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      notifySuccess({ title: 'Moneda actualizada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await apiClient.DELETE('/admin/currencies/{code}', {
        params: { path: { code } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-currencies'] });
      notifySuccess({ title: 'Moneda eliminada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Monedas
      </Title>

      <form onSubmit={form.onSubmit((values) => create.mutate(values))}>
        <Stack maw={600} gap="md" mb="xl">
          <Group grow>
            <TextInput label="Código (3 letras)" {...form.getInputProps('code')} />
            <TextInput label="Símbolo" {...form.getInputProps('symbol')} />
          </Group>
          <TextInput label="Nombre" {...form.getInputProps('name')} />
          <Group grow>
            <NumberInput label="Tasa de cambio" min={0.00000001} step={0.01} {...form.getInputProps('exchangeRate')} />
            <NumberInput label="Orden" min={0} {...form.getInputProps('sortOrder')} />
          </Group>
          <Group>
            <Switch label="Por defecto" {...form.getInputProps('isDefault', { type: 'checkbox' })} />
            <Switch label="Activa" {...form.getInputProps('isActive', { type: 'checkbox' })} />
          </Group>
          <Button type="submit" loading={create.isPending}>
            Agregar moneda
          </Button>
        </Stack>
      </form>

      <DataTable
        records={data ?? []}
        fetching={isLoading}
        columns={[
          { accessor: 'code', title: 'Código' },
          { accessor: 'name', title: 'Nombre' },
          { accessor: 'symbol', title: 'Símbolo' },
          {
            accessor: 'exchangeRate',
            title: 'Tasa',
            render: (item) => Number(item.exchangeRate).toFixed(6),
          },
          {
            accessor: 'isDefault',
            title: 'Por defecto',
            render: (item) => (item.isDefault ? 'Sí' : 'No'),
          },
          {
            accessor: 'isActive',
            title: 'Activa',
            render: (item) => (
              <Switch
                checked={item.isActive}
                onChange={(event) =>
                  update.mutate({ code: item.code, values: { isActive: event.currentTarget.checked } })
                }
              />
            ),
          },
          {
            accessor: 'actions',
            title: 'Acciones',
            render: (item) => (
              <Group gap="xs">
                {!item.isDefault && (
                  <Button size="xs" variant="light" onClick={() => update.mutate({ code: item.code, values: { isDefault: true } })}>
                    Default
                  </Button>
                )}
                {!item.isDefault && (
                  <Button size="xs" color="red" variant="light" onClick={() => remove.mutate(item.code)}>
                    Eliminar
                  </Button>
                )}
              </Group>
            ),
          },
        ]}
        noRecordsText="No hay monedas"
      />
    </AdminShell>
  );
}
