'use client';

import {
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

const orderStatuses = [
  { value: 'PENDING_PAYMENT', label: 'Pendiente de pago' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'IN_PRODUCTION', label: 'En producción' },
  { value: 'READY_TO_SHIP', label: 'Listo para enviar' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'REFUNDED', label: 'Reembolsado' },
];

const paymentStatuses = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'AUTHORIZED', label: 'Autorizado' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'FAILED', label: 'Fallado' },
  { value: 'REFUNDED', label: 'Reembolsado' },
];

function formatPrice(amount: number) {
  return `$${amount.toLocaleString()}`;
}

type OrderColumnKey = 'customer' | 'total' | 'status' | 'payment' | 'date' | 'actions';

interface SavedFilter {
  id: string;
  name: string;
  search: string;
  statusFilter: string | null;
  paymentFilter: string | null;
}

const ALL_ORDER_COLUMNS: { key: Exclude<OrderColumnKey, 'actions'>; label: string }[] = [
  { key: 'customer', label: 'Cliente' },
  { key: 'total', label: 'Total' },
  { key: 'status', label: 'Estado' },
  { key: 'payment', label: 'Pago' },
  { key: 'date', label: 'Fecha' },
];

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<OrderColumnKey[]>({
    key: 'admin-orders-visible-columns',
    defaultValue: ['customer', 'total', 'status', 'payment', 'date', 'actions'],
  });
  const [savedFilters, setSavedFilters] = useLocalStorage<SavedFilter[]>({
    key: 'admin-orders-saved-filters',
    defaultValue: [],
  });
  const [filterName, setFilterName] = useState('');
  const limit = 10;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string; status: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, statusFilter, paymentFilter],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/orders', {
        params: {
          query: {
            page: String(page),
            limit: String(limit),
            search: search || undefined,
            status: statusFilter || undefined,
            paymentStatus: paymentFilter || undefined,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-order', detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const { data, error } = await apiClient.GET('/admin/orders/{id}', {
        params: { path: { id: detailId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(detailId),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/status', {
        params: { path: { id } },
        body: { status } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', detailId] });
      notifySuccess({ title: 'Estado de orden actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar estado', message: getApiErrorMessage(error) });
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, paymentStatus }: { id: string; paymentStatus: string }) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/payment-status', {
        params: { path: { id } },
        body: { paymentStatus } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', detailId] });
      notifySuccess({ title: 'Estado de pago actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar pago', message: getApiErrorMessage(error) });
    },
  });

  const updateTracking = useMutation({
    mutationFn: async ({ id, trackingNumber, carrier }: { id: string; trackingNumber: string; carrier: string }) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/tracking', {
        params: { path: { id } },
        body: { trackingNumber, carrier } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', detailId] });
      notifySuccess({ title: 'Tracking actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar tracking', message: getApiErrorMessage(error) });
    },
  });

  const bulkStatus = useMutation({
    mutationFn: async ({ status, ids }: { status: string; ids: string[] }) => {
      const { error } = await apiClient.POST('/admin/orders/bulk/status', {
        body: { status, ids } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds([]);
      notifySuccess({ title: 'Estado masivo actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar órdenes', message: getApiErrorMessage(error) });
    },
  });

  const orders = ordersResponse?.data ?? [];
  const totalPages = ordersResponse?.meta?.total ? Math.ceil(ordersResponse.meta.total / limit) : 1;

  useEffect(() => {
    if (detail) {
      setTrackingNumber(detail.trackingNumber ?? '');
      setCarrier(detail.carrier ?? '');
    }
  }, [detail]);

  function handleOpenDetail(id: string) {
    setDetailId(id);
    openDetail();
  }

  function handleStatusChange(id: string, status: string) {
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      setPendingStatusChange({ id, status });
      openConfirm();
      return;
    }
    updateStatus.mutate({ id, status });
  }

  function confirmStatusChange() {
    if (pendingStatusChange) {
      updateStatus.mutate(pendingStatusChange);
      setPendingStatusChange(null);
      closeConfirm();
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]));
  }

  function toggleAll() {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  }

  function saveFilter() {
    if (!filterName.trim()) return;
    const newFilter: SavedFilter = {
      id: `${Date.now()}`,
      name: filterName.trim(),
      search,
      statusFilter,
      paymentFilter,
    };
    setSavedFilters((current) => [...current, newFilter]);
    setFilterName('');
    notifySuccess({ title: 'Filtro guardado' });
  }

  function loadFilter(id: string | null) {
    if (!id) return;
    const filter = savedFilters.find((f) => f.id === id);
    if (!filter) return;
    setSearch(filter.search);
    setStatusFilter(filter.statusFilter);
    setPaymentFilter(filter.paymentFilter);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter(null);
    setPaymentFilter(null);
    setPage(1);
  }

  const isVisible = (key: OrderColumnKey) => visibleColumns.includes(key);
  const columnOptions = ALL_ORDER_COLUMNS.map((c) => ({ value: c.key, label: c.label }));
  const filterOptions = savedFilters.map((f) => ({ value: f.id, label: f.name }));

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Órdenes
      </Title>

      <Paper p="md">
        <Group mb="md" grow align="flex-end">
          <TextInput
            label="Buscar por email"
            placeholder="cliente@ejemplo.com"
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            label="Estado de orden"
            placeholder="Todos"
            data={orderStatuses}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            clearable
          />
          <Select
            label="Estado de pago"
            placeholder="Todos"
            data={paymentStatuses}
            value={paymentFilter}
            onChange={(value) => {
              setPaymentFilter(value);
              setPage(1);
            }}
            clearable
          />
          <MultiSelect
            label="Columnas"
            data={columnOptions}
            value={visibleColumns.filter((c) => c !== 'actions')}
            onChange={(value) => setVisibleColumns([...(value as Exclude<OrderColumnKey, 'actions'>[]), 'actions'])}
            clearable={false}
            style={{ minWidth: 220 }}
          />
        </Group>

        <Group mb="md" gap="xs">
          <Select
            placeholder="Cargar filtro guardado"
            data={filterOptions}
            onChange={loadFilter}
            clearable
            style={{ width: 220 }}
          />
          <TextInput
            placeholder="Nombre del filtro"
            value={filterName}
            onChange={(event) => setFilterName(event.currentTarget.value)}
            style={{ width: 180 }}
          />
          <Button size="xs" variant="light" onClick={saveFilter} disabled={!filterName.trim()}>
            Guardar filtro
          </Button>
          <Button size="xs" variant="subtle" onClick={clearFilters}>
            Limpiar
          </Button>
        </Group>

        {selectedIds.length > 0 && (
          <Group mb="md" gap="xs">
            <Text size="sm">{selectedIds.length} seleccionadas</Text>
            <Select
              placeholder="Cambiar estado"
              data={orderStatuses}
              value={null}
              onChange={(value) => value && bulkStatus.mutate({ status: value, ids: selectedIds })}
              style={{ width: 200 }}
              clearable
            />
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
                      checked={orders.length > 0 && selectedIds.length === orders.length}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < orders.length}
                      onChange={toggleAll}
                    />
                  </Table.Th>
                  {isVisible('customer') && <Table.Th>Cliente</Table.Th>}
                  {isVisible('total') && <Table.Th>Total</Table.Th>}
                  {isVisible('status') && <Table.Th>Estado</Table.Th>}
                  {isVisible('payment') && <Table.Th>Pago</Table.Th>}
                  {isVisible('date') && <Table.Th>Fecha</Table.Th>}
                  {isVisible('actions') && <Table.Th>Acciones</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orders.map((order) => (
                  <Table.Tr key={order.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleSelection(order.id)}
                      />
                    </Table.Td>
                    {isVisible('customer') && <Table.Td>{order.user.email}</Table.Td>}
                    {isVisible('total') && <Table.Td>{formatPrice(order.totalAmount)}</Table.Td>}
                    {isVisible('status') && (
                      <Table.Td>
                        <Badge>{order.status}</Badge>
                      </Table.Td>
                    )}
                    {isVisible('payment') && (
                      <Table.Td>
                        <Badge color="gray">{order.paymentStatus}</Badge>
                      </Table.Td>
                    )}
                    {isVisible('date') && <Table.Td>{new Date(order.createdAt).toLocaleString()}</Table.Td>}
                    {isVisible('actions') && (
                      <Table.Td>
                        <Button size="xs" variant="outline" onClick={() => handleOpenDetail(order.id)}>
                          Ver / Editar
                        </Button>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {orders.length === 0 && (
              <Box mt="md">
                <EmptyState
                  title="No hay órdenes"
                  description="No se encontraron órdenes con los filtros seleccionados."
                />
              </Box>
            )}

            <Pagination value={page} onChange={setPage} total={totalPages} mt="md" />
          </>
        )}
      </Paper>

      <Modal opened={detailOpened} onClose={closeDetail} title={`Orden #${detail?.id?.slice(0, 8) ?? ''}`} size="lg">
        {detail && (
          <Stack>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Cliente
              </Text>
              <Text>
                {detail.user.email} ({[detail.user.firstName, detail.user.lastName].filter(Boolean).join(' ') || '-'})
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Total
              </Text>
              <Text>{formatPrice(detail.totalAmount)}</Text>
            </Group>

            <Select
              label="Estado de orden"
              data={orderStatuses}
              value={detail.status}
              onChange={(value) => value && handleStatusChange(detail.id, value)}
            />

            <Select
              label="Estado de pago"
              data={paymentStatuses}
              value={detail.paymentStatus}
              onChange={(value) => value && updatePaymentStatus.mutate({ id: detail.id, paymentStatus: value })}
            />

            <Text fw={600} mt="sm">
              Envío
            </Text>
            <TextInput
              label="Número de seguimiento"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.currentTarget.value)}
            />
            <TextInput label="Transportista" value={carrier} onChange={(event) => setCarrier(event.currentTarget.value)} />
            <Button
              onClick={() => updateTracking.mutate({ id: detail.id, trackingNumber, carrier })}
              loading={updateTracking.isPending}
            >
              Guardar tracking
            </Button>

            <Text fw={600} mt="sm">
              Items
            </Text>
            <Table withTableBorder striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Cantidad</Table.Th>
                  <Table.Th>Precio unitario</Table.Th>
                  <Table.Th>Producción</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.items.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      {item.type === 'STANDARD'
                        ? item.productVariant?.product?.name ?? 'Producto'
                        : item.customDesign?.designTemplate?.name ?? 'Diseño personalizado'}
                    </Table.Td>
                    <Table.Td>{item.quantity}</Table.Td>
                    <Table.Td>{formatPrice(item.unitPrice)}</Table.Td>
                    <Table.Td>{item.productionStatus}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Button component={Link} href={`/orders/${detail.id}`} variant="light">
              Abrir página de detalle
            </Button>
          </Stack>
        )}
      </Modal>

      <Modal opened={confirmOpened} onClose={closeConfirm} title="Confirmar cambio de estado" centered size="sm">
        <Stack>
          <Text size="sm">
            ¿Seguro que querés cambiar el estado a{' '}
            <strong>{orderStatuses.find((s) => s.value === pendingStatusChange?.status)?.label}</strong>? Esta acción puede
            notificar al cliente.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeConfirm}>
              Cancelar
            </Button>
            <Button color="dark" loading={updateStatus.isPending} onClick={confirmStatusChange}>
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AdminShell>
  );
}
