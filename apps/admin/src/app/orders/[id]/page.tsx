'use client';

import { Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppModal } from '../../../components/ui/app-modal';
import { Button } from '../../../components/ui/button';
import { Card, EmptyState, SectionTitle } from '../../../components/ui/card';
import { Icon } from '../../../components/ui/icon';
import { Field, Input, Select, Textarea } from '../../../components/ui/input';
import { QueryError } from '../../../components/ui/query-error';
import { StatusPill, StatusTone } from '../../../components/ui/status-pill';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';
import { useTranslation } from '../../../providers/i18n-provider';

const orderStatuses = [
  { value: 'PENDING_PAYMENT', labelKey: 'pages.orderDetail.statusPendingPayment' },
  { value: 'PAID', labelKey: 'pages.orderDetail.statusPaid' },
  { value: 'IN_PRODUCTION', labelKey: 'pages.orderDetail.statusInProduction' },
  { value: 'READY_TO_SHIP', labelKey: 'pages.orderDetail.statusReadyToShip' },
  { value: 'SHIPPED', labelKey: 'pages.orderDetail.statusShipped' },
  { value: 'DELIVERED', labelKey: 'pages.orderDetail.statusDelivered' },
  { value: 'CANCELLED', labelKey: 'pages.orderDetail.statusCancelled' },
  { value: 'REFUNDED', labelKey: 'pages.orderDetail.statusRefunded' },
];

const paymentStatuses = [
  { value: 'PENDING', labelKey: 'pages.orderDetail.paymentPending' },
  { value: 'AUTHORIZED', labelKey: 'pages.orderDetail.paymentAuthorized' },
  { value: 'PAID', labelKey: 'pages.orderDetail.paymentPaid' },
  { value: 'FAILED', labelKey: 'pages.orderDetail.paymentFailed' },
  { value: 'REFUNDED', labelKey: 'pages.orderDetail.paymentRefunded' },
];

const ORDER_STATUS_META: Record<string, { labelKey: string; tone: StatusTone; pulse?: boolean }> = {
  PENDING_PAYMENT: { labelKey: 'pages.orderDetail.statusPendingPayment', tone: 'warning' },
  PAID: { labelKey: 'pages.orderDetail.statusPaid', tone: 'success' },
  IN_PRODUCTION: { labelKey: 'pages.orderDetail.metaInProduction', tone: 'secondary', pulse: true },
  READY_TO_SHIP: { labelKey: 'pages.orderDetail.metaReadyToShip', tone: 'info' },
  SHIPPED: { labelKey: 'pages.orderDetail.statusShipped', tone: 'info' },
  DELIVERED: { labelKey: 'pages.orderDetail.statusDelivered', tone: 'success' },
  CANCELLED: { labelKey: 'pages.orderDetail.statusCancelled', tone: 'danger' },
  REFUNDED: { labelKey: 'pages.orderDetail.statusRefunded', tone: 'danger' },
};

const PAYMENT_STATUS_META: Record<string, { labelKey: string; tone: StatusTone }> = {
  PENDING: { labelKey: 'pages.orderDetail.metaPaymentPending', tone: 'warning' },
  AUTHORIZED: { labelKey: 'pages.orderDetail.metaPaymentAuthorized', tone: 'info' },
  PAID: { labelKey: 'pages.orderDetail.paymentPaid', tone: 'success' },
  FAILED: { labelKey: 'pages.orderDetail.metaPaymentFailed', tone: 'danger' },
  REFUNDED: { labelKey: 'pages.orderDetail.paymentRefunded', tone: 'neutral' },
};

const actionLabelKeys: Record<string, string> = {
  UPDATE_STATUS: 'pages.orderDetail.actionUpdateStatus',
  UPDATE_PAYMENT_STATUS: 'pages.orderDetail.actionUpdatePaymentStatus',
  UPDATE_TRACKING: 'pages.orderDetail.actionUpdateTracking',
  ASSIGN_ORDER: 'pages.orderDetail.actionAssignOrder',
  UPDATE_NOTES: 'pages.orderDetail.actionUpdateNotes',
  CANCEL_ORDER: 'pages.orderDetail.actionCancelOrder',
  REFUND_ORDER: 'pages.orderDetail.actionRefundOrder',
  UPDATE_PRODUCTION_STATUS: 'pages.orderDetail.actionUpdateProductionStatus',
  CREATE_SHIPMENT: 'pages.orderDetail.actionCreateShipment',
  UPDATE_SHIPMENT_STATUS: 'pages.orderDetail.actionUpdateShipmentStatus',
};

const productionStages = [
  { value: 'PENDING_PRODUCTION', labelKey: 'pages.orderDetail.stagePendingProduction' },
  { value: 'IN_PRODUCTION', labelKey: 'pages.orderDetail.stageInProduction' },
  { value: 'QUALITY_CHECK', labelKey: 'pages.orderDetail.stageQualityCheck' },
  { value: 'READY_TO_SHIP', labelKey: 'pages.orderDetail.stageReadyToShip' },
];

const PRODUCTION_STATUS_META: Record<string, { labelKey: string; tone: StatusTone; pulse?: boolean }> = {
  PENDING_PRODUCTION: { labelKey: 'pages.orderDetail.productionPending', tone: 'neutral' },
  IN_PRODUCTION: { labelKey: 'pages.orderDetail.productionInProduction', tone: 'secondary', pulse: true },
  QUALITY_CHECK: { labelKey: 'pages.orderDetail.productionQualityCheck', tone: 'warning' },
  READY_TO_SHIP: { labelKey: 'pages.orderDetail.productionReadyToShip', tone: 'success' },
};

