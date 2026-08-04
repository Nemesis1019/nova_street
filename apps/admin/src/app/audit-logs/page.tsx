'use client';

import { Button, Group, Paper, Table, TextInput, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { apiClient } from '../../lib/api';

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function AuditLogsPage() {
  const [entity, setEntity] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');

  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', entity, entityId, action],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/audit-logs', {
        params: {
          query: {
            entity: entity || undefined,
            entityId: entityId || undefined,
            action: action || undefined,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const logs = logsResponse?.data ?? [];

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Auditoría
      </Title>

      <Paper p="md">
        <Group mb="md" grow align="flex-end">
          <TextInput
            label="Entidad"
            placeholder="Order, User, ProductVariant..."
            value={entity}
            onChange={(event) => setEntity(event.currentTarget.value)}
          />
          <TextInput
            label="ID de entidad"
            placeholder="uuid"
            value={entityId}
            onChange={(event) => setEntityId(event.currentTarget.value)}
          />
          <TextInput
            label="Acción"
            placeholder="UPDATE_STATUS, SUSPEND_USER..."
            value={action}
            onChange={(event) => setAction(event.currentTarget.value)}
          />
        </Group>

        {isLoading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <EmptyState title="Sin registros" description="No se encontraron eventos de auditoría." />
        ) : (
          <Table withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Acción</Table.Th>
                <Table.Th>Entidad</Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th>Usuario</Table.Th>
                <Table.Th>Cambios</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>{formatDate(log.createdAt)}</Table.Td>
                  <Table.Td>{log.action}</Table.Td>
                  <Table.Td>{log.entity}</Table.Td>
                  <Table.Td>{log.entityId.slice(0, 8)}...</Table.Td>
                  <Table.Td>
                    {log.user
                      ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email
                      : 'Sistema'}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => {
                         
                        alert(JSON.stringify({ before: log.before, after: log.after }, null, 2));
                      }}
                    >
                      Ver
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminShell>
  );
}
