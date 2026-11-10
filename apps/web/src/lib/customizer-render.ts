import type { CustomizerPrintZone } from '@ecommerce/shared';

import type { CustomDesignElement } from './customizer-types';

export type CustomizerRenderElement = CustomDesignElement & { id: string };

export function renderZoneCanvas({
  zone,
  elements,
  imageMap,
  stageWidth,
  stageHeight,
  width = 1024,
  height,
}: {
  zone: CustomizerPrintZone | null;
  elements: CustomizerRenderElement[];
  imageMap: Record<string, HTMLImageElement>;
  stageWidth: number;
  stageHeight: number;
  width?: number;
  height?: number;
}): { canvas: HTMLCanvasElement; aspect: number } {
  if (!zone || stageWidth <= 0 || stageHeight <= 0) {
    return { canvas: document.createElement('canvas'), aspect: 1 };
  }

  const zoneWidth = zone.width * stageWidth;
  const zoneHeight = zone.height * stageHeight;
  const aspect = zoneWidth / Math.max(1, zoneHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height ?? Math.min(1536, width / aspect)));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, aspect };

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const zoneElements = elements.filter(
    (element) => (element.printAreaKey || 'front') === zone.key,
  );

  for (const element of zoneElements) {
    const u = (element.positionX - zone.x * stageWidth) / Math.max(1, zoneWidth);
    const v = (element.positionY - zone.y * stageHeight) / Math.max(1, zoneHeight);
    const x = u * canvas.width;
    const y = v * canvas.height;
    const scale = element.scale ?? 1;
    const rotation = ((element.rotation ?? 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (element.type === 'TEXT') {
      const fontSize = Math.max(
        8,
        ((element.fontSize ?? 32) / Math.max(1, zoneHeight)) * canvas.height * scale,
      );
      ctx.fillStyle = element.fill || '#0d0d0d';
      ctx.font = `${element.fontWeight && element.fontWeight >= 600 ? '700' : '500'} ${fontSize}px ${element.fontFamily || 'Inter, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      (element.textContent ?? '').split('\n').forEach((line, index) => {
        ctx.fillText(line, 0, index * fontSize * 1.1);
      });
    } else if (element.type === 'UPLOADED_IMAGE' && element.assetUrl) {
      const image = imageMap[element.assetUrl];
      if (image) {
        const imageWidth =
          (element.width ?? image.width * 0.5) * scale * (canvas.width / Math.max(1, zoneWidth));
        const imageHeight =
          (element.height ?? image.height * 0.5) * scale * (canvas.height / Math.max(1, zoneHeight));
        ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      }
    } else if (element.type === 'CLIPART' && element.textContent === 'star') {
      const outer = Math.max(10, 30 * scale * (canvas.height / Math.max(1, zoneHeight)));
      ctx.fillStyle = element.fill || '#0d0d0d';
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? outer : outer * 0.45;
        const angle = (Math.PI / 5) * point - Math.PI / 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (element.type === 'CLIPART' && element.textContent === 'heart') {
      const size = Math.max(10, 36 * scale * (canvas.height / Math.max(1, zoneHeight)));
      ctx.fillStyle = element.fill || '#0d0d0d';
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤', 0, 0);
    }

    ctx.restore();
  }

  return { canvas, aspect };
}

export function zonePrintSize(zone: CustomizerPrintZone, fallbackWidthCm = 30) {
  const aspect = zone.width / Math.max(0.01, zone.height);
  const widthCm = zone.maxWidthCm ?? fallbackWidthCm;
  const heightCm = zone.maxHeightCm ?? widthCm / Math.max(0.01, aspect);
  const dpi = zone.printDpi ?? 300;
  const widthPx = Math.max(256, Math.min(8000, Math.round((widthCm / 2.54) * dpi)));
  const heightPx = Math.max(256, Math.min(8000, Math.round((heightCm / 2.54) * dpi)));
  return { widthCm, heightCm, dpi, widthPx, heightPx };
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string, mirror = false) {
  return new Promise<void>((resolve, reject) => {
    try {
      const output = document.createElement('canvas');
      output.width = canvas.width;
      output.height = canvas.height;
      const ctx = output.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');
      if (mirror) {
        ctx.translate(output.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(canvas, 0, 0);
      output.toBlob((blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar el archivo'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

export function canvasToPngBlob(canvas: HTMLCanvasElement, mirror = false): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const output = document.createElement('canvas');
      output.width = canvas.width;
      output.height = canvas.height;
      const ctx = output.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');
      if (mirror) {
        ctx.translate(output.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(canvas, 0, 0);
      output.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar el archivo'));
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}
