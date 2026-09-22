'use client';

import {
  Badge,
  Button,
  Group,
  Image,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { LoginForm } from '../../components/login-form';
import { apiClient } from '../../lib/api';
import { getAccessToken } from '../../lib/auth';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

const statusOptions = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING_REVIEW', label: 'Pendiente' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'DRAFT', label: 'Borrador' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'gray',
  PENDING_REVIEW: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  PENDING_REVIEW: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

export default function CustomDesignsPage() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDesign, setSelectedDesign] = useState<{
    id: string;
    status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: designs, isLoading } = useQuery({
    queryKey: ['admin-custom-designs', statusFilter],
    queryFn: async () => {
      const { data } = await apiClient.GET('/custom-designs/admin/all', {
        params: {
          query: {
            limit: '100',
            status: statusFilter === 'ALL' ? undefined : statusFilter,
          },
        },
      });
      return data ?? { data: [], meta: { page: 1, limit: 20, total: 0 } };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
      reason?: string;
    }) => {
      const { error } = await apiClient.PATCH('/custom-designs/admin/{id}/status', {
        params: { path: { id } },
        body: { status, rejectionReason: reason },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custom-designs'] });
      notifySuccess({ title: 'Estado actualizado' });
      setSelectedDesign(null);
      setRejectionReason('');
    },
    onError: (err) => {
      notifyError({ title: 'Error', message: getApiErrorMessage(err) });
    },
  });

  if (!isClient) {
    return null;
  }

  if (!getAccessToken()) {
    return <LoginForm />;
  }

  const designList = designs?.data ?? [];

  const rows = designList.map((design) => (
    <Table.Tr key={design.id}>
      <Table.Td>
        {design.previewImageUrl ? (
          <Image
            src={design.previewImageUrl}
            alt="Preview"
            width={60}
            height={60}
            radius="sm"
            style={{ cursor: 'pointer', objectFit: 'cover' }}
            onClick={() => {
              setPreviewUrl(design.previewImageUrl ?? null);
              openPreview();
            }}
          />
        ) : (
          <Text size="sm" c="dimmed">
            Sin preview
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Badge color={statusColors[design.status] ?? 'gray'}>{statusLabels[design.status] ?? design.status}</Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={2} maw={200}>
          {design.rejectionReason ?? '-'}
        </Text>
      </Table.Td>
      <Table.Td>{design.color ?? '-'}</Table.Td>
      <Table.Td>{design.size ?? '-'}</Table.Td>
      <Table.Td>${design.surcharge.toFixed(2)}</Table.Td>
      <Table.Td>{new Date(design.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Button
            size="xs"
            variant="outline"
            disabled={design.status === 'APPROVED'}
            onClick={() => updateStatus.mutate({ id: design.id, status: 'APPROVED' })}
          >
            Aprobar
          </Button>
          <Button
            size="xs"
            color="red"
            variant="outline"
            disabled={design.status === 'REJECTED'}
            onClick={() => setSelectedDesign({ id: design.id, status: 'REJECTED' })}
          >
            Rechazar
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Diseños personalizados
      </Title>

      <Paper p="md">
        <Group mb="md" justify="space-between">
          <Select
            label="Estado"
            data={statusOptions}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value ?? 'ALL')}
            style={{ minWidth: 200 }}
          />
          <Text size="sm" c="dimmed">
            {designs?.meta?.total ?? designList.length} diseños
          </Text>
        </Group>

        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table withTableBorder striped highlightOnHover>
                <Table.Thead>
                <Table.Tr>
                  <Table.Th>Preview</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Motivo</Table.Th>
                  <Table.Th>Color</Table.Th>
                  <Table.Th>Talle</Table.Th>
                  <Table.Th>Recargo</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>

            {designList.length === 0 && (
              <EmptyState
                title="No hay diseños"
                description="No se encontraron diseños personalizados con el filtro seleccionado."
              />
            )}
          </>
        )}
      </Paper>

      <Modal
        opened={!!selectedDesign}
        onClose={() => {
          setSelectedDesign(null);
          setRejectionReason('');
        }}
        title="Rechazar diseño"
        centered
      >
        <Stack>
          <Text size="sm">Indicá el motivo del rechazo. Se enviará por email al cliente.</Text>
          <Textarea
            label="Motivo del rechazo"
            placeholder="El diseño contiene elementos que no podemos imprimir..."
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.currentTarget.value)}
            minRows={3}
            required
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setSelectedDesign(null);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              loading={updateStatus.isPending}
              disabled={!rejectionReason.trim()}
              onClick={() => {
                if (selectedDesign) {
                  updateStatus.mutate({ ...selectedDesign, reason: rejectionReason.trim() });
                }
              }}
            >
              Rechazar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={previewOpened} onClose={closePreview} title="Vista previa" centered size="lg">
        {previewUrl && (
          <Image
            src={previewUrl}
            alt="Vista previa del diseño"
            radius="md"
            style={{ width: '100%', objectFit: 'contain' }}
          />
        )}
      </Modal>
    </AdminShell>
  );
}
