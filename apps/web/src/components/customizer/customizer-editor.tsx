'use client';

import { Button, ColorSwatch, FileButton, Grid, GridCol, Group, Select, Slider, Stack, Text as MantineText, TextInput, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';

import { apiClient } from '../../lib/api';
import { uploadAsset } from '../../lib/assets';
import type { CustomDesign, CustomDesignElement, DesignTemplate } from '../../lib/customizer-types';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useCurrency } from '../../providers/currency-provider';
import { useAuthStore } from '../../store/auth-store';

const Stage = dynamic(() => import('react-konva').then((mod) => mod.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva').then((mod) => mod.Layer), { ssr: false });
const Image = dynamic(() => import('react-konva').then((mod) => mod.Image), { ssr: false });
const KText = dynamic(() => import('react-konva').then((mod) => mod.Text), { ssr: false });
const Rect = dynamic(() => import('react-konva').then((mod) => mod.Rect), { ssr: false });
const Star = dynamic(() => import('react-konva').then((mod) => mod.Star), { ssr: false });

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
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, HTMLImageElement>>({});
  const [textInput, setTextInput] = useState('');

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const { data: template } = useQuery<DesignTemplate>({
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

  useEffect(() => {
    if (template?.baseImageUrl) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = template.baseImageUrl;
      img.onload = () => {
        setBaseImage(img);
        const maxWidth = Math.min(600, stageRef.current?.clientWidth ?? 600);
        const scale = maxWidth / img.width;
        setStageSize({ width: maxWidth, height: img.height * scale });
      };
    }
  }, [template?.baseImageUrl]);

  useEffect(() => {
    elements.forEach((element) => {
      if (element.type === 'UPLOADED_IMAGE' && element.assetUrl && !imageMap[element.assetUrl]) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = element.assetUrl;
        img.onload = () => {
          setImageMap((prev) => ({ ...prev, [element.assetUrl as string]: img }));
        };
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
      const dataUrl = konvaStageRef.current?.toDataURL();
      const previewUrl = dataUrl ? (await uploadPreview.mutateAsync(dataUrl)).url : undefined;

      const { data, error } = await apiClient.PATCH('/custom-designs/{id}', {
        params: { path: { id: designId } },
        body: {
          color: selectedColor,
          size: selectedSize,
          previewImageUrl: previewUrl,
          surcharge,
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
        body: { quantity: 1 } as never,
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

  function addImageElement(url: string) {
    setElements((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'UPLOADED_IMAGE',
        assetUrl: url,
        positionX: stageSize.width / 2,
        positionY: stageSize.height / 2,
        scale: 0.5,
        rotation: 0,
        zIndex: prev.length,
      },
    ]);
  }

  function addTextElement() {
    if (!textInput.trim()) return;
    setElements((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'TEXT',
        textContent: textInput,
        fontSize: 32,
        fill: '#0d0d0d',
        positionX: stageSize.width / 2,
        positionY: stageSize.height / 2,
        scale: 1,
        rotation: 0,
        zIndex: prev.length,
      },
    ]);
    setTextInput('');
  }

  function addClipartElement(shape: 'star' | 'heart') {
    setElements((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'CLIPART',
        textContent: shape,
        positionX: stageSize.width / 2,
        positionY: stageSize.height / 2,
        scale: 1,
        rotation: 0,
        zIndex: prev.length,
      },
    ]);
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

  if (!isAuthenticated) {
    return (
      <Stack align="center" py="xl">
        <Title order={3} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
          Personalización
        </Title>
        <MantineText>Debes iniciar sesión para crear diseños personalizados.</MantineText>
        <Button component="a" href="/login" style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}>
          Iniciar sesión
        </Button>
      </Stack>
    );
  }

  if (!template) {
    return (
      <Stack align="center" py="xl">
        <MantineText c="dimmed">Cargando plantilla...</MantineText>
      </Stack>
    );
  }

  const colors = template.availableColors ?? [];
  const sizes = template.availableSizes ?? [];
  const surcharge = elements.length * 2_500;
  const totalPrice = template.basePrice + surcharge;

  function getColorHex(colorName: string): string {
    const map: Record<string, string> = {
      blanco: '#ffffff',
      blanca: '#ffffff',
      negro: '#0d0d0d',
      preta: '#0d0d0d',
      gris: '#888888',
      cinza: '#888888',
      rojo: '#c92a2a',
      vermelho: '#c92a2a',
      azul: '#1864ab',
      verde: '#2f9e44',
      amarillo: '#f08c00',
      rosa: '#d6336c',
      oliva: '#6f7a4e',
      beige: '#eaddcf',
      marron: '#5c3a21',
    };
    return map[colorName.toLowerCase()] ?? '#cccccc';
  }

  return (
    <Grid gap="xl">
      <GridCol span={{ base: 12, md: 8 }}>
        <div ref={stageRef} style={{ border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          {baseImage && (
            <Stage
              width={stageSize.width}
              height={stageSize.height}
              ref={(node) => {
                konvaStageRef.current = node;
              }}
              onMouseDown={(event) => {
                if (event.target === event.target.getStage()) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                <Image image={baseImage} width={stageSize.width} height={stageSize.height} listening={false} />
                <Rect
                  x={stageSize.width * 0.25}
                  y={stageSize.height * 0.2}
                  width={stageSize.width * 0.5}
                  height={stageSize.height * 0.6}
                  stroke="#0d0d0d"
                  strokeWidth={1}
                  dash={[4, 4]}
                  listening={false}
                />
                {elements
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((element) => {
                    const isSelected = element.id === selectedId;
                    const commonProps = {
                      x: element.positionX,
                      y: element.positionY,
                      scaleX: element.scale,
                      scaleY: element.scale,
                      rotation: element.rotation,
                      draggable: true,
                      onClick: () => setSelectedId(element.id),
                      onTap: () => setSelectedId(element.id),
                      onDragEnd: (event: { target: { x: () => number; y: () => number } }) => {
                        setElements((prev) =>
                          prev.map((item) =>
                            item.id === element.id
                              ? { ...item, positionX: event.target.x(), positionY: event.target.y() }
                              : item,
                          ),
                        );
                      },
                      shadowEnabled: isSelected,
                      shadowColor: '#0d0d0d',
                      shadowBlur: 4,
                      shadowOffset: { x: 0, y: 0 },
                    };

                    if (element.type === 'UPLOADED_IMAGE') {
                      const img = element.assetUrl ? imageMap[element.assetUrl] : undefined;
                      if (!img) return null;
                      return (
                        <Image
                          key={element.id}
                          image={img}
                          {...commonProps}
                          offsetX={img.width / 2}
                          offsetY={img.height / 2}
                        />
                      );
                    }

                    if (element.type === 'TEXT') {
                      return (
                        <KText
                          key={element.id}
                          text={element.textContent}
                          fontSize={element.fontSize ?? 24}
                          fill={element.fill ?? '#0d0d0d'}
                          fontFamily="Inter, sans-serif"
                          {...commonProps}
                          offsetX={0}
                          offsetY={0}
                        />
                      );
                    }

                    if (element.type === 'CLIPART' && element.textContent === 'star') {
                      return (
                        <Star
                          key={element.id}
                          numPoints={5}
                          innerRadius={15}
                          outerRadius={30}
                          fill="#0d0d0d"
                          {...commonProps}
                          offsetX={0}
                          offsetY={0}
                        />
                      );
                    }

                    if (element.type === 'CLIPART' && element.textContent === 'heart') {
                      return (
                        <KText
                          key={element.id}
                          text="❤️"
                          fontSize={40}
                          {...commonProps}
                          offsetX={0}
                          offsetY={0}
                        />
                      );
                    }

                    return null;
                  })}
              </Layer>
            </Stage>
          )}
        </div>
        <MantineText size="xs" c="dimmed" mt="xs">
          El área punteada indica la zona recomendada de impresión.
        </MantineText>
      </GridCol>

      <GridCol span={{ base: 12, md: 4 }}>
        <Stack gap="lg" style={{ padding: '32px', border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            {template.name}
          </Title>

          <Group>
            {colors.map((color: string) => (
              <ColorSwatch
                key={color}
                color={getColorHex(color)}
                onClick={() => setSelectedColor(color)}
                style={{
                  border: selectedColor === color ? '2px solid #0d0d0d' : '1px solid rgba(13,13,13,0.2)',
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
            data={(sizes as string[]).map((size) => ({ value: size, label: size }))}
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

          <div style={{ borderTop: '1px solid #0d0d0d', paddingTop: 16 }}>
            <MantineText size="xl" fw={700} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
              Total aprox.: {format(totalPrice)}
            </MantineText>
            <MantineText size="xs" c="dimmed">
              Base + recargo por elementos aplicados
            </MantineText>
          </div>

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
    </Grid>
  );
}
