'use client';

import { Badge, Button, Group, Modal, Pagination, Paper, Select, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CUSTOMER', label: 'Cliente' },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const limit = 10;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendOpened, { open: openSuspend, close: closeSuspend }] = useDisclosure(false);

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users', {
        params: {
          query: {
            page: String(page),
            limit: String(limit),
            search: search || undefined,
            role: roleFilter || undefined,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-user', detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const { data, error } = await apiClient.GET('/admin/users/{id}', {
        params: { path: { id: detailId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(detailId),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, roleName }: { id: string; roleName: string }) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/role', {
        params: { path: { id } },
        body: { roleName } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', detailId] });
      notifySuccess({ title: 'Rol actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar rol', message: getApiErrorMessage(error) });
    },
  });

  const suspendUser = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/suspend', {
        params: { path: { id } },
        body: { reason } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSuspendReason('');
      closeSuspend();
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', suspendUserId] });
      notifySuccess({ title: 'Usuario suspendido' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al suspender', message: getApiErrorMessage(error) });
    },
  });

  const unsuspendUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.PATCH('/admin/users/{id}/unsuspend', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', detailId] });
      notifySuccess({ title: 'Usuario reactivado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al reactivar', message: getApiErrorMessage(error) });
    },
  });

  const users = usersResponse?.data ?? [];
  const totalPages = usersResponse?.meta?.total ? Math.ceil(usersResponse.meta.total / limit) : 1;

  function handleOpenDetail(id: string) {
    setDetailId(id);
    openDetail();
  }

  function handleOpenSuspend(id: string) {
    setSuspendUserId(id);
    openSuspend();
  }

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Usuarios
      </Title>

      <Paper p="md">
        <Group mb="md" grow align="flex-end">
          <TextInput
            label="Buscar"
            placeholder="Nombre o email"
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            label="Rol"
            placeholder="Todos"
            data={roleOptions}
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
            clearable
          />
        </Group>

        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Rol</Table.Th>
                  <Table.Th>Verificado</Table.Th>
                  <Table.Th>Activo</Table.Th>
                  <Table.Th>Suspendido</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>{user.email}</Table.Td>
                    <Table.Td>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}</Table.Td>
                    <Table.Td>
                      <Badge color={user.role.name === 'ADMIN' ? 'dark' : 'gray'}>{user.role.name}</Badge>
                    </Table.Td>
                    <Table.Td>{user.emailVerified ? 'Sí' : 'No'}</Table.Td>
                    <Table.Td>{user.isActive ? 'Sí' : 'No'}</Table.Td>
                    <Table.Td>{user.isSuspended ? 'Sí' : 'No'}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="outline" onClick={() => handleOpenDetail(user.id)}>
                          Ver / Rol
                        </Button>
                        <Button
                          size="xs"
                          color={user.isSuspended ? 'green' : 'red'}
                          variant="outline"
                          onClick={() =>
                            user.isSuspended ? unsuspendUser.mutate(user.id) : handleOpenSuspend(user.id)
                          }
                        >
                          {user.isSuspended ? 'Reactivar' : 'Suspender'}
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {users.length === 0 && (
              <EmptyState title="No hay usuarios" description="No se encontraron usuarios con los filtros seleccionados." />
            )}

            <Pagination value={page} onChange={setPage} total={totalPages} mt="md" />
          </>
        )}
      </Paper>

      <Modal opened={detailOpened} onClose={closeDetail} title="Detalle de usuario" size="md">
        {detail && (
          <>
            <Text>
              <strong>Email:</strong> {detail.email}
            </Text>
            <Text>
              <strong>Nombre:</strong> {[detail.firstName, detail.lastName].filter(Boolean).join(' ') || '-'}
            </Text>
            <Text>
              <strong>Creado:</strong> {new Date(detail.createdAt).toLocaleString()}
            </Text>

            <Select
              label="Rol"
              data={roleOptions}
              value={detail.role.name}
              onChange={(value) => value && updateRole.mutate({ id: detail.id, roleName: value })}
              mt="md"
            />

            {detail.isSuspended && (
              <Text c="red" size="sm" mt="sm">
                Suspendido: {detail.suspendedReason || 'Sin motivo'} —{' '}
                {detail.suspendedAt ? new Date(detail.suspendedAt).toLocaleString() : '-'}
              </Text>
            )}

            <Button
              color={detail.isSuspended ? 'green' : 'red'}
              variant="outline"
              mt="md"
              fullWidth
              onClick={() =>
                detail.isSuspended ? unsuspendUser.mutate(detail.id) : handleOpenSuspend(detail.id)
              }
            >
              {detail.isSuspended ? 'Reactivar usuario' : 'Suspender usuario'}
            </Button>

            <Button component={Link} href={`/users/${detail.id}`} variant="light" mt="md" fullWidth>
              Abrir página de detalle
            </Button>
          </>
        )}
      </Modal>

      <Modal opened={suspendOpened} onClose={closeSuspend} title="Suspender usuario" centered size="sm">
        <Stack>
          <Text size="sm">Indicá el motivo de la suspensión. El usuario perderá el acceso inmediatamente.</Text>
          <Textarea
            value={suspendReason}
            onChange={(event) => setSuspendReason(event.currentTarget.value)}
            placeholder="Motivo de suspensión"
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeSuspend}>
              Cerrar
            </Button>
            <Button
              color="red"
              loading={suspendUser.isPending}
              onClick={() => {
                if (suspendUserId) {
                  suspendUser.mutate({ id: suspendUserId, reason: suspendReason });
                }
              }}
            >
              Suspender
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AdminShell>
  );
}
