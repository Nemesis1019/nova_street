'use client';

import type { components } from '@ecommerce/api-client';
import {
  Autocomplete,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { AccountLayout } from '../../../components/account-layout';
import { EmptyState } from '../../../components/empty-state';
import { LoadingState } from '../../../components/loading-state';
import { apiClient } from '../../../lib/api';
import {
  fetchCities,
  fetchCountries,
  fetchStates,
  geocodeAddress,
  getBrowserLocation,
  reverseGeocode,
} from '../../../lib/geo';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';

const AddressMap = dynamic(() => import('../../../components/address-map').then((mod) => mod.AddressMap), {
  ssr: false,
  loading: () => <div style={{ height: 240, border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }} />,
});

type Address = components['schemas']['AddressResponseDto'];

interface AddressFormValues {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}

const EMPTY_ADDRESS: AddressFormValues = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  country: '',
  zipCode: '',
  phone: '',
  isDefault: false,
};

interface Coords {
  latitude: number;
  longitude: number;
  displayName?: string;
}

const GEO_STALE_TIME = 24 * 60 * 60 * 1000;

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/addresses');
      return (data ?? []) as Address[];
    },
  });

  const hasAddresses = (addresses?.length ?? 0) > 0;

  const form = useForm<AddressFormValues>({
    initialValues: EMPTY_ADDRESS,
    validate: {
      label: (value: string) => (value.trim() ? null : 'Ingresá un nombre (Casa, Oficina...)'),
      line1: (value: string) => (value.trim() ? null : 'Ingresá la dirección'),
      country: (value: string) => (value.trim() ? null : 'Elegí el país'),
      state: (value: string) => (value.trim() ? null : 'Elegí el estado / departamento'),
      city: (value: string) => (value.trim() ? null : 'Elegí la ciudad'),
      zipCode: (value: string) => (value.trim() ? null : 'Ingresá el código postal'),
    },
  });

  /* ----------------------------- Datos geográficos ----------------------------- */

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['geo-countries'],
    staleTime: GEO_STALE_TIME,
    queryFn: fetchCountries,
  });

  const selectedCountry = form.values.country.trim();

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['geo-states', selectedCountry],
    enabled: selectedCountry.length >= 2,
    staleTime: GEO_STALE_TIME,
    queryFn: () => fetchStates(selectedCountry),
  });

  const selectedStateApiName = useMemo(
    () => states.find((state) => state.label === form.values.state)?.apiName ?? form.values.state.trim(),
    [states, form.values.state],
  );

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['geo-cities', selectedCountry, selectedStateApiName],
    enabled: selectedCountry.length >= 2 && selectedStateApiName.length >= 2,
    staleTime: GEO_STALE_TIME,
    queryFn: () => fetchCities(selectedCountry, selectedStateApiName),
  });

  /* ------------------------------- Mapa (auto) ------------------------------- */

  const addressQuery = [form.values.line1, form.values.city, form.values.state, form.values.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (!modalOpen || !form.values.city.trim() || !form.values.country.trim()) return;

    const timer = setTimeout(async () => {
      setGeocoding(true);
      try {
        const result = await geocodeAddress(addressQuery);
        if (result) setCoords(result);
      } catch {
        // Silencioso: el mapa es una ayuda, no bloquea el guardado.
      } finally {
        setGeocoding(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [modalOpen, addressQuery, form.values.city, form.values.country]);

  /* -------------------------------- Mutations -------------------------------- */

  const save = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      const common = {
        label: values.label,
        line1: values.line1,
        city: values.city,
        state: values.state,
        country: values.country,
        zipCode: values.zipCode,
        isDefault: values.isDefault || !hasAddresses,
      };

      if (editing) {
        const { error } = await apiClient.PATCH('/addresses/{id}', {
          params: { path: { id: editing.id } },
          body: {
            ...common,
            line2: values.line2,
            phone: values.phone,
          } as never,
        });
        if (error) throw error;
        return;
      }

      const { error } = await apiClient.POST('/addresses', {
        body: {
          ...common,
          line2: values.line2 || undefined,
          phone: values.phone || undefined,
        } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      notifySuccess({ title: editing ? 'Dirección actualizada' : 'Dirección guardada' });
      closeModal();
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

  /* --------------------------------- Modal ---------------------------------- */

  const openCreate = () => {
    form.setValues(EMPTY_ADDRESS);
    setEditing(null);
    setCoords(null);
    setModalOpen(true);
  };

  const openEdit = (address: Address) => {
    form.setValues({
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      state: address.state,
      country: address.country,
      zipCode: address.zipCode,
      phone: address.phone ?? '',
      isDefault: address.isDefault,
    });
    setEditing(address);
    setCoords(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setCoords(null);
    // Ojo: no usar `form.reset()` — Mantine toma los valores actuales como
    // snapshot al hacer resetDirty y el formulario quedaría con el estado anterior.
    form.setValues(EMPTY_ADDRESS);
  };

  /* ------------------------------- Ubicación -------------------------------- */

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { latitude, longitude } = await getBrowserLocation();
      const result = await reverseGeocode(latitude, longitude);

      if (result.country) form.setFieldValue('country', result.country);
      if (result.state) form.setFieldValue('state', result.state);
      if (result.city) form.setFieldValue('city', result.city);
      if (result.line1) form.setFieldValue('line1', result.line1);
      if (result.zipCode) form.setFieldValue('zipCode', result.zipCode);

      setCoords({ latitude, longitude, displayName: result.displayName });

      notifySuccess({
        title: 'Ubicación detectada',
        message: result.displayName ? result.displayName.slice(0, 140) : 'Revisá y completá los datos.',
      });
    } catch (error) {
      notifyError({
        title: 'No pudimos usar tu ubicación',
        message: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLocating(false);
    }
  };

  /* --------------------------------- Render --------------------------------- */

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
            <Group justify="space-between" wrap="wrap">
              <Text size="sm" fw={500} style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 18 }}>
                Mis direcciones
              </Text>
              <Button
                size="xs"
                onClick={openCreate}
                style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
              >
                + Agregar nueva dirección
              </Button>
            </Group>

            {isLoading ? (
              <LoadingState message="Cargando direcciones..." />
            ) : !hasAddresses ? (
              <Stack gap="md" align="center" py="md">
                <EmptyState
                  title="No hay direcciones registradas"
                  description="Agregá tu primer punto de entrega para agilizar tus compras."
                />
                <Button
                  onClick={openCreate}
                  style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
                >
                  Agregar dirección
                </Button>
              </Stack>
            ) : null}

            {addresses?.map((address) => (
              <Group
                key={address.id}
                justify="space-between"
                wrap="wrap"
                style={{ borderBottom: '1px solid rgba(13,13,13,0.2)', paddingBottom: 12 }}
              >
                <div>
                  <Group gap="xs" align="center">
                    <Text fw={500} style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 18 }}>
                      {address.label}
                    </Text>
                    {address.isDefault && (
                      <Badge variant="filled" color="dark" radius={0} style={{ fontSize: 10 }}>
                        Predeterminada
                      </Badge>
                    )}
                  </Group>
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
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => openEdit(address)}
                    style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
                  >
                    Ver detalle
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => remove.mutate(address.id)}
                    loading={remove.isPending && remove.variables === address.id}
                  >
                    Eliminar
                  </Button>
                </Group>
              </Group>
            ))}
          </Stack>
        </div>
      </Stack>

      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={
          <Text style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 22 }}>
            {editing ? 'EDITAR DIRECCIÓN' : 'AÑADIR DIRECCIÓN'}
          </Text>
        }
        size="lg"
        radius={0}
        centered
        styles={{
          content: { borderRadius: 0, border: '1px solid #0d0d0d', backgroundColor: '#fcf9f8' },
          header: { borderBottom: '1px solid #0d0d0d', backgroundColor: '#fcf9f8' },
          body: { backgroundColor: '#fcf9f8' },
        }}
      >
        <form onSubmit={form.onSubmit((values) => save.mutate(values))}>
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <Text size="xs" c="dimmed" maw={420}>
                Completá a mano (país → estado → ciudad) o usá tu ubicación actual. El mapa se actualiza solo.
              </Text>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => void useMyLocation()}
                loading={locating}
                style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Usar mi ubicación
              </Button>
            </Group>

            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Casa, Oficina..."
                {...form.getInputProps('label')}
                styles={{ input: inputStyles }}
              />
              <TextInput
                label="Teléfono"
                placeholder="+57 300 123 4567"
                {...form.getInputProps('phone')}
                styles={{ input: inputStyles }}
              />
            </Group>
            <TextInput
              label="Dirección línea 1"
              placeholder="Calle y número"
              {...form.getInputProps('line1')}
              styles={{ input: inputStyles }}
            />
            <TextInput
              label="Dirección línea 2"
              placeholder="Apto, piso, etc."
              {...form.getInputProps('line2')}
              styles={{ input: inputStyles }}
            />

            <Group grow align="flex-start">
              <Autocomplete
                label="País"
                placeholder={countriesLoading ? 'Cargando países...' : 'Escribí para buscar'}
                data={countries.map((country) => country.name)}
                limit={8}
                maxDropdownHeight={240}
                rightSection={countriesLoading ? <Loader size={14} color="dark" /> : undefined}
                {...form.getInputProps('country')}
                onChange={(value) => {
                  form.setFieldValue('country', value);
                  form.setFieldValue('state', '');
                  form.setFieldValue('city', '');
                }}
                styles={{ input: inputStyles, dropdown: dropdownStyles }}
              />
              <Autocomplete
                label="Estado / Departamento"
                placeholder={selectedCountry ? 'Escribí para buscar' : 'Elegí primero el país'}
                disabled={!selectedCountry}
                data={states.map((state) => state.label)}
                limit={8}
                maxDropdownHeight={240}
                rightSection={statesLoading ? <Loader size={14} color="dark" /> : undefined}
                {...form.getInputProps('state')}
                onChange={(value) => {
                  form.setFieldValue('state', value);
                  form.setFieldValue('city', '');
                }}
                styles={{ input: inputStyles, dropdown: dropdownStyles }}
              />
            </Group>

            <Group grow align="flex-start">
              <Autocomplete
                label="Ciudad"
                placeholder={form.values.state ? 'Escribí para buscar' : 'Elegí primero el estado'}
                disabled={!form.values.state.trim()}
                data={cities}
                limit={8}
                maxDropdownHeight={240}
                rightSection={citiesLoading ? <Loader size={14} color="dark" /> : undefined}
                {...form.getInputProps('city')}
                styles={{ input: inputStyles, dropdown: dropdownStyles }}
              />
              <TextInput label="Código postal" {...form.getInputProps('zipCode')} styles={{ input: inputStyles }} />
            </Group>

            <div>
              {coords ? (
                <AddressMap
                  latitude={coords.latitude}
                  longitude={coords.longitude}
                  label={geocoding ? 'Buscando dirección...' : coords.displayName?.slice(0, 120)}
                />
              ) : (
                <div
                  style={{
                    padding: '24px 16px',
                    border: '1px dashed rgba(13,13,13,0.35)',
                    backgroundColor: '#f6f3f2',
                    textAlign: 'center',
                  }}
                >
                  <Text size="xs" c="dimmed">
                    {geocoding
                      ? 'Buscando la dirección en el mapa...'
                      : 'Completá país y ciudad (o usá tu ubicación) para verla en el mapa.'}
                  </Text>
                </div>
              )}
            </div>

            {hasAddresses && (
              <Checkbox
                label="Usar como dirección predeterminada"
                {...form.getInputProps('isDefault', { type: 'checkbox' })}
              />
            )}

            <Group justify="flex-end" gap="sm">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={save.isPending}
                style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
              >
                {editing ? 'Guardar cambios' : 'Guardar dirección'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </AccountLayout>
  );
}

const inputStyles = {
  border: '1px solid #0d0d0d',
  borderRadius: 0,
  backgroundColor: 'transparent',
};

const dropdownStyles = {
  borderRadius: 0,
  border: '1px solid #0d0d0d',
};