const COURIERS = [
  { value: 'Andreani Express', labelKey: 'pages.orderDetail.courierAndreani' },
  { value: 'DHL Worldwide Express', labelKey: 'pages.orderDetail.courierDhl' },
  { value: 'Cadetería Privada NÖVA', labelKey: 'pages.orderDetail.courierPrivate' },
  { value: 'Retiro en Atelier Central', labelKey: 'pages.orderDetail.courierPickup' },
];

const SHIPMENT_STATUS_META: Record<string, { labelKey: string; tone: StatusTone }> = {
  PENDING: { labelKey: 'pages.orderDetail.shipmentPending', tone: 'neutral' },
  IN_TRANSIT: { labelKey: 'pages.orderDetail.shipmentInTransitStatus', tone: 'info' },
  DELIVERED: { labelKey: 'pages.orderDetail.shipmentDeliveredStatus', tone: 'success' },
  CANCELLED: { labelKey: 'pages.orderDetail.shipmentCancelled', tone: 'danger' },
};

function formatPrice(amount: number) {
  return `$${amount.toLocaleString('es-CO')}`;
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CO');
}

function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getItemName(
  item: {
    type: string;
    productVariant?: { product?: { name?: string } } | null;
    customDesign?: { designTemplate?: { name?: string } } | null;
  },
  t: (key: string) => string,
) {
  if (item.type === 'STANDARD')
    return item.productVariant?.product?.name ?? t('pages.orderDetail.productFallback');
  return item.customDesign?.designTemplate?.name ?? t('pages.orderDetail.customDesignFallback');
}

function getItemVariant(item: {
  productVariant?: ({ id: string } & { sku?: string; size?: string | null; color?: string | null }) | null;
}) {
  const variant = item.productVariant;
  if (!variant) return { sku: undefined, label: '' };
  const label = [variant.size, variant.color].filter(Boolean).join(' • ');
  return { sku: variant.sku, label };
}

function getTimelineDot(action: string) {
  if (action.includes('PAYMENT')) return 'bg-emerald-500';
  if (action.includes('REFUND') || action.includes('CANCEL')) return 'bg-rose-500';
  if (action.includes('TRACKING') || action.includes('SHIPMENT')) return 'bg-sky-500';
  if (action.includes('ASSIGN')) return 'bg-secondary';
  if (action.includes('NOTES')) return 'bg-amber-500';
  return 'bg-primary';
}

