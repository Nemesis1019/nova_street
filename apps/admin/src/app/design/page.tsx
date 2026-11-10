'use client';

import {
  STOREFRONT_MOTION_PRESET_VALUES,
  STOREFRONT_MOTION_PROFILES,
  STOREFRONT_SECTION_LABELS,
  type StorefrontDocument,
  type StorefrontExperiment,
  type StorefrontMotionPreset,
  type StorefrontSection,
  type StorefrontSectionType,
} from '@ecommerce/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AppModal } from '../../components/ui/app-modal';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Field, Input, Select, Textarea } from '../../components/ui/input';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { Switch } from '../../components/ui/switch';
import { getAuthToken } from '../../lib/api';
import { uploadAsset } from '../../lib/assets';
import { useDesignLocale, useDesignT } from '../../lib/design-i18n';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { platformRequest } from '../../lib/platform-auth';
import { getAdminTenantSlug } from '../../lib/tenant';
import { usePlatformSession } from '../../providers/platform-provider';

type PageKey =
  | 'home'
  | 'pages'
  | 'header'
  | 'footer'
  | 'catalog'
  | 'product'
  | 'theme'
  | 'motion'
  | 'scripts';

interface StaticPageRow {
  id: string;
  slug: string;
  title: string;
}

interface MediaAsset {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  purpose: string;
  focalPointX?: number;
  focalPointY?: number;
  cropZoom?: number;
  createdAt: string;
}
type Device = 'desktop' | 'tablet' | 'mobile';
type Busy =
  | null
  | 'save'
  | 'publish'
  | 'preview'
  | 'preset'
  | 'versions'
  | 'restore'
  | 'approval';
type Settings = Record<string, unknown>;

type StorefrontApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface StorefrontApprovalState {
  required: boolean;
  status: StorefrontApprovalStatus;
  requestedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  hashMatches: boolean | null;
}

interface PresetMeta {
  key: string;
  name: string;
  description: string;
  custom?: boolean;
}

interface StorefrontState {
  draft: StorefrontDocument;
  published: StorefrontDocument | null;
  version: number;
  presets: PresetMeta[];
  storefrontUrl: string;
  approval: StorefrontApprovalState;
  canApprove: boolean;
}

interface ImportTheme {
  tenant: { id: string; slug: string; name: string };
  doc: StorefrontDocument;
  version: number;
}

interface VersionRow {
  id: string;
  version: number;
  createdAt: string;
  createdById: string | null;
}

interface ExperimentResults {
  experimentId: string;
  variants: Array<{
    variant: 'A' | 'B';
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  totalImpressions: number;
  totalClicks: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const tenant = getAdminTenantSlug();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Client': 'admin',
      ...(tenant ? { 'X-Tenant': tenant } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = 'No se pudo completar la operación';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? message);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

const SECTION_TYPES: StorefrontSectionType[] = [
  'hero',
  'showcase',
  'productGrid',
  'categories',
  'story',
  'scrollStory',
  'countdown',
  'productSpotlight',
  'promo',
  'newsletter',
  'marquee',
  'faq',
];

function sectionDefaults(type: StorefrontSectionType, index: number): StorefrontSection {
  const base = {
    id: `${type}-${Date.now()}-${index}`,
    type,
    visible: true,
    motion: {
      reveal: 'inherit' as const,
      delay: 'none' as const,
      hover: 'inherit' as const,
      parallax: 'inherit' as const,
      stickyMedia: false,
    },
  };
  switch (type) {
    case 'hero':
      return {
        ...base,
        type,
        variant: 'asymmetric',
        settings: {
          eyebrow: 'Nueva temporada',
          title: 'Tu próxima historia',
          subtitle: 'Contale a tus clientes qué hace única a esta tienda.',
          imageUrl: '',
          imageFocalPoint: 'center',
          imageScale: 100,
          overlay: 0.32,
          align: 'left',
          minHeight: '78vh',
          showBadge: false,
          badgeText: '',
          badgeCenter: '',
          ctas: [{ label: 'Ver catálogo', href: '/catalogo', style: 'solid' }],
        },
      };
    case 'showcase':
      return {
        ...base,
        type,
        variant: 'bento',
        settings: {
          eyebrow: 'Colección',
          title: 'Colección destacada',
          linkLabel: 'Ver toda la colección',
          linkHref: '/catalogo',
          categorySlug: '',
          story: {
            enabled: true,
            title: 'Una historia para acompañar',
            text: 'Contá el concepto de la colección, el proceso o una colaboración.',
            linkLabel: 'Conocer más',
            linkHref: '/pagina/nuestra-historia',
          },
        },
      };
    case 'productGrid':
      return {
        ...base,
        type,
        variant: 'editorial',
        settings: {
          eyebrow: '',
          title: 'Productos destacados',
          description: '',
          limit: 8,
          columns: 3,
          categorySlug: '',
          ctaLabel: 'Ver catálogo',
          ctaHref: '/catalogo',
        },
      };
    case 'categories':
      return {
        ...base,
        type,
        variant: 'tiles',
        settings: { eyebrow: '', title: 'Categorías', description: '' },
      };
    case 'story':
      return {
        ...base,
        type,
        variant: 'split',
        settings: {
          eyebrow: 'La historia',
          title: 'Hecho con intención',
          text: 'Contá el origen, el proceso o la filosofía de tu marca.',
          imageUrl: '',
          imageFocalPoint: 'center',
          imageScale: 100,
          imagePosition: 'right',
          linkLabel: 'Conocer más',
          linkHref: '/pagina/nuestra-historia',
        },
      };
    case 'scrollStory':
      return {
        ...base,
        type,
        variant: 'pinned',
        settings: {
          imageUrl: '',
          imageFocalPoint: 'center',
          imageScale: 100,
          backgroundColor: '#FCF9F8',
          textColor: '#1F1B16',
          linkLabel: 'Conocer más',
          linkHref: '/catalogo',
          steps: [
            {
              eyebrow: 'Paso 01',
              title: 'Una historia que se despliega',
              text: 'La imagen queda fija mientras el visitante avanza por los momentos de la marca.',
            },
            {
              eyebrow: 'Paso 02',
              title: 'Cada scroll suma contexto',
              text: 'Usá pocos pasos, textos breves y una imagen que sostenga el relato.',
            },
          ],
        },
      };
    case 'countdown':
      return {
        ...base,
        type,
        variant: 'panel',
        settings: {
          title: 'Próximo drop',
          targetAt: '',
          finishedLabel: 'El drop ya está disponible',
          backgroundColor: '#0D0D0D',
          textColor: '#FCF9F8',
        },
      };
    case 'productSpotlight':
      return {
        ...base,
        type,
        variant: 'split',
        settings: {
          eyebrow: 'Prenda de la semana',
          title: '',
          text: '',
          productSlug: '',
          imagePosition: 'right',
          ctaLabel: 'Comprar ahora',
          showPrice: true,
          backgroundColor: '#0D0D0D',
          textColor: '#FCF9F8',
        },
      };
    case 'promo':
      return {
        ...base,
        type,
        variant: 'box',
        settings: {
          eyebrow: '',
          title: 'Una propuesta especial',
          subtitle: 'Destacá una colección, un beneficio o una novedad.',
          link: '/catalogo',
          buttonLabel: 'Ver más',
          backgroundColor: '#6F7A4E',
          textColor: '#FCF9F8',
          startsAt: '',
          endsAt: '',
        },
      };
    case 'newsletter':
      return {
        ...base,
        type,
        variant: 'inline',
        settings: {
          title: 'Novedades',
          description: 'Recibí lanzamientos y contenido antes que nadie.',
          buttonLabel: 'Suscribirme',
        },
      };
    case 'marquee':
      return {
        ...base,
        type,
        variant: 'default',
        settings: {
          items: ['Nueva colección', 'Envíos a todo el país'],
          backgroundColor: '#6F7A4E',
          textColor: '#FCF9F8',
        },
      };
    case 'faq':
      return {
        ...base,
        type,
        variant: 'accordion',
        settings: {
          title: 'Preguntas frecuentes',
          items: [{ question: '¿Cómo comprar?', answer: 'Elegí tus productos y completá el checkout.' }],
        },
      };
  }
}

function getSettings(section: StorefrontSection): Settings {
  return section.settings as unknown as Settings;
}

function setByPath<T extends object>(target: T, key: string, value: unknown) {
  (target as Record<string, unknown>)[key] = value;
}

function cloneDoc(doc: StorefrontDocument): StorefrontDocument {
  return structuredClone(doc);
}

function SettingField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  rows,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  rows?: number;
}) {
  if (rows) {
    return (
      <Field label={label}>
        <Textarea rows={rows} value={String(value)} onChange={(event) => onChange(event.currentTarget.value)} />
      </Field>
    );
  }
  return (
    <Field label={label}>
      <Input
        type={type}
        value={String(value)}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </Field>
  );
}

function ImageSettingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const tr = useDesignT();
  const [uploading, setUploading] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadAsset(file);
      onChange(asset.url);
      notifySuccess({ title: tr('Imagen subida') });
    } catch (error) {
      notifyError({ title: tr('No se pudo subir la imagen'), message: getApiErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label} hint={tr('Podés pegar una URL o subir una imagen a R2.')}>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          placeholder="https://..."
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <label
          className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-outline-variant/50 px-2.5 py-2 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-low ${
            uploading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <Icon name={uploading ? 'progress_activity' : 'upload'} className={`text-[16px] ${uploading ? 'animate-spin' : ''}`} />
          {uploading ? tr('Subiendo') : tr('Subir archivo')}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => void onFile(event.currentTarget.files?.[0])}
          />
        </label>
        <Button variant="secondary" icon="photo_library" onClick={() => setMediaOpen(true)}>
          {tr('Biblioteca')}
        </Button>
      </div>
      {value ? (
        <img
          src={value}
          alt="Preview"
          className="mt-1 h-28 w-full rounded-lg object-cover"
        />
      ) : null}
      <MediaPickerModal
        opened={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setMediaOpen(false);
        }}
      />
    </Field>
  );
}

