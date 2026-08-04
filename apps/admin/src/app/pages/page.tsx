'use client';

import {
  Button,
  Group,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  Stack,
  Switch,
  Table,
  Textarea,
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
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

interface PageFormValues {
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isVisible: boolean;
  sortOrder: number;
}

export default function PagesPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);

  const form = useForm<PageFormValues>({
    initialValues: {
      slug: '',
      title: '',
      content: '',
      metaTitle: '',
      metaDescription: '',
      isVisible: true,
      sortOrder: 0,
    },
  });

  const { data: pagesResponse, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/pages');
      return data;
    },
  });

  const pages = pagesResponse?.data ?? [];

  const [search, setSearch] = useState('');
  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: pages,
    search,
    getSearchFields: (p) => [p.title, p.slug],
  });

  const create = useMutation({
    mutationFn: async (values: PageFormValues) => {
      const { error } = await apiClient.POST('/admin/pages', {
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      notifySuccess({ title: 'Página creada' });
      close();
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear página', message: getApiErrorMessage(error) });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PageFormValues }) => {
      const { error } = await apiClient.PATCH('/admin/pages/{id}', {
        params: { path: { id } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      notifySuccess({ title: 'Página actualizada' });
      close();
      setEditing(null);
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar página', message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/pages/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      notifySuccess({ title: 'Página eliminada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al eliminar página', message: getApiErrorMessage(error) });
    },
  });

  const startEdit = (pageItem: (typeof pages)[number]) => {
    setEditing(pageItem.id);
    form.setValues({
      slug: pageItem.slug,
      title: pageItem.title,
      content: pageItem.content,
      metaTitle: pageItem.metaTitle ?? '',
      metaDescription: pageItem.metaDescription ?? '',
      isVisible: pageItem.isVisible,
      sortOrder: pageItem.sortOrder,
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
        <Title order={1}>Páginas estáticas</Title>
        <Button onClick={startCreate}>Nueva página</Button>
      </Group>

      <Paper p="md">
        <TextInput
          placeholder="Buscar páginas..."
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
                  <Table.Th>Título</Table.Th>
                  <Table.Th>Slug</Table.Th>
                  <Table.Th>Visible</Table.Th>
                  <Table.Th>Orden</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedData.map((pageItem) => (
                  <Table.Tr key={pageItem.id}>
                    <Table.Td>{pageItem.title}</Table.Td>
                    <Table.Td>{pageItem.slug}</Table.Td>
                    <Table.Td>
                      <Switch checked={pageItem.isVisible} disabled />
                    </Table.Td>
                    <Table.Td>{pageItem.sortOrder}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="outline" onClick={() => startEdit(pageItem)}>
                          Editar
                        </Button>
                        <Button size="xs" variant="outline" color="red" onClick={() => remove.mutate(pageItem.id)}>
                          Eliminar
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {paginatedData.length === 0 && (
              <EmptyState title="No hay páginas" description="Todavía no hay páginas cargadas." />
            )}

            <Pagination value={page} onChange={setPage} total={totalPages} mt="md" />
          </>
        )}
      </Paper>

      <Modal opened={opened} onClose={close} title={editing ? 'Editar página' : 'Nueva página'} size="lg">
        <form
          onSubmit={form.onSubmit((values) =>
            editing ? update.mutate({ id: editing, values }) : create.mutate(values),
          )}
        >
          <Stack>
            <TextInput label="Slug" placeholder="faq" {...form.getInputProps('slug')} />
            <TextInput label="Título" {...form.getInputProps('title')} />
            <Textarea label="Contenido" rows={8} {...form.getInputProps('content')} />
            <TextInput label="Meta título" {...form.getInputProps('metaTitle')} />
            <TextInput label="Meta descripción" {...form.getInputProps('metaDescription')} />
            <NumberInput label="Orden" min={0} {...form.getInputProps('sortOrder')} />
            <Switch label="Visible" {...form.getInputProps('isVisible', { type: 'checkbox' })} />
            <Button type="submit" loading={create.isPending || update.isPending}>
              Guardar
            </Button>
          </Stack>
        </form>
      </Modal>
    </AdminShell>
  );
}
