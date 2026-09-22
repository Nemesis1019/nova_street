'use client';

import {
  Button,
  Group,
  Modal,
  NumberInput,
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
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

type ShippingOption = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  freeShippingThreshold?: number | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

interface FormValues {
  name: string;
  description: string;
  price: number;
  estimatedDaysMin: number | '';
  estimatedDaysMax: number | '';
  freeShippingThreshold: number | '';
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export default function ShippingOptionsPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<string | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      description: '',
      price: 0,
      estimatedDaysMin: '',
      estimatedDaysMax: '',
      freeShippingThreshold: '',
      isDefault: false,
      isActive: true,
      sortOrder: 0,
    },
  });

  const { data: options, isLoading } = useQuery({
    queryKey: ['admin-shipping-options'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/shipping-options/admin');
      return (data ?? []) as ShippingOption[];
    },
  });

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await apiClient.POST('/shipping-options/admin', {
        body: buildPayload(values) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      closeModal();
      notifySuccess({ title: 'Opción de envío creada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FormValues }) => {
      const { error } = await apiClient.PATCH('/shipping-options/admin/{id}', {
        params: { path: { id } },
        body: buildPayload(values) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      closeModal();
      notifySuccess({ title: 'Opción de envío actualizada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/shipping-options/admin/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-options'] });
      notifySuccess({ title: 'Opción de envío eliminada' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const closeModal = () => {
    setEditing(null);
    form.reset();
    close();
  };

  const handleEdit = (option: ShippingOption) => {
    setEditing(option.id);
    form.setValues({
      name: option.name,
      description: option.description ?? '',
      price: option.price,
      estimatedDaysMin: option.estimatedDaysMin ?? '',
      estimatedDaysMax: option.estimatedDaysMax ?? '',
      freeShippingThreshold: option.freeShippingThreshold ?? '',
      isDefault: option.isDefault,
      isActive: option.isActive,
      sortOrder: option.sortOrder,
    });
    open();
  };

  const handleSubmit = (values: FormValues) => {
    if (editing) {
      update.mutate({ id: editing, values });
    } else {
      create.mutate(values);
    }
  };

  if (isLoading) {
    return (
      <AdminShell>
        <LoadingState />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Opciones de envío
          </Title>
          <Button onClick={open} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Nueva opción
          </Button>
        </Group>

        {!options || options.length === 0 ? (
          <EmptyState title="Sin opciones de envío" description="No hay opciones de envío configuradas." />
        ) : (
          <Paper withBorder radius="md" p="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Entrega estimada</Table.Th>
                  <Table.Th>Envío gratis desde</Table.Th>
                  <Table.Th>Predeterminada</Table.Th>
                  <Table.Th>Activa</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {options.map((option) => (
                  <Table.Tr key={option.id}>
                    <Table.Td>{option.name}</Table.Td>
                    <Table.Td>{formatPrice(option.price)}</Table.Td>
                    <Table.Td>
                      {option.estimatedDaysMin ?? '-'} - {option.estimatedDaysMax ?? '-'} días
                    </Table.Td>
                    <Table.Td>{option.freeShippingThreshold ? formatPrice(option.freeShippingThreshold) : '-'}</Table.Td>
                    <Table.Td>{option.isDefault ? 'Sí' : 'No'}</Table.Td>
                    <Table.Td>{option.isActive ? 'Sí' : 'No'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap="xs" justify="flex-end">
                        <Button variant="subtle" size="xs" onClick={() => handleEdit(option)}>
                          Editar
                        </Button>
                        <Button variant="subtle" color="red" size="xs" onClick={() => remove.mutate(option.id)}>
                          Eliminar
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>

      <Modal opened={opened} onClose={closeModal} title={editing ? 'Editar opción' : 'Nueva opción'} size="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Nombre" required {...form.getInputProps('name')} />
            <Textarea label="Descripción" {...form.getInputProps('description')} />
            <NumberInput label="Precio" required min={0} {...form.getInputProps('price')} />
            <Group grow>
              <NumberInput label="Días estimados (mín)" min={0} {...form.getInputProps('estimatedDaysMin')} />
              <NumberInput label="Días estimados (máx)" min={0} {...form.getInputProps('estimatedDaysMax')} />
            </Group>
            <NumberInput
              label="Envío gratis desde (dejar vacío si no aplica)"
              min={0}
              {...form.getInputProps('freeShippingThreshold')}
            />
            <NumberInput label="Orden" {...form.getInputProps('sortOrder')} />
            <Switch label="Opción predeterminada" {...form.getInputProps('isDefault', { type: 'checkbox' })} />
            <Switch label="Activa" {...form.getInputProps('isActive', { type: 'checkbox' })} />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={create.isPending || update.isPending}>
                Guardar
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </AdminShell>
  );
}

function buildPayload(values: FormValues) {
  return {
    name: values.name,
    description: values.description || undefined,
    price: values.price,
    estimatedDaysMin: values.estimatedDaysMin === '' ? undefined : Number(values.estimatedDaysMin),
    estimatedDaysMax: values.estimatedDaysMax === '' ? undefined : Number(values.estimatedDaysMax),
    freeShippingThreshold: values.freeShippingThreshold === '' ? undefined : Number(values.freeShippingThreshold),
    isDefault: values.isDefault,
    isActive: values.isActive,
    sortOrder: values.sortOrder,
  };
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}
