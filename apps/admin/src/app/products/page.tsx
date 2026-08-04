'use client';

import {
  Button,
  Group,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  categoryId: string;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm<ProductFormValues>({
    initialValues: { name: '', slug: '', description: '', basePrice: 0, categoryId: '' },
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 10;

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/products', {
        params: { query: { page: String(page), limit: String(limit), search: search || undefined } },
      });
      return data;
    },
  });

  const products = productsResponse?.data ?? [];
  const totalPages = productsResponse?.meta?.total ? Math.ceil(productsResponse.meta.total / limit) : 1;

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/categories');
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const { error } = await apiClient.POST('/admin/products', {
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      notifySuccess({ title: 'Producto creado' });
      close();
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear producto', message: getApiErrorMessage(error) });
    },
  });

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/products/{id}/toggle-active', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      notifySuccess({ title: 'Estado actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al cambiar estado', message: getApiErrorMessage(error) });
    },
  });

  const categoryOptions = categories?.map((c) => ({ value: c.id, label: c.name })) ?? [];

  return (
    <AdminShell>
      <Group justify="space-between" mb="md">
        <Title order={1}>Productos</Title>
        <Button onClick={open}>Nuevo producto</Button>
      </Group>

      <Paper p="md">
        <TextInput
          placeholder="Buscar productos..."
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
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Slug</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Precio base</Table.Th>
                  <Table.Th>Activo</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map((product) => (
                  <Table.Tr key={product.id}>
                    <Table.Td>{product.name}</Table.Td>
                    <Table.Td>{product.slug}</Table.Td>
                    <Table.Td>{product.category?.name ?? '-'}</Table.Td>
                    <Table.Td>{product.basePrice.toLocaleString()}</Table.Td>
                    <Table.Td>
                      <Switch
                        checked={product.isActive}
                        onChange={() => toggle.mutate(product.id)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Button component={Link} href={`/products/${product.id}`} size="xs" variant="outline">
                        Editar
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {products.length === 0 && (
              <EmptyState title="No hay productos" description="Todavía no hay productos cargados." />
            )}

            <Pagination value={page} onChange={setPage} total={totalPages} mt="md" />
          </>
        )}
      </Paper>

      <Modal opened={opened} onClose={close} title="Nuevo producto">
        <form onSubmit={form.onSubmit((values) => create.mutate(values))}>
          <Stack>
            <TextInput label="Nombre" {...form.getInputProps('name')} />
            <TextInput label="Slug" {...form.getInputProps('slug')} />
            <TextInput label="Descripción" {...form.getInputProps('description')} />
            <NumberInput label="Precio base" {...form.getInputProps('basePrice')} />
            <Select
              label="Categoría"
              data={categoryOptions}
              {...form.getInputProps('categoryId')}
            />
            <Button type="submit" loading={create.isPending}>
              Guardar
            </Button>
          </Stack>
        </form>
      </Modal>
    </AdminShell>
  );
}
