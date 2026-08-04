'use client';

import {
  Badge,
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { useClientPagination } from '../../hooks/use-client-pagination';
import { apiClient } from '../../lib/api';
import { getAccessToken } from '../../lib/auth';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

interface StockFormValues {
  stockMode: 'MADE_TO_ORDER' | 'TRACKED';
  quantity: number;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<{ id: string; mode: 'stock' | 'addStock' } | null>(null);

  const form = useForm<StockFormValues>({
    initialValues: { stockMode: 'MADE_TO_ORDER', quantity: 0 },
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/inventory', { params: { query: { limit: '100' } } });
      return data?.data ?? [];
    },
  });

  const [search, setSearch] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: inventory,
    search,
    getSearchFields: (v) => [v.product?.name, v.sku, v.size, v.color],
  });

  const updateStockMode = useMutation({
    mutationFn: async ({ id, stockMode }: { id: string; stockMode: string }) => {
      const { error } = await apiClient.PATCH('/admin/variants/{id}/stock-mode', {
        params: { path: { id } },
        body: { stockMode } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      notifySuccess({ title: 'Modo de stock actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar modo', message: getApiErrorMessage(error) });
    },
  });

  const addStock = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const formData = new FormData();
      formData.append('quantity', String(quantity));
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${baseUrl}/admin/variants/${id}/add-stock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken() ?? ''}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(body.message ?? `Error ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      setImageFile(null);
      notifySuccess({ title: 'Stock agregado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al agregar stock', message: getApiErrorMessage(error) });
    },
  });

  const openStockMode = (variant: NonNullable<typeof inventory>[number]) => {
    setEditing({ id: variant.id, mode: 'stock' });
    form.setValues({ stockMode: variant.stockMode as 'MADE_TO_ORDER' | 'TRACKED', quantity: variant.inventory?.quantity ?? 0 });
    open();
  };

  const openAddStock = (variant: NonNullable<typeof inventory>[number]) => {
    setEditing({ id: variant.id, mode: 'addStock' });
    form.setValues({ stockMode: variant.stockMode as 'MADE_TO_ORDER' | 'TRACKED', quantity: 1 });
    setImageFile(null);
    open();
  };

  const handleSubmit = (values: StockFormValues) => {
    if (!editing) return;
    if (editing.mode === 'stock') {
      updateStockMode.mutate({ id: editing.id, stockMode: values.stockMode });
    } else {
      addStock.mutate({ id: editing.id, quantity: Number(values.quantity) });
    }
    close();
  };

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Stock
      </Title>

      <Paper p="md">
        <TextInput
          placeholder="Buscar por producto, SKU, talla o color..."
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          mb="md"
        />

        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Talla/Color</Table.Th>
                  <Table.Th>Modo stock</Table.Th>
                  <Table.Th>Inventario</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedData.map((variant) => (
                  <Table.Tr key={variant.id}>
                    <Table.Td>{variant.product?.name ?? '-'}</Table.Td>
                    <Table.Td>{variant.sku}</Table.Td>
                    <Table.Td>
                      {variant.size} / {variant.color}
                    </Table.Td>
                    <Table.Td>
                      <Badge>{variant.stockMode}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {variant.stockMode === 'TRACKED'
                        ? `${variant.inventory?.quantity ?? 0} (reservado: ${variant.inventory?.reservedQuantity ?? 0})`
                        : '-'}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="outline" onClick={() => openStockMode(variant)}>
                          Modo
                        </Button>
                        {variant.stockMode === 'TRACKED' && (
                          <Button size="xs" variant="outline" onClick={() => openAddStock(variant)}>
                            Agregar stock
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {paginatedData.length === 0 && (
              <EmptyState title="No hay variantes" description="Todavía no hay inventario cargado." />
            )}

            <Pagination value={page} onChange={setPage} total={totalPages} mt="md" />
          </>
        )}
      </Paper>

      <Modal opened={opened} onClose={close} title={editing?.mode === 'stock' ? 'Cambiar modo de stock' : 'Agregar stock'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {editing?.mode === 'stock' ? (
              <Select
                label="Modo de stock"
                data={[
                  { value: 'MADE_TO_ORDER', label: 'Made to order' },
                  { value: 'TRACKED', label: 'Tracked' },
                ]}
                {...form.getInputProps('stockMode')}
              />
            ) : (
              <>
                <Text size="sm" c="dimmed">
                  Stock actual: {inventory?.find((v) => v.id === editing?.id)?.inventory?.quantity ?? 0} (reservado: {inventory?.find((v) => v.id === editing?.id)?.inventory?.reservedQuantity ?? 0})
                </Text>
                <NumberInput
                  label="Cantidad a agregar"
                  min={1}
                  value={form.values.quantity}
                  onChange={(value) => form.setFieldValue('quantity', Number(value) || 0)}
                />
                <FileInput
                  label="Imagen del stock (opcional)"
                  placeholder="Subir imagen"
                  value={imageFile}
                  onChange={setImageFile}
                  accept="image/*"
                />
              </>
            )}
            <Button type="submit" loading={updateStockMode.isPending || addStock.isPending}>
              Guardar
            </Button>
          </Stack>
        </form>
      </Modal>
    </AdminShell>
  );
}
