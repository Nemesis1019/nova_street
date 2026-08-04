'use client';

import { Button, Group, Modal, Pagination, Paper, Select, Stack, Switch, Table, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { useClientPagination } from '../../hooks/use-client-pagination';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  parentId: string;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    initialValues: { name: '', slug: '', description: '', metaTitle: '', metaDescription: '', parentId: '' },
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/categories');
      return data ?? [];
    },
  });

  const [search, setSearch] = useState('');
  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: categories,
    search,
    getSearchFields: (c) => [c.name, c.slug],
  });

  const create = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const { error } = await apiClient.POST('/admin/categories', {
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      notifySuccess({ title: 'Categoría creada' });
      close();
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear categoría', message: getApiErrorMessage(error) });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CategoryFormValues }) => {
      const { error } = await apiClient.PATCH('/admin/categories/{id}', {
        params: { path: { id } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      notifySuccess({ title: 'Categoría actualizada' });
      close();
      setEditing(null);
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar categoría', message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/categories/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      notifySuccess({ title: 'Categoría eliminada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al eliminar categoría', message: getApiErrorMessage(error) });
    },
  });

  const parentOptions = categories?.map((c) => ({ value: c.id, label: c.name })) ?? [];

  const startEdit = (category: NonNullable<typeof categories>[number]) => {
    setEditing(category.id);
    form.setValues({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      metaTitle: category.metaTitle ?? '',
      metaDescription: category.metaDescription ?? '',
      parentId: category.parentId ?? '',
    });
    open();
  };

  const startCreate = () => {
    setEditing(null);
    form.reset();
    open();
  };

  return (
    <AdminShell>
      <Group justify="space-between" mb="md">
        <Title order={1}>Categorías</Title>
        <Button onClick={startCreate}>Nueva categoría</Button>
      </Group>

      <Paper p="md">
        <TextInput
          placeholder="Buscar categorías..."
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
                  <Table.Th>Activo</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedData.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>{category.name}</Table.Td>
                    <Table.Td>{category.slug}</Table.Td>
                    <Table.Td>
                      <Switch checked={category.isActive} disabled />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="outline" onClick={() => startEdit(category)}>
                          Editar
                        </Button>
                        <Button size="xs" variant="outline" color="red" onClick={() => remove.mutate(category.id)}>
                          Eliminar
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {paginatedData.length === 0 && (
              <EmptyState title="No hay categorías" description="Todavía no hay categorías cargadas." />
            )}

            <Pagination value={page} onChange={setPage} total={totalPages} mt="md" />
          </>
        )}
      </Paper>

      <Modal opened={opened} onClose={close} title={editing ? 'Editar categoría' : 'Nueva categoría'}>
        <form
          onSubmit={form.onSubmit((values) =>
            editing ? update.mutate({ id: editing, values }) : create.mutate(values),
          )}
        >
          <Stack>
            <TextInput label="Nombre" {...form.getInputProps('name')} />
            <TextInput label="Slug" {...form.getInputProps('slug')} />
            <TextInput label="Descripción" {...form.getInputProps('description')} />
            <TextInput label="Meta título" {...form.getInputProps('metaTitle')} />
            <TextInput label="Meta descripción" {...form.getInputProps('metaDescription')} />
            <Select
              label="Categoría padre"
              data={[{ value: '', label: 'Ninguna' }, ...parentOptions]}
              {...form.getInputProps('parentId')}
            />
            <Button type="submit" loading={create.isPending || update.isPending}>
              Guardar
            </Button>
          </Stack>
        </form>
      </Modal>
    </AdminShell>
  );
}
