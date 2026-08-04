'use client';

import {
  Button,
  Grid,
  GridCol,
  Group,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AdminShell } from '../../components/admin-shell';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useStoreConfig } from '../../providers/config-provider';

const AVAILABLE_TEMPLATES = [{ value: 'storefront', label: 'Storefront (actual)' }];

interface TemplateConfigFormValues {
  template: string;
  heroLayout: string;
  showMarquee: boolean;
  showIdentitySection: boolean;
  productCardVariant: string;
  headerVariant: string;
}

const webUrl = process.env.NEXT_PUBLIC_WEB_URL;

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const config = useStoreConfig();

  const { data: freshConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/store-config');
      return data;
    },
    initialData: config as unknown as Record<string, unknown>,
  });

  const templateConfig = (freshConfig?.templateConfig as Record<string, unknown>) ?? {};

  const form = useForm<TemplateConfigFormValues>({
    initialValues: {
      template: (freshConfig?.template as string) ?? 'storefront',
      heroLayout: (templateConfig.heroLayout as string) ?? 'centered',
      showMarquee: (templateConfig.showMarquee as boolean) ?? true,
      showIdentitySection: (templateConfig.showIdentitySection as boolean) ?? true,
      productCardVariant: (templateConfig.productCardVariant as string) ?? 'default',
      headerVariant: (templateConfig.headerVariant as string) ?? 'default',
    },
  });

  const [previewKey, setPreviewKey] = useState(0);

  const update = useMutation({
    mutationFn: async (values: TemplateConfigFormValues) => {
      const { error } = await apiClient.PATCH('/store-config', {
        body: {
          template: values.template,
          templateConfig: JSON.stringify({
            heroLayout: values.heroLayout,
            showMarquee: values.showMarquee,
            showIdentitySection: values.showIdentitySection,
            productCardVariant: values.productCardVariant,
            headerVariant: values.headerVariant,
          }),
        } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      setPreviewKey((k) => k + 1);
      notifySuccess({ title: 'Plantilla guardada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar plantilla', message: getApiErrorMessage(error) });
    },
  });

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Plantillas del storefront
      </Title>
      <Grid gap="xl">
        <GridCol span={{ base: 12, lg: 4 }}>
          <Paper p="md">
            <form onSubmit={form.onSubmit((values) => update.mutate(values))}>
              <Stack>
                <Select
                  label="Plantilla activa"
                  description="Selecciona la plantilla que verán los visitantes."
                  data={AVAILABLE_TEMPLATES}
                  {...form.getInputProps('template')}
                />

                <Title order={4} mt="md" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                  Configuración de la plantilla
                </Title>

                <Select
                  label="Diseño del hero"
                  data={[
                    { value: 'centered', label: 'Centrado' },
                    { value: 'split', label: 'Dividido' },
                    { value: 'minimal', label: 'Mínimo' },
                  ]}
                  {...form.getInputProps('heroLayout')}
                />

                <Select
                  label="Variante del header"
                  data={[
                    { value: 'default', label: 'Por defecto' },
                    { value: 'centered', label: 'Centrado' },
                    { value: 'minimal', label: 'Mínimo' },
                  ]}
                  {...form.getInputProps('headerVariant')}
                />

                <Select
                  label="Variante de tarjeta de producto"
                  data={[
                    { value: 'default', label: 'Por defecto' },
                    { value: 'minimal', label: 'Mínima' },
                  ]}
                  {...form.getInputProps('productCardVariant')}
                />

                <Switch
                  label="Mostrar marquee debajo del hero"
                  {...form.getInputProps('showMarquee', { type: 'checkbox' })}
                />

                <Switch
                  label="Mostrar sección de identidad de marca"
                  {...form.getInputProps('showIdentitySection', { type: 'checkbox' })}
                />

                <Button type="submit" loading={update.isPending}>
                  Guardar cambios
                </Button>
              </Stack>
            </form>
          </Paper>
        </GridCol>

        <GridCol span={{ base: 12, lg: 8 }}>
          <Paper p="md" h="100%">
            <Stack h="100%">
              <Group justify="space-between">
                <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                  Vista previa
                </Title>
                <Button variant="outline" size="xs" onClick={() => setPreviewKey((k) => k + 1)}>
                  Recargar
                </Button>
              </Group>
              {webUrl ? (
                <iframe
                  key={previewKey}
                  src={`${webUrl}?preview=${previewKey}`}
                  title="Vista previa del storefront"
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: '70vh',
                    border: '1px solid #E5E5E5',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              ) : (
                <Text c="dimmed" size="sm">
                  Configura <code>NEXT_PUBLIC_WEB_URL</code> para ver la vista previa.
                </Text>
              )}
            </Stack>
          </Paper>
        </GridCol>
      </Grid>
    </AdminShell>
  );
}
