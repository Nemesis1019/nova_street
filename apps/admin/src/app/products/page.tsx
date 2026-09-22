'use client';

import {
  Box,
  Button,
  Checkbox,
  FileInput,
  Group,
  Image,
  Loader,
  Menu,
  Modal,
  MultiSelect,
  NumberInput,
  Pagination,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { apiClient, getAuthToken } from '../../lib/api';
import { createExternalAsset, uploadAsset } from '../../lib/assets';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

type ImageMode = 'file' | 'url';

interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  categoryId: string;
  imageMode: ImageMode;
  imageFile: File | null;
  imageUrl: string;
}

type ColumnKey = 'name' | 'slug' | 'category' | 'basePrice' | 'isActive' | 'actions';

const ALL_COLUMNS: { key: Exclude<ColumnKey, 'actions'>; label: string }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'slug', label: 'Slug' },
  { key: 'category', label: 'Categoría' },
  { key: 'basePrice', label: 'Precio base' },
  { key: 'isActive', label: 'Activo' },
];

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [navigating, setNavigating] = useState(false);
  const form = useForm<ProductFormValues>({
    initialValues: { name: '', slug: '', description: '', basePrice: 0, categoryId: '', imageMode: 'file', imageFile: null, imageUrl: '' },
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (form.values.imageMode === 'file') {
      const file = form.values.imageFile;
      if (!file) {
        setPreviewUrl(null);
        return undefined;
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    const url = form.values.imageUrl.trim();
    setPreviewUrl(url || null);
    return undefined;
  }, [form.values.imageFile, form.values.imageUrl, form.values.imageMode]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<ColumnKey[]>({
    key: 'admin-products-visible-columns',
    defaultValue: ['name', 'slug', 'category', 'basePrice', 'isActive', 'actions'],
  });
  const [importFile, setImportFile] = useState<File | null>(null);
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
      let imageAssetId: string | undefined;
      if (values.imageMode === 'file' && values.imageFile) {
        const asset = await uploadAsset(values.imageFile);
        imageAssetId = asset.id;
      } else if (values.imageMode === 'url' && values.imageUrl.trim()) {
        const asset = await createExternalAsset(values.imageUrl.trim());
        imageAssetId = asset.id;
      }

      const { error } = await apiClient.POST('/admin/products', {
        body: {
          name: values.name,
          slug: values.slug,
          description: values.description,
          basePrice: values.basePrice,
          categoryId: values.categoryId || undefined,
          imageAssetId,
        } as never,
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

  const bulk = useMutation({
    mutationFn: async ({ action, ids }: { action: 'activate' | 'deactivate' | 'delete'; ids: string[] }) => {
      const { error } = await apiClient.POST('/admin/products/bulk', {
        body: { action, ids } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds([]);
      notifySuccess({ title: 'Acción masiva aplicada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error en acción masiva', message: getApiErrorMessage(error) });
    },
  });

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admin/products/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken() ?? ''}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Error al importar CSV');
      }
      return response.json() as Promise<{ created: number; total: number; errors: Array<{ row: number; message: string }> }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setImportFile(null);
      const errorMsg = result.errors.length ? ` (${result.errors.length} errores)` : '';
      notifySuccess({ title: `Importación completada: ${result.created} productos${errorMsg}` });
    },
    onError: (error) => {
      notifyError({ title: 'Error al importar CSV', message: getApiErrorMessage(error) });
    },
  });

  const categoryOptions = categories?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const columnOptions = ALL_COLUMNS.map((c) => ({ value: c.key, label: c.label }));

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]));
  };

  const toggleAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const isVisible = (key: ColumnKey) => visibleColumns.includes(key);

  return (
    <AdminShell>
      <Group justify="space-between" mb="md">
        <Title order={1}>Productos</Title>
        <Group>
          <MultiSelect
            placeholder="Columnas"
            data={columnOptions}
            value={visibleColumns.filter((c) => c !== 'actions')}
            onChange={(value) => setVisibleColumns([...(value as Exclude<ColumnKey, 'actions'>[]), 'actions'])}
            style={{ width: 220 }}
            clearable={false}
          />
          <Button onClick={open}>Nuevo producto</Button>
        </Group>
      </Group>

      <Paper p="md" mb="md" withBorder>
        <Group gap="xs" align="flex-end">
          <FileInput
            placeholder="CSV de productos"
            value={importFile}
            onChange={setImportFile}
            accept=".csv"
            style={{ flex: 1, minWidth: 220 }}
          />
          <Button
            onClick={() => importFile && importCsv.mutate(importFile)}
            loading={importCsv.isPending}
            disabled={!importFile}
          >
            Importar CSV
          </Button>
          <Button
            component="a"
            variant="light"
            href="data:text/csv;charset=utf-8,name,slug,description,basePrice,categoryId,metaTitle,metaDescription,isActive\nEjemplo,ejemplo,Descripción,10000,ID_CATEGORIA,Meta,Meta,true"
            download="productos-plantilla.csv"
          >
            Descargar plantilla
          </Button>
          {importCsv.data && importCsv.data.errors.length > 0 && (
            <Text size="sm" c="red">
              {importCsv.data.errors.length} errores
            </Text>
          )}
        </Group>
      </Paper>

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

        {selectedIds.length > 0 && (
          <Group mb="md" gap="xs">
            <Text size="sm">{selectedIds.length} seleccionados</Text>
            <Button size="xs" variant="light" onClick={() => bulk.mutate({ action: 'activate', ids: selectedIds })}>
              Activar
            </Button>
            <Button size="xs" variant="light" onClick={() => bulk.mutate({ action: 'deactivate', ids: selectedIds })}>
              Desactivar
            </Button>
            <Menu>
              <Menu.Target>
                <Button size="xs" color="red" variant="light" loading={bulk.isPending}>
                  Eliminar
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item color="red" onClick={() => bulk.mutate({ action: 'delete', ids: selectedIds })}>
                  Confirmar eliminación
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        )}

        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Checkbox
                      checked={products.length > 0 && selectedIds.length === products.length}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < products.length}
                      onChange={toggleAll}
                    />
                  </Table.Th>
                  {isVisible('name') && <Table.Th>Nombre</Table.Th>}
                  {isVisible('slug') && <Table.Th>Slug</Table.Th>}
                  {isVisible('category') && <Table.Th>Categoría</Table.Th>}
                  {isVisible('basePrice') && <Table.Th>Precio base</Table.Th>}
                  {isVisible('isActive') && <Table.Th>Activo</Table.Th>}
                  {isVisible('actions') && <Table.Th>Acciones</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map((product) => (
                  <Table.Tr key={product.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                      />
                    </Table.Td>
                    {isVisible('name') && <Table.Td>{product.name}</Table.Td>}
                    {isVisible('slug') && <Table.Td>{product.slug}</Table.Td>}
                    {isVisible('category') && <Table.Td>{product.category?.name ?? '-'}</Table.Td>}
                    {isVisible('basePrice') && <Table.Td>{product.basePrice.toLocaleString()}</Table.Td>}
                    {isVisible('isActive') && (
                      <Table.Td>
                        <Switch
                          checked={product.isActive}
                          onChange={() => toggle.mutate(product.id)}
                        />
                      </Table.Td>
                    )}
                    {isVisible('actions') && (
                      <Table.Td>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setNavigating(true);
                            router.push(`/products/${product.id}`);
                          }}
                        >
                          Editar
                        </Button>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {products.length === 0 && (
              <Box mt="md">
                <EmptyState title="No hay productos" description="Todavía no hay productos cargados." />
              </Box>
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
            <SegmentedControl
              data={[
                { label: 'Subir archivo', value: 'file' },
                { label: 'Usar URL', value: 'url' },
              ]}
              {...form.getInputProps('imageMode')}
            />
            {form.values.imageMode === 'file' ? (
              <FileInput
                label="Imagen del producto"
                placeholder="Subir imagen"
                accept="image/*"
                clearable
                {...form.getInputProps('imageFile')}
              />
            ) : (
              <TextInput
                label="URL de la imagen"
                placeholder="https://..."
                {...form.getInputProps('imageUrl')}
              />
            )}
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Vista previa"
                radius="md"
                height={160}
                fit="contain"
              />
            )}
            <Button type="submit" loading={create.isPending}>
              Guardar
            </Button>
          </Stack>
        </form>
      </Modal>

      {navigating && (
        <Box
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1000,
          }}
        >
          <Loader type="dots" size="xl" />
        </Box>
      )}
    </AdminShell>
  );
}
