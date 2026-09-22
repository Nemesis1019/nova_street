'use client';

import { Badge, Button, Paper, Stack, Table, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { allPermissions, permissionLabels } from '../../lib/permissions';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: rolesResponse, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/users/roles');
      if (error) throw error;
      return data;
    },
  });

  const updatePermissions = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }) => {
      const { error } = await apiClient.PATCH('/admin/users/roles/{id}/permissions', {
        params: { path: { id } },
        body: { permissions },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setEditingRoleId(null);
      notifySuccess({ title: 'Permisos actualizados' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar permisos', message: getApiErrorMessage(error) });
    },
  });

  const roles = rolesResponse?.data ?? [];

  function startEditing(role: { id: string; permissions: string[] }) {
    setEditingRoleId(role.id);
    setSelectedPermissions(role.permissions);
  }

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Roles y permisos
      </Title>

      <Paper p="md">
        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Rol</Table.Th>
                  <Table.Th>Descripción</Table.Th>
                  <Table.Th>Permisos</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {roles.map((role) => (
                  <Table.Tr key={role.id}>
                    <Table.Td>
                      <strong>{role.name}</strong>
                    </Table.Td>
                    <Table.Td>{role.description || '-'}</Table.Td>
                    <Table.Td>
                      {editingRoleId === role.id ? (
                        <Stack gap="xs">
                          {allPermissions.map((permission) => (
                            <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(permission)}
                                onChange={(event) => {
                                  setSelectedPermissions((prev) =>
                                    event.target.checked
                                      ? [...prev, permission]
                                      : prev.filter((p) => p !== permission),
                                  );
                                }}
                              />
                              <span>{permissionLabels[permission] || permission}</span>
                            </label>
                          ))}
                        </Stack>
                      ) : (
                        <Stack gap="xs" align="flex-start">
                          {role.permissions.length === 0 ? (
                            <Badge color="gray">Sin permisos</Badge>
                          ) : (
                            role.permissions.map((permission) => (
                              <Badge key={permission} color="blue" variant="light">
                                {permissionLabels[permission] || permission}
                              </Badge>
                            ))
                          )}
                        </Stack>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editingRoleId === role.id ? (
                        <Stack gap="xs">
                          <Button
                            size="xs"
                            onClick={() =>
                              updatePermissions.mutate({ id: role.id, permissions: selectedPermissions })
                            }
                            loading={updatePermissions.isPending}
                          >
                            Guardar
                          </Button>
                          <Button size="xs" variant="default" onClick={() => setEditingRoleId(null)}>
                            Cancelar
                          </Button>
                        </Stack>
                      ) : (
                        <Button size="xs" variant="outline" onClick={() => startEditing(role)}>
                          Editar permisos
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {roles.length === 0 && (
              <EmptyState title="No hay roles" description="No se encontraron roles en el sistema." />
            )}
          </>
        )}
      </Paper>
    </AdminShell>
  );
}
