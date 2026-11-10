'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { LoadingState } from '../../components/loading-state';
import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card, EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select } from '../../components/ui/input';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { StatusPill } from '../../components/ui/status-pill';
import { Switch } from '../../components/ui/switch';
import { uploadAsset } from '../../lib/assets';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { platformRequest } from '../../lib/platform-auth';

interface ColorOption {
  name: string;
  hex: string;
  imageUrl?: string | null;
  priceAdjustment: number;
}
interface SizeOption {
  name: string;
  priceAdjustment: number;
}
interface PrintZone {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  price: number;
  printMethod: 'DTG' | 'DTF' | 'SCREEN' | 'EMBROIDERY';
  printDpi: number;
  bleedMm: number;
  imageUrl?: string | null;
  maxWidthCm?: number | null;
  maxHeightCm?: number | null;
  allowText: boolean;
  allowImage: boolean;
  allowClipart: boolean;
}
interface QuantityTier {
  minQuantity: number;
  discountPercent: number;
}
interface PricingRules {
  perElement: number;
  textPerCharacter: number;
  setupFee: number;
  minPrice: number;
  quantityTiers: QuantityTier[];
}
interface DesignTemplate {
  id: string;
  name: string;
  garmentType: string;
  description: string | null;
  baseImageUrl: string;
  thumbnailUrl: string | null;
  model3dUrl: string | null;
  model3dRotationY: number;
  basePrice: number;
  colors: ColorOption[];
  sizes: SizeOption[];
  zones: PrintZone[];
  pricing: PricingRules;
  stockMode: string;
  productionLeadTimeDays: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type FormState = Omit<DesignTemplate, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY_FORM: FormState = {
  name: '',
  garmentType: 'Remera',
  description: '',
  baseImageUrl: '',
  thumbnailUrl: '',
  model3dUrl: '',
  model3dRotationY: 180,
  basePrice: 45000,
  colors: [{ name: 'Negro', hex: '#0d0d0d', priceAdjustment: 0 }],
  sizes: [{ name: 'S', priceAdjustment: 0 }],
  zones: [
    {
      key: 'front',
      label: 'Frente',
      x: 0.25,
      y: 0.2,
      width: 0.5,
      height: 0.6,
      price: 0,
      printMethod: 'DTG',
      printDpi: 300,
      bleedMm: 2,
      imageUrl: '',
      allowText: true,
      allowImage: true,
      allowClipart: true,
    },
  ],
  pricing: {
    perElement: 2500,
    textPerCharacter: 0,
    setupFee: 0,
    minPrice: 0,
    quantityTiers: [],
  },
  stockMode: 'MADE_TO_ORDER',
  productionLeadTimeDays: 7,
  isActive: true,
  sortOrder: 0,
};

function fromTemplate(template: DesignTemplate): FormState {
  return {
    name: template.name,
    garmentType: template.garmentType,
    description: template.description ?? '',
    baseImageUrl: template.baseImageUrl,
    thumbnailUrl: template.thumbnailUrl ?? '',
    model3dUrl: template.model3dUrl ?? '',
    model3dRotationY: template.model3dRotationY ?? 180,
    basePrice: template.basePrice,
    colors: template.colors ?? [],
    sizes: template.sizes ?? [],
    zones: (template.zones ?? []).map((zone) => ({
      ...zone,
      imageUrl: zone.imageUrl ?? '',
      maxWidthCm: zone.maxWidthCm ?? null,
      maxHeightCm: zone.maxHeightCm ?? null,
      allowText: zone.allowText !== false,
      allowImage: zone.allowImage !== false,
      allowClipart: zone.allowClipart !== false,
    })),
    pricing: {
      ...EMPTY_FORM.pricing,
      ...(template.pricing ?? {}),
      quantityTiers: template.pricing?.quantityTiers ?? [],
    },
    stockMode: template.stockMode ?? 'MADE_TO_ORDER',
    productionLeadTimeDays: template.productionLeadTimeDays ?? 7,
    isActive: template.isActive !== false,
    sortOrder: template.sortOrder ?? 0,
  };
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadAsset(file);
      onChange(asset.url);
      notifySuccess({ title: 'Imagen subida' });
    } catch (error) {
      notifyError({ title: 'No se pudo subir la imagen', message: getApiErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <Input value={value} placeholder="https://..." onChange={(event) => onChange(event.currentTarget.value)} />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant/50 px-2.5 py-2 font-label-sm text-label-sm hover:bg-surface-container-low">
          <Icon name={uploading ? 'progress_activity' : 'upload'} className={`text-[16px] ${uploading ? 'animate-spin' : ''}`} />
          {uploading ? 'Subiendo' : 'Subir'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => void upload(event.currentTarget.files?.[0])}
          />
        </label>
      </div>
      {value ? <img src={value} alt="" className="mt-2 h-24 w-full rounded-lg object-contain" /> : null}
    </Field>
  );
}

function Model3DField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadAsset(file, 'CUSTOM_DESIGN_ASSET');
      onChange(asset.url);
      notifySuccess({ title: 'Modelo 3D subido' });
    } catch (error) {
      notifyError({ title: 'No se pudo subir el modelo', message: getApiErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label="Modelo 3D (GLB/GLTF)" tooltip="Si se deja vacío se usa el modelo base de remera.">
      <div className="flex items-center gap-2">
        <Input value={value} placeholder="/models/tee-base.glb o https://.../remera.glb" onChange={(event) => onChange(event.currentTarget.value)} />
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant/50 px-2.5 py-2 font-label-sm text-label-sm hover:bg-surface-container-low">
          <Icon name={uploading ? 'progress_activity' : 'upload'} className={uploading ? 'animate-spin text-[16px]' : 'text-[16px]'} />
          {uploading ? 'Subiendo' : 'Subir GLB'}
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            className="hidden"
            disabled={uploading}
            onChange={(event) => void upload(event.currentTarget.files?.[0])}
          />
        </label>
      </div>
    </Field>
  );
}

export default function DesignTemplatesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DesignTemplate | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['admin-design-templates'],
    queryFn: () => platformRequest<DesignTemplate[]>('/admin/design-templates'),
  });

  const templates = templatesQuery.data ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        description: form.description?.trim() || null,
        thumbnailUrl: form.thumbnailUrl?.trim() || null,
        model3dUrl: form.model3dUrl?.trim() || null,
        colors: form.colors.map((color) => ({
          ...color,
          imageUrl: color.imageUrl?.trim() || undefined,
          priceAdjustment: Number(color.priceAdjustment) || 0,
        })),
        sizes: form.sizes.map((size) => ({
          ...size,
          priceAdjustment: Number(size.priceAdjustment) || 0,
        })),
        zones: form.zones.map((zone) => ({
          ...zone,
          imageUrl: zone.imageUrl?.trim() || undefined,
          price: Number(zone.price) || 0,
          x: numberValue(String(zone.x), 0),
          y: numberValue(String(zone.y), 0),
          width: numberValue(String(zone.width), 0.5),
          height: numberValue(String(zone.height), 0.6),
        })),
        pricing: {
          ...form.pricing,
          perElement: Number(form.pricing.perElement) || 0,
          textPerCharacter: Number(form.pricing.textPerCharacter) || 0,
          setupFee: Number(form.pricing.setupFee) || 0,
          minPrice: Number(form.pricing.minPrice) || 0,
          quantityTiers: form.pricing.quantityTiers.map((tier) => ({
            minQuantity: Number(tier.minQuantity) || 1,
            discountPercent: Number(tier.discountPercent) || 0,
          })),
        },
      };
      if (editingId) {
        return platformRequest(`/admin/design-templates/${editingId}`, { method: 'PATCH', body });
      }
      return platformRequest('/admin/design-templates', { method: 'POST', body });
    },
    onSuccess: () => {
      notifySuccess({ title: editingId ? 'Prenda actualizada' : 'Prenda creada' });
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      void queryClient.invalidateQueries({ queryKey: ['admin-design-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['design-templates'] });
    },
    onError: (error) => notifyError({ title: 'No se pudo guardar', message: getApiErrorMessage(error) }),
  });

  const archive = useMutation({
    mutationFn: (template: DesignTemplate) =>
      platformRequest(`/admin/design-templates/${template.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      notifySuccess({ title: 'Prenda eliminada o archivada' });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-design-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['design-templates'] });
    },
    onError: (error) => notifyError({ title: 'No se pudo eliminar', message: getApiErrorMessage(error) }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (template: DesignTemplate) => {
    setEditingId(template.id);
    setForm(fromTemplate(template));
    setModalOpen(true);
  };

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Catálogo' }, { label: 'Personalizador' }]}
        title="Prendas personalizables"
        subtitle="Definí tipos de prenda, colores, talles, zonas de estampado y reglas de precio del configurador."
        actions={
          <>
            <Button variant="secondary" icon="refresh" onClick={() => void templatesQuery.refetch()} disabled={templatesQuery.isFetching}>
              Actualizar
            </Button>
            <Button icon="add" onClick={openCreate}>
              Nueva prenda
            </Button>
          </>
        }
      />

      {templatesQuery.isLoading ? (
        <LoadingState />
      ) : templatesQuery.isError ? (
        <QueryError
          onRetry={() => void templatesQuery.refetch()}
          retrying={templatesQuery.isFetching}
          description={templatesQuery.error instanceof Error ? templatesQuery.error.message : undefined}
        />
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon="checkroom"
            title="Todavía no hay prendas personalizables"
            description="Creá la primera prenda, definí sus zonas de impresión y empezá a recibir diseños."
            action={<Button icon="add" onClick={openCreate}>Crear prenda</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col gap-4 p-0">
              <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-surface-container">
                {template.thumbnailUrl || template.baseImageUrl ? (
                  <img
                    src={template.thumbnailUrl ?? template.baseImageUrl}
                    alt={template.name}
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Icon name="checkroom" className="text-[48px] text-secondary" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 p-5 pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">{template.name}</h2>
                      <StatusPill
                        tone={template.isActive ? 'success' : 'neutral'}
                        label={template.isActive ? 'Activa' : 'Archivada'}
                      />
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{template.garmentType}</p>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface">{formatMoney(template.basePrice)}</span>
                </div>
                <div className="flex flex-wrap gap-3 font-label-sm text-label-sm text-on-surface-variant">
                  <span>{template.colors.length} colores</span>
                  <span>{template.sizes.length} talles</span>
                  <span>{template.zones.length} zonas</span>
                </div>
                <div className="flex items-center gap-2 border-t border-outline-variant/30 pt-3">
                  <Button variant="secondary" icon="edit" onClick={() => openEdit(template)}>
                    Editar
                  </Button>
                  <Button variant="ghost" icon="archive" onClick={() => setDeleteTarget(template)}>
                    Archivar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AppModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar prenda personalizable' : 'Nueva prenda personalizable'}
        subtitle="Los cambios aplican al editor y a la cotización del carrito."
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button icon="save" onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim() || !form.baseImageUrl.trim()}>
              {save.isPending ? 'Guardando...' : 'Guardar prenda'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              <Input value={form.name} onChange={(event) => update({ name: event.currentTarget.value })} placeholder="Remera oversized" />
            </Field>
            <Field label="Tipo de prenda" required>
              <Input value={form.garmentType} onChange={(event) => update({ garmentType: event.currentTarget.value })} placeholder="Remera" />
            </Field>
            <Field label="Precio base">
              <Input type="number" value={form.basePrice} onChange={(event) => update({ basePrice: numberValue(event.currentTarget.value) })} />
            </Field>
            <Field label="Orden">
              <Input type="number" value={form.sortOrder} onChange={(event) => update({ sortOrder: numberValue(event.currentTarget.value) })} />
            </Field>
            <Field label="Stock">
              <Select value={form.stockMode} onChange={(event) => update({ stockMode: event.currentTarget.value })}>
                <option value="MADE_TO_ORDER">A pedido</option>
                <option value="TRACKED">Stock real</option>
              </Select>
            </Field>
            <Field label="Días de producción">
              <Input type="number" value={form.productionLeadTimeDays} onChange={(event) => update({ productionLeadTimeDays: numberValue(event.currentTarget.value, 7) })} />
            </Field>
            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5">
              <span className="font-body-sm text-body-sm">Prenda activa</span>
              <Switch checked={form.isActive} onChange={(checked) => update({ isActive: checked })} label="Prenda activa" />
            </div>
            <Field label="Descripción">
              <Input value={form.description ?? ''} onChange={(event) => update({ description: event.currentTarget.value })} placeholder="Remera de algodón 240 g" />
            </Field>
            <ImageField label="Imagen base / mockup" value={form.baseImageUrl} onChange={(value) => update({ baseImageUrl: value })} />
            <ImageField label="Thumbnail de catálogo" value={form.thumbnailUrl ?? ''} onChange={(value) => update({ thumbnailUrl: value })} />
            <Model3DField value={form.model3dUrl ?? ''} onChange={(value) => update({ model3dUrl: value })} />
            <Field label="Rotación 3D (°)" tooltip="Ajustá la orientación si el GLB mira hacia otro lado.">
              <Input type="number" value={form.model3dRotationY} onChange={(event) => update({ model3dRotationY: numberValue(event.currentTarget.value, 180) })} />
            </Field>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">Colores</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">El ajuste se suma al precio unitario.</p>
              </div>
              <Button variant="secondary" icon="add" onClick={() => update({ colors: [...form.colors, { name: '', hex: '#000000', priceAdjustment: 0 }] })}>
                Agregar color
              </Button>
            </div>
            {form.colors.map((color, index) => (
              <div key={index} className="grid grid-cols-[1fr_90px_110px_1fr_40px] items-end gap-2">
                <Field label="Nombre">
                  <Input value={color.name} onChange={(event) => update({ colors: form.colors.map((item, i) => i === index ? { ...item, name: event.currentTarget.value } : item) })} />
                </Field>
                <Field label="Hex">
                  <Input value={color.hex} onChange={(event) => update({ colors: form.colors.map((item, i) => i === index ? { ...item, hex: event.currentTarget.value } : item) })} />
                </Field>
                <Field label="Ajuste">
                  <Input type="number" value={color.priceAdjustment} onChange={(event) => update({ colors: form.colors.map((item, i) => i === index ? { ...item, priceAdjustment: numberValue(event.currentTarget.value) } : item) })} />
                </Field>
                <Field label="Mockup (URL)">
                  <Input value={color.imageUrl ?? ''} onChange={(event) => update({ colors: form.colors.map((item, i) => i === index ? { ...item, imageUrl: event.currentTarget.value } : item) })} placeholder="Opcional" />
                </Field>
                <Button variant="ghost" icon="delete" onClick={() => update({ colors: form.colors.filter((_, i) => i !== index) })} />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">Talles</h3>
              <Button variant="secondary" icon="add" onClick={() => update({ sizes: [...form.sizes, { name: '', priceAdjustment: 0 }] })}>
                Agregar talle
              </Button>
            </div>
            {form.sizes.map((size, index) => (
              <div key={index} className="grid grid-cols-[1fr_160px_40px] items-end gap-2">
                <Field label="Nombre">
                  <Input value={size.name} onChange={(event) => update({ sizes: form.sizes.map((item, i) => i === index ? { ...item, name: event.currentTarget.value } : item) })} />
                </Field>
                <Field label="Ajuste de precio">
                  <Input type="number" value={size.priceAdjustment} onChange={(event) => update({ sizes: form.sizes.map((item, i) => i === index ? { ...item, priceAdjustment: numberValue(event.currentTarget.value) } : item) })} />
                </Field>
                <Button variant="ghost" icon="delete" onClick={() => update({ sizes: form.sizes.filter((_, i) => i !== index) })} />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">Zonas de impresión</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Coordenadas relativas 0–1 sobre la imagen base.</p>
              </div>
              <Button variant="secondary" icon="add" onClick={() => update({ zones: [...form.zones, { ...EMPTY_FORM.zones[0], key: `zone-${form.zones.length + 1}`, label: 'Nueva zona' }] })}>
                Agregar zona
              </Button>
            </div>
            {form.zones.map((zone, index) => (
              <div key={index} className="rounded-xl border border-outline-variant/40 p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Key"><Input value={zone.key} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, key: event.currentTarget.value } : item) })} /></Field>
                  <Field label="Etiqueta"><Input value={zone.label} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, label: event.currentTarget.value } : item) })} /></Field>
                  <Field label="Precio de zona"><Input type="number" value={zone.price} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, price: numberValue(event.currentTarget.value) } : item) })} /></Field>
                  <Field label="Método"><Select value={zone.printMethod} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, printMethod: event.currentTarget.value as PrintZone['printMethod'] } : item) })}><option value="DTG">DTG</option><option value="DTF">DTF</option><option value="SCREEN">Screen</option><option value="EMBROIDERY">Bordado</option></Select></Field>
                  <Field label="DPI"><Input type="number" value={zone.printDpi} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, printDpi: numberValue(event.currentTarget.value, 300) } : item) })} /></Field>
                  <Field label="Bleed (mm)"><Input type="number" value={zone.bleedMm} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, bleedMm: numberValue(event.currentTarget.value, 2) } : item) })} /></Field>
                  <Field label="X (0–1)"><Input type="number" step="0.01" value={zone.x} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, x: numberValue(event.currentTarget.value) } : item) })} /></Field>
                  <Field label="Y (0–1)"><Input type="number" step="0.01" value={zone.y} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, y: numberValue(event.currentTarget.value) } : item) })} /></Field>
                  <Field label="Ancho (0–1)"><Input type="number" step="0.01" value={zone.width} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, width: numberValue(event.currentTarget.value) } : item) })} /></Field>
                  <Field label="Alto (0–1)"><Input type="number" step="0.01" value={zone.height} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, height: numberValue(event.currentTarget.value) } : item) })} /></Field>
                  <Field label="Imagen específica"><Input value={zone.imageUrl ?? ''} onChange={(event) => update({ zones: form.zones.map((item, i) => i === index ? { ...item, imageUrl: event.currentTarget.value } : item) })} placeholder="Opcional: frente/espalda" /></Field>
                  <div className="flex items-end">
                    <Button variant="ghost" icon="delete" onClick={() => update({ zones: form.zones.filter((_, i) => i !== index) })} />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">Reglas de precio</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Precio por elemento"><Input type="number" value={form.pricing.perElement} onChange={(event) => update({ pricing: { ...form.pricing, perElement: numberValue(event.currentTarget.value) } })} /></Field>
              <Field label="Precio por carácter"><Input type="number" value={form.pricing.textPerCharacter} onChange={(event) => update({ pricing: { ...form.pricing, textPerCharacter: numberValue(event.currentTarget.value) } })} /></Field>
              <Field label="Setup"><Input type="number" value={form.pricing.setupFee} onChange={(event) => update({ pricing: { ...form.pricing, setupFee: numberValue(event.currentTarget.value) } })} /></Field>
              <Field label="Precio mínimo"><Input type="number" value={form.pricing.minPrice} onChange={(event) => update({ pricing: { ...form.pricing, minPrice: numberValue(event.currentTarget.value) } })} /></Field>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Descuentos por cantidad</span>
              <Button variant="secondary" icon="add" onClick={() => update({ pricing: { ...form.pricing, quantityTiers: [...form.pricing.quantityTiers, { minQuantity: 10, discountPercent: 5 }] } })}>
                Agregar tramo
              </Button>
            </div>
            {form.pricing.quantityTiers.map((tier, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_40px] items-end gap-2">
                <Field label="Desde cantidad"><Input type="number" value={tier.minQuantity} onChange={(event) => update({ pricing: { ...form.pricing, quantityTiers: form.pricing.quantityTiers.map((item, i) => i === index ? { ...item, minQuantity: numberValue(event.currentTarget.value) } : item) } })} /></Field>
                <Field label="Descuento %"><Input type="number" value={tier.discountPercent} onChange={(event) => update({ pricing: { ...form.pricing, quantityTiers: form.pricing.quantityTiers.map((item, i) => i === index ? { ...item, discountPercent: numberValue(event.currentTarget.value) } : item) } })} /></Field>
                <Button variant="ghost" icon="delete" onClick={() => update({ pricing: { ...form.pricing, quantityTiers: form.pricing.quantityTiers.filter((_, i) => i !== index) } })} />
              </div>
            ))}
          </section>
        </div>
      </AppModal>

      <AppModal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Archivar prenda"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" icon="archive" onClick={() => deleteTarget && archive.mutate(deleteTarget)} disabled={archive.isPending}>
              {archive.isPending ? 'Archivando...' : 'Archivar'}
            </Button>
          </>
        }
      >
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {deleteTarget?.name} dejará de aparecer en el personalizador. Si ya tiene diseños, se conserva el historial.
        </p>
      </AppModal>
    </div>
  );
}
