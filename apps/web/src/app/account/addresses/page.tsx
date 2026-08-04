'use client';

import { Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AccountLayout } from '../../../components/account-layout';
import { EmptyState } from '../../../components/empty-state';
import { LoadingState } from '../../../components/loading-state';
import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';

interface AddressFormValues {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
}

export default function AddressesPage() {
  const queryClient = useQueryClient();

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/addresses');
      return data ?? [];
    },
  });

  const form = useForm<AddressFormValues>({
    initialValues: {
      label: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      phone: '',
    },
  });

  const create = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      const { error } = await apiClient.POST('/addresses', {
        body: { ...values, line2: values.line2 || undefined, phone: values.phone || undefined } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      notifySuccess({ title: 'Dirección guardada' });
      form.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar', message: getApiErrorMessage(error) });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/addresses/{id}', { params: { path: { id } } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      notifySuccess({ title: 'Dirección eliminada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al eliminar', message: getApiErrorMessage(error) });
    },
  });

  return (
    <AccountLayout>
      <Stack gap="xl">
        <Stack gap="xs">
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Direcciones
          </Text>
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            PUNTOS DE ENTREGA
          </Title>
        </Stack>

        <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <Stack gap="md">
            {isLoading ? (
              <LoadingState message="Cargando direcciones..." />
            ) : addresses?.length === 0 ? (
              <EmptyState title="Sin direcciones" description="No tenés direcciones guardadas." />
            ) : null}
            {addresses?.map((address) => (
              <Group key={address.id} justify="space-between" wrap="wrap" style={{ borderBottom: '1px solid rgba(13,13,13,0.2)', paddingBottom: 12 }}>
                <div>
                  <Text fw={500} style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 18 }}>
                    {address.label}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''} — {address.city}, {address.state},{' '}
                    {address.country} ({address.zipCode})
                  </Text>
                  {address.phone && (
                    <Text size="xs" c="dimmed">
                      {address.phone}
                    </Text>
                  )}
                </div>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => remove.mutate(address.id)}
                  loading={remove.isPending}
                >
                  Eliminar
                </Button>
              </Group>
            ))}
          </Stack>
        </div>

        <div style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <form onSubmit={form.onSubmit((values) => create.mutate(values))}>
            <Stack gap="md">
              <Text size="sm" fw={500} style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 18 }}>
                Añadir dirección
              </Text>
              <Group grow>
                <TextInput label="Nombre" placeholder="Casa, Oficina..." {...form.getInputProps('label')} styles={{ input: inputStyles }} />
                <TextInput label="Teléfono" placeholder="+595..." {...form.getInputProps('phone')} styles={{ input: inputStyles }} />
              </Group>
              <TextInput label="Dirección línea 1" placeholder="Calle y número" {...form.getInputProps('line1')} styles={{ input: inputStyles }} />
              <TextInput label="Dirección línea 2" placeholder="Apto, piso, etc." {...form.getInputProps('line2')} styles={{ input: inputStyles }} />
              <Group grow>
                <TextInput label="Ciudad" {...form.getInputProps('city')} styles={{ input: inputStyles }} />
                <TextInput label="Estado / Departamento" {...form.getInputProps('state')} styles={{ input: inputStyles }} />
              </Group>
              <Group grow>
                <TextInput label="País" {...form.getInputProps('country')} styles={{ input: inputStyles }} />
                <TextInput label="Código postal" {...form.getInputProps('zipCode')} styles={{ input: inputStyles }} />
              </Group>
              <Button
                type="submit"
                loading={create.isPending}
                style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Guardar dirección
              </Button>
            </Stack>
          </form>
        </div>
      </Stack>
    </AccountLayout>
  );
}

const inputStyles = {
  borderRadius: 0,
  borderColor: '#0d0d0d',
  backgroundColor: 'transparent',
};
