'use client';

import type { CustomizerPrintZone } from '@ecommerce/shared';
import { Image as KonvaImage, Layer, Rect, Stage, Star, Text as KonvaText } from 'react-konva';

import type { CustomDesignElement } from '../../lib/customizer-types';

type EditorElement = CustomDesignElement & { id: string };

interface KonvaCanvasProps {
  width: number;
  height: number;
  baseImage: HTMLImageElement | null;
  zone: CustomizerPrintZone | null;
  elements: EditorElement[];
  imageMap: Record<string, HTMLImageElement>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  stageRef?: (node: { toDataURL: () => string } | null) => void;
}

export function KonvaCanvas({
  width,
  height,
  baseImage,
  zone,
  elements,
  imageMap,
  selectedId,
  onSelect,
  onDeselect,
  onDragEnd,
  stageRef,
}: KonvaCanvasProps) {
  return (
    <Stage
      width={width}
      height={height}
      ref={(node) => {
        stageRef?.(node as unknown as { toDataURL: () => string } | null);
      }}
      onMouseDown={(event) => {
        if (event.target === event.target.getStage()) onDeselect();
      }}
    >
      <Layer>
        {baseImage ? (
          <KonvaImage image={baseImage} width={width} height={height} listening={false} />
        ) : null}
        {zone ? (
          <Rect
            x={zone.x * width}
            y={zone.y * height}
            width={zone.width * width}
            height={zone.height * height}
            stroke="#6f7a4e"
            strokeWidth={1.5}
            fill="rgba(111,122,78,0.06)"
            dash={[6, 4]}
            listening={false}
          />
        ) : null}
        {elements
          .slice()
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
              onClick: () => onSelect(element.id),
              onTap: () => onSelect(element.id),
              onDragEnd: (event: { target: { x: () => number; y: () => number } }) =>
                onDragEnd(element.id, event.target.x(), event.target.y()),
              shadowEnabled: isSelected,
              shadowColor: '#0d0d0d',
              shadowBlur: 4,
              shadowOffset: { x: 0, y: 0 },
            };

            if (element.type === 'UPLOADED_IMAGE') {
              const img = element.assetUrl ? imageMap[element.assetUrl] : undefined;
              if (!img) return null;
              return (
                <KonvaImage
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
                <KonvaText
                  key={element.id}
                  text={element.textContent ?? ''}
                  fontSize={element.fontSize ?? 24}
                  fill={element.fill ?? '#0d0d0d'}
                  fontFamily={element.fontFamily || 'Inter, sans-serif'}
                  fontStyle={element.fontWeight && element.fontWeight >= 600 ? 'bold' : 'normal'}
                  {...commonProps}
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
                  fill={element.fill ?? '#0d0d0d'}
                  {...commonProps}
                />
              );
            }

            if (element.type === 'CLIPART' && element.textContent === 'heart') {
              return (
                <KonvaText
                  key={element.id}
                  text="❤️"
                  fontSize={40}
                  {...commonProps}
                />
              );
            }

            return null;
          })}
      </Layer>
    </Stage>
  );
}