function getInitials(firstName?: string | null, lastName?: string | null, fallback = '') {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (first || last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return fallback.slice(0, 2).toUpperCase();
}

export default function OrderDetailPage() {
  const { t } = useTranslation();
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
  const [newShipment, setNewShipment] = useState({
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
    notes: '',
  });
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [cancelOpened, { open: openCancel, close: closeCancel }] = useDisclosure(false);
  const [refundOpened, { open: openRefund, close: closeRefund }] = useDisclosure(false);
  const [createShipmentOpened, { open: openCreateShipment, close: closeCreateShipment }] = useDisclosure(false);

  const { data: order, isLoading, isError, isFetching, refetch } = useQuery({
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

  const { data: shipments } = useQuery({
    queryKey: ['admin-order-shipments', id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/orders/{orderId}/shipments', {
        params: { path: { orderId: id } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const customerId = order?.user.id;

  const { data: customerUser } = useQuery({
    queryKey: ['admin-user', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await apiClient.GET('/admin/users/{id}', {
        params: { path: { id: customerId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(customerId),
  });

  const { data: customerOrdersResponse } = useQuery({
    queryKey: ['admin-user-orders', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await apiClient.GET('/admin/users/{id}/orders', {
        params: { path: { id: customerId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(customerId),
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
      notifySuccess({ title: t('pages.orderDetail.toastStatusUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastStatusError'), message: getApiErrorMessage(error) });
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
      notifySuccess({ title: t('pages.orderDetail.toastPaymentUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastPaymentError'), message: getApiErrorMessage(error) });
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
      notifySuccess({ title: t('pages.orderDetail.toastTrackingUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastTrackingError'), message: getApiErrorMessage(error) });
    },
  });

  const updateProductionStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const { error } = await apiClient.PATCH('/admin/production/items/{id}/status', {
        params: { path: { id: itemId } },
        body: { status } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-timeline', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-queue'] });
      notifySuccess({ title: t('pages.orderDetail.toastProductionUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastProductionError'), message: getApiErrorMessage(error) });
    },
  });

  const createShipment = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/admin/orders/{orderId}/shipments', {
        params: { path: { orderId: id } },
        body: {
          carrier: newShipment.carrier,
          trackingNumber: newShipment.trackingNumber,
          trackingUrl: newShipment.trackingUrl || undefined,
          notes: newShipment.notes || undefined,
        } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-shipments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setNewShipment({ carrier: '', trackingNumber: '', trackingUrl: '', notes: '' });
      closeCreateShipment();
      notifySuccess({ title: t('pages.orderDetail.toastShipmentCreated') });
    },
    onError: (error) => notifyError({ title: t('pages.orderDetail.toastShipmentError'), message: getApiErrorMessage(error) }),
  });

  const updateShipmentStatus = useMutation({
    mutationFn: async ({ shipmentId, status }: { shipmentId: string; status: string }) => {
      const { error } = await apiClient.PATCH('/admin/shipments/{id}/status', {
        params: { path: { id: shipmentId } },
        body: { status } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order-shipments', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      notifySuccess({ title: t('pages.orderDetail.toastShipmentStatusUpdated') });
    },
    onError: (error) => notifyError({ title: t('pages.orderDetail.toastShipmentStatusError'), message: getApiErrorMessage(error) }),
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
      notifySuccess({ title: t('pages.orderDetail.toastAssigned') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastAssignError'), message: getApiErrorMessage(error) });
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
      notifySuccess({ title: t('pages.orderDetail.toastNotesSaved') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastNotesError'), message: getApiErrorMessage(error) });
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
      notifySuccess({ title: t('pages.orderDetail.toastCancelled') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastCancelError'), message: getApiErrorMessage(error) });
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
      notifySuccess({ title: t('pages.orderDetail.toastRefunded') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.orderDetail.toastRefundError'), message: getApiErrorMessage(error) });
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

  async function copyToClipboard(value: string, title: string) {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess({ title });
    } catch {
      notifyError({ title: t('pages.orderDetail.copyErrorTitle'), message: t('pages.orderDetail.copyErrorMessage') });
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
  const shortId = id.slice(0, 8);

  const orderMeta = ORDER_STATUS_META[order?.status ?? ''] ?? {
    labelKey: '',
    tone: 'neutral' as StatusTone,
  };
  const paymentMeta = PAYMENT_STATUS_META[order?.paymentStatus ?? ''] ?? {
    labelKey: '',
    tone: 'neutral' as StatusTone,
  };
  const orderMetaLabel = orderMeta.labelKey ? t(orderMeta.labelKey) : (order?.status ?? '-');
  const paymentMetaLabel = paymentMeta.labelKey ? t(paymentMeta.labelKey) : (order?.paymentStatus ?? '-');

  const shipmentRecords = shipments?.data ?? [];
  const activeShipment = shipmentRecords[0];
  const shipmentBadge = activeShipment
    ? SHIPMENT_STATUS_META[activeShipment.status] ?? { labelKey: '', tone: 'neutral' as StatusTone }
    : order?.status === 'READY_TO_SHIP'
      ? { labelKey: 'pages.orderDetail.shipmentReadyToDispatch', tone: 'info' as StatusTone }
      : order?.status === 'SHIPPED'
        ? { labelKey: 'pages.orderDetail.shipmentInTransit', tone: 'info' as StatusTone }
        : order?.status === 'DELIVERED'
          ? { labelKey: 'pages.orderDetail.shipmentDelivered', tone: 'success' as StatusTone }
          : { labelKey: 'pages.orderDetail.shipmentNone', tone: 'neutral' as StatusTone };

  const canCreateShipment = order?.status === 'READY_TO_SHIP' || order?.status === 'SHIPPED';
  const trackingUrlDisplay = order?.trackingUrl ?? activeShipment?.trackingUrl;
  const customerNotes = order ? (order as { customerNotes?: string | null }).customerNotes : undefined;

  const customerName = order
    ? [order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || order.user.email
    : '';
  const initials = order ? getInitials(order.user.firstName, order.user.lastName, order.user.email) : '';
  const phone = order?.shippingAddress?.phone;

  const customerOrders = customerOrdersResponse?.data ?? [];
  const countedOrders = customerOrders.filter((entry) => entry.status !== 'CANCELLED' && entry.status !== 'REFUNDED');
  const purchaseCount = countedOrders.length;
  const lifetimeValue = countedOrders.reduce((sum, entry) => sum + entry.totalAmount, 0);

  const latestPayment = order?.payments
    ? [...order.payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : undefined;
  const paymentProvider = latestPayment
    ? latestPayment.provider.charAt(0).toUpperCase() + latestPayment.provider.slice(1)
    : '';
  const taxAmount = order ? Math.round((order.totalAmount * 21) / 121) : 0;

  return (
    <>
      {isError ? (
        <QueryError onRetry={() => refetch()} retrying={isFetching} />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-14 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin text-[20px]" />
          {t('pages.orderDetail.loadingOrder')}
        </div>
      ) : order ? (
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                <Link href="/orders" className="flex items-center gap-1.5 transition-colors hover:text-primary">
                  <Icon name="arrow_back" className="text-[16px]" />
                  <span>{t('pages.orderDetail.backToOrders')}</span>
                </Link>
                <span className="text-outline-variant">/</span>
                <span>{t('pages.orderDetail.breadcrumbSales')}</span>
                <span className="text-outline-variant">/</span>
                <span className="font-medium text-on-surface">{t('pages.orderDetail.orderRef').replace('{{id}}', shortId)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface">{t('pages.orderDetail.orderRef').replace('{{id}}', shortId)}</h1>
                <Menu position="bottom-start" shadow="md">
                  <Menu.Target>
                    <button
                      type="button"
                      title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.changePaymentStatus')}
                      disabled={isFinal}
                      className="rounded-full transition-opacity enabled:cursor-pointer disabled:cursor-not-allowed"
                    >
                      <StatusPill label={paymentMetaLabel} tone={paymentMeta.tone} />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {paymentStatuses.map((status) => (
                      <Menu.Item
                        key={status.value}
                        disabled={status.value === order.paymentStatus}
                        onClick={() => updatePaymentStatus.mutate(status.value)}
                      >
                        {t(status.labelKey)}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
                <Menu position="bottom-start" shadow="md">
                  <Menu.Target>
                    <button
                      type="button"
                      title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.changeOrderStatus')}
                      disabled={isFinal}
                      className="rounded-full transition-opacity enabled:cursor-pointer disabled:cursor-not-allowed"
                    >
                      <StatusPill label={orderMetaLabel} tone={orderMeta.tone} pulse={orderMeta.pulse} />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {orderStatuses.map((status) => (
                      <Menu.Item
                        key={status.value}
                        disabled={status.value === order.status}
                        onClick={() => handleStatusChange(status.value)}
                      >
                        {t(status.labelKey)}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
                <span className="ml-1 font-body-sm text-body-sm text-on-surface-variant">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="secondary"
                icon="receipt"
                onClick={() => window.print()}
                title={t('pages.orderDetail.printTitle')}
              >
                {t('pages.orderDetail.printButton')}
              </Button>
              <Button
                variant="secondary"
                icon="assignment_return"
                onClick={openRefund}
                disabled={isFinal}
                title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.refundOrder')}
              >
                {t('pages.orderDetail.refundOrder')}
              </Button>
              <Button
                variant="danger"
                icon="cancel"
                onClick={openCancel}
                disabled={isFinal}
                title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.cancelOrder')}
              >
                {t('pages.orderDetail.cancelOrder')}
              </Button>
            </div>
          </div>

          {(order.cancellationReason || order.refundReason) && (
            <div className="flex flex-col gap-2">
              {order.cancellationReason && (
                <div className="flex items-start gap-2 rounded-lg bg-error-container/60 px-4 py-3 font-body-sm text-body-sm text-on-error-container">
                  <Icon name="cancel" className="text-[18px]" />
                  <span>
                    <strong>{t('pages.orderDetail.cancellationReasonLabel')}</strong> {order.cancellationReason} —{' '}
                    {formatDateTime(order.cancelledAt)}
                  </span>
                </div>
              )}
              {order.refundReason && (
                <div className="flex items-start gap-2 rounded-lg bg-error-container/60 px-4 py-3 font-body-sm text-body-sm text-on-error-container">
                  <Icon name="assignment_return" className="text-[18px]" />
                  <span>
                    <strong>{t('pages.orderDetail.refundReasonLabel')}</strong> {order.refundReason} — {formatDateTime(order.refundedAt)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Main Asymmetric Grid */}
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Primary Operational Column (8 cols) */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              {/* Items Card */}
              <Card className="flex flex-col gap-5">
                <SectionTitle
                  icon="shopping_bag"
                  title={t('pages.orderDetail.itemsTitle')}
                  actions={
                    <span className="font-label-sm text-label-sm font-numeric-tabular text-on-surface-variant">
                      {t(order.items.length === 1 ? 'pages.orderDetail.itemsTotalSingular' : 'pages.orderDetail.itemsTotalPlural').replace(
                        '{{count}}',
                        String(order.items.length),
                      )}
                    </span>
                  }
                />
                {order.items.length === 0 ? (
                  <EmptyState
                    icon="shopping_bag"
                    title={t('pages.orderDetail.emptyItemsTitle')}
                    description={t('pages.orderDetail.emptyItemsDescription')}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                          <th className="rounded-l-lg px-4 py-3">{t('pages.orderDetail.columnProduct')}</th>
                          <th className="px-3 py-3">{t('pages.orderDetail.columnProductionStatus')}</th>
                          <th className="px-3 py-3 text-center">{t('pages.orderDetail.columnQuantity')}</th>
                          <th className="px-3 py-3 text-right">{t('pages.orderDetail.columnUnitPrice')}</th>
                          <th className="rounded-r-lg px-4 py-3 text-right">{t('pages.orderDetail.columnTotal')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => {
                          const productionMeta = PRODUCTION_STATUS_META[item.productionStatus] ?? {
                            labelKey: '',
                            tone: 'neutral' as StatusTone,
                          };
                          const variant = getItemVariant(item);
                          return (
                            <tr
                              key={item.id}
                              className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low/40"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3.5">
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container shadow-sm">
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Icon name="checkroom" className="text-[22px] text-on-surface-variant" />
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                                      {getItemName(item, t)}
                                    </span>
                                    {variant.label && (
                                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                                        {variant.label}
                                      </span>
                                    )}
                                    {variant.sku && (
                                      <span className="mt-0.5 font-label-sm text-label-sm font-numeric-tabular text-outline">
                                        {t('pages.orderDetail.skuPrefix').replace('{{sku}}', variant.sku)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4">
                                <div className="flex flex-col gap-1.5">
                                  <StatusPill
                                    label={productionMeta.labelKey ? t(productionMeta.labelKey) : item.productionStatus}
                                    tone={productionMeta.tone}
                                    pulse={productionMeta.pulse}
                                  />
                                  <Select
                                    value={item.productionStatus}
                                    disabled={isFinal || updateProductionStatus.isPending}
                                    title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.productionStageTitle')}
                                    onChange={(event) => {
                                      const value = event.currentTarget.value;
                                      if (value && value !== item.productionStatus) {
                                        updateProductionStatus.mutate({ itemId: item.id, status: value });
                                      }
                                    }}
                                    className="w-fit"
                                  >
                                    {productionStages.map((stage) => (
                                      <option key={stage.value} value={stage.value}>
                                        {t(stage.labelKey)}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                              </td>
                              <td className="px-3 py-4 text-center font-numeric-tabular text-body-md text-on-surface">
                                {item.quantity}
                              </td>
                              <td className="px-3 py-4 text-right font-numeric-tabular text-body-md text-on-surface">
                                {formatPrice(item.unitPrice)}
                              </td>
                              <td className="px-4 py-4 text-right font-numeric-tabular text-headline-sm font-semibold text-on-surface">
                                {formatPrice(item.unitPrice * item.quantity)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Logistics & Shipping Card */}
              <Card className="flex flex-col gap-5">
                <SectionTitle
                  icon="local_shipping"
                  title={t('pages.orderDetail.logisticsTitle')}
                  actions={<StatusPill label={shipmentBadge.labelKey ? t(shipmentBadge.labelKey) : (activeShipment?.status ?? '-')} tone={shipmentBadge.tone} />}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={t('pages.orderDetail.carrierLabel')}>
                    <Select
                      value={carrier}
                      disabled={isFinal}
                      title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.carrierLabel')}
                      onChange={(event) => setCarrier(event.currentTarget.value)}
                    >
                      <option value="">{t('pages.orderDetail.carrierPlaceholder')}</option>
                      {COURIERS.map((courier) => (
                        <option key={courier.value} value={courier.value}>
                          {t(courier.labelKey)}
                        </option>
                      ))}
                      {carrier && !COURIERS.some((courier) => courier.value === carrier) && (
                        <option value={carrier}>{carrier}</option>
                      )}
                    </Select>
                  </Field>
                  <Field label={t('pages.orderDetail.deliveryStatus')}>
                    <Select
                      value={activeShipment?.status ?? ''}
                      disabled={isFinal || !activeShipment || updateShipmentStatus.isPending}
                      title={
                        activeShipment
                          ? t('pages.orderDetail.latestShipmentStatusTitle')
                          : t('pages.orderDetail.noShipmentStatusTitle')
                      }
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        if (activeShipment && value && value !== activeShipment.status) {
                          updateShipmentStatus.mutate({ shipmentId: activeShipment.id, status: value });
                        }
                      }}
                    >
                      {!activeShipment && <option value="">{t('pages.orderDetail.noShipmentRegistered')}</option>}
                      {Object.entries(SHIPMENT_STATUS_META).map(([value, meta]) => (
                        <option key={value} value={value}>
                          {t(meta.labelKey)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('pages.orderDetail.trackingLabel')} className="md:col-span-2">
                    <div className="flex gap-2">
                      <Input
                        icon="barcode_scanner"
                        className="flex-1"
                        value={trackingNumber}
                        disabled={isFinal}
                        placeholder={t('pages.orderDetail.trackingPlaceholder')}
                        onChange={(event) => setTrackingNumber(event.currentTarget.value)}
                      />
                      <Button
                        icon="send"
                        className="shrink-0"
                        onClick={() => updateTracking.mutate()}
                        disabled={isFinal || updateTracking.isPending}
                        title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.saveTrackingTitle')}
                      >
                        {t('pages.orderDetail.saveTrackingButton')}
                      </Button>
                    </div>
                  </Field>
                  {trackingUrlDisplay && (
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3.5 text-on-surface-variant md:col-span-2">
                      <div className="flex min-w-0 items-center gap-2 font-body-sm text-body-sm">
                        <Icon name="link" className="text-[18px] text-primary" />
                        <span className="truncate">{trackingUrlDisplay}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(trackingUrlDisplay, t('pages.orderDetail.trackingUrlCopied'))}
                        className="flex shrink-0 items-center gap-1 font-label-sm text-label-sm font-semibold text-primary hover:underline"
                      >
                        <Icon name="content_copy" className="text-[16px]" />
                        {t('pages.orderDetail.copy')}
                      </button>
                    </div>
                  )}
                </div>

                {shipmentRecords.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-4">
                    <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                      {t('pages.orderDetail.registeredShipments')}
                    </span>
                    <div className="flex flex-col gap-2">
                      {shipmentRecords.map((shipment) => (
                        <div
                          key={shipment.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3.5 py-2.5"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="font-label-md text-label-md font-medium text-on-surface">
                              {shipment.carrier}
                            </span>
                            <span className="font-label-sm text-label-sm font-numeric-tabular text-on-surface-variant">
                              {shipment.trackingNumber} • {formatShortDate(shipment.deliveredAt ?? shipment.shippedAt)}
                            </span>
                            {shipment.notes && (
                              <span className="mt-0.5 truncate font-body-sm text-body-sm text-on-surface-variant/80">
                                {shipment.notes}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {shipment.trackingUrl && (
                              <a
                                href={shipment.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t('pages.orderDetail.openTracking')}
                                className="flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                              >
                                <Icon name="open_in_new" className="text-[18px]" />
                              </a>
                            )}
                            <Select
                              value={shipment.status}
                              disabled={isFinal || updateShipmentStatus.isPending}
                              onChange={(event) => {
                                const value = event.currentTarget.value;
                                if (value && value !== shipment.status) {
                                  updateShipmentStatus.mutate({ shipmentId: shipment.id, status: value });
                                }
                              }}
                              className="w-44"
                            >
                              {Object.entries(SHIPMENT_STATUS_META).map(([value, meta]) => (
                                <option key={value} value={value}>
                                  {t(meta.labelKey)}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canCreateShipment && (
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      icon="add_box"
                      onClick={openCreateShipment}
                      disabled={isFinal}
                      title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.registerShipmentTitle')}
                    >
                      {t('pages.orderDetail.registerShipment')}
                    </Button>
                  </div>
                )}
              </Card>

              {/* Internal Operations & Operator Assignee */}
              <Card className="flex flex-col gap-5">
                <SectionTitle
                  icon="assignment_ind"
                  title={t('pages.orderDetail.operatorNotesTitle')}
                  actions={<span className="font-label-sm text-label-sm text-outline">{t('pages.orderDetail.teamVisibility')}</span>}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={t('pages.orderDetail.operatorField')} className="md:col-span-2">
                    <div className="flex items-center gap-3">
                      <Select
                        className="flex-1"
                        value={assigneeId ?? ''}
                        disabled={isFinal}
                        title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.operatorTitle')}
                        onChange={(event) => setAssigneeId(event.currentTarget.value || null)}
                      >
                        <option value="">{t('pages.orderDetail.unassigned')}</option>
                        {assigneeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                      <Button
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => assignOrder.mutate()}
                        disabled={isFinal || assignOrder.isPending}
                        title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.assignOperatorTitle')}
                      >
                        {t('pages.orderDetail.assign')}
                      </Button>
                    </div>
                  </Field>
                  <Field label={t('pages.orderDetail.internalNotesLabel')} className="md:col-span-2">
                    <Textarea
                      value={adminNotes}
                      disabled={isFinal}
                      onChange={(event) => setAdminNotes(event.currentTarget.value)}
                      placeholder={t('pages.orderDetail.internalNotesPlaceholder')}
                      rows={3}
                    />
                    <div className="mt-1 flex justify-end">
                      <Button
                        onClick={() => updateNotes.mutate()}
                        disabled={isFinal || updateNotes.isPending}
                        title={isFinal ? t('pages.orderDetail.orderFinalized') : t('pages.orderDetail.saveNotes')}
                      >
                        {t('pages.orderDetail.saveNotes')}
                      </Button>
                    </div>
                  </Field>
                </div>
              </Card>

              {/* Audit Timeline Card */}
              <Card className="flex flex-col gap-5">
                <SectionTitle
                  icon="history"
                  title={t('pages.orderDetail.timelineTitle')}
                  actions={
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {t('pages.orderDetail.eventsRegistered').replace('{{count}}', String(timeline?.data.length ?? 0))}
                    </span>
                  }
                />
                {!timeline || timeline.data.length === 0 ? (
                  <EmptyState
                    icon="history"
                    title={t('pages.orderDetail.emptyTimelineTitle')}
                    description={t('pages.orderDetail.emptyTimelineDescription')}
                  />
                ) : (
                  <div className="relative space-y-6 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-[2px] before:bg-surface-container">
                    {timeline.data.map((entry) => (
                      <div key={entry.id} className="relative flex items-start gap-4">
                        <span
                          className={`absolute -left-6 top-1 h-4 w-4 rounded-full shadow-sm ${getTimelineDot(entry.action)}`}
                        />
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-label-md text-label-md font-semibold text-on-surface">
                              {actionLabelKeys[entry.action] ? t(actionLabelKeys[entry.action]) : entry.action}
                            </span>
                            <span className="font-label-sm text-label-sm font-numeric-tabular text-outline">
                              {formatShortDate(entry.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                            {entry.user
                              ? `${[entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ') || entry.user.email} (${entry.user.email})`
                              : t('pages.orderDetail.systemUser')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Secondary Lateral Column: Customer, Delivery, Financial (4 cols) */}
            <div className="flex flex-col gap-6 lg:col-span-4">
              {/* Customer Profile Card */}
              <Card className="flex flex-col gap-5">
                <SectionTitle
                  title={t('pages.orderDetail.customerTitle')}
                  actions={
                    <Link
                      href={`/users/${order.user.id}`}
                      className="font-label-sm text-label-sm font-semibold text-primary hover:underline"
                    >
                      {t('pages.orderDetail.viewProfile')}
                    </Link>
                  }
                />
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-headline-sm text-headline-sm font-bold text-on-primary">
                    {initials}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-label-md text-label-md font-semibold text-on-surface">
                        {customerName}
                      </span>
                      {customerUser?.emailVerified && (
                        <Icon name="verified" className="text-[16px] text-emerald-600" />
                      )}
                    </div>
                    {customerUser && (
                      <span className="font-label-sm text-label-sm text-outline">
                        {t('pages.orderDetail.customerSince').replace('{{year}}', String(new Date(customerUser.createdAt).getFullYear()))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex flex-col">
                    <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                      {t('pages.orderDetail.emailLabel')}
                    </span>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate font-body-sm text-body-sm font-medium text-on-surface">
                        {order.user.email}
                      </span>
                      <button
                        type="button"
                        title={t('pages.orderDetail.copyEmailTitle')}
                        onClick={() => copyToClipboard(order.user.email, t('pages.orderDetail.emailCopied'))}
                        className="shrink-0 text-on-surface-variant transition-colors hover:text-primary"
                      >
                        <Icon name="content_copy" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                  {phone && (
                    <div className="flex flex-col">
                      <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                        {t('pages.orderDetail.phoneLabel')}
                      </span>
                      <span className="mt-0.5 font-body-sm text-body-sm font-numeric-tabular text-on-surface">
                        {phone}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                      {t('pages.orderDetail.purchaseHistory')}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-surface-container px-2 py-0.5 font-numeric-tabular text-label-sm text-on-surface">
                        {t(purchaseCount === 1 ? 'pages.orderDetail.purchasesSingular' : 'pages.orderDetail.purchasesPlural').replace('{{count}}', String(purchaseCount))}
                      </span>
                      <span className="font-body-sm text-body-sm font-numeric-tabular text-on-surface-variant">
                        {t('pages.orderDetail.ltvLabel')} {formatPrice(lifetimeValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Delivery Address Card */}
              <Card className="flex flex-col gap-4">
                <SectionTitle
                  title={t('pages.orderDetail.deliveryAddress')}
                  actions={<Icon name="home_pin" className="text-[20px] text-on-surface-variant" />}
                />
                {order.shippingAddress ? (
                  <div className="space-y-1 rounded-lg bg-surface-container-low p-3.5">
                    <p className="font-label-md text-label-md font-semibold text-on-surface">
                      {order.shippingAddress.fullName}
                    </p>
                    <p className="font-body-sm leading-snug text-body-sm text-on-surface-variant">
                      {order.shippingAddress.addressLine1}
                      {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
                      <br />
                      {order.shippingAddress.postalCode} — {order.shippingAddress.city},{' '}
                      {order.shippingAddress.state}
                      <br />
                      {order.shippingAddress.country}
                    </p>
                  </div>
                ) : (
                  <EmptyState
                    icon="home_pin"
                    title={t('pages.orderDetail.noAddress')}
                    description={t('pages.orderDetail.noAddressDescription')}
                  />
                )}
                {customerNotes && (
                  <div className="flex flex-col gap-1">
                    <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                      {t('pages.orderDetail.receptionInstructions')}
                    </span>
                    <p className="rounded bg-surface-container-low/50 p-2.5 font-body-sm italic text-body-sm text-on-surface-variant">
                      &quot;{customerNotes}&quot;
                    </p>
                  </div>
                )}
                {/* Placeholder estático de mapa (sin integración real) */}
                <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-lg bg-surface-container-high shadow-inner">
                  <div className="absolute inset-0 bg-primary/10" />
                  <span className="relative flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface shadow-md">
                    <Icon name="pin_drop" className="text-[16px] text-error" />
                    {order.shippingAddress ? t('pages.orderDetail.cityCentral').replace('{{city}}', order.shippingAddress.city) : t('pages.orderDetail.location')}
                  </span>
                </div>
              </Card>

              {/* Financial Summary Card */}
              <Card className="flex flex-col gap-5">
                <SectionTitle
                  title={t('pages.orderDetail.financialSummary')}
                  actions={<StatusPill label={paymentMetaLabel} tone={paymentMeta.tone} withDot={false} />}
                />
                <div className="space-y-3 font-body-sm text-body-sm text-on-surface">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">{t('pages.orderDetail.subtotalItems')}</span>
                    <span className="font-numeric-tabular font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">
                      {t('pages.orderDetail.shippingCostLabel')}{order.carrier ? ` (${order.carrier})` : ''}
                    </span>
                    {order.shippingCost === 0 ? (
                      <span className="font-numeric-tabular font-medium text-emerald-600">{t('pages.orderDetail.freeOverThreshold')}</span>
                    ) : (
                      <span className="font-numeric-tabular font-medium">{formatPrice(order.shippingCost)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">{t('pages.orderDetail.discountsCoupons')}</span>
                    <span className="flex items-center gap-1.5 font-numeric-tabular text-on-surface-variant">
                      {order.discountAmount > 0 ? `-${formatPrice(order.discountAmount)}` : '$0'}
                      {order.coupon && (
                        <span className="rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-on-surface">
                          {order.coupon.code}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">{t('pages.orderDetail.taxesIncluded')}</span>
                    <span className="font-numeric-tabular font-medium">{formatPrice(taxAmount)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-surface-container pt-3">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{t('pages.orderDetail.totalPaid')}</span>
                    <span className="font-headline-lg text-headline-lg font-bold font-numeric-tabular text-on-surface">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>
                {latestPayment && (
                  <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-8 items-center justify-center rounded bg-surface-container-lowest shadow-sm">
                        <Icon name="credit_card" className="text-[18px] text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-medium text-on-surface">
                          {t('pages.orderDetail.paidWith').replace('{{provider}}', paymentProvider)}
                        </span>
                        <span className="font-label-sm text-label-sm font-numeric-tabular text-outline">
                          {t('pages.orderDetail.paymentRef').replace('{{id}}', latestPayment.id.slice(0, 14))}
                        </span>
                      </div>
                    </div>
                    {latestPayment.status === 'PAID' ? (
                      <Icon name="check_circle" className="text-[20px] text-emerald-600" />
                    ) : (
                      <StatusPill
                        label={
                          PAYMENT_STATUS_META[latestPayment.status]
                            ? t(PAYMENT_STATUS_META[latestPayment.status].labelKey)
                            : latestPayment.status
                        }
                        tone={PAYMENT_STATUS_META[latestPayment.status]?.tone ?? 'neutral'}
                        withDot={false}
                      />
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Print area (client-side, visible only when printing) */}
          <style>{`
            @media print {
              @page { margin: 12mm; }
              body * { visibility: hidden !important; }
              #order-print-area, #order-print-area * { visibility: visible !important; }
              #order-print-area {
                display: block !important;
                position: fixed !important;
                inset: 0 !important;
                z-index: 9999 !important;
                overflow: auto !important;
                background: #ffffff !important;
                padding: 24px !important;
              }
            }
          `}</style>
          <div id="order-print-area" className="hidden">
            <div className="flex flex-col gap-6 text-black">
              <div className="flex items-start justify-between border-b-2 border-black pb-4">
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-bold tracking-tight">NÖVA</p>
                  <p className="text-sm">{t('pages.orderDetail.printDocumentTitle')}</p>
                </div>
                <div className="flex flex-col items-end gap-1 text-sm">
                  <p className="font-semibold">Orden #{shortId}</p>
                  <p>{formatDateTime(order.createdAt)}</p>
                  <p>{t('pages.orderDetail.printStatus')} {orderMetaLabel}</p>
                  <p>{t('pages.orderDetail.printPayment')} {paymentMetaLabel}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{t('pages.orderDetail.printCustomer')}</p>
                  <p>{customerName || '-'}</p>
                  <p>{order.user.email}</p>
                  {phone && <p>{phone}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{t('pages.orderDetail.printDeliveryAddress')}</p>
                  {order.shippingAddress ? (
                    <>
                      <p>{order.shippingAddress.fullName}</p>
                      <p>
                        {order.shippingAddress.addressLine1}
                        {order.shippingAddress.addressLine2
                          ? `, ${order.shippingAddress.addressLine2}`
                          : ''}
                      </p>
                      <p>
                        {order.shippingAddress.postalCode} — {order.shippingAddress.city},{' '}
                        {order.shippingAddress.state}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                    </>
                  ) : (
                    <p>{t('pages.orderDetail.printNoAddress')}</p>
                  )}
                </div>
              </div>
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-2 pr-2">{t('pages.orderDetail.columnProduct')}</th>
                    <th className="px-2 py-2 text-center">{t('pages.orderDetail.columnQuantity')}</th>
                    <th className="px-2 py-2 text-right">{t('pages.orderDetail.columnUnitPrice')}</th>
                    <th className="py-2 pl-2 text-right">{t('pages.orderDetail.columnTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-neutral-300">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded object-cover"
                            />
                          )}
                          <span>{getItemName(item, t)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">{item.quantity}</td>
                      <td className="px-2 py-2 text-right">{formatPrice(item.unitPrice)}</td>
                      <td className="py-2 pl-2 text-right">{formatPrice(item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ml-auto flex w-64 flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span>{t('pages.orderDetail.printSubtotal')}</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('pages.orderDetail.printShipping')}</span>
                  <span>{order.shippingCost === 0 ? t('pages.orderDetail.free') : formatPrice(order.shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('pages.orderDetail.printDiscounts')}</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('pages.orderDetail.printTaxes')}</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-black pt-1 font-bold">
                  <span>{t('pages.orderDetail.printTotalPaid')}</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                {t('pages.orderDetail.printGenerated').replace('{{date}}', formatDateTime(new Date()))}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="receipt_long"
          title={t('pages.orderDetail.notFoundTitle')}
          description={t('pages.orderDetail.notFoundDescription')}
        />
      )}

      <AppModal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={t('pages.orderDetail.confirmTitle')}
        subtitle={t('pages.orderDetail.confirmSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmStatusChange} disabled={updateStatus.isPending}>
              {t('pages.orderDetail.confirm')}
            </Button>
          </>
        }
      >
        <p className="font-body-sm text-body-sm text-on-surface">
          {t('pages.orderDetail.confirmPrefix')}{' '}
          <strong>
            {t(orderStatuses.find((status) => status.value === pendingStatus)?.labelKey ?? '')}
          </strong>
          {t('pages.orderDetail.confirmSuffix')}
        </p>
      </AppModal>

      <AppModal
        opened={cancelOpened}
        onClose={closeCancel}
        title={t('pages.orderDetail.cancelOrder')}
        subtitle={t('pages.orderDetail.cancelSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeCancel}>
              {t('common.close')}
            </Button>
            <Button
              variant="danger"
              onClick={() => cancelOrder.mutate()}
              disabled={!reason || cancelOrder.isPending}
            >
              {cancelOrder.isPending ? t('pages.orderDetail.cancelling') : t('pages.orderDetail.cancelOrder')}
            </Button>
          </>
        }
      >
        <Field label={t('pages.orderDetail.cancellationReason')} required>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder={t('pages.orderDetail.cancellationReason')}
            rows={3}
          />
        </Field>
      </AppModal>

      <AppModal
        opened={refundOpened}
        onClose={closeRefund}
        title={t('pages.orderDetail.refundOrder')}
        subtitle={t('pages.orderDetail.refundSubtitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeRefund}>
              {t('common.close')}
            </Button>
            <Button
              variant="danger"
              onClick={() => refundOrder.mutate({ amount: refundAmount, refundReason: reason })}
              disabled={!reason || refundAmount <= 0 || refundOrder.isPending}
            >
              {refundOrder.isPending ? t('pages.orderDetail.refunding') : t('pages.orderDetail.refundOrder')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t('pages.orderDetail.refundAmount')} required>
            <Input
              type="number"
              value={refundAmount}
              onChange={(event) => setRefundAmount(Number(event.currentTarget.value))}
            />
          </Field>
          <Field label={t('pages.orderDetail.reasonLabel')} required>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.currentTarget.value)}
              placeholder={t('pages.orderDetail.refundReasonPlaceholder')}
              rows={3}
            />
          </Field>
        </div>
      </AppModal>

      <AppModal
        opened={createShipmentOpened}
        onClose={closeCreateShipment}
        title={t('pages.orderDetail.registerShipment')}
        subtitle={t('pages.orderDetail.registerShipmentSubtitle')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeCreateShipment}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="local_shipping"
              onClick={() => createShipment.mutate()}
              disabled={!newShipment.carrier || !newShipment.trackingNumber || createShipment.isPending}
            >
              {createShipment.isPending ? t('pages.orderDetail.registering') : t('pages.orderDetail.registerShipment')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('pages.orderDetail.carrierLabel')} required>
            <Select
              value={newShipment.carrier}
              onChange={(event) => setNewShipment((current) => ({ ...current, carrier: event.currentTarget.value }))}
            >
              <option value="">{t('pages.orderDetail.carrierPlaceholder')}</option>
              {COURIERS.map((courier) => (
                <option key={courier.value} value={courier.value}>
                  {t(courier.labelKey)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('pages.orderDetail.trackingNumberLabel')} required>
            <Input
              value={newShipment.trackingNumber}
              placeholder="AND-89472910-AR"
              onChange={(event) =>
                setNewShipment((current) => ({ ...current, trackingNumber: event.currentTarget.value }))
              }
            />
          </Field>
          <Field label={t('pages.orderDetail.trackingUrlLabel')} className="md:col-span-2">
            <Input
              value={newShipment.trackingUrl}
              placeholder="https://courier.example.com/track?123"
              onChange={(event) => setNewShipment((current) => ({ ...current, trackingUrl: event.currentTarget.value }))}
            />
          </Field>
          <Field label={t('pages.orderDetail.notesLabel')} className="md:col-span-2">
            <Textarea
              value={newShipment.notes}
              placeholder={t('pages.orderDetail.shipmentNotesPlaceholder')}
              rows={2}
              onChange={(event) => setNewShipment((current) => ({ ...current, notes: event.currentTarget.value }))}
            />
          </Field>
        </div>
      </AppModal>
    </>
  );
}
