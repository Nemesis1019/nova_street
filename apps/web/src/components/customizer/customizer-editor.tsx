'use client';

import {
  calculateCustomizerPrice,
  normalizeColorOptions,
  normalizePricingRules,
  normalizePrintZones,
  normalizeSizeOptions,
} from '@ecommerce/shared';
import { Button, ColorInput, ColorSwatch, Container, FileButton, Grid, GridCol, Group, Loader, Select, Slider, Stack, Text as MantineText, TextInput, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { type ReactNode,useEffect, useMemo, useRef, useState } from 'react';

import { apiClient } from '../../lib/api';
import { uploadAsset } from '../../lib/assets';
import { canvasToPngBlob, downloadCanvasPng, renderZoneCanvas, zonePrintSize } from '../../lib/customizer-render';
import type { CustomDesign, CustomDesignElement, DesignTemplate } from '../../lib/customizer-types';
import { getApiErrorMessage, notifyError, notifySuccess, notifyWarning } from '../../lib/notifications';
import { useCurrency } from '../../providers/currency-provider';
import { useAuthStore } from '../../store/auth-store';
import { AuthShell } from '../auth-shell';

const KonvaCanvas = dynamic(
  () => import('./konva-canvas').then((mod) => mod.KonvaCanvas),
  { ssr: false },
);
const Shirt3DViewer = dynamic(
  () => import('./shirt-3d-viewer').then((mod) => mod.Shirt3DViewer),
  { ssr: false },
);

interface CustomizerEditorProps {
  templateId: string;
}

interface EditorElement extends CustomDesignElement {
  id: string;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CustomizerEditor({ templateId }: CustomizerEditorProps) {
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const { isAuthenticated } = useAuthStore();
  const stageRef = useRef<HTMLDivElement>(null);
  const konvaStageRef = useRef<{ toDataURL: () => string } | null>(null);

  const [stageSize, setStageSize] = useState({ width: 400, height: 400 });
  const [designId, setDesignId] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [baseImageStatus, setBaseImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [crossOriginBlocked, setCrossOriginBlocked] = useState(false);
  const [baseImageNonce, setBaseImageNonce] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, HTMLImageElement>>({});
  const [textInput, setTextInput] = useState('');
  const [selectedZoneKey, setSelectedZoneKey] = useState('front');
  const [quantity, setQuantity] = useState(1);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const { data: template, isError: templateError, refetch: refetchTemplate } = useQuery<DesignTemplate>({
    queryKey: ['design-template', templateId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/design-templates/{id}', {
        params: { path: { id: templateId } },
      });
      if (error || !data) throw error ?? new Error('Template not found');
      return data as DesignTemplate;
    },
    enabled: isAuthenticated,
  });

  const colors = useMemo(() => (template ? normalizeColorOptions(template) : []), [template]);
  const sizes = useMemo(() => (template ? normalizeSizeOptions(template) : []), [template]);
  const zones = useMemo(() => (template ? normalizePrintZones(template.printAreas) : []), [template]);
  const pricing = useMemo(
    () => (template ? normalizePricingRules(template.pricing ?? template.pricingRules) : normalizePricingRules(undefined)),
    [template],
  );
  const selectedZone = zones.find((zone) => zone.key === selectedZoneKey) ?? zones[0] ?? null;
  const viewImageUrl =
    selectedZone?.imageUrl ||
    colors.find((color) => color.name === selectedColor)?.imageUrl ||
    template?.baseImageUrl;

  useEffect(() => {
    if (!template) return;
    if (!selectedColor && colors[0]) setSelectedColor(colors[0].name);
    if (!selectedSize && sizes[0]) setSelectedSize(sizes[0].name);
    if (zones.length > 0 && !zones.some((zone) => zone.key === selectedZoneKey)) {
      setSelectedZoneKey(zones[0].key);
    }
  }, [template, colors, sizes, zones, selectedColor, selectedSize, selectedZoneKey]);

  const quote = useMemo(() => {
    if (!template) return null;
    return calculateCustomizerPrice({
      template: {
        ...template,
        colorOptions: colors,
        sizeOptions: sizes,
        printAreas: { zones },
        pricingRules: pricing,
      },
      elements,
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
  }, [template, colors, sizes, zones, pricing, elements, selectedColor, selectedSize, quantity]);

  useEffect(() => {
    if (!viewImageUrl) return;
    let cancelled = false;
    setBaseImageStatus('loading');
    setCrossOriginBlocked(false);

    const load = (withCrossOrigin: boolean, allowFallback: boolean) => {
      const img = new window.Image();
      if (withCrossOrigin) img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        setBaseImage(img);
        setBaseImageStatus('ready');
        setCrossOriginBlocked(!withCrossOrigin);
        const maxWidth = Math.min(600, stageRef.current?.clientWidth ?? 600);
        const scale = img.width > 0 ? maxWidth / img.width : 1;
        setStageSize({ width: maxWidth, height: img.height * scale });
      };
      img.onerror = () => {
        if (cancelled) return;
        // Si el bucket no tiene CORS habilitado para este dominio, reintenta
        // sin `crossOrigin`: la prenda se muestra igual (el canvas queda
        // "tainted" y la vista previa no se podrá exportar, ver saveDesign).
        if (allowFallback) {
          load(false, false);
        } else {
          setBaseImageStatus('error');
        }
      };
      img.src = viewImageUrl;
    };

    load(true, true);
    return () => {
      cancelled = true;
    };
  }, [viewImageUrl, baseImageNonce]);

  useEffect(() => {
    elements.forEach((element) => {
      if (element.type === 'UPLOADED_IMAGE' && element.assetUrl && !imageMap[element.assetUrl]) {
        const url = element.assetUrl;
        const load = (withCrossOrigin: boolean, allowFallback: boolean) => {
          const img = new window.Image();
          if (withCrossOrigin) img.crossOrigin = 'anonymous';
          img.onload = () => {
            setImageMap((prev) => ({ ...prev, [url]: img }));
          };
          img.onerror = () => {
            if (allowFallback) load(false, false);
          };
          img.src = url;
        };
        load(true, true);
      }
    });
  }, [elements, imageMap]);

  const createDesign = useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST('/custom-designs', {
        body: { designTemplateId: templateId, color: selectedColor, size: selectedSize } as never,
      });
      if (error || !data) throw error ?? new Error('Create design failed');
      return data as CustomDesign;
    },
    onSuccess: (data) => {
      setDesignId(data.id);
      notifySuccess({ title: 'Diseño creado', message: 'Podés comenzar a personalizar.' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadAsset(file, 'CUSTOM_DESIGN_ASSET');
      return asset;
    },
    onSuccess: (data) => {
      addImageElement(data.url);
    },
    onError: (error) => notifyError({ title: 'Error al subir imagen', message: getApiErrorMessage(error) }),
  });

  const uploadPreview = useMutation({
    mutationFn: async (dataUrl: string) => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'preview.png', { type: 'image/png' });
      const asset = await uploadAsset(file, 'CUSTOM_DESIGN_ASSET');
      return asset;
    },
    onError: (error) => notifyError({ title: 'Error al subir preview', message: getApiErrorMessage(error) }),
  });

  const saveDesign = useMutation({
    mutationFn: async () => {
      if (!designId) throw new Error('Missing design');
      let previewUrl: string | undefined;
      try {
        const dataUrl = konvaStageRef.current?.toDataURL();
        if (dataUrl) {
          previewUrl = (await uploadPreview.mutateAsync(dataUrl)).url;
        }
      } catch {
        // Canvas "tainted" (imagen sin CORS): se guarda sin vista previa.
        notifyWarning({
          title: 'Diseño sin vista previa',
          message:
            'No se pudo exportar la vista previa porque la imagen base no permite CORS para este dominio. El diseño se guardará igual.',
        });
      }

      const printFiles: Array<{
        zoneKey: string;
        assetUrl: string;
        dpi: number;
        widthCm: number;
        heightCm: number;
        printMethod: string;
        mirrored: boolean;
      }> = [];

      for (const zone of zones) {
        const zoneElements = elements.filter(
          (element) => (element.printAreaKey || 'front') === zone.key,
        );
        if (zoneElements.length === 0) continue;

        const size = zonePrintSize(zone);
        const { canvas } = renderZoneCanvas({
          zone,
          elements: zoneElements,
          imageMap,
          stageWidth: stageSize.width,
          stageHeight: stageSize.height,
          width: size.widthPx,
          height: size.heightPx,
        });
        const mirrored = zone.printMethod === 'DTF';
        const blob = await canvasToPngBlob(canvas, mirrored);
        const file = new File([blob], `print-${zone.key}-${size.dpi}dpi.png`, {
          type: 'image/png',
        });
        const asset = await uploadAsset(file, 'CUSTOM_DESIGN_ASSET');
        printFiles.push({
          zoneKey: zone.key,
          assetUrl: asset.url,
          dpi: size.dpi,
          widthCm: size.widthCm,
          heightCm: size.heightCm,
          printMethod: zone.printMethod,
          mirrored,
        });
      }

      const { data, error } = await apiClient.PATCH('/custom-designs/{id}', {
        params: { path: { id: designId } },
        body: {
          color: selectedColor,
          size: selectedSize,
          previewImageUrl: previewUrl,
          printFiles,
          elements: elements.map(({ id: _id, ...rest }) => rest),
        } as never,
      });
      if (error || !data) throw error ?? new Error('Save design failed');
      return data;
    },
    onSuccess: () => notifySuccess({ title: 'Diseño guardado' }),
    onError: (error) => notifyError({ title: 'Error al guardar', message: getApiErrorMessage(error) }),
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      if (!designId) throw new Error('No design');
      const { data, error } = await apiClient.POST('/custom-designs/{id}/add-to-cart', {
        params: { path: { id: designId } },
        body: { quantity } as never,
      });
      if (error || !data) throw error ?? new Error('Add to cart failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      notifySuccess({ title: 'Agregado al carrito' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const defaultInk = ['negro', 'negra', 'black', 'preta', 'marino', 'navy']
    .includes(selectedColor.trim().toLowerCase())
    ? '#ffffff'
    : '#0d0d0d';

  function addImageElement(url: string) {
    const id = generateId();
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'UPLOADED_IMAGE',
        printAreaKey: selectedZone?.key ?? 'front',
        assetUrl: url,
        positionX: stageSize.width / 2,
        positionY: stageSize.height / 2,
        scale: 0.5,
        rotation: 0,
        zIndex: prev.length,
      },
    ]);
    setSelectedId(id);
  }

  function addTextElement() {
    if (!textInput.trim()) return;
    const id = generateId();
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'TEXT',
        printAreaKey: selectedZone?.key ?? 'front',
        textContent: textInput,
        fontSize: 32,
        fill: defaultInk,
        positionX: stageSize.width / 2,
        positionY: stageSize.height / 2,
        scale: 1,
        rotation: 0,
        zIndex: prev.length,
      },
    ]);
    setSelectedId(id);
    setTextInput('');
  }

  function addClipartElement(shape: 'star' | 'heart') {
    const id = generateId();
    setElements((prev) => [
      ...prev,
      {
        id,
        type: 'CLIPART',
        printAreaKey: selectedZone?.key ?? 'front',
        textContent: shape,
        fill: defaultInk,
        positionX: stageSize.width / 2,
        positionY: stageSize.height / 2,
        scale: 1,
        rotation: 0,
        zIndex: prev.length,
      },
    ]);
    setSelectedId(id);
  }

  function updateSelected(patch: Partial<EditorElement>) {
    if (!selectedId) return;
    setElements((prev) => prev.map((element) => (element.id === selectedId ? { ...element, ...patch } : element)));
  }

  function deleteSelected() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((element) => element.id !== selectedId));
    setSelectedId(null);
  }

  function moveLayer(direction: 'up' | 'down') {
    if (!selectedId) return;
    setElements((prev) => {
      const index = prev.findIndex((element) => element.id === selectedId);
      if (index < 0) return prev;
      const newIndex = direction === 'up' ? Math.min(prev.length - 1, index + 1) : Math.max(0, index - 1);
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(newIndex, 0, moved);
      return next.map((element, idx) => ({ ...element, zIndex: idx }));
    });
  }

  const pageShell = (content: ReactNode) => (
    <main style={{ backgroundColor: '#fcf9f8', padding: '96px 16px 128px' }}>
      <Container size="xl" px={0}>
        {content}
      </Container>
    </main>
  );

  if (!isAuthenticated) {
    return (
      <AuthShell
        withChrome={false}
        eyebrow="Studio NÖVA"
        title={
          <>
            INGRESA PARA<br />PERSONALIZAR.
          </>
        }
        description="Necesitás una cuenta para crear diseños, guardarlos y agregarlos al carrito."
      >
        <Stack gap="lg">
          <Title order={3} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            PERSONALIZACIÓN
          </Title>
          <MantineText size="sm" c="dimmed">
            Iniciá sesión o creá una cuenta para empezar a diseñar tu prenda.
          </MantineText>
          <Button
            component="a"
            href="/login"
            fullWidth
            size="lg"
            style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
          >
            Iniciar sesión
          </Button>
          <MantineText size="sm" ta="center">
            ¿No tenés cuenta?{' '}
            <Link href="/register" style={{ color: '#0d0d0d', fontWeight: 600 }}>
              Crear cuenta
            </Link>
          </MantineText>
        </Stack>
      </AuthShell>
    );
  }

  if (templateError) {
    return pageShell(
      <Stack align="center" py="xl" gap="sm">
        <MantineText c="dimmed">No se pudo cargar la plantilla.</MantineText>
        <Button
          variant="outline"
          style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
          onClick={() => void refetchTemplate()}
        >
          Reintentar
        </Button>
      </Stack>,
    );
  }

  if (!template) {
    return pageShell(
      <Stack align="center" py="xl">
        <MantineText c="dimmed">Cargando plantilla...</MantineText>
      </Stack>,
    );
  }

  const visibleElements = elements.filter(
    (element) => (element.printAreaKey || 'front') === (selectedZone?.key ?? 'front'),
  );
  const totalPrice = quote?.unitPrice ?? template.basePrice;
  const colorHex = colors.find((item) => item.name === selectedColor)?.hex ?? '#f5f5f5';

  const downloadPrintFile = async () => {
    if (!selectedZone || visibleElements.length === 0) return;
    try {
      const size = zonePrintSize(selectedZone);
      const { canvas } = renderZoneCanvas({
        zone: selectedZone,
        elements: visibleElements,
        imageMap,
        stageWidth: stageSize.width,
        stageHeight: stageSize.height,
        width: size.widthPx,
        height: size.heightPx,
      });
      const mirror = selectedZone.printMethod === 'DTF';
      await downloadCanvasPng(
        canvas,
        `${template.name.replace(/\s+/g, '-').toLowerCase()}-${selectedZone.key}-${size.dpi}dpi.png`,
        mirror,
      );
      notifySuccess({ title: 'Archivo de impresión descargado' });
      if (selectedZone.printMethod === 'SCREEN' || selectedZone.printMethod === 'EMBROIDERY') {
        notifyWarning({
          title: 'Archivo de referencia',
          message:
            selectedZone.printMethod === 'EMBROIDERY'
              ? 'El bordado requiere digitización DST/PES; este PNG es sólo una referencia.'
              : 'Screen printing requiere archivo vectorial y separación por color; este PNG es una referencia.',
        });
      }
    } catch (error) {
      notifyError({
        title: 'No se pudo generar el archivo',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.',
      });
    }
  };

  return pageShell(
    <Grid gap="xl">
      <GridCol span={{ base: 12, md: 8 }}>
        <Group justify="space-between" mb="sm">
          <Group gap={6}>
            <Button
              size="compact-sm"
              variant={viewMode === '2d' ? 'filled' : 'outline'}
              color="dark"
              onClick={() => setViewMode('2d')}
              styles={{ root: { borderRadius: 0 } }}
            >
              Editar 2D
            </Button>
            <Button
              size="compact-sm"
              variant={viewMode === '3d' ? 'filled' : 'outline'}
              color="dark"
              onClick={() => setViewMode('3d')}
              styles={{ root: { borderRadius: 0 } }}
            >
              Ver 3D
            </Button>
          </Group>
          <MantineText size="xs" c="dimmed">
            El precio y el diseño se comparten entre ambas vistas.
          </MantineText>
        </Group>

        {viewMode === '3d' ? (
          <div style={{ height: 640 }}>
            <Shirt3DViewer
              modelUrl={template.model3dUrl}
              color={colorHex}
              zone={selectedZone}
              elements={elements}
              imageMap={imageMap}
              stageWidth={stageSize.width}
              stageHeight={stageSize.height}
            />
          </div>
        ) : null}

        <div
          ref={stageRef}
          style={{
            border: '1px solid #0d0d0d',
            backgroundColor: '#f6f3f2',
            ...(baseImage
              ? { display: viewMode === '3d' ? 'none' : 'flex', justifyContent: 'center' }
              : { minHeight: 360, display: viewMode === '3d' ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }),
          }}
        >
          {!baseImage && baseImageStatus === 'error' && (
            <Stack align="center" gap="sm" p="xl">
              <MantineText c="dimmed" size="sm">
                No se pudo cargar la prenda base.
              </MantineText>
              <Button
                variant="outline"
                style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
                onClick={() => setBaseImageNonce((nonce) => nonce + 1)}
              >
                Reintentar
              </Button>
            </Stack>
          )}
          {!baseImage && baseImageStatus !== 'error' && <Loader color="dark" />}
          {baseImage && (
            <KonvaCanvas
              width={stageSize.width}
              height={stageSize.height}
              baseImage={baseImage}
              zone={selectedZone}
              elements={visibleElements}
              imageMap={imageMap}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDeselect={() => setSelectedId(null)}
              onDragEnd={(id, x, y) => {
                setElements((prev) =>
                  prev.map((item) => (item.id === id ? { ...item, positionX: x, positionY: y } : item)),
                );
              }}
              stageRef={(node) => {
                konvaStageRef.current = node;
              }}
            />
          )}
        </div>
        {viewMode === '2d' ? (
          <MantineText size="xs" c="dimmed" mt="xs">
            El área punteada indica la zona recomendada de impresión.
          </MantineText>
        ) : null}
        {crossOriginBlocked && (
          <MantineText size="xs" c="yellow.8" mt={4}>
            La imagen base se cargó sin CORS para este dominio: podés editar y guardar, pero la vista previa no se
            generará.
          </MantineText>
        )}
      </GridCol>

      <GridCol span={{ base: 12, md: 4 }}>
        <Stack gap="lg" style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            {template.name}
          </Title>

          {zones.length > 1 && (
            <div>
              <MantineText size="xs" fw={600} mb={6}>Zona de impresión</MantineText>
              <Group gap={6}>
                {zones.map((zone) => (
                  <Button
                    key={zone.key}
                    size="compact-sm"
                    variant={selectedZone?.key === zone.key ? 'filled' : 'outline'}
                    color="dark"
                    onClick={() => {
                      setSelectedZoneKey(zone.key);
                      setSelectedId(null);
                    }}
                    styles={{ root: { borderRadius: 0 } }}
                  >
                    {zone.label}
                  </Button>
                ))}
              </Group>
            </div>
          )}

          <Group>
            {colors.map((color) => (
              <ColorSwatch
                key={color.name}
                color={color.hex}
                title={`${color.name}${color.priceAdjustment ? ` (+${format(color.priceAdjustment)})` : ''}`}
                onClick={() => setSelectedColor(color.name)}
                style={{
                  border: selectedColor === color.name ? '2px solid #0d0d0d' : '1px solid rgba(13,13,13,0.2)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Group>
          {selectedColor && <MantineText size="sm">Color: {selectedColor}</MantineText>}

          <Select
            placeholder="Talla"
            value={selectedSize}
            onChange={(value) => setSelectedSize(value ?? '')}
            data={sizes.map((size) => ({
              value: size.name,
              label: `${size.name}${size.priceAdjustment ? ` (+${format(size.priceAdjustment)})` : ''}`,
            }))}
            styles={{
              input: { borderRadius: 0, borderColor: '#0d0d0d', backgroundColor: 'transparent' },
              dropdown: { borderRadius: 0 },
            }}
          />

          <FileButton onChange={(file) => file && uploadFile.mutate(file)} accept="image/png,image/jpeg">
            {(props) => (
              <Button {...props} loading={uploadFile.isPending} variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}>
                Subir imagen
              </Button>
            )}
          </FileButton>

          <Group>
            <TextInput
              placeholder="Agregar texto"
              value={textInput}
              onChange={(event) => setTextInput(event.currentTarget.value)}
              style={{ flex: 1 }}
              styles={{
                input: { borderRadius: 0, borderColor: '#0d0d0d', backgroundColor: 'transparent' },
              }}
            />
            <Button onClick={addTextElement} variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}>
              +
            </Button>
          </Group>

          <Group>
            <Button onClick={() => addClipartElement('star')} variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d' }}>
              ⭐
            </Button>
            <Button onClick={() => addClipartElement('heart')} variant="outline" style={{ borderColor: '#0d0d0d', color: '#0d0d0d' }}>
              ❤️
            </Button>
          </Group>

          {selectedElement && (
            <Stack gap="xs" style={{ padding: '16px', border: '1px solid rgba(13,13,13,0.2)' }}>
              <MantineText size="sm" fw={500}>
                Elemento seleccionado
              </MantineText>
              <MantineText size="xs">Escala</MantineText>
              <Slider
                min={0.1}
                max={3}
                step={0.05}
                value={selectedElement.scale}
                onChange={(value) => updateSelected({ scale: value })}
                styles={{ track: { backgroundColor: '#0d0d0d' } }}
              />
              <MantineText size="xs">Rotación</MantineText>
              <Slider
                min={-180}
                max={180}
                step={5}
                value={selectedElement.rotation}
                onChange={(value) => updateSelected({ rotation: value })}
                styles={{ track: { backgroundColor: '#0d0d0d' } }}
              />
              {selectedElement.type !== 'UPLOADED_IMAGE' && (
                <ColorInput
                  label="Color de tinta"
                  format="hex"
                  value={selectedElement.fill ?? '#0d0d0d'}
                  onChange={(value) => updateSelected({ fill: value || '#0d0d0d' })}
                  styles={{ input: { borderRadius: 0 } }}
                />
              )}
              {selectedElement.type === 'TEXT' && (
                <>
                  <MantineText size="xs">Tamaño fuente</MantineText>
                  <Slider
                    min={12}
                    max={120}
                    step={4}
                    value={selectedElement.fontSize ?? 32}
                    onChange={(value) => updateSelected({ fontSize: value })}
                    styles={{ track: { backgroundColor: '#0d0d0d' } }}
                  />
                </>
              )}
              <Group>
                <Button size="xs" variant="subtle" onClick={() => moveLayer('up')}>
                  Adelante
                </Button>
                <Button size="xs" variant="subtle" onClick={() => moveLayer('down')}>
                  Atrás
                </Button>
                <Button size="xs" variant="subtle" color="red" onClick={deleteSelected}>
                  Eliminar
                </Button>
              </Group>
            </Stack>
          )}

          <TextInput
            label="Cantidad"
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(100, Number(event.currentTarget.value) || 1)))}
            styles={{ input: { borderRadius: 0, borderColor: '#0d0d0d', backgroundColor: 'transparent' } }}
          />

          <div style={{ borderTop: '1px solid #0d0d0d', paddingTop: 16 }}>
            <MantineText size="xl" fw={700} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Total: {format(totalPrice * quantity)}
            </MantineText>
            <MantineText size="xs" c="dimmed">
              {format(totalPrice)} por unidad · {quantity} {quantity === 1 ? 'unidad' : 'unidades'}
            </MantineText>
            {quote && (
              <Stack gap={2} mt="xs">
                {quote.breakdown.map((item) => (
                  <Group key={item.key} justify="space-between">
                    <MantineText size="xs" c="dimmed">{item.label}</MantineText>
                    <MantineText size="xs">{format(item.amount)}</MantineText>
                  </Group>
                ))}
              </Stack>
            )}
          </div>

          <Button
            variant="outline"
            fullWidth
            onClick={() => void downloadPrintFile()}
            disabled={!selectedZone || visibleElements.length === 0}
            style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
          >
            Descargar {selectedZone?.printMethod ?? 'DTG'} · {selectedZone?.printDpi ?? 300} DPI
          </Button>
          {selectedZone ? (
            <MantineText size="xs" c="dimmed">
              {selectedZone.printMethod === 'DTF'
                ? 'El PNG se descarga espejado para transferencia DTF.'
                : `Zona ${selectedZone.label} · sangrado ${selectedZone.bleedMm} mm.`}
            </MantineText>
          ) : null}

          {!designId && (
            <Button
              onClick={() => createDesign.mutate()}
              loading={createDesign.isPending}
              fullWidth
              style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
            >
              Crear diseño
            </Button>
          )}

          {designId && (
            <>
              <Button
                onClick={() => saveDesign.mutate()}
                loading={saveDesign.isPending}
                disabled={elements.length === 0}
                fullWidth
                variant="outline"
                style={{ borderColor: '#0d0d0d', color: '#0d0d0d', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Guardar diseño
              </Button>
              <Button
                onClick={() => addToCart.mutate()}
                loading={addToCart.isPending}
                disabled={elements.length === 0}
                fullWidth
                style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}
              >
                Agregar al carrito
              </Button>
            </>
          )}
        </Stack>
      </GridCol>
    </Grid>,
  );
}