function MediaPickerModal({
  opened,
  onClose,
  onSelect,
}: {
  opened: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const tr = useDesignT();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [cropAsset, setCropAsset] = useState<MediaAsset | null>(null);

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    setLoading(true);
    apiRequest<{ data: MediaAsset[] }>('/admin/assets?purpose=CATALOG_IMAGE&limit=80')
      .then((response) => {
        if (!cancelled) setAssets(response.data ?? []);
      })
      .catch((error) => {
        if (!cancelled) {
          notifyError({ title: tr('No se pudo cargar la biblioteca'), message: getApiErrorMessage(error) });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opened, refresh]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadAsset(file);
      setRefresh((value) => value + 1);
      notifySuccess({ title: tr('Imagen agregada a la biblioteca') });
    } catch (error) {
      notifyError({ title: tr('No se pudo subir la imagen'), message: getApiErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={() => {
        setCropAsset(null);
        onClose();
      }}
      title={tr('Biblioteca de medios')}
      subtitle={tr('Imágenes disponibles en este cliente. Podés subir una nueva o elegir una existente.')}
      size="xl"
      footer={
        <>
          <label className="mr-auto inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary">
            <Icon name={uploading ? 'progress_activity' : 'upload'} className={`text-[18px] ${uploading ? 'animate-spin' : ''}`} />
            {uploading ? tr('Subiendo...') : tr('Subir imagen')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(event) => void upload(event.currentTarget.files?.[0])}
            />
          </label>
          <Button variant="secondary" icon="close" onClick={onClose}>
            {tr('Cerrar')}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-14 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin text-[20px]" />
          {tr('Cargando imágenes...')}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <Icon name="photo_library" className="text-[42px] text-secondary" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">{tr('Todavía no hay imágenes en este cliente.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest"
            >
              <button
                type="button"
                onClick={() => onSelect(asset.url)}
                className="block w-full text-left transition-colors hover:bg-surface-container-low"
              >
                <img
                  src={asset.url}
                  alt=""
                  className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                  style={{
                    objectPosition: `${asset.focalPointX ?? 50}% ${asset.focalPointY ?? 50}%`,
                    scale: asset.cropZoom && asset.cropZoom > 1 ? asset.cropZoom : undefined,
                  }}
                />
                <span className="block truncate px-2 py-1.5 font-label-sm text-[10px] text-on-surface-variant">
                  {asset.mimeType.replace('image/', '').toUpperCase()} · {Math.max(1, Math.round(asset.size / 1024))} KB
                </span>
              </button>
              <button
                type="button"
                title={tr('Ajustar encuadre')}
                onClick={() => setCropAsset(asset)}
                className="absolute right-1.5 top-1.5 rounded-full border border-outline-variant/50 bg-surface-container-lowest/90 p-1 text-on-surface-variant shadow-sm transition-colors hover:text-on-surface"
              >
                <Icon name="crop_free" className="text-[15px]" />
              </button>
            </div>
          ))}
        </div>
      )}
      <AssetCropModal
        asset={cropAsset}
        opened={Boolean(cropAsset)}
        onClose={() => setCropAsset(null)}
        onSaved={(updated) => {
          setAssets((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        }}
      />
    </AppModal>
  );
}

function AssetCropModal({
  asset,
  opened,
  onClose,
  onSaved,
}: {
  asset: MediaAsset | null;
  opened: boolean;
  onClose: () => void;
  onSaved: (asset: MediaAsset) => void;
}) {
  const tr = useDesignT();
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setX(asset.focalPointX ?? 50);
    setY(asset.focalPointY ?? 50);
    setZoom(asset.cropZoom ?? 1);
  }, [asset]);

  if (!asset) return null;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await apiRequest<MediaAsset>(`/admin/assets/${asset.id}/crop`, {
        method: 'PATCH',
        body: JSON.stringify({ focalPointX: x, focalPointY: y, cropZoom: zoom }),
      });
      onSaved(updated);
      notifySuccess({ title: tr('Encuadre guardado') });
      onClose();
    } catch (error) {
      notifyError({ title: tr('No se pudo guardar el encuadre'), message: getApiErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={tr('Ajustar encuadre')}
      subtitle={tr('Este recorte se usa en las imágenes de producto que apuntan a este asset.')}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {tr('Cancelar')}
          </Button>
          <Button icon="save" onClick={() => void save()} disabled={saving}>
            {saving ? tr('Guardando...') : tr('Guardar encuadre')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
        <div className="h-64 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container">
          <img
            src={asset.url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${x}% ${y}%`,
              scale: zoom,
            }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <SettingField
            label={tr('Foco X (%)')}
            type="number"
            value={x}
            onChange={(value) => setX(Math.max(0, Math.min(100, Number(value) || 50)))}
          />
          <SettingField
            label={tr('Foco Y (%)')}
            type="number"
            value={y}
            onChange={(value) => setY(Math.max(0, Math.min(100, Number(value) || 50)))}
          />
          <SettingField
            label={tr('Zoom')}
            type="number"
            value={zoom}
            onChange={(value) => setZoom(Math.max(1, Math.min(2, Number(value) || 1)))}
          />
        </div>
      </div>
    </AppModal>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="h-9 w-10 cursor-pointer rounded border border-outline-variant/50 bg-transparent"
          aria-label={label}
        />
        <Input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
      </div>
    </Field>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2.5">
      <span className="font-body-sm text-body-sm text-on-surface">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export default function StorefrontDesignPage() {
  const tr = useDesignT();
  const locale = useDesignLocale();
  const queryClient = useQueryClient();
  const { user: platformUser } = usePlatformSession();
  const stateQuery = useQuery<StorefrontState>({
    queryKey: ['admin-storefront'],
    queryFn: () => apiRequest<StorefrontState>('/admin/storefront'),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const [doc, setDoc] = useState<StorefrontDocument | null>(null);
  const [baseline, setBaseline] = useState('');
  const [page, setPage] = useState<PageKey>('home');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [newSectionType, setNewSectionType] = useState<StorefrontSectionType>('hero');
  const [busy, setBusy] = useState<Busy>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewReducedMotion, setPreviewReducedMotion] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [device, setDevice] = useState<Device>('desktop');
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [pagesList, setPagesList] = useState<StaticPageRow[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedStaticSlug, setSelectedStaticSlug] = useState<string | null>(null);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importThemes, setImportThemes] = useState<ImportTheme[]>([]);
  const [importSource, setImportSource] = useState('');
  const [importing, setImporting] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    if (stateQuery.data && !doc) {
      setDoc(stateQuery.data.draft);
      setBaseline(JSON.stringify(stateQuery.data.draft));
      setSelectedSectionId(stateQuery.data.draft.pages.home.sections[0]?.id ?? null);
    }
  }, [stateQuery.data, doc]);

  useEffect(() => {
    if (page !== 'pages' || pagesList.length > 0) return;
    let cancelled = false;
    setPagesLoading(true);
    apiRequest<{ data: StaticPageRow[] }>('/pages')
      .then((response) => {
        if (cancelled) return;
        setPagesList(response.data ?? []);
      })
      .catch((error) => {
        if (!cancelled) {
          notifyError({ title: tr('No se pudieron cargar las páginas'), message: getApiErrorMessage(error) });
        }
      })
      .finally(() => {
        if (!cancelled) setPagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pagesList.length]);

  useEffect(() => {
    if (page === 'pages' && !selectedStaticSlug && pagesList[0]) {
      setSelectedStaticSlug(pagesList[0].slug);
    }
  }, [page, pagesList, selectedStaticSlug]);

  const activeSections = useMemo(() => {
    if (!doc) return [];
    if (page === 'pages' && selectedStaticSlug) {
      return doc.pages.staticPages?.[selectedStaticSlug]?.sections ?? [];
    }
    return doc.pages.home.sections;
  }, [doc, page, selectedStaticSlug]);

  const dirty = Boolean(doc && JSON.stringify(doc) !== baseline);
  const hasUnpublishedChanges = Boolean(
    doc && (!stateQuery.data?.published || JSON.stringify(doc) !== JSON.stringify(stateQuery.data.published)),
  );
  const selectedSection = useMemo(
    () => activeSections.find((section) => section.id === selectedSectionId) ?? null,
    [activeSections, selectedSectionId],
  );

  const applyState = (state: StorefrontState) => {
    setDoc(state.draft);
    setBaseline(JSON.stringify(state.draft));
    queryClient.setQueryData(['admin-storefront'], state);
    setPreviewUrl(null);
  };

  const patchDoc = (updater: (next: StorefrontDocument) => void) => {
    setDoc((current) => {
      if (!current) return current;
      const next = cloneDoc(current);
      updater(next);
      return next;
    });
  };

  const patchSections = (updater: (sections: StorefrontSection[]) => void) => {
    setDoc((current) => {
      if (!current) return current;
      const next = cloneDoc(current);

      if (page === 'pages') {
        if (!selectedStaticSlug) return current;
        next.pages.staticPages ??= {};
        next.pages.staticPages[selectedStaticSlug] ??= { sections: [] };
        updater(next.pages.staticPages[selectedStaticSlug].sections);
        return next;
      }

      updater(next.pages.home.sections);
      return next;
    });
  };

  const patchSection = (id: string, updater: (section: StorefrontSection) => void) => {
    patchSections((sections) => {
      const section = sections.find((item) => item.id === id);
      if (section) updater(section);
    });
  };

  const patchSetting = (id: string, key: string, value: unknown) => {
    patchSection(id, (section) => setByPath(getSettings(section), key, value));
  };

  const handleSave = async (): Promise<StorefrontState | null> => {
    if (!doc) return null;
    setBusy('save');
    try {
      const state = await apiRequest<StorefrontState>('/admin/storefront/draft', {
        method: 'PUT',
        body: JSON.stringify({ doc }),
      });
      applyState(state);
      notifySuccess({ title: tr('Borrador guardado') });
      return state;
    } catch (error) {
      notifyError({ title: tr('No se pudo guardar'), message: getApiErrorMessage(error) });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    if (!doc) return;
    const approval = stateQuery.data?.approval;
    const canApprove = stateQuery.data?.canApprove === true;
    const hasDirtyChanges = JSON.stringify(doc) !== baseline;

    if (approval?.required && !canApprove) {
      if (approval.status !== 'APPROVED' || hasDirtyChanges || approval.hashMatches === false) {
        setApprovalOpen(true);
        notifyError({
          title: tr('Publicación pendiente de aprobación'),
          message:
            approval.status === 'APPROVED' && hasDirtyChanges
              ? tr('Hay cambios sin guardar. Guardá y enviá una nueva revisión.')
              : approval.hashMatches === false
                ? tr('El borrador cambió después de la revisión. Enviá una nueva revisión.')
                : tr('Enviá el borrador a revisión y esperá la aprobación de plataforma.'),
        });
        return;
      }
    }

    setBusy('publish');
    try {
      if (hasDirtyChanges) {
        await apiRequest<StorefrontState>('/admin/storefront/draft', {
          method: 'PUT',
          body: JSON.stringify({ doc }),
        });
      }
      const state = await apiRequest<StorefrontState>('/admin/storefront/publish', { method: 'POST' });
      applyState(state);
      setPreviewUrl(null);
      notifySuccess({ title: tr('Storefront publicado'), message: tr('Versión {{version}}', { version: state.version }) });
    } catch (error) {
      notifyError({ title: tr('No se pudo publicar'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handlePreview = async () => {
    if (!doc) return;
    setBusy('preview');
    try {
      if (dirty) {
        const saved = await apiRequest<StorefrontState>('/admin/storefront/draft', {
          method: 'PUT',
          body: JSON.stringify({ doc }),
        });
        applyState(saved);
      }
      const { token } = await apiRequest<{ token: string }>('/admin/storefront/preview-token', {
        method: 'POST',
      });
      const baseUrl = stateQuery.data?.storefrontUrl ?? process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
      const path = page === 'pages' && selectedStaticSlug ? `/pagina/${selectedStaticSlug}` : '/';
      const url = new URL(path, baseUrl);
      url.searchParams.set('preview', token);
      setPreviewUrl(url.toString());
      setPreviewNonce((value) => value + 1);
    } catch (error) {
      notifyError({ title: tr('No se pudo generar el preview'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handlePreset = async (key: string) => {
    setBusy('preset');
    try {
      const state = await apiRequest<StorefrontState>(`/admin/storefront/presets/${key}/apply`, {
        method: 'POST',
      });
      applyState(state);
      setPage('home');
      setSelectedSectionId(state.draft.pages.home.sections[0]?.id ?? null);
      notifySuccess({ title: tr('Preset aplicado al borrador'), message: tr('Revisá el preview antes de publicar.') });
    } catch (error) {
      notifyError({ title: tr('No se pudo aplicar el preset'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const saveAsPreset = async () => {
    if (!doc || !presetName.trim()) {
      notifyError({ title: tr('Preset'), message: tr('Ponele un nombre al preset.') });
      return;
    }
    setBusy('preset');
    try {
      await apiRequest<StorefrontState>('/admin/storefront/draft', {
        method: 'PUT',
        body: JSON.stringify({ doc }),
      });
      const state = await apiRequest<StorefrontState>('/admin/storefront/presets', {
        method: 'POST',
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDescription.trim(),
        }),
      });
      applyState(state);
      setPresetModalOpen(false);
      setPresetName('');
      setPresetDescription('');
      notifySuccess({ title: tr('Preset guardado'), message: tr('Ya podés aplicarlo desde la lista.') });
    } catch (error) {
      notifyError({ title: tr('No se pudo guardar el preset'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const deletePreset = async (key: string) => {
    const id = key.replace(/^custom:/, '');
    setBusy('preset');
    try {
      const state = await apiRequest<StorefrontState>(`/admin/storefront/presets/${id}`, {
        method: 'DELETE',
      });
      applyState(state);
      notifySuccess({ title: tr('Preset eliminado') });
    } catch (error) {
      notifyError({ title: tr('No se pudo eliminar el preset'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const setApprovalRequired = async (required: boolean) => {
    setBusy('approval');
    try {
      const state = await apiRequest<StorefrontState>('/admin/storefront/approval', {
        method: 'PATCH',
        body: JSON.stringify({ required }),
      });
      applyState(state);
      notifySuccess({
        title: required ? tr('Aprobación activada') : tr('Aprobación desactivada'),
        message: required
          ? tr('Los admins del cliente deberán enviar el borrador a revisión.')
          : tr('Los admins del cliente vuelven a publicar directo.'),
      });
    } catch (error) {
      notifyError({ title: tr('No se pudo cambiar la aprobación'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const submitApproval = async () => {
    if (!doc) return;
    setBusy('approval');
    try {
      if (dirty) {
        const saved = await apiRequest<StorefrontState>('/admin/storefront/draft', {
          method: 'PUT',
          body: JSON.stringify({ doc }),
        });
        applyState(saved);
      }
      const state = await apiRequest<StorefrontState>('/admin/storefront/approval/submit', {
        method: 'POST',
      });
      applyState(state);
      setApprovalOpen(true);
      notifySuccess({ title: tr('Enviado a revisión'), message: tr('Plataforma recibió el borrador.') });
    } catch (error) {
      notifyError({ title: tr('No se pudo enviar a revisión'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const approveApproval = async () => {
    setBusy('approval');
    try {
      const state = await apiRequest<StorefrontState>('/admin/storefront/approval/approve', {
        method: 'POST',
        body: JSON.stringify({ note: approvalNote.trim() || undefined }),
      });
      applyState(state);
      setApprovalNote('');
      notifySuccess({ title: tr('Publicación aprobada'), message: tr('El admin del cliente ya puede publicar.') });
    } catch (error) {
      notifyError({ title: tr('No se pudo aprobar'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const rejectApproval = async () => {
    setBusy('approval');
    try {
      const state = await apiRequest<StorefrontState>('/admin/storefront/approval/reject', {
        method: 'POST',
        body: JSON.stringify({ note: approvalNote.trim() || undefined }),
      });
      applyState(state);
      notifySuccess({ title: tr('Publicación rechazada') });
    } catch (error) {
      notifyError({ title: tr('No se pudo rechazar'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const openImport = async () => {
    setImportOpen(true);
    if (importThemes.length > 0) return;

    setImportLoading(true);
    try {
      const tenants = await platformRequest<Array<{ id: string; slug: string; name: string }>>(
        '/platform/tenants',
      );
      const currentSlug = getAdminTenantSlug();
      const options = tenants.filter((tenant) => tenant.slug !== currentSlug);

      const token = getAuthToken();
      const themes = (
        await Promise.all(
          options.map(async (tenant) => {
            try {
              const response = await fetch(`${API_URL}/admin/storefront`, {
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  'X-Client': 'admin',
                  'X-Tenant': tenant.slug,
                },
              });
              if (!response.ok) return null;
              const source = (await response.json()) as StorefrontState;
              const doc = source.published ?? source.draft;
              if (!doc) return null;
              return { tenant, doc, version: source.version };
            } catch {
              return null;
            }
          }),
        )
      ).filter((theme): theme is ImportTheme => theme !== null);

      setImportThemes(themes);
      setImportSource(themes[0]?.tenant.slug ?? '');
    } catch (error) {
      notifyError({ title: tr('No se pudieron cargar los temas'), message: getApiErrorMessage(error) });
    } finally {
      setImportLoading(false);
    }
  };

  const importTheme = async () => {
    if (!importSource) return;
    setImporting(true);
    try {
      const selected = importThemes.find((theme) => theme.tenant.slug === importSource);
      let sourceDoc = selected?.doc;
      if (!sourceDoc) {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/admin/storefront`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Client': 'admin',
            'X-Tenant': importSource,
          },
        });
        if (!response.ok) throw new Error(tr('No se pudo leer el tema del cliente de origen'));
        const source = (await response.json()) as StorefrontState;
        sourceDoc = source.published ?? source.draft ?? undefined;
      }
      if (!sourceDoc) throw new Error(tr('El cliente de origen no tiene un tema publicado'));
      setDoc(structuredClone(sourceDoc));
      setPage('home');
      setSelectedSectionId(sourceDoc.pages.home.sections[0]?.id ?? null);
      setImportOpen(false);
      notifySuccess({
        title: tr('Tema importado al borrador'),
        message: tr('Revisá imágenes, categorías y publicá cuando esté listo.'),
      });
    } catch (error) {
      notifyError({ title: tr('No se pudo importar el tema'), message: getApiErrorMessage(error) });
    } finally {
      setImporting(false);
    }
  };

  const openVersions = async () => {
    setVersionsOpen(true);
    setVersionsLoading(true);
    try {
      setVersions(await apiRequest<VersionRow[]>('/admin/storefront/versions'));
    } catch (error) {
      notifyError({ title: tr('No se pudieron cargar las versiones'), message: getApiErrorMessage(error) });
    } finally {
      setVersionsLoading(false);
    }
  };

  const restoreVersion = async (id: string) => {
    setBusy('restore');
    try {
      const state = await apiRequest<StorefrontState>(`/admin/storefront/versions/${id}/restore`, {
        method: 'POST',
      });
      applyState(state);
      setVersionsOpen(false);
      notifySuccess({ title: tr('Versión restaurada al borrador') });
    } catch (error) {
      notifyError({ title: tr('No se pudo restaurar'), message: getApiErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const addSection = () => {
    if (!doc || (page === 'pages' && !selectedStaticSlug)) return;
    const section = sectionDefaults(newSectionType, activeSections.length);
    patchSections((sections) => {
      sections.push(section);
    });
    setSelectedSectionId(section.id);
  };

  const moveSection = (id: string, direction: -1 | 1) => {
    patchSections((sections) => {
      const index = sections.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sections.length) return;
      const [moved] = sections.splice(index, 1);
      sections.splice(target, 0, moved);
    });
  };

  const removeSection = (id: string) => {
    patchSections((sections) => {
      const index = sections.findIndex((section) => section.id === id);
      if (index >= 0) sections.splice(index, 1);
    });
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  if (stateQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
        <Icon name="progress_activity" className="animate-spin text-[20px]" />
        {tr('Cargando editor de storefront...')}
      </div>
    );
  }

  if (stateQuery.isError || !stateQuery.data) {
    return <QueryError onRetry={() => void stateQuery.refetch()} retrying={stateQuery.isFetching} />;
  }

  if (!doc) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
        <Icon name="progress_activity" className="animate-spin text-[20px]" />
        {tr('Preparando editor...')}
      </div>
    );
  }

  const state = stateQuery.data;
  const versionLabel = dirty
    ? tr('Cambios sin guardar')
    : hasUnpublishedChanges
      ? tr('Borrador sin publicar')
      : state.version > 0
        ? tr('Publicado v{{version}}', { version: state.version })
        : tr('Sin publicar');
  const approvalLabels: Record<StorefrontApprovalStatus, string> = {
    NONE: tr('Sin enviar'),
    PENDING: tr('Pendiente'),
    APPROVED: tr('Aprobado'),
    REJECTED: tr('Rechazado'),
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumb={[{ label: tr('Storefront & Contenido') }, { label: tr('Diseño de tienda') }]}
        title={tr('Diseño de tienda')}
        subtitle={tr('Componé la identidad y el layout de tu storefront sin tocar código.')}
        actions={
          <>
            <span className={`rounded-full px-3 py-1.5 font-label-sm text-label-sm ${dirty ? 'bg-amber-50 text-amber-700' : 'bg-surface-container text-on-surface-variant'}`}>
              {versionLabel}
            </span>
            {state.approval.required ? (
              <span
                className={`rounded-full px-3 py-1.5 font-label-sm text-label-sm ${
                  state.approval.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700'
                    : state.approval.status === 'REJECTED'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                }`}
              >
                {tr('Aprobación')}: {approvalLabels[state.approval.status]}
              </span>
            ) : null}
            <Link
              href={state.storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 px-3.5 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
            >
              <Icon name="open_in_new" className="text-[16px]" />
              {tr('Ver tienda')}
            </Link>
            <Button
              variant="secondary"
              icon="fact_check"
              onClick={() => setApprovalOpen(true)}
            >
              {state.canApprove && state.approval.status === 'PENDING' ? tr('Revisar') : tr('Aprobación')}
            </Button>
            <Button variant="secondary" icon="history" onClick={() => void openVersions()}>
              {tr('Versiones')}
            </Button>
            <Button variant="secondary" icon="save" onClick={() => void handleSave()} disabled={Boolean(busy)}>
              {busy === 'save' ? tr('Guardando...') : tr('Guardar borrador')}
            </Button>
            <Button icon="publish" onClick={() => void handlePublish()} disabled={Boolean(busy)}>
              {busy === 'publish' ? tr('Publicando...') : tr('Publicar')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[270px_minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {tr('Presets')}
              </span>
              <Icon name="auto_awesome" className="text-[18px] text-secondary" />
            </div>
            <div className="flex flex-col gap-2">
              {state.presets.map((preset) => (
                <div key={preset.key} className="relative">
                  <button
                    type="button"
                    onClick={() => void handlePreset(preset.key)}
                    disabled={Boolean(busy)}
                    className={`w-full rounded-lg border px-3 py-2.5 pr-8 text-left transition-colors ${
                      doc.presetKey === preset.key
                        ? 'border-primary bg-surface-container'
                        : 'border-outline-variant/40 hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-label-md text-label-md font-semibold text-on-surface">{tr(preset.name)}</span>
                      {preset.custom ? (
                        <span className="rounded bg-secondary-fixed px-1.5 py-0.5 font-label-sm text-[9px] text-on-secondary-fixed">
                          {tr('PROPIO')}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block font-body-sm text-[11px] leading-snug text-on-surface-variant">{tr(preset.description)}</span>
                  </button>
                  {preset.custom ? (
                    <button
                      type="button"
                      title={tr('Eliminar preset')}
                      onClick={() => void deletePreset(preset.key)}
                      disabled={Boolean(busy)}
                      className="absolute right-2 top-2 rounded p-1 text-on-surface-variant hover:bg-error-container hover:text-error"
                    >
                      <Icon name="delete" className="text-[15px]" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              icon="bookmark_add"
              onClick={() => setPresetModalOpen(true)}
              disabled={Boolean(busy)}
              className="mt-3 w-full"
            >
              {tr('Guardar borrador como preset')}
            </Button>
            {platformUser ? (
              <Button
                variant="ghost"
                icon="content_copy"
                onClick={() => void openImport()}
                disabled={Boolean(busy)}
                className="mt-2 w-full"
              >
                {tr('Marketplace de temas')}
              </Button>
            ) : null}
            <p className="mt-3 font-label-sm text-label-sm text-on-surface-variant">
              {tr('Aplicar un preset reemplaza el borrador actual.')}
            </p>
          </Card>

          <Card className="p-2">
            {([
              ['home', tr('Home'), 'home'],
              ['pages', tr('Páginas'), 'article'],
              ['header', tr('Header'), 'web_asset'],
              ['footer', tr('Footer'), 'call_to_action'],
              ['catalog', tr('Catálogo'), 'grid_view'],
              ['product', tr('Producto'), 'inventory_2'],
              ['theme', tr('Tema'), 'palette'],
              ['motion', tr('Movimiento'), 'animation'],
              ['scripts', tr('Scripts sandbox'), 'code'],
            ] as Array<[PageKey, string, string]>).map(([key, label, icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setPage(key);
                  if (key === 'pages') setSelectedSectionId(null);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-body-sm text-body-sm transition-colors ${
                  page === key ? 'bg-surface-container font-semibold text-on-surface' : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Icon name={icon} className="text-[18px]" />
                {label}
              </button>
            ))}
          </Card>

          {page === 'home' || page === 'pages' ? (
            <Card className="p-4">
              {page === 'pages' ? (
                <div className="mb-3 flex flex-col gap-2 border-b border-outline-variant/30 pb-3">
                  <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                    {tr('Página estática')}
                  </span>
                  {pagesLoading ? (
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{tr('Cargando páginas...')}</span>
                  ) : pagesList.length === 0 ? (
                    <span className="font-body-sm text-[12px] leading-snug text-on-surface-variant">
                      {tr('No hay páginas visibles. Creá una desde Páginas estáticas.')}
                    </span>
                  ) : (
                    <Select
                      value={selectedStaticSlug ?? ''}
                      onChange={(event) => {
                        const slug = event.currentTarget.value;
                        setSelectedStaticSlug(slug || null);
                        setSelectedSectionId(
                          slug ? (doc.pages.staticPages?.[slug]?.sections[0]?.id ?? null) : null,
                        );
                      }}
                    >
                      {pagesList.map((item) => (
                        <option key={item.id} value={item.slug}>
                          {item.title}
                        </option>
                      ))}
                    </Select>
                  )}
                  {selectedStaticSlug ? (
                    <a
                      href={`${state.storefrontUrl}/pagina/${selectedStaticSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface"
                    >
                      <Icon name="open_in_new" className="text-[14px]" />
                      {tr('Ver página publicada')}
                    </a>
                  ) : null}
                </div>
              ) : null}
              <div className="mb-3 flex items-center justify-between">
                <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                  {tr('Secciones')}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{activeSections.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {activeSections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`group rounded-lg border px-2.5 py-2 transition-colors ${
                      selectedSectionId === section.id
                        ? 'border-primary bg-surface-container'
                        : 'border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSectionId(section.id)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span className="font-numeric-tabular text-[10px] text-on-surface-variant">{String(index + 1).padStart(2, '0')}</span>
                      <span className={`flex-1 truncate font-body-sm text-body-sm ${section.visible ? 'text-on-surface' : 'text-on-surface-variant line-through'}`}>
                        {tr(STOREFRONT_SECTION_LABELS[section.type])}
                      </span>
                      <Icon name={section.visible ? 'visibility' : 'visibility_off'} className="text-[15px] text-on-surface-variant" />
                    </button>
                    <div className="mt-1 flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" title={tr('Subir')} onClick={() => moveSection(section.id, -1)} className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high">
                        <Icon name="arrow_upward" className="text-[14px]" />
                      </button>
                      <button type="button" title={tr('Bajar')} onClick={() => moveSection(section.id, 1)} className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high">
                        <Icon name="arrow_downward" className="text-[14px]" />
                      </button>
                      <button
                        type="button"
                        title={tr('Ocultar')}
                        onClick={() => patchSection(section.id, (item) => { item.visible = !item.visible; })}
                        className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high"
                      >
                        <Icon name={section.visible ? 'visibility_off' : 'visibility'} className="text-[14px]" />
                      </button>
                      <button type="button" title={tr('Eliminar')} onClick={() => removeSection(section.id)} className="rounded p-0.5 text-error hover:bg-error-container">
                        <Icon name="delete" className="text-[14px]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Select
                  value={newSectionType}
                  onChange={(event) => setNewSectionType(event.currentTarget.value as StorefrontSectionType)}
                  className="min-w-0 flex-1"
                >
                  {SECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {tr(STOREFRONT_SECTION_LABELS[type])}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  icon="add"
                  onClick={addSection}
                  disabled={page === 'pages' && !selectedStaticSlug}
                  className="shrink-0"
                >
                  {tr('Agregar')}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-lowest px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon="visibility" onClick={() => void handlePreview()} disabled={Boolean(busy)}>
                {busy === 'preview' ? tr('Generando...') : tr('Actualizar preview')}
              </Button>
              {previewUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewNonce((value) => value + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container"
                  >
                    <Icon name="replay" className="text-[16px]" />
                    {tr('Repetir animación')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={previewReducedMotion}
                    onClick={() => setPreviewReducedMotion((value) => !value)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-label-sm text-label-sm transition-colors ${
                      previewReducedMotion
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <Icon name="accessibility" className="text-[16px]" />
                    {tr('Movimiento reducido')}
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-surface-container px-1 py-0.5">
              {([
                ['desktop', 'desktop_windows'],
                ['tablet', 'tablet_mac'],
                ['mobile', 'smartphone'],
              ] as Array<[Device, string]>).map(([key, icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  className={`rounded-md p-1.5 text-on-surface-variant ${device === key ? 'bg-surface-container-lowest text-on-surface shadow-sm' : ''}`}
                  title={tr(key)}
                >
                  <Icon name={icon} className="text-[17px]" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-[640px] justify-center overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
            {previewUrl ? (
              <iframe
                key={`${previewNonce}-${previewReducedMotion}`}
                title={tr('Preview del storefront')}
                src={`${previewUrl}&_preview=${previewNonce}${previewReducedMotion ? '&motion=reduce' : ''}`}
                style={{
                  width: device === 'desktop' ? '100%' : device === 'tablet' ? 768 : 390,
                  maxWidth: '100%',
                  height: 760,
                  border: 0,
                  borderRadius: 8,
                  backgroundColor: '#fff',
                }}
              />
            ) : (
              <div className="flex max-w-sm flex-col items-center justify-center gap-3 text-center">
                <Icon name="web_asset" className="text-[52px] text-secondary" />
                <p className="font-body-md text-body-md text-on-surface">{tr('Generá un preview para ver el borrador.')}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {tr('Se guarda el borrador actual y se abre la tienda con un token temporal.')}
                </p>
                <Button icon="visibility" onClick={() => void handlePreview()} disabled={Boolean(busy)}>
                  {tr('Previsualizar')}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {page === 'home' || page === 'pages' ? (
            selectedSection ? (
              <SectionInspector
                section={selectedSection}
                onChange={(key, value) => patchSetting(selectedSection.id, key, value)}
                onVariantChange={(value) =>
                  patchSection(selectedSection.id, (item) => {
                    (item as unknown as { variant: string }).variant = value;
                  })
                }
                onVisibleChange={(checked) =>
                  patchSection(selectedSection.id, (item) => {
                    item.visible = checked;
                  })
                }
                onCtasChange={(ctas) => patchSetting(selectedSection.id, 'ctas', ctas)}
                onFaqChange={(items) => patchSetting(selectedSection.id, 'items', items)}
                onMotionChange={(key, value) => {
                  patchSection(selectedSection.id, (item) => {
                    (item.motion as Record<string, unknown>)[key] = value;
                  });
                }}
              />
            ) : (
              <Card className="p-5">
                <p className="font-body-sm text-body-sm text-on-surface-variant">{tr('Seleccioná una sección para editarla.')}</p>
              </Card>
            )
          ) : null}
          {page === 'home' ? <ExperimentInspector doc={doc} patchDoc={patchDoc} /> : null}
          {page === 'theme' ? (
            <ThemeInspector doc={doc} patchDoc={patchDoc} />
          ) : null}
          {page === 'motion' ? <MotionInspector doc={doc} patchDoc={patchDoc} /> : null}
          {page === 'scripts' ? <ScriptSandboxInspector /> : null}
          {page === 'header' ? <HeaderInspector doc={doc} patchDoc={patchDoc} /> : null}
          {page === 'footer' ? <FooterInspector doc={doc} patchDoc={patchDoc} /> : null}
          {page === 'catalog' ? (
            <Card className="p-5">
              <InspectorTitle icon="grid_view" title={tr('Catálogo')} />
              <div className="flex flex-col gap-4">
                <Field label={tr('Variante de card')}>
                  <Select
                    value={doc.pages.catalog.productCardVariant}
                    onChange={(event) =>
                      patchDoc((next) => {
                        next.pages.catalog.productCardVariant = event.currentTarget.value as 'default' | 'editorial' | 'minimal';
                      })
                    }
                  >
                    <option value="default">{tr('Estándar')}</option>
                    <option value="editorial">{tr('Editorial')}</option>
                    <option value="minimal">{tr('Minimal')}</option>
                  </Select>
                </Field>
                <SettingField
                  label={tr('Columnas')}
                  type="number"
                  value={doc.pages.catalog.columns}
                  onChange={(value) =>
                    patchDoc((next) => {
                      next.pages.catalog.columns = Math.max(2, Math.min(6, Number(value) || 4));
                    })
                  }
                />
                <SettingToggle
                  label={tr('Mostrar filtros')}
                  checked={doc.pages.catalog.showFilters}
                  onChange={(checked) => patchDoc((next) => { next.pages.catalog.showFilters = checked; })}
                />
                <SettingToggle
                  label={tr('Mostrar orden')}
                  checked={doc.pages.catalog.showSort}
                  onChange={(checked) => patchDoc((next) => { next.pages.catalog.showSort = checked; })}
                />
              </div>
            </Card>
          ) : null}
          {page === 'product' ? (
            <Card className="p-5">
              <InspectorTitle icon="inventory_2" title={tr('Ficha de producto')} />
              <div className="flex flex-col gap-4">
                <Field label={tr('Galería')}>
                  <Select
                    value={doc.pages.product.galleryLayout}
                    onChange={(event) =>
                      patchDoc((next) => {
                        next.pages.product.galleryLayout = event.currentTarget.value as 'left' | 'right';
                      })
                    }
                  >
                    <option value="left">{tr('Imagen a la izquierda')}</option>
                    <option value="right">{tr('Imagen a la derecha')}</option>
                  </Select>
                </Field>
                <SettingToggle
                  label={tr('Mostrar miniaturas')}
                  checked={doc.pages.product.showGalleryThumbnails ?? true}
                  onChange={(checked) => patchDoc((next) => { next.pages.product.showGalleryThumbnails = checked; })}
                />
                <SettingToggle
                  label={tr('Deslizar galería en móvil')}
                  checked={doc.pages.product.gallerySwipeEnabled ?? true}
                  onChange={(checked) => patchDoc((next) => { next.pages.product.gallerySwipeEnabled = checked; })}
                />
                <SettingToggle
                  label={tr('Buy box sticky')}
                  checked={doc.pages.product.stickyBuyBox}
                  onChange={(checked) => patchDoc((next) => { next.pages.product.stickyBuyBox = checked; })}
                />
                <SettingToggle
                  label={tr('Mostrar reseñas')}
                  checked={doc.pages.product.showReviews}
                  onChange={(checked) => patchDoc((next) => { next.pages.product.showReviews = checked; })}
                />
                <SettingToggle
                  label={tr('Mostrar relacionados')}
                  checked={doc.pages.product.showRelated}
                  onChange={(checked) => patchDoc((next) => { next.pages.product.showRelated = checked; })}
                />
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <AppModal
        opened={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        title={tr('Aprobación de publicación')}
        subtitle={tr('Workflow opcional para que los cambios del storefront pasen por revisión de plataforma.')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApprovalOpen(false)}>
              {tr('Cerrar')}
            </Button>
            {state.canApprove && state.approval.required && state.approval.status === 'PENDING' ? (
              <>
                <Button variant="secondary" onClick={() => void rejectApproval()} disabled={Boolean(busy)}>
                  {tr('Rechazar')}
                </Button>
                <Button icon="check" onClick={() => void approveApproval()} disabled={Boolean(busy)}>
                  {busy === 'approval' ? tr('Aprobando...') : tr('Aprobar')}
                </Button>
              </>
            ) : null}
            {!state.canApprove &&
            state.approval.required &&
            (state.approval.status === 'NONE' || state.approval.status === 'REJECTED') ? (
              <Button icon="send" onClick={() => void submitApproval()} disabled={Boolean(busy)}>
                {busy === 'approval' ? tr('Enviando...') : tr('Enviar a revisión')}
              </Button>
            ) : null}
            {!state.canApprove &&
            state.approval.required &&
            state.approval.status === 'APPROVED' ? (
              <Button
                icon="publish"
                onClick={() => {
                  setApprovalOpen(false);
                  void handlePublish();
                }}
                disabled={Boolean(busy)}
              >
                {tr('Publicar')}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {state.canApprove ? (
            <SettingToggle
              label={tr('Requerir aprobación de plataforma')}
              checked={state.approval.required}
              onChange={(checked) => void setApprovalRequired(checked)}
            />
          ) : null}

          {state.approval.required ? (
            <>
              <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                    {tr('Estado')}
                  </span>
                  <span className="rounded-full bg-surface-container-lowest px-2.5 py-1 font-label-sm text-label-sm text-on-surface">
                    {approvalLabels[state.approval.status]}
                  </span>
                </div>
                {state.approval.requestedAt ? (
                  <p className="mt-2 font-body-sm text-[11px] text-on-surface-variant">
                    {tr('Enviado:')} {new Date(state.approval.requestedAt).toLocaleString(locale)}
                  </p>
                ) : null}
                {state.approval.reviewedAt ? (
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    {tr('Revisado:')} {new Date(state.approval.reviewedAt).toLocaleString(locale)}
                  </p>
                ) : null}
                {state.approval.note ? (
                  <p className="mt-2 rounded bg-surface-container-lowest px-2 py-1.5 font-body-sm text-[11px] text-on-surface-variant">
                    {tr('Nota:')} {state.approval.note}
                  </p>
                ) : null}
                {state.approval.hashMatches === false ? (
                  <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 font-body-sm text-[11px] text-amber-800">
                    {tr('El borrador cambió desde la última revisión. Hay que enviarlo de nuevo.')}
                  </p>
                ) : null}
              </div>

              {state.canApprove && state.approval.status === 'PENDING' ? (
                <Field label={tr('Nota de revisión')}>
                  <Textarea
                    rows={3}
                    value={approvalNote}
                    onChange={(event) => setApprovalNote(event.currentTarget.value)}
                    placeholder={tr('Opcional: qué revisar o por qué se rechaza')}
                  />
                </Field>
              ) : null}

              {!state.canApprove && state.approval.status === 'PENDING' ? (
                <p className="rounded-lg bg-blue-50 px-3 py-2 font-body-sm text-body-sm text-blue-800">
                  {tr('El borrador está en revisión. Cuando plataforma lo apruebe vas a poder publicarlo.')}
                </p>
              ) : null}
              {!state.canApprove && state.approval.status === 'APPROVED' ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 font-body-sm text-body-sm text-emerald-800">
                  {tr('Aprobado. Ya podés publicar esta versión.')}
                </p>
              ) : null}
            </>
          ) : (
            <p className="rounded-lg bg-surface-container-low px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
              {state.canApprove
                ? tr('Al activarlo, los admins del cliente dejan de publicar directo y deben enviar el borrador a revisión.')
                : tr('La publicación está en modo directo. Plataforma puede activar un workflow de aprobación para este cliente.')}
            </p>
          )}
        </div>
      </AppModal>

      <AppModal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        title={tr('Marketplace de temas')}
        subtitle={tr('Explorá el tema publicado de otros clientes y clonalo al borrador actual. No copia productos, pedidos ni credenciales.')}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              {tr('Cancelar')}
            </Button>
            <Button icon="content_copy" onClick={() => void importTheme()} disabled={!importSource || importing}>
              {importing ? tr('Importando...') : tr('Usar este tema')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {importLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 font-body-sm text-body-sm text-on-surface-variant">
              <Icon name="progress_activity" className="animate-spin text-[20px]" />
              {tr('Cargando temas de clientes...')}
            </div>
          ) : importThemes.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {tr('No hay otros clientes con temas disponibles para importar.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {importThemes.map((theme) => {
                const hero = theme.doc.pages.home.sections.find(
                  (section): section is Extract<StorefrontSection, { type: 'hero' }> =>
                    section.type === 'hero',
                );
                const selected = importSource === theme.tenant.slug;
                return (
                  <button
                    key={theme.tenant.id}
                    type="button"
                    onClick={() => setImportSource(theme.tenant.slug)}
                    className={`overflow-hidden rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-outline-variant/40 hover:border-primary/60'
                    }`}
                  >
                    <div
                      style={{
                        backgroundColor: theme.doc.tokens.colors.canvas,
                        color: theme.doc.tokens.colors.text,
                      }}
                    >
                      {hero?.settings.imageUrl ? (
                        <img
                          src={hero.settings.imageUrl}
                          alt=""
                          className="h-32 w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-32 items-center justify-center"
                          style={{ backgroundColor: theme.doc.tokens.colors.surfaceMuted }}
                        >
                          <Icon name="palette" className="text-[32px] opacity-40" />
                        </div>
                      )}
                      <div className="p-3">
                        <p
                          className="line-clamp-2 text-[18px] font-semibold leading-tight"
                          style={{ fontFamily: 'var(--font-heading, inherit)' }}
                        >
                          {hero?.settings.title || theme.tenant.name}
                        </p>
                        <p className="mt-1 font-label-sm text-[10px] uppercase tracking-wider opacity-60">
                          {theme.doc.presetKey} · v{theme.version}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-surface-container-lowest px-3 py-2">
                      <div>
                        <p className="font-label-md text-label-md font-semibold text-on-surface">
                          {theme.tenant.name}
                        </p>
                        <p className="font-label-sm text-[10px] text-on-surface-variant">
                          {theme.tenant.slug}
                        </p>
                      </div>
                      {selected ? (
                        <span className="rounded-full bg-primary px-2 py-1 font-label-sm text-[10px] text-on-primary">
                          {tr('Seleccionado')}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="rounded-lg bg-surface-container-low px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
            {tr('Revisá imágenes y categorías antes de publicar: el catálogo y la configuración comercial del cliente destino no se modifican.')}
          </p>
        </div>
      </AppModal>

      <AppModal
        opened={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        title={tr('Guardar como preset')}
        subtitle={tr('Guardá el borrador actual como una plantilla reutilizable para este cliente.')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPresetModalOpen(false)}>
              {tr('Cancelar')}
            </Button>
            <Button icon="bookmark_add" onClick={() => void saveAsPreset()} disabled={Boolean(busy)}>
              {busy === 'preset' ? tr('Guardando...') : tr('Guardar preset')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={tr('Nombre')} required>
            <Input value={presetName} onChange={(event) => setPresetName(event.currentTarget.value)} placeholder={tr('Ej: Coffee Editorial — verano')} />
          </Field>
          <Field label={tr('Descripción')}>
            <Textarea rows={3} value={presetDescription} onChange={(event) => setPresetDescription(event.currentTarget.value)} placeholder={tr('Para qué sirve o qué lo hace distinto')} />
          </Field>
        </div>
      </AppModal>

      <AppModal
        opened={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title={tr('Versiones publicadas')}
        subtitle={tr('Restaurar una versión la copia al borrador para que la revises antes de publicar.')}
        size="md"
        footer={<Button variant="secondary" onClick={() => setVersionsOpen(false)}>{tr('Cerrar')}</Button>}
      >
        {versionsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 font-body-sm text-body-sm text-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[20px]" />
            {tr('Cargando versiones...')}
          </div>
        ) : versions.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">{tr('Todavía no publicaste ninguna versión.')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {versions.map((version) => (
              <div key={version.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2.5">
                <div>
                  <div className="font-label-md text-label-md text-on-surface">{tr('Versión {{version}}', { version: version.version })}</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    {new Date(version.createdAt).toLocaleString(locale)}
                  </div>
                </div>
                <Button
                  variant="secondary"

                  onClick={() => void restoreVersion(version.id)}
                  disabled={busy === 'restore'}
                >
                  {tr('Restaurar')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </AppModal>
    </div>
  );
}

function InspectorTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-outline-variant/30 pb-3">
      <Icon name={icon} className="text-[20px] text-secondary" />
      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{title}</h2>
    </div>
  );
}

function SectionInspector({
  section,
  onChange,
  onVariantChange,
  onVisibleChange,
  onCtasChange,
  onFaqChange,
  onMotionChange,
}: {
  section: StorefrontSection;
  onChange: (key: string, value: unknown) => void;
  onVariantChange: (value: string) => void;
  onVisibleChange: (checked: boolean) => void;
  onCtasChange: (ctas: Array<{ label: string; href: string; style: 'solid' | 'outline' }>) => void;
  onFaqChange: (items: Array<{ question: string; answer: string }>) => void;
  onMotionChange: (
    key: 'reveal' | 'delay' | 'hover' | 'parallax' | 'stickyMedia',
    value: unknown,
  ) => void;
}) {
  const tr = useDesignT();
  const settings = getSettings(section);
  const text = (key: string) => String(settings[key] ?? '');
  const number = (key: string) => Number(settings[key] ?? 0);
  const showcaseStory = (settings.story ?? {}) as {
    enabled?: boolean;
    title?: string;
    text?: string;
    linkLabel?: string;
    linkHref?: string;
  };

  return (
    <Card className="p-5">
      <InspectorTitle icon="tune" title={tr(STOREFRONT_SECTION_LABELS[section.type])} />
      <div className="flex flex-col gap-4">
        {'variant' in section ? (
          <Field label={tr('Variante')}>
            <Select
              value={section.variant}
              onChange={(event) => onVariantChange(event.currentTarget.value)}
            >
              {variantsFor(section.type).map((variant) => (
                <option key={variant} value={variant}>
                  {tr({ fullBleed: 'Full bleed', split: 'Split', asymmetric: 'Asimétrico', minimal: 'Minimal', bento: 'Bento', grid: 'Grilla', editorial: 'Editorial', list: 'Lista', tiles: 'Mosaicos', overlap: 'Overlap', pinned: 'Pinned', panel: 'Panel', banner: 'Banner', box: 'Box', inline: 'Inline', accordion: 'Acordeón', columns: 'Columnas', default: 'Default' }[variant] ?? variant)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {section.type === 'hero' ? (
          <>
            <SettingField label={tr('Eyebrow')} value={text('eyebrow')} onChange={(value) => onChange('eyebrow', value)} />
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('Subtítulo')} rows={3} value={text('subtitle')} onChange={(value) => onChange('subtitle', value)} />
            <ImageSettingField label={tr('Imagen')} value={text('imageUrl')} onChange={(value) => onChange('imageUrl', value)} />
            <Field label={tr('Encuadre de imagen')}>
              <Select
                value={text('imageFocalPoint') || 'center'}
                onChange={(event) => onChange('imageFocalPoint', event.currentTarget.value)}
              >
                <option value="center">{tr('Centro')}</option>
                <option value="top">{tr('Arriba')}</option>
                <option value="bottom">{tr('Abajo')}</option>
                <option value="left">{tr('Izquierda')}</option>
                <option value="right">{tr('Derecha')}</option>
              </Select>
            </Field>
            <SettingField
              label={tr('Zoom de imagen (%)')}
              type="number"
              value={number('imageScale') || 100}
              onChange={(value) => onChange('imageScale', Math.max(100, Math.min(200, Number(value) || 100)))}
            />
            <SettingField label={tr('Overlay (0-1)')} type="number" value={number('overlay')} onChange={(value) => onChange('overlay', Math.max(0, Math.min(1, Number(value) || 0)))} />
            <SettingField label={tr('Altura mínima')} value={text('minHeight')} onChange={(value) => onChange('minHeight', value)} />
            <Field label={tr('Alineación')}>
              <Select value={text('align')} onChange={(event) => onChange('align', event.currentTarget.value)}>
                <option value="left">{tr('Izquierda')}</option>
                <option value="center">{tr('Centro')}</option>
              </Select>
            </Field>
            <SettingToggle
              label={tr('Badge giratorio')}
              checked={Boolean(settings.showBadge)}
              onChange={(checked) => onChange('showBadge', checked)}
            />
            {settings.showBadge ? (
              <>
                <SettingField
                  label={tr('Texto del badge')}
                  value={text('badgeText')}
                  onChange={(value) => onChange('badgeText', value)}
                  placeholder="NÖVA • DROP 01 •"
                />
                <SettingField
                  label={tr('Centro del badge')}
                  value={text('badgeCenter')}
                  onChange={(value) => onChange('badgeCenter', value)}
                  placeholder="01"
                />
              </>
            ) : null}
            <CtasEditor ctas={Array.isArray(settings.ctas) ? settings.ctas as Array<{ label: string; href: string; style: 'solid' | 'outline' }> : []} onChange={onCtasChange} />
          </>
        ) : null}

        {section.type === 'productGrid' ? (
          <>
            <SettingField label={tr('Eyebrow')} value={text('eyebrow')} onChange={(value) => onChange('eyebrow', value)} />
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('Descripción')} rows={3} value={text('description')} onChange={(value) => onChange('description', value)} />
            <div className="grid grid-cols-2 gap-3">
              <SettingField label={tr('Límite')} type="number" value={number('limit')} onChange={(value) => onChange('limit', Math.max(1, Math.min(24, Number(value) || 8)))} />
              <SettingField label={tr('Columnas')} type="number" value={number('columns')} onChange={(value) => onChange('columns', Math.max(2, Math.min(6, Number(value) || 4)))} />
            </div>
            <SettingField label={tr('Categoría (slug)')} value={text('categorySlug')} onChange={(value) => onChange('categorySlug', value)} />
            <SettingField label={tr('CTA')} value={text('ctaLabel')} onChange={(value) => onChange('ctaLabel', value)} />
            <SettingField label={tr('Link CTA')} value={text('ctaHref')} onChange={(value) => onChange('ctaHref', value)} />
          </>
        ) : null}

        {section.type === 'categories' ? (
          <>
            <SettingField label={tr('Eyebrow')} value={text('eyebrow')} onChange={(value) => onChange('eyebrow', value)} />
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('Descripción')} value={text('description')} onChange={(value) => onChange('description', value)} />
          </>
        ) : null}

        {section.type === 'showcase' ? (
          <>
            <SettingField label={tr('Eyebrow')} value={text('eyebrow')} onChange={(value) => onChange('eyebrow', value)} />
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('CTA')} value={text('linkLabel')} onChange={(value) => onChange('linkLabel', value)} />
            <SettingField label={tr('Link CTA')} value={text('linkHref')} onChange={(value) => onChange('linkHref', value)} />
            <SettingField label={tr('Categoría (slug)')} value={text('categorySlug')} onChange={(value) => onChange('categorySlug', value)} />
            <SettingToggle
              label={tr('Mostrar historia')}
              checked={showcaseStory.enabled !== false}
              onChange={(checked) => onChange('story', { ...showcaseStory, enabled: checked })}
            />
            <SettingField
              label={tr('Título de la historia')}
              value={showcaseStory.title ?? ''}
              onChange={(value) => onChange('story', { ...showcaseStory, title: value })}
            />
            <SettingField
              label={tr('Texto de la historia')}
              rows={4}
              value={showcaseStory.text ?? ''}
              onChange={(value) => onChange('story', { ...showcaseStory, text: value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <SettingField
                label={tr('CTA historia')}
                value={showcaseStory.linkLabel ?? ''}
                onChange={(value) => onChange('story', { ...showcaseStory, linkLabel: value })}
              />
              <SettingField
                label={tr('Link historia')}
                value={showcaseStory.linkHref ?? ''}
                onChange={(value) => onChange('story', { ...showcaseStory, linkHref: value })}
              />
            </div>
          </>
        ) : null}

        {section.type === 'countdown' ? (
          <>
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField
              label={tr('Fecha objetivo')}
              type="datetime-local"
              value={text('targetAt')}
              onChange={(value) => onChange('targetAt', value)}
            />
            <SettingField
              label={tr('Texto al finalizar')}
              value={text('finishedLabel')}
              onChange={(value) => onChange('finishedLabel', value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <ColorField label={tr('Fondo')} value={String(settings.backgroundColor ?? '#0D0D0D')} onChange={(value) => onChange('backgroundColor', value)} />
              <ColorField label={tr('Texto')} value={String(settings.textColor ?? '#FCF9F8')} onChange={(value) => onChange('textColor', value)} />
            </div>
          </>
        ) : null}

        {section.type === 'productSpotlight' ? (
          <>
            <SettingField label={tr('Eyebrow')} value={text('eyebrow')} onChange={(value) => onChange('eyebrow', value)} />
            <SettingField label={tr('Título (vacío = nombre del producto)')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('Texto')} rows={4} value={text('text')} onChange={(value) => onChange('text', value)} />
            <SettingField label={tr('Producto (slug)')} value={text('productSlug')} onChange={(value) => onChange('productSlug', value)} />
            <Field label={tr('Posición de imagen')}>
              <Select value={text('imagePosition') || 'right'} onChange={(event) => onChange('imagePosition', event.currentTarget.value)}>
                <option value="left">{tr('Izquierda')}</option>
                <option value="right">{tr('Derecha')}</option>
              </Select>
            </Field>
            <SettingField label={tr('CTA')} value={text('ctaLabel')} onChange={(value) => onChange('ctaLabel', value)} />
            <SettingToggle label={tr('Mostrar precio')} checked={settings.showPrice !== false} onChange={(checked) => onChange('showPrice', checked)} />
            <div className="grid grid-cols-2 gap-3">
              <ColorField label={tr('Fondo')} value={String(settings.backgroundColor ?? '#0D0D0D')} onChange={(value) => onChange('backgroundColor', value)} />
              <ColorField label={tr('Texto')} value={String(settings.textColor ?? '#FCF9F8')} onChange={(value) => onChange('textColor', value)} />
            </div>
          </>
        ) : null}

        {section.type === 'story' ? (
          <>
            <SettingField label={tr('Eyebrow')} value={text('eyebrow')} onChange={(value) => onChange('eyebrow', value)} />
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('Texto')} rows={4} value={text('text')} onChange={(value) => onChange('text', value)} />
            <ImageSettingField label={tr('Imagen')} value={text('imageUrl')} onChange={(value) => onChange('imageUrl', value)} />
            <Field label={tr('Encuadre de imagen')}>
              <Select
                value={text('imageFocalPoint') || 'center'}
                onChange={(event) => onChange('imageFocalPoint', event.currentTarget.value)}
              >
                <option value="center">{tr('Centro')}</option>
                <option value="top">{tr('Arriba')}</option>
                <option value="bottom">{tr('Abajo')}</option>
                <option value="left">{tr('Izquierda')}</option>
                <option value="right">{tr('Derecha')}</option>
              </Select>
            </Field>
            <SettingField
              label={tr('Zoom de imagen (%)')}
              type="number"
              value={number('imageScale') || 100}
              onChange={(value) => onChange('imageScale', Math.max(100, Math.min(200, Number(value) || 100)))}
            />
            <Field label={tr('Posición de imagen')}>
              <Select value={text('imagePosition')} onChange={(event) => onChange('imagePosition', event.currentTarget.value)}>
                <option value="left">{tr('Izquierda')}</option>
                <option value="right">{tr('Derecha')}</option>
              </Select>
            </Field>
            <SettingField label={tr('CTA')} value={text('linkLabel')} onChange={(value) => onChange('linkLabel', value)} />
            <SettingField label={tr('Link CTA')} value={text('linkHref')} onChange={(value) => onChange('linkHref', value)} />
          </>
        ) : null}

        {section.type === 'scrollStory' ? (
          <>
            <ImageSettingField label={tr('Imagen sticky')} value={text('imageUrl')} onChange={(value) => onChange('imageUrl', value)} />
            <Field label={tr('Encuadre de imagen')}>
              <Select
                value={text('imageFocalPoint') || 'center'}
                onChange={(event) => onChange('imageFocalPoint', event.currentTarget.value)}
              >
                <option value="center">{tr('Centro')}</option>
                <option value="top">{tr('Arriba')}</option>
                <option value="bottom">{tr('Abajo')}</option>
                <option value="left">{tr('Izquierda')}</option>
                <option value="right">{tr('Derecha')}</option>
              </Select>
            </Field>
            <SettingField
              label={tr('Zoom de imagen (%)')}
              type="number"
              value={number('imageScale') || 100}
              onChange={(value) => onChange('imageScale', Math.max(100, Math.min(200, Number(value) || 100)))}
            />
            <div className="grid grid-cols-2 gap-3">
              <ColorField label={tr('Fondo')} value={String(settings.backgroundColor ?? '#FCF9F8')} onChange={(value) => onChange('backgroundColor', value)} />
              <ColorField label={tr('Texto')} value={String(settings.textColor ?? '#1F1B16')} onChange={(value) => onChange('textColor', value)} />
            </div>
            <SettingField label={tr('CTA')} value={text('linkLabel')} onChange={(value) => onChange('linkLabel', value)} />
            <SettingField label={tr('Link CTA')} value={text('linkHref')} onChange={(value) => onChange('linkHref', value)} />
            <ScrollStoryStepsEditor
              steps={
                Array.isArray(settings.steps)
                  ? (settings.steps as Array<{ eyebrow: string; title: string; text: string }>)
                  : []
              }
              onChange={(steps) => onChange('steps', steps)}
            />
          </>
        ) : null}

        {section.type === 'promo' ? (
          <>
            <SettingField label={tr('Eyebrow')} value={text('eyebrow')} onChange={(value) => onChange('eyebrow', value)} />
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('Subtítulo')} rows={3} value={text('subtitle')} onChange={(value) => onChange('subtitle', value)} />
            <SettingField label={tr('Link')} value={text('link')} onChange={(value) => onChange('link', value)} />
            <SettingField label={tr('Botón')} value={text('buttonLabel')} onChange={(value) => onChange('buttonLabel', value)} />
            <ColorField label={tr('Fondo')} value={String(settings.backgroundColor ?? '#6F7A4E')} onChange={(value) => onChange('backgroundColor', value)} />
            <ColorField label={tr('Texto')} value={String(settings.textColor ?? '#FCF9F8')} onChange={(value) => onChange('textColor', value)} />
            <div className="grid grid-cols-2 gap-3">
              <SettingField label={tr('Programar desde')} type="datetime-local" value={text('startsAt')} onChange={(value) => onChange('startsAt', value)} />
              <SettingField label={tr('Programar hasta')} type="datetime-local" value={text('endsAt')} onChange={(value) => onChange('endsAt', value)} />
            </div>
          </>
        ) : null}

        {section.type === 'newsletter' ? (
          <>
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <SettingField label={tr('Descripción')} rows={3} value={text('description')} onChange={(value) => onChange('description', value)} />
            <SettingField label={tr('Botón')} value={text('buttonLabel')} onChange={(value) => onChange('buttonLabel', value)} />
          </>
        ) : null}

        {section.type === 'marquee' ? (
          <>
            <SettingField
              label={tr('Items (uno por línea)')}
              rows={4}
              value={Array.isArray(settings.items) ? (settings.items as string[]).join('\n') : ''}
              onChange={(value) => onChange('items', value.split('\n').map((item) => item.trim()).filter(Boolean))}
            />
            <ColorField label={tr('Fondo')} value={String(settings.backgroundColor ?? '#6F7A4E')} onChange={(value) => onChange('backgroundColor', value)} />
            <ColorField label={tr('Texto')} value={String(settings.textColor ?? '#FCF9F8')} onChange={(value) => onChange('textColor', value)} />
          </>
        ) : null}

        {section.type === 'faq' ? (
          <>
            <SettingField label={tr('Título')} value={text('title')} onChange={(value) => onChange('title', value)} />
            <FaqEditor
              items={Array.isArray(settings.items) ? settings.items as Array<{ question: string; answer: string }> : []}
              onChange={onFaqChange}
            />
          </>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-outline-variant/30 pt-4">
          <p className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
            {tr('Animación de la sección')}
          </p>
          <Field label={tr('Reveal')}>
            <Select
              value={section.motion.reveal}
              onChange={(event) => onMotionChange('reveal', event.currentTarget.value)}
            >
              <option value="inherit">{tr('Heredar del tema')}</option>
              <option value="none">{tr('Sin reveal')}</option>
              <option value="fade">{tr('Fade')}</option>
              <option value="rise">{tr('Rise')}</option>
              <option value="clip">{tr('Clip')}</option>
              <option value="scale">{tr('Scale')}</option>
            </Select>
          </Field>
          <Field label={tr('Delay')}>
            <Select
              value={section.motion.delay}
              onChange={(event) => onMotionChange('delay', event.currentTarget.value)}
            >
              <option value="none">{tr('Sin delay')}</option>
              <option value="short">{tr('Corto')}</option>
              <option value="medium">{tr('Medio')}</option>
            </Select>
          </Field>
          <Field label={tr('Hover de cards')}>
            <Select
              value={section.motion.hover}
              onChange={(event) => onMotionChange('hover', event.currentTarget.value)}
            >
              <option value="inherit">{tr('Heredar del tema')}</option>
              <option value="none">{tr('Sin hover')}</option>
              <option value="lift">{tr('Lift')}</option>
              <option value="zoom">{tr('Zoom')}</option>
              <option value="swap">{tr('Cambio de imagen')}</option>
            </Select>
          </Field>
          {section.type === 'hero' || section.type === 'story' ? (
            <Field label={tr('Parallax')}>
              <Select
                value={section.motion.parallax}
                onChange={(event) => onMotionChange('parallax', event.currentTarget.value)}
              >
                <option value="inherit">{tr('Heredar del tema')}</option>
                <option value="none">{tr('Sin parallax')}</option>
                <option value="subtle">{tr('Sutil')}</option>
                <option value="strong">{tr('Marcado')}</option>
              </Select>
            </Field>
          ) : null}
          {section.type === 'story' ? (
            <SettingToggle
              label={tr('Media sticky')}
              checked={section.motion.stickyMedia}
              onChange={(checked) => onMotionChange('stickyMedia', checked)}
            />
          ) : null}
          <p className="font-label-sm text-[10px] leading-snug text-on-surface-variant">
            {tr('El hero anima su contenido al cargar; el reveal de la sección aplica al entrar en viewport. El parallax se desactiva con movimiento reducido.')}
          </p>
        </div>

        <SettingToggle label={tr('Visible')} checked={section.visible} onChange={onVisibleChange} />
      </div>
    </Card>
  );
}

function variantsFor(type: StorefrontSectionType): string[] {
  switch (type) {
    case 'hero':
      return ['fullBleed', 'split', 'asymmetric', 'minimal'];
    case 'showcase':
      return ['bento'];
    case 'productGrid':
      return ['grid', 'editorial', 'list'];
    case 'categories':
      return ['tiles', 'list'];
    case 'story':
      return ['split', 'fullBleed', 'overlap'];
    case 'scrollStory':
      return ['pinned'];
    case 'countdown':
      return ['panel'];
    case 'productSpotlight':
      return ['split'];
    case 'promo':
      return ['banner', 'box'];
    case 'newsletter':
      return ['inline'];
    case 'marquee':
      return ['default'];
    case 'faq':
      return ['accordion', 'columns'];
  }
}

function CtasEditor({
  ctas,
  onChange,
}: {
  ctas: Array<{ label: string; href: string; style: 'solid' | 'outline' }>;
  onChange: (ctas: Array<{ label: string; href: string; style: 'solid' | 'outline' }>) => void;
}) {
  const tr = useDesignT();
  const update = (index: number, patch: Partial<{ label: string; href: string; style: 'solid' | 'outline' }>) => {
    const next = ctas.map((cta, current) => (current === index ? { ...cta, ...patch } : cta));
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low p-3">
      <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">{tr('Botones')}</span>
      {ctas.map((cta, index) => (
        <div key={index} className="grid grid-cols-2 gap-2">
          <Input value={cta.label} placeholder={tr('Label')} onChange={(event) => update(index, { label: event.currentTarget.value })} />
          <Input value={cta.href} placeholder="/link" onChange={(event) => update(index, { href: event.currentTarget.value })} />
          <Select value={cta.style} onChange={(event) => update(index, { style: event.currentTarget.value as 'solid' | 'outline' })}>
            <option value="solid">{tr('Sólido')}</option>
            <option value="outline">{tr('Outline')}</option>
          </Select>
          <Button variant="ghost" icon="delete" onClick={() => onChange(ctas.filter((_, current) => current !== index))} className="text-error">
            {tr('Quitar')}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        icon="add"
        onClick={() => onChange([...ctas, { label: tr('Ver más'), href: '/catalogo', style: 'outline' }])}
      >
        {tr('Agregar botón')}
      </Button>
    </div>
  );
}

function FaqEditor({
  items,
  onChange,
}: {
  items: Array<{ question: string; answer: string }>;
  onChange: (items: Array<{ question: string; answer: string }>) => void;
}) {
  const tr = useDesignT();
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3">
          <Input
            value={item.question}
            placeholder={tr('Pregunta')}
            onChange={(event) => {
              const next = items.map((current, currentIndex) => currentIndex === index ? { ...current, question: event.currentTarget.value } : current);
              onChange(next);
            }}
          />
          <Textarea
            rows={2}
            value={item.answer}
            placeholder={tr('Respuesta')}
            onChange={(event) => {
              const next = items.map((current, currentIndex) => currentIndex === index ? { ...current, answer: event.currentTarget.value } : current);
              onChange(next);
            }}
          />
          <Button variant="ghost" icon="delete" onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}>
            {tr('Quitar')}
          </Button>
        </div>
      ))}
      <Button variant="secondary" icon="add" onClick={() => onChange([...items, { question: '', answer: '' }])}>
        {tr('Agregar pregunta')}
      </Button>
    </div>
  );
}

function ScrollStoryStepsEditor({
  steps,
  onChange,
}: {
  steps: Array<{ eyebrow: string; title: string; text: string }>;
  onChange: (steps: Array<{ eyebrow: string; title: string; text: string }>) => void;
}) {
  const tr = useDesignT();
  const update = (index: number, patch: Partial<{ eyebrow: string; title: string; text: string }>) => {
    onChange(steps.map((step, current) => (current === index ? { ...step, ...patch } : step)));
  };

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
              {tr('Paso {{number}}', { number: String(index + 1).padStart(2, '0') })}
            </span>
            <Button variant="ghost" icon="delete" onClick={() => onChange(steps.filter((_, current) => current !== index))}>
              {tr('Quitar')}
            </Button>
          </div>
          <Input
            value={step.eyebrow}
            placeholder={tr('Eyebrow')}
            onChange={(event) => update(index, { eyebrow: event.currentTarget.value })}
          />
          <Input
            value={step.title}
            placeholder={tr('Título')}
            onChange={(event) => update(index, { title: event.currentTarget.value })}
          />
          <Textarea
            rows={3}
            value={step.text}
            placeholder={tr('Texto')}
            onChange={(event) => update(index, { text: event.currentTarget.value })}
          />
        </div>
      ))}
      <Button
        variant="secondary"
        icon="add"
        onClick={() => onChange([...steps, { eyebrow: '', title: '', text: '' }])}
        disabled={steps.length >= 6}
      >
        {tr('Agregar paso')}
      </Button>
    </div>
  );
}

function ExperimentInspector({
  doc,
  patchDoc,
}: {
  doc: StorefrontDocument;
  patchDoc: (updater: (next: StorefrontDocument) => void) => void;
}) {
  const tr = useDesignT();
  const experiment = doc.experiments[0] as StorefrontExperiment | undefined;
  const heroes = doc.pages.home.sections.filter(
    (section): section is Extract<StorefrontSection, { type: 'hero' }> => section.type === 'hero',
  );
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!experiment?.id) {
      setResults(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiRequest<ExperimentResults>(
      `/admin/storefront/experiments/${encodeURIComponent(experiment.id)}/results`,
    )
      .then((response) => {
        if (!cancelled) setResults(response);
      })
      .catch(() => {
        if (!cancelled) setResults(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [experiment?.id, refresh]);

  const update = (patch: (item: StorefrontExperiment) => void) => {
    patchDoc((next) => {
      const item = next.experiments[0];
      if (item) patch(item);
    });
  };

  const createExperiment = () => {
    const hero = heroes[0];
    patchDoc((next) => {
      next.experiments = [
        {
          id: `hero-${Date.now().toString(36)}`,
          name: tr('Test del título principal'),
          enabled: false,
          target: 'heroTitle',
          sectionId: hero?.id ?? '',
          variantA: hero?.settings.title ?? '',
          variantB: '',
          split: 50,
          startedAt: '',
          endedAt: '',
        },
      ];
    });
  };

  const variantA = results?.variants.find((item) => item.variant === 'A');
  const variantB = results?.variants.find((item) => item.variant === 'B');
  const ctr = (value: number | undefined) => `${((value ?? 0) * 100).toFixed(1)}%`;

  return (
    <Card className="p-5">
      <InspectorTitle icon="science" title={tr('Experimento A/B')} />
      {!experiment ? (
        <div className="flex flex-col gap-3">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {tr('Probá dos títulos del hero o dos personalidades de movimiento y medí cuál genera más clics. La asignación es estable por visitante.')}
          </p>
          <Button variant="secondary" icon="add" onClick={createExperiment}>
            {tr('Crear experimento')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SettingToggle
            label={tr('Experimento activo')}
            checked={experiment.enabled}
            onChange={(checked) => update((item) => { item.enabled = checked; })}
          />
          <SettingField
            label={tr('Nombre')}
            value={experiment.name}
            onChange={(value) => update((item) => { item.name = value; })}
          />
          <Field label={tr('Qué se testea')}>
            <Select
              value={experiment.target}
              onChange={(event) => {
                const target = event.currentTarget.value as 'heroTitle' | 'motion';
                update((item) => {
                  item.target = target;
                  if (target === 'motion') {
                    if (!(STOREFRONT_MOTION_PRESET_VALUES as readonly string[]).includes(item.variantA)) {
                      item.variantA = 'quiet';
                    }
                    if (!(STOREFRONT_MOTION_PRESET_VALUES as readonly string[]).includes(item.variantB)) {
                      item.variantB = 'kinetic';
                    }
                  } else {
                    item.variantA = heroes[0]?.settings.title ?? '';
                    item.variantB = '';
                  }
                });
              }}
            >
              <option value="heroTitle">{tr('Título del hero')}</option>
              <option value="motion">{tr('Perfil de movimiento')}</option>
            </Select>
          </Field>
          {experiment.target === 'heroTitle' ? (
            <>
              <Field label={tr('Hero objetivo')}>
                <Select
                  value={experiment.sectionId}
                  onChange={(event) => update((item) => { item.sectionId = event.currentTarget.value; })}
                >
                  <option value="">{tr('Primer hero visible')}</option>
                  {heroes.map((hero, index) => (
                    <option key={hero.id} value={hero.id}>
                      {tr('Hero {{number}} — {{title}}', { number: index + 1, title: hero.settings.title || tr('sin título') })}
                    </option>
                  ))}
                </Select>
              </Field>
              <SettingField
                label={tr('Título A')}
                value={experiment.variantA}
                placeholder={tr('Vacío = título actual')}
                onChange={(value) => update((item) => { item.variantA = value; })}
              />
              <SettingField
                label={tr('Título B')}
                value={experiment.variantB}
                placeholder={tr('Título alternativo')}
                onChange={(value) => update((item) => { item.variantB = value; })}
              />
            </>
          ) : (
            <>
              <Field label={tr('Movimiento A')}>
                <Select
                  value={experiment.variantA}
                  onChange={(event) => update((item) => { item.variantA = event.currentTarget.value; })}
                >
                  {STOREFRONT_MOTION_PRESET_VALUES.map((preset) => (
                    <option key={preset} value={preset}>
                      {tr({ none: 'Sin movimiento', quiet: 'Quiet — sutil', editorial: 'Editorial — narrativo', kinetic: 'Kinetic — drop' }[preset])}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={tr('Movimiento B')}>
                <Select
                  value={experiment.variantB}
                  onChange={(event) => update((item) => { item.variantB = event.currentTarget.value; })}
                >
                  {STOREFRONT_MOTION_PRESET_VALUES.map((preset) => (
                    <option key={preset} value={preset}>
                      {tr({ none: 'Sin movimiento', quiet: 'Quiet — sutil', editorial: 'Editorial — narrativo', kinetic: 'Kinetic — drop' }[preset])}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="rounded-lg bg-surface-container-low px-3 py-2 font-body-sm text-[11px] leading-snug text-on-surface-variant">
                {tr('El experimento de movimiento aplica el perfil al home de la tienda publicada. El parallax y la transición de página se mantienen.')}
              </p>
            </>
          )}
          <SettingField
            label={tr('Tráfico a la variante B (%)')}
            type="number"
            value={experiment.split}
            onChange={(value) => update((item) => {
              item.split = Math.max(1, Math.min(99, Number(value) || 50));
            })}
          />
          <div className="grid grid-cols-2 gap-3">
            <SettingField
              label={tr('Desde')}
              type="datetime-local"
              value={experiment.startedAt}
              onChange={(value) => update((item) => { item.startedAt = value; })}
            />
            <SettingField
              label={tr('Hasta')}
              type="datetime-local"
              value={experiment.endedAt}
              onChange={(value) => update((item) => { item.endedAt = value; })}
            />
          </div>
          {experiment.enabled && !experiment.variantB.trim() ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 font-body-sm text-body-sm text-amber-800">
              {tr('Cargá una variante B para que el experimento entre en juego.')}
            </p>
          ) : null}

          <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                {tr('Resultados')}
              </span>
              <button
                type="button"
                title={tr('Actualizar resultados')}
                onClick={() => setRefresh((value) => value + 1)}
                className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high"
              >
                <Icon name={loading ? 'progress_activity' : 'refresh'} className={`text-[16px] ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['A', variantA],
                ['B', variantB],
              ] as const).map(([label, data]) => (
                <div key={label} className="rounded bg-surface-container-lowest p-2">
                  <div className="font-label-sm text-[10px] uppercase text-on-surface-variant">{tr('Variante {{variant}}', { variant: label })}</div>
                  <div className="mt-1 font-numeric-tabular text-[18px] text-on-surface">{data?.impressions ?? 0}</div>
                  <div className="font-label-sm text-[10px] text-on-surface-variant">{tr('impresiones')}</div>
                  <div className="mt-1 font-label-md text-label-md text-on-surface">{ctr(data?.ctr)} CTR</div>
                  <div className="font-label-sm text-[10px] text-on-surface-variant">{tr('{{count}} clics', { count: data?.clicks ?? 0 })}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 font-label-sm text-[10px] leading-snug text-on-surface-variant">
              {tr('{{impressions}} impresiones y {{clicks}} clics registrados.', { impressions: results?.totalImpressions ?? 0, clicks: results?.totalClicks ?? 0 })}
            </p>
          </div>

          <Button variant="ghost" icon="delete" onClick={() => patchDoc((next) => { next.experiments = []; })}>
            {tr('Eliminar experimento')}
          </Button>
          <p className="font-label-sm text-[10px] leading-relaxed text-on-surface-variant">
            {tr('Se asigna con una cookie first-party. Los eventos se registran en la tienda publicada.')}
          </p>
        </div>
      )}
    </Card>
  );
}

const DEFAULT_SCRIPT_SANDBOX = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Inter, sans-serif; background: #fcf9f8; color: #1f1b16; padding: 24px; }
      button { padding: 10px 16px; border: 1px solid #1f1b16; background: #1f1b16; color: #fff; cursor: pointer; }
    </style>
  </head>
  <body>
    <h2>Sandbox de scripts</h2>
    <p id="message">El script todavía no se ejecutó.</p>
    <button id="action">Probar interacción</button>
    <script>
      const message = document.getElementById('message');
      const action = document.getElementById('action');
      action.addEventListener('click', () => {
        message.textContent = 'Script ejecutado dentro del sandbox: ' + new Date().toLocaleTimeString();
        message.style.color = '#3f6b4a';
      });
    </script>
  </body>
</html>`;

function ScriptSandboxInspector() {
  const tr = useDesignT();
  const [code, setCode] = useState(DEFAULT_SCRIPT_SANDBOX);
  const [sandboxDoc, setSandboxDoc] = useState(DEFAULT_SCRIPT_SANDBOX);
  const [runKey, setRunKey] = useState(0);

  const run = () => {
    setSandboxDoc(code);
    setRunKey((value) => value + 1);
  };

  return (
    <Card className="p-5">
      <InspectorTitle icon="code" title={tr('Script sandbox')} />
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-surface-container-low px-3 py-2 font-body-sm text-[11px] leading-snug text-on-surface-variant">
          {tr('Este editor ejecuta HTML/JS dentro de un iframe aislado con ')}<code>sandbox=&quot;allow-scripts&quot;</code>.
          {tr('No se guarda, no se publica y no puede acceder al admin ni a la sesión. Los scripts de producción se gestionan aparte en Configuración de la tienda.')}
        </p>
        <Field label={tr('HTML / JavaScript')}>
          <Textarea
            rows={14}
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
            spellCheck={false}
            style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12 }}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button icon="play_arrow" onClick={run}>
            {tr('Ejecutar en sandbox')}
          </Button>
          <Button variant="ghost" icon="restart_alt" onClick={() => setCode(DEFAULT_SCRIPT_SANDBOX)}>
            {tr('Restaurar ejemplo')}
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-low">
          <div className="flex items-center justify-between border-b border-outline-variant/30 px-3 py-1.5 font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
            <span>{tr('Resultado aislado')}</span>
            <span>sandbox=&quot;allow-scripts&quot;</span>
          </div>
          <iframe
            key={runKey}
            title={tr('Sandbox de scripts')}
            sandbox="allow-scripts"
            srcDoc={sandboxDoc}
            style={{ width: '100%', height: 360, border: 0, backgroundColor: '#fcf9f8' }}
          />
        </div>
      </div>
    </Card>
  );
}

function MotionInspector({
  doc,
  patchDoc,
}: {
  doc: StorefrontDocument;
  patchDoc: (updater: (next: StorefrontDocument) => void) => void;
}) {
  const tr = useDesignT();
  const motion = doc.motion;
  const update = (key: keyof typeof motion, value: unknown) => {
    patchDoc((next) => {
      (next.motion as Record<string, unknown>)[key] = value;
    });
  };
  const applyPreset = (preset: StorefrontMotionPreset) => {
    patchDoc((next) => {
      next.motion = { ...STOREFRONT_MOTION_PROFILES[preset] };
    });
  };

  return (
    <Card className="p-5">
      <InspectorTitle icon="animation" title={tr('Movimiento')} />
      <div className="flex flex-col gap-4">
        <Field label={tr('Perfil')}>
          <Select
            value={motion.preset}
            onChange={(event) => applyPreset(event.currentTarget.value as StorefrontMotionPreset)}
          >
            {STOREFRONT_MOTION_PRESET_VALUES.map((preset) => (
              <option key={preset} value={preset}>
                {{
                  none: 'Sin movimiento',
                  quiet: 'Quiet — sutil',
                  editorial: 'Editorial — narrativo',
                  kinetic: 'Kinetic — drop',
                }[preset]}
              </option>
            ))}
          </Select>
        </Field>
        <p className="rounded-lg bg-surface-container-low px-3 py-2 font-body-sm text-[11px] leading-snug text-on-surface-variant">
          {tr('El perfil define una personalidad completa. Los ajustes de abajo permiten afinar sin salir del sistema curado.')}
        </p>

        <Field label={tr('Velocidad')}>
          <Select value={motion.speed} onChange={(event) => update('speed', event.currentTarget.value)}>
            <option value="slow">{tr('Lenta')}</option>
            <option value="normal">{tr('Normal')}</option>
            <option value="fast">{tr('Rápida')}</option>
          </Select>
        </Field>
        <Field label={tr('Reveal por defecto')}>
          <Select value={motion.reveal} onChange={(event) => update('reveal', event.currentTarget.value)}>
            <option value="none">{tr('Sin reveal')}</option>
            <option value="fade">{tr('Fade')}</option>
            <option value="rise">{tr('Rise')}</option>
            <option value="clip">{tr('Clip')}</option>
            <option value="scale">{tr('Scale')}</option>
          </Select>
        </Field>
        <SettingField
          label={tr('Stagger (ms)')}
          type="number"
          value={motion.stagger}
          onChange={(value) => update('stagger', Math.max(0, Math.min(160, Number(value) || 0)))}
        />
        <Field label={tr('Hover de productos')}>
          <Select value={motion.hover} onChange={(event) => update('hover', event.currentTarget.value)}>
            <option value="none">{tr('Sin hover')}</option>
            <option value="lift">{tr('Lift')}</option>
            <option value="zoom">{tr('Zoom')}</option>
            <option value="swap">{tr('Cambio de imagen')}</option>
          </Select>
        </Field>
        <Field label={tr('Imagen de hero/story')}>
          <Select value={motion.imageMotion} onChange={(event) => update('imageMotion', event.currentTarget.value)}>
            <option value="none">{tr('Estática')}</option>
            <option value="zoom">{tr('Zoom lento')}</option>
          </Select>
        </Field>
        <Field label={tr('Parallax por defecto')}>
          <Select value={motion.parallax} onChange={(event) => update('parallax', event.currentTarget.value)}>
            <option value="none">{tr('Sin parallax')}</option>
            <option value="subtle">{tr('Sutil')}</option>
            <option value="strong">{tr('Marcado')}</option>
          </Select>
        </Field>
        <Field label={tr('Marquee')}>
          <Select value={motion.marquee} onChange={(event) => update('marquee', event.currentTarget.value)}>
            <option value="paused">{tr('Pausado')}</option>
            <option value="slow">{tr('Lento')}</option>
            <option value="normal">{tr('Normal')}</option>
            <option value="fast">{tr('Rápido')}</option>
            <option value="reverse">{tr('Inverso')}</option>
          </Select>
        </Field>
        <Field label={tr('Micro-interacción de CTA')}>
          <Select value={motion.cta} onChange={(event) => update('cta', event.currentTarget.value)}>
            <option value="none">{tr('Sin movimiento')}</option>
            <option value="arrow">{tr('Flecha')}</option>
            <option value="lift">{tr('Elevar')}</option>
          </Select>
        </Field>
        <SettingToggle
          label={tr('Transición de página')}
          checked={motion.pageTransition}
          onChange={(checked) => update('pageTransition', checked)}
        />

        <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3">
          <p className="font-label-uppercase text-[10px] uppercase tracking-wider text-on-surface-variant">
            {tr('Accesibilidad')}
          </p>
          <p className="mt-1 font-body-sm text-[11px] leading-snug text-on-surface-variant">
            {tr('Si el visitante tiene activado “reducir movimiento”, se desactivan reveals, zoom y marquee automáticamente. El marquee también se pausa al hover/focus.')}
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low p-3">
          <p className="font-label-uppercase text-[10px] uppercase tracking-wider text-on-surface-variant">
            {tr('Preview')}
          </p>
          <p className="mt-1 font-body-sm text-[11px] leading-snug text-on-surface-variant">
            {tr('Usá “Actualizar preview” para ver el borrador. El perfil se aplica al guardar y publicar.')}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ThemeInspector({
  doc,
  patchDoc,
}: {
  doc: StorefrontDocument;
  patchDoc: (updater: (next: StorefrontDocument) => void) => void;
}) {
  const tr = useDesignT();
  const colors = doc.tokens.colors;
  const updateColor = (key: keyof typeof colors, value: string) => {
    patchDoc((next) => { next.tokens.colors[key] = value; });
  };
  const updateFont = (key: keyof typeof doc.tokens.fonts, value: string) => {
    patchDoc((next) => { next.tokens.fonts[key] = value; });
  };
  const updateNumber = (key: 'section' | 'container' | 'gap', value: string) => {
    patchDoc((next) => { next.tokens.spacing[key] = value; });
  };

  return (
    <Card className="p-5">
      <InspectorTitle icon="palette" title={tr('Tema')} />
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">{tr('Color')}</p>
          <div className="grid grid-cols-1 gap-3">
            {([
              ['canvas', 'Fondo'],
              ['surface', 'Superficie'],
              ['surfaceMuted', 'Superficie suave'],
              ['text', 'Texto'],
              ['textMuted', 'Texto suave'],
              ['brand', 'Marca'],
              ['accent', 'Acento'],
              ['border', 'Bordes'],
              ['inverse', 'Inverso'],
            ] as Array<[keyof typeof colors, string]>).map(([key, label]) => (
              <ColorField key={key} label={tr(label)} value={colors[key]} onChange={(value) => updateColor(key, value)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">{tr('Tipografía')}</p>
          <div className="flex flex-col gap-3">
            {([
              ['display', 'Display'],
              ['heading', 'Títulos'],
              ['body', 'Texto'],
              ['mono', 'Mono'],
            ] as Array<[keyof typeof doc.tokens.fonts, string]>).map(([key, label]) => (
              <Field key={key} label={tr(label)}>
                <Input value={doc.tokens.fonts[key]} onChange={(event) => updateFont(key, event.currentTarget.value)} />
              </Field>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SettingField label={tr('Radio')} value={doc.tokens.shape.radius} onChange={(value) => patchDoc((next) => { next.tokens.shape.radius = value; })} />
          <SettingField label={tr('Borde')} value={doc.tokens.shape.borderWidth} onChange={(value) => patchDoc((next) => { next.tokens.shape.borderWidth = value; })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SettingField label={tr('Espacio sección')} value={doc.tokens.spacing.section} onChange={(value) => updateNumber('section', value)} />
          <SettingField label={tr('Container')} value={doc.tokens.spacing.container} onChange={(value) => updateNumber('container', value)} />
          <SettingField label={tr('Gap')} value={doc.tokens.spacing.gap} onChange={(value) => updateNumber('gap', value)} />
          <SettingField
            label={tr('Ratio producto')}
            value={doc.tokens.image.productRatio}
            onChange={(value) => patchDoc((next) => { next.tokens.image.productRatio = value; })}
          />
        </div>
        <SettingField
          label={tr('Overlay hero')}
          type="number"
          value={doc.tokens.image.heroOverlay}
          onChange={(value) => patchDoc((next) => { next.tokens.image.heroOverlay = Math.max(0, Math.min(1, Number(value) || 0)); })}
        />
        <Field label={tr('CSS personalizado (avanzado)')}>
          <Textarea
            rows={5}
            value={doc.tokens.customCss}
            onChange={(event) => patchDoc((next) => { next.tokens.customCss = event.currentTarget.value; })}
          />
        </Field>
      </div>
    </Card>
  );
}

function HeaderInspector({
  doc,
  patchDoc,
}: {
  doc: StorefrontDocument;
  patchDoc: (updater: (next: StorefrontDocument) => void) => void;
}) {
  const tr = useDesignT();
  const header = doc.header;
  const updateNav = (index: number, patch: Partial<{ label: string; href: string }>) => {
    patchDoc((next) => {
      const item = next.header.navigation[index];
      if (item) Object.assign(item, patch);
    });
  };
  return (
    <Card className="p-5">
      <InspectorTitle icon="web_asset" title={tr('Header')} />
      <div className="flex flex-col gap-4">
        <Field label={tr('Variante')}>
          <Select
            value={header.variant}
            onChange={(event) => patchDoc((next) => { next.header.variant = event.currentTarget.value as typeof header.variant; })}
          >
            <option value="classic">{tr('Clásico')}</option>
            <option value="centered">{tr('Centrado')}</option>
            <option value="minimal">{tr('Minimal')}</option>
          </Select>
        </Field>
        <SettingToggle
          label={tr('Header sticky')}
          checked={header.sticky}
          onChange={(checked) => patchDoc((next) => { next.header.sticky = checked; })}
        />
        <SettingToggle
          label={tr('Compactar header al scrollear')}
          checked={header.shrinkOnScroll}
          onChange={(checked) => patchDoc((next) => { next.header.shrinkOnScroll = checked; })}
        />
        <p className="font-label-sm text-[10px] leading-snug text-on-surface-variant">
          {tr('Reduce el padding vertical después de 48 px de scroll. Funciona mejor con header sticky.')}
        </p>
        <SettingToggle
          label={tr('Mostrar búsqueda')}
          checked={header.showSearch}
          onChange={(checked) => patchDoc((next) => { next.header.showSearch = checked; })}
        />
        <div className="rounded-lg bg-surface-container-low p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">{tr('Navegación')}</span>
            <Button
              variant="ghost"

              icon="add"
              onClick={() => patchDoc((next) => { next.header.navigation.push({ label: 'Nuevo link', href: '/catalogo', newTab: false }); })}
            >
              {tr('Agregar')}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {header.navigation.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={item.label} onChange={(event) => updateNav(index, { label: event.currentTarget.value })} />
                <Input value={item.href} onChange={(event) => updateNav(index, { href: event.currentTarget.value })} />
                <button
                  type="button"
                  className="rounded p-1 text-error hover:bg-error-container"
                  onClick={() => patchDoc((next) => { next.header.navigation.splice(index, 1); })}
                >
                  <Icon name="delete" className="text-[16px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-surface-container-low p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">{tr('Announcement')}</span>
            <Switch
              checked={header.announcement.enabled}
              onChange={(checked) => patchDoc((next) => { next.header.announcement.enabled = checked; })}
              label={tr('Mostrar announcement')}
            />
          </div>
          <div className="flex flex-col gap-3">
            <SettingField
              label={tr('Texto')}
              value={header.announcement.text}
              onChange={(value) => patchDoc((next) => { next.header.announcement.text = value; })}
            />
            <SettingField
              label={tr('Link')}
              value={header.announcement.link}
              onChange={(value) => patchDoc((next) => { next.header.announcement.link = value; })}
            />
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label={tr('Fondo')}
                value={header.announcement.backgroundColor}
                onChange={(value) => patchDoc((next) => { next.header.announcement.backgroundColor = value; })}
              />
              <ColorField
                label={tr('Texto')}
                value={header.announcement.textColor}
                onChange={(value) => patchDoc((next) => { next.header.announcement.textColor = value; })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SettingField
                label={tr('Programar desde')}
                type="datetime-local"
                value={header.announcement.startsAt}
                onChange={(value) => patchDoc((next) => { next.header.announcement.startsAt = value; })}
              />
              <SettingField
                label={tr('Programar hasta')}
                type="datetime-local"
                value={header.announcement.endsAt}
                onChange={(value) => patchDoc((next) => { next.header.announcement.endsAt = value; })}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FooterInspector({
  doc,
  patchDoc,
}: {
  doc: StorefrontDocument;
  patchDoc: (updater: (next: StorefrontDocument) => void) => void;
}) {
  const tr = useDesignT();
  const footer = doc.footer;
  return (
    <Card className="p-5">
      <InspectorTitle icon="call_to_action" title={tr('Footer')} />
      <div className="flex flex-col gap-4">
        <Field label={tr('Variante')}>
          <Select
            value={footer.variant}
            onChange={(event) => patchDoc((next) => { next.footer.variant = event.currentTarget.value as typeof footer.variant; })}
          >
            <option value="columns">{tr('Columnas')}</option>
            <option value="minimal">{tr('Minimal')}</option>
            <option value="editorial">{tr('Editorial')}</option>
          </Select>
        </Field>
        <SettingField label={tr('Tagline')} rows={3} value={footer.tagline} onChange={(value) => patchDoc((next) => { next.footer.tagline = value; })} />
        <SettingToggle
          label={tr('Newsletter')}
          checked={footer.showNewsletter}
          onChange={(checked) => patchDoc((next) => { next.footer.showNewsletter = checked; })}
        />
        <SettingToggle
          label={tr('Redes sociales')}
          checked={footer.showSocialLinks}
          onChange={(checked) => patchDoc((next) => { next.footer.showSocialLinks = checked; })}
        />
        <SettingField
          label={tr('Copyright')}
          value={footer.copyrightText}
          onChange={(value) => patchDoc((next) => { next.footer.copyrightText = value; })}
        />
      </div>
    </Card>
  );
}
