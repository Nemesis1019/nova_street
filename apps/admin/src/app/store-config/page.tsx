'use client';

import { type StorefrontConfig,StorefrontConfigSchema } from '@ecommerce/shared';
import { Button, ColorInput, NumberInput, Paper, Select, Stack, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AdminShell } from '../../components/admin-shell';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useStoreConfig } from '../../providers/config-provider';
import { StorefrontConfigSection } from './storefront-config-section';

interface StoreConfigFormValues {
  name: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  appearanceMode: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  borderColor: string;
  errorColor: string;
  successColor: string;
  warningColor: string;
  darkBackgroundColor: string;
  darkTextColor: string;
  heroImageUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  currencyCode: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableCustomDesigns: boolean;
  enableNewsletter: boolean;
  enableCatalogFilters: boolean;
  emailProvider: string;
  paymentProvider: string;
  shippingProvider: string;
  shippingBaseCost: number;
  freeShippingThreshold: number | '';
  shippingDiscountPercentage: number | '';
  shippingDiscountFixedAmount: number | '';
  storefrontConfig: StorefrontConfig;
}

export default function StoreConfigPage() {
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

  const form = useForm<StoreConfigFormValues>({
    initialValues: {
      name: (freshConfig?.name as string) ?? '',
      description: (freshConfig?.description as string) ?? '',
      logoUrl: (freshConfig?.logoUrl as string) ?? '',
      faviconUrl: (freshConfig?.faviconUrl as string) ?? '',
      primaryColor: (freshConfig?.primaryColor as string) ?? '#228be6',
      secondaryColor: (freshConfig?.secondaryColor as string) ?? '#15aabf',
      backgroundColor: (freshConfig?.backgroundColor as string) ?? '#ffffff',
      textColor: (freshConfig?.textColor as string) ?? '#1a1a1a',
      appearanceMode: (freshConfig?.appearanceMode as string) ?? 'LIGHT',
      surfaceColor: (freshConfig?.surfaceColor as string) ?? '#ffffff',
      surfaceMutedColor: (freshConfig?.surfaceMutedColor as string) ?? '#f6f3f2',
      borderColor: (freshConfig?.borderColor as string) ?? '#0d0d0d',
      errorColor: (freshConfig?.errorColor as string) ?? '#e03131',
      successColor: (freshConfig?.successColor as string) ?? '#2f9e44',
      warningColor: (freshConfig?.warningColor as string) ?? '#f76707',
      darkBackgroundColor: (freshConfig?.darkBackgroundColor as string) ?? '#0d0d0d',
      darkTextColor: (freshConfig?.darkTextColor as string) ?? '#f5f5f5',
      heroImageUrl: (freshConfig?.heroImageUrl as string) ?? '',
      heroTitle: (freshConfig?.heroTitle as string) ?? '',
      heroSubtitle: (freshConfig?.heroSubtitle as string) ?? '',
      contactEmail: (freshConfig?.contactEmail as string) ?? '',
      contactPhone: (freshConfig?.contactPhone as string) ?? '',
      currencyCode: (freshConfig?.currencyCode as string) ?? 'COP',
      maintenanceMode: (freshConfig?.maintenanceMode as boolean) ?? false,
      maintenanceMessage: (freshConfig?.maintenanceMessage as string) ?? '',
      enableCustomDesigns: (freshConfig?.enableCustomDesigns as boolean) ?? true,
      enableNewsletter: (freshConfig?.enableNewsletter as boolean) ?? true,
      enableCatalogFilters: (freshConfig?.enableCatalogFilters as boolean) ?? true,
      emailProvider: (freshConfig?.emailProvider as string) ?? 'smtp',
      paymentProvider: (freshConfig?.paymentProvider as string) ?? 'stripe',
      shippingProvider: (freshConfig?.shippingProvider as string) ?? 'flatRate',
      shippingBaseCost: (freshConfig?.shippingBaseCost as number) ?? 10_000,
      freeShippingThreshold: (freshConfig?.freeShippingThreshold as number) ?? '',
      shippingDiscountPercentage: (freshConfig?.shippingDiscountPercentage as number) ?? '',
      shippingDiscountFixedAmount: (freshConfig?.shippingDiscountFixedAmount as number) ?? '',
      storefrontConfig: StorefrontConfigSchema.parse((freshConfig?.storefrontConfig as Record<string, unknown>) ?? {}),
    },
  });

  const update = useMutation({
    mutationFn: async (values: StoreConfigFormValues) => {
      const { storefrontConfig, ...rest } = values;
      const body = {
        ...rest,
        freeShippingThreshold: values.freeShippingThreshold === '' ? undefined : values.freeShippingThreshold,
        shippingDiscountPercentage: values.shippingDiscountPercentage === '' ? undefined : values.shippingDiscountPercentage,
        shippingDiscountFixedAmount: values.shippingDiscountFixedAmount === '' ? undefined : values.shippingDiscountFixedAmount,
        storefrontConfig: JSON.stringify(storefrontConfig),
      };
      const { error } = await apiClient.PATCH('/store-config', {
        body: body as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      notifySuccess({ title: 'Configuración guardada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al guardar configuración', message: getApiErrorMessage(error) });
    },
  });

  return (
    <AdminShell>
      <Title order={1} mb="md">
        Configuración de la tienda
      </Title>
      <Paper p="md">
        <form onSubmit={form.onSubmit((values) => update.mutate(values))}>
          <Stack maw={600}>
            <TextInput label="Nombre" {...form.getInputProps('name')} />
            <TextInput label="Descripción" {...form.getInputProps('description')} />
            <TextInput label="Logo URL" {...form.getInputProps('logoUrl')} />
            <TextInput label="Favicon URL" {...form.getInputProps('faviconUrl')} />
            <TextInput label="Color primario" {...form.getInputProps('primaryColor')} />
            <TextInput label="Color secundario" {...form.getInputProps('secondaryColor')} />
            <TextInput label="Color de fondo" {...form.getInputProps('backgroundColor')} />
            <TextInput label="Color de texto" {...form.getInputProps('textColor')} />

            <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Tema y apariencia
            </Title>
            <Select
              label="Modo de apariencia"
              data={[
                { value: 'LIGHT', label: 'Claro' },
                { value: 'DARK', label: 'Oscuro' },
                { value: 'SYSTEM', label: 'Según sistema' },
              ]}
              {...form.getInputProps('appearanceMode')}
            />
            <ColorInput label="Color de superficie" {...form.getInputProps('surfaceColor')} />
            <ColorInput label="Color de superficie muted" {...form.getInputProps('surfaceMutedColor')} />
            <ColorInput label="Color de borde" {...form.getInputProps('borderColor')} />
            <ColorInput label="Color de error" {...form.getInputProps('errorColor')} />
            <ColorInput label="Color de éxito" {...form.getInputProps('successColor')} />
            <ColorInput label="Color de advertencia" {...form.getInputProps('warningColor')} />
            <ColorInput label="Fondo modo oscuro" {...form.getInputProps('darkBackgroundColor')} />
            <ColorInput label="Texto modo oscuro" {...form.getInputProps('darkTextColor')} />

            <TextInput label="Hero URL" {...form.getInputProps('heroImageUrl')} />
            <TextInput label="Hero título" {...form.getInputProps('heroTitle')} />
            <TextInput label="Hero subtítulo" {...form.getInputProps('heroSubtitle')} />
            <TextInput label="Email de contacto" {...form.getInputProps('contactEmail')} />
            <TextInput label="Teléfono de contacto" {...form.getInputProps('contactPhone')} />
            <TextInput label="Moneda (código 3 letras)" {...form.getInputProps('currencyCode')} />

            <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Funcionalidades del storefront
            </Title>
            <Switch
              label="Modo mantenimiento (solo admins ven el admin; el storefront muestra mensaje de mantenimiento)"
              {...form.getInputProps('maintenanceMode', { type: 'checkbox' })}
            />
            {form.values.maintenanceMode && (
              <TextInput
                label="Mensaje de mantenimiento"
                placeholder="Estamos realizando tareas de mantenimiento. Volvemos pronto."
                {...form.getInputProps('maintenanceMessage')}
              />
            )}
            <Switch label="Habilitar personalizador" {...form.getInputProps('enableCustomDesigns', { type: 'checkbox' })} />
            <Switch label="Habilitar newsletter" {...form.getInputProps('enableNewsletter', { type: 'checkbox' })} />
            <Switch label="Habilitar filtros de catálogo" {...form.getInputProps('enableCatalogFilters', { type: 'checkbox' })} />

            <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Personalización del storefront
            </Title>
            <StorefrontConfigSection form={form as never} />

            <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Proveedores
            </Title>
            <Select
              label="Proveedor de email"
              data={[
                { value: 'smtp', label: 'SMTP (Mailgun, Gmail, etc.)' },
                { value: 'resend', label: 'Resend' },
              ]}
              {...form.getInputProps('emailProvider')}
            />
            <Select
              label="Pasarela de pagos"
              data={[
                { value: 'stripe', label: 'Stripe' },
              ]}
              {...form.getInputProps('paymentProvider')}
            />

            <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Envío
            </Title>
            <Select
              label="Política de envío"
              data={[
                { value: 'flatRate', label: 'Tarifa plana' },
                { value: 'freeThreshold', label: 'Envío gratis desde cierto monto' },
                { value: 'discount', label: 'Descuento sobre tarifa base' },
              ]}
              {...form.getInputProps('shippingProvider')}
            />
            <NumberInput
              label="Costo base de envío"
              min={0}
              {...form.getInputProps('shippingBaseCost')}
            />
            {form.values.shippingProvider !== 'flatRate' && (
              <NumberInput
                label="Monto mínimo para envío gratis"
                min={0}
                {...form.getInputProps('freeShippingThreshold')}
              />
            )}
            {form.values.shippingProvider === 'discount' && (
              <>
                <NumberInput
                  label="Descuento porcentual sobre envío (%)"
                  min={0}
                  max={100}
                  {...form.getInputProps('shippingDiscountPercentage')}
                />
                <NumberInput
                  label="Descuento fijo sobre envío"
                  min={0}
                  {...form.getInputProps('shippingDiscountFixedAmount')}
                />
              </>
            )}

            <Button type="submit" loading={update.isPending}>
              Guardar cambios
            </Button>
          </Stack>
        </form>
      </Paper>
    </AdminShell>
  );
}
