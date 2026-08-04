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
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { useClientPagination } from '../../hooks/use-client-pagination';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

type AppliesTo = 'ALL' | 'CATEGORY' | 'PRODUCT';
type DiscountType = 'PERCENTAGE' | 'FIXED';

interface CouponFormValues {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  isActive: boolean;
  appliesTo: AppliesTo;
  categoryId: string;
  productId: string;
  minOrderAmount: number;
  maxUsesPerUser: number;
  isFirstPurchaseOnly: boolean;
}

const appliesToOptions = [
  { value: 'ALL', label: 'Todo' },
  { value: 'CATEGORY', label: 'Categoría' },
  { value: 'PRODUCT', label: 'Producto' },
];

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);

  const form = useForm<CouponFormValues>({
    initialValues: {
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      maxUses: 100,
      isActive: true,
      appliesTo: 'ALL',
      categoryId: '',
      productId: '',
      minOrderAmount: 0,
      maxUsesPerUser: 0,
      isFirstPurchaseOnly: false,
    },
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/coupons');
      return data?.data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories-select'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/categories');
      return data ?? [];
    },
  });

  const { data: productsResponse } = useQuery({
    queryKey: ['admin-products-select'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/products');
      return data;
    },
  });

  const products = productsResponse?.data ?? [];

  const categoryOptions =
    categories?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const productOptions =
    products?.map((p) => ({ value: p.id, label: p.name })) ?? [];

  const [search, setSearch] = useState('');
  const { page, setPage, paginatedData, totalPages } = useClientPagination({
    data: coupons,
    search,
    getSearchFields: (c) => [c.code],
  });

  const create = useMutation({
    mutationFn: async (values: CouponFormValues) => {
      const payload = buildPayload(values);
      const { error } = await apiClient.POST('/admin/coupons', {
        body: payload as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: 'Cupón creado' });
      close();
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear cupón', message: getApiErrorMessage(error) });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CouponFormValues }) => {
      const payload = buildPayload(values);
      const { error } = await apiClient.PATCH('/admin/coupons/{id}', {
        params: { path: { id } },
        body: payload as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: 'Cupón actualizado' });
      close();
      setEditing(null);
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar cupón', message: getApiErrorMessage(error) });
    },
  });

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/coupons/{id}/toggle-active', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: 'Estado actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al cambiar estado', message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/admin/coupons/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      notifySuccess({ title: 'Cupón eliminado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al eliminar cupón', message: getApiErrorMessage(error) });
    },
  });

  const startEdit = (coupon: NonNullable<typeof coupons>[number]) => {
    setEditing(coupon.id);
    form.setValues({
      code: coupon.code,
      discountType: coupon.discountType as DiscountType,
      discountValue: coupon.discountValue,
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil?.split('T')[0] ?? '',
      maxUses: coupon.maxUses ?? 0,
      isActive: coupon.isActive,
      appliesTo: (coupon.appliesTo as AppliesTo) ?? 'ALL',
      categoryId: coupon.categoryId ?? '',
      productId: coupon.productId ?? '',
      minOrderAmount: coupon.minOrderAmount ?? 0,
      maxUsesPerUser: coupon.maxUsesPerUser ?? 0,
      isFirstPurchaseOnly: coupon.isFirstPurchaseOnly ?? false,
    });
    open();
  };

  const startCreate = () => {
    setEditing(null);
    form.reset();
    open();
  };

  const appliesTo = form.values.appliesTo;

  return (
    <AdminShell>
      <Group justify="space-between" mb="md">
        <Title order={1}>Cupones</Title>
        <Button onClick={startCreate}>Nuevo cupón</Button>
      </Group>

      <Paper p="md">
        <TextInput
          placeholder="Buscar cupones..."
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
                  <Table.Th>Código</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Valor</Table.Th>
                  <Table.Th>Aplica a</Table.Th>
                  <Table.Th>Mínimo</Table.Th>
                  <Table.Th>Usos</Table.Th>
                  <Table.Th>Activo</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedData.map((coupon) => (
                  <Table.Tr key={coupon.id}>
                    <Table.Td>{coupon.code}</Table.Td>
                    <Table.Td>{coupon.discountType}</Table.Td>
                    <Table.Td>{coupon.discountValue.toLocaleString()}</Table.Td>
                    <Table.Td>
                      {coupon.appliesTo === 'CATEGORY'
                        ? `Cat: ${coupon.category?.name ?? coupon.categoryId}`
                        : coupon.appliesTo === 'PRODUCT'
                          ? `Prod: ${coupon.product?.name ?? coupon.productId}`
                          : 'Todo'}
                    </Table.Td>
                    <Table.Td>{coupon.minOrderAmount?.toLocaleString() ?? '-'}</Table.Td>
                    <Table.Td>
                      {coupon.usedCount} / {coupon.maxUses ?? '∞'}
                      {coupon.maxUsesPerUser ? ` (máx ${coupon.maxUsesPerUser}/usr)` : ''}
                    </Table.Td>
                    <Table.Td>
                      <Switch checked={coupon.isActive} onChange={() => toggle.mutate(coupon.id)} />
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="outline" onClick={() => startEdit(coupon)}>
                          Editar
                        </Button>
                        <Button size="xs" variant="outline" color="red" onClick={() => remove.mutate(coupon.id)}>
                          Eliminar
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {paginatedData.length === 0 && (
              <EmptyState title="No hay cupones" description="Todavía no hay cupones cargados." />
            )}

            <Pagination value={page} onChange={setPage} total={totalPages} mt="md" />
          </>
        )}
      </Paper>

      <Modal opened={opened} onClose={close} title={editing ? 'Editar cupón' : 'Nuevo cupón'}>
        <form
          onSubmit={form.onSubmit((values) =>
            editing ? update.mutate({ id: editing, values }) : create.mutate(values),
          )}
        >
          <Stack>
            <TextInput label="Código" {...form.getInputProps('code')} />
            <Select
              label="Tipo de descuento"
              data={[
                { value: 'PERCENTAGE', label: 'Porcentaje' },
                { value: 'FIXED', label: 'Monto fijo' },
              ]}
              {...form.getInputProps('discountType')}
            />
            <NumberInput
              label="Valor"
              value={form.values.discountValue}
              onChange={(value) => form.setFieldValue('discountValue', Number(value) || 0)}
            />
            <TextInput label="Válido desde" type="date" {...form.getInputProps('validFrom')} />
            <TextInput label="Válido hasta" type="date" {...form.getInputProps('validUntil')} />
            <NumberInput label="Máximo de usos" {...form.getInputProps('maxUses')} />
            <Select label="Aplica a" data={appliesToOptions} {...form.getInputProps('appliesTo')} />
            {appliesTo === 'CATEGORY' && (
              <Select
                label="Categoría"
                data={categoryOptions}
                placeholder="Seleccionar categoría"
                {...form.getInputProps('categoryId')}
              />
            )}
            {appliesTo === 'PRODUCT' && (
              <Select
                label="Producto"
                data={productOptions}
                placeholder="Seleccionar producto"
                {...form.getInputProps('productId')}
              />
            )}
            <NumberInput
              label="Monto mínimo de orden"
              {...form.getInputProps('minOrderAmount')}
            />
            <NumberInput
              label="Máximo de usos por usuario"
              {...form.getInputProps('maxUsesPerUser')}
            />
            <Switch
              label="Solo primera compra"
              {...form.getInputProps('isFirstPurchaseOnly', { type: 'checkbox' })}
            />
            <Switch label="Activo" {...form.getInputProps('isActive', { type: 'checkbox' })} />
            <Button type="submit" loading={create.isPending || update.isPending}>
              Guardar
            </Button>
          </Stack>
        </form>
      </Modal>
    </AdminShell>
  );
}

function buildPayload(values: CouponFormValues) {
  return {
    code: values.code,
    discountType: values.discountType,
    discountValue: values.discountValue,
    validFrom: values.validFrom,
    validUntil: values.validUntil || undefined,
    maxUses: values.maxUses || undefined,
    isActive: values.isActive,
    appliesTo: values.appliesTo,
    categoryId: values.appliesTo === 'CATEGORY' ? values.categoryId || undefined : undefined,
    productId: values.appliesTo === 'PRODUCT' ? values.productId || undefined : undefined,
    minOrderAmount: values.minOrderAmount || undefined,
    maxUsesPerUser: values.maxUsesPerUser || undefined,
    isFirstPurchaseOnly: values.isFirstPurchaseOnly,
  };
}
