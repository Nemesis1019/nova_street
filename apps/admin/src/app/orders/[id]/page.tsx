'use client';

import {
  Anchor,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Timeline,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../../components/admin-shell';
import { EmptyState } from '../../../components/empty-state';
import { LoadingState } from '../../../components/loading-state';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';

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

const actionLabels: Record<string, string> = {
  UPDATE_STATUS: 'Cambio de estado',
  UPDATE_PAYMENT_STATUS: 'Cambio de estado de pago',
  UPDATE_TRACKING: 'Actualización de tracking',
  ASSIGN_ORDER: 'Asignación de operador',
  UPDATE_NOTES: 'Notas internas',
  CANCEL_ORDER: 'Cancelación',
  REFUND_ORDER: 'Reembolso',
};

function formatPrice(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

const shipmentStatuses = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'IN_TRANSIT', label: 'En tránsito' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

function OrderShipmentsSection({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');

  const { data: shipments } = useQuery({
    queryKey: ['admin-order-shipments', orderId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/orders/{orderId}/shipments', {
        params: { path: { orderId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orderId),
  });

  const createShipment = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/admin/orders/{orderId}/shipments', {
        params: { path: { orderId } },
        body: { carrier, trackingNumber, trackingUrl: trackingUrl || undefined, notes } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-shipments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      setCarrier('');
      setTrackingNumber('');
      setTrackingUrl('');
      setNotes('');
      notifySuccess({ title: 'Envío registrado' });
    },
    onError: (error) => notifyError({ title: 'Error al registrar envío', message: getApiErrorMessage(error) }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await apiClient.PATCH('/admin/shipments/{id}/status', {
        params: { path: { id } },
        body: { status } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-shipments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      notifySuccess({ title: 'Estado de envío actualizado' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const canCreate = orderStatus === 'READY_TO_SHIP' || orderStatus === 'SHIPPED';
  const records = (shipments?.data ?? []) as Array<{
    id: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    status: string;
    shippedAt?: string;
    deliveredAt?: string;
    notes?: string;
  }>;

  return (
    <>
      <Title order={3} mb="md">
        Envíos
      </Title>
      <Paper p="md" mb="xl">
        <Stack>
          {canCreate && (
            <>
              <TextInput
                label="Transportista"
                value={carrier}
                onChange={(e) => setCarrier(e.currentTarget.value)}
              />
              <TextInput
                label="Número de seguimiento"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.currentTarget.value)}
              />
              <TextInput
                label="URL de rastreo"
                placeholder="https://courier.example.com/track?123"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.currentTarget.value)}
              />
              <TextInput
                label="Notas"
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
              />
              <Button
                onClick={() => createShipment.mutate()}
                loading={createShipment.isPending}
                disabled={!carrier || !trackingNumber}
              >
                Registrar envío
              </Button>
            </>
          )}

          {records.length === 0 ? (
            <Text c="dimmed">No hay envíos registrados.</Text>
          ) : (
            <Table withTableBorder striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Transportista</Table.Th>
                  <Table.Th>Seguimiento</Table.Th>
                  <Table.Th>Link</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Actualizado</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((shipment) => (
                  <Table.Tr key={shipment.id}>
                    <Table.Td>{shipment.carrier}</Table.Td>
                    <Table.Td>{shipment.trackingNumber}</Table.Td>
                    <Table.Td>
                      {shipment.trackingUrl ? (
                        <Anchor href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                          Rastrear
                        </Anchor>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Select
                        data={shipmentStatuses}
                        value={shipment.status}
                        onChange={(value) => value && updateStatus.mutate({ id: shipment.id, status: value })}
                        style={{ minWidth: 160 }}
                      />
                    </Table.Td>
                    <Table.Td>{formatDate(shipment.deliveredAt ?? shipment.shippedAt)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Paper>
    </>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [cancelOpened, { open: openCancel, close: closeCancel }] = useDisclosure(false);
  const [refundOpened, { open: openRefund, close: closeRefund }] = useDisclosure(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/orders/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: timeline } = useQuery({
    queryKey: ['admin-order-timeline', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/orders/{id}/timeline', {
        params: { path: { id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: admins } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (order) {
      setTrackingNumber(order.trackingNumber ?? '');
      setCarrier(order.carrier ?? '');
      setTrackingUrl(order.trackingUrl ?? '');
      setAdminNotes(order.adminNotes ?? '');
      setAssigneeId(order.assignedTo?.id ?? null);
      setRefundAmount(order.totalAmount);
    }
  }, [order]);

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/status', {
        params: { path: { id } },
        body: { status } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      notifySuccess({ title: 'Estado de orden actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar estado', message: getApiErrorMessage(error) });
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async (paymentStatus: string) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/payment-status', {
        params: { path: { id } },
        body: { paymentStatus } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      notifySuccess({ title: 'Estado de pago actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar pago', message: getApiErrorMessage(error) });
    },
  });

  const updateTracking = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/tracking', {
        params: { path: { id } },
        body: { trackingNumber, carrier, trackingUrl: trackingUrl || undefined } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      notifySuccess({ title: 'Tracking actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar tracking', message: getApiErrorMessage(error) });
    },
  });

  const assignOrder = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/assign', {
        params: { path: { id } },
        body: { assignedToId: assigneeId ?? undefined } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      notifySuccess({ title: 'Operador asignado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al asignar operador', message: getApiErrorMessage(error) });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/notes', {
        params: { path: { id } },
        body: { adminNotes } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      notifySuccess({ title: 'Notas guardadas' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar notas', message: getApiErrorMessage(error) });
    },
  });

  const cancelOrder = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/cancel', {
        params: { path: { id } },
        body: { reason } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReason('');
      closeCancel();
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      notifySuccess({ title: 'Orden cancelada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al cancelar', message: getApiErrorMessage(error) });
    },
  });

  const refundOrder = useMutation({
    mutationFn: async ({ amount, refundReason }: { amount: number; refundReason: string }) => {
      const { error } = await apiClient.PATCH('/admin/orders/{id}/refund', {
        params: { path: { id } },
        body: { reason: refundReason, amount } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReason('');
      closeRefund();
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      notifySuccess({ title: 'Orden reembolsada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al reembolsar', message: getApiErrorMessage(error) });
    },
  });

  function handleStatusChange(status: string) {
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      setPendingStatus(status);
      openConfirm();
      return;
    }
    updateStatus.mutate(status);
  }

  function confirmStatusChange() {
    if (pendingStatus) {
      updateStatus.mutate(pendingStatus);
      setPendingStatus(null);
      closeConfirm();
    }
  }

  const assigneeOptions =
    admins?.data
      .filter((user) => user.role.name === 'ADMIN')
      .map((admin) => ({
        value: admin.id,
        label: `${admin.firstName ?? ''} ${admin.lastName ?? ''} (${admin.email})`.trim(),
      })) ?? [];

  const isFinal = order?.status === 'CANCELLED' || order?.status === 'REFUNDED' || order?.status === 'DELIVERED';

  return (
    <AdminShell>
      <Group mb="md">
        <Button component={Link} href="/orders" variant="outline">
          ← Volver
        </Button>
        <Title order={1}>Orden #{id.slice(0, 8)}</Title>
      </Group>

      {isLoading ? (
        <LoadingState />
      ) : order ? (
        <>
          <Paper p="md" mb="xl">
            <Stack>
              <Text>
                <strong>Cliente:</strong> {order.user.email} (
                {[order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || '-'})
              </Text>
              <Text>
                <strong>Total:</strong> {formatPrice(order.totalAmount)}
              </Text>
              <Text>
                <strong>Fecha:</strong> {new Date(order.createdAt).toLocaleString()}
              </Text>

              {order.assignedTo && (
                <Text>
                  <strong>Operador:</strong>{' '}
                  {[order.assignedTo.firstName, order.assignedTo.lastName].filter(Boolean).join(' ') ||
                    order.assignedTo.email}
                </Text>
              )}

              <Select
                label="Estado de orden"
                data={orderStatuses}
                value={order.status}
                disabled={isFinal}
                onChange={(value) => value && handleStatusChange(value)}
              />

              <Select
                label="Estado de pago"
                data={paymentStatuses}
                value={order.paymentStatus}
                disabled={isFinal}
                onChange={(value) => value && updatePaymentStatus.mutate(value)}
              />

              <Text fw={600} mt="sm">
                Envío
              </Text>
              <TextInput
                label="Número de seguimiento"
                value={trackingNumber}
                disabled={isFinal}
                onChange={(event) => setTrackingNumber(event.currentTarget.value)}
              />
              <TextInput
                label="Transportista"
                value={carrier}
                disabled={isFinal}
                onChange={(event) => setCarrier(event.currentTarget.value)}
              />
              <TextInput
                label="URL de rastreo"
                placeholder="https://courier.example.com/track?123"
                value={trackingUrl}
                disabled={isFinal}
                onChange={(event) => setTrackingUrl(event.currentTarget.value)}
              />
              {order?.trackingUrl && (
                <Anchor href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                  Abrir link de rastreo
                </Anchor>
              )}
              <Button onClick={() => updateTracking.mutate()} loading={updateTracking.isPending} disabled={isFinal}>
                Guardar tracking
              </Button>

              <Text fw={600} mt="sm">
                Operador asignado
              </Text>
              <Select
                data={assigneeOptions}
                value={assigneeId}
                disabled={isFinal}
                placeholder="Sin asignar"
                onChange={setAssigneeId}
              />
              <Button onClick={() => assignOrder.mutate()} loading={assignOrder.isPending} disabled={isFinal}>
                Asignar operador
              </Button>

              <Text fw={600} mt="sm">
                Notas internas
              </Text>
              <Textarea
                value={adminNotes}
                disabled={isFinal}
                onChange={(event) => setAdminNotes(event.currentTarget.value)}
                placeholder="Notas visibles solo para el equipo"
                minRows={3}
              />
              <Button onClick={() => updateNotes.mutate()} loading={updateNotes.isPending} disabled={isFinal}>
                Guardar notas
              </Button>

              <Group mt="sm">
                <Button color="red" variant="outline" onClick={openCancel} disabled={isFinal}>
                  Cancelar orden
                </Button>
                <Button color="dark" variant="outline" onClick={openRefund} disabled={isFinal}>
                  Reembolsar orden
                </Button>
              </Group>

              {order.cancellationReason && (
                <Text c="red" size="sm">
                  <strong>Motivo de cancelación:</strong> {order.cancellationReason} —{' '}
                  {formatDate(order.cancelledAt)}
                </Text>
              )}
              {order.refundReason && (
                <Text c="red" size="sm">
                  <strong>Motivo de reembolso:</strong> {order.refundReason} — {formatDate(order.refundedAt)}
                </Text>
              )}
            </Stack>
          </Paper>

          <Title order={3} mb="md">
            Timeline de auditoría
          </Title>
          <Paper p="md" mb="xl">
            {!timeline || timeline.data.length === 0 ? (
              <EmptyState title="Sin eventos" description="Todavía no hay cambios registrados para esta orden." />
            ) : (
              <Timeline active={-1} bulletSize={24} lineWidth={2}>
                {timeline.data.map((entry) => (
                  <Timeline.Item
                    key={entry.id}
                    title={actionLabels[entry.action] ?? entry.action}
                  >
                    <Text c="dimmed" size="sm">
                      {formatDate(entry.createdAt)}
                    </Text>
                    <Text size="sm">
                      {entry.user
                        ? [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ') || entry.user.email
                        : 'Sistema'}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Paper>

          <Title order={3} mb="md">
            Items
          </Title>
          <Paper p="md" mb="xl">
            {order.items.length === 0 ? (
              <EmptyState title="Sin items" description="La orden no tiene productos asociados." />
            ) : (
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
                  {order.items.map((item) => (
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
            )}
          </Paper>

          <OrderShipmentsSection orderId={id} orderStatus={order.status} />
        </>
      ) : null}

      <Modal opened={confirmOpened} onClose={closeConfirm} title="Confirmar cambio de estado" centered size="sm">
        <Stack>
          <Text size="sm">
            ¿Seguro que querés cambiar el estado a{' '}
            <strong>{orderStatuses.find((s) => s.value === pendingStatus)?.label}</strong>? Esta acción puede notificar al
            cliente.
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

      <Modal opened={cancelOpened} onClose={closeCancel} title="Cancelar orden" centered size="sm">
        <Stack>
          <Text size="sm">Indicá el motivo de la cancelación. Esta acción libera el stock reservado.</Text>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder="Motivo de cancelación"
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeCancel}>
              Cerrar
            </Button>
            <Button color="red" loading={cancelOrder.isPending} onClick={() => cancelOrder.mutate()} disabled={!reason}>
              Cancelar orden
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={refundOpened} onClose={closeRefund} title="Reembolsar orden" centered size="sm">
        <Stack>
          <Text size="sm">Indicá el monto y el motivo del reembolso.</Text>
          <TextInput
            label="Monto a reembolsar"
            type="number"
            value={refundAmount}
            onChange={(event) => setRefundAmount(Number(event.currentTarget.value))}
          />
          <Textarea
            label="Motivo"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder="Motivo de reembolso"
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeRefund}>
              Cerrar
            </Button>
            <Button
              color="dark"
              loading={refundOrder.isPending}
              onClick={() => refundOrder.mutate({ amount: refundAmount, refundReason: reason })}
              disabled={!reason || refundAmount <= 0}
            >
              Reembolsar orden
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AdminShell>
  );
}
