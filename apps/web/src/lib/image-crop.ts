import type { CSSProperties } from 'react';

export interface ImageCrop {
  focalPointX?: number;
  focalPointY?: number;
  cropZoom?: number;
}

/**
 * Traduce el crop persistente del asset a estilos de <img>. Se usa junto a
 * overflow:hidden en el contenedor para que el zoom no desborde la card.
 */
export function imageCropStyle(image?: ImageCrop | null): CSSProperties {
  const x = Math.max(0, Math.min(100, image?.focalPointX ?? 50));
  const y = Math.max(0, Math.min(100, image?.focalPointY ?? 50));
  const zoom = Math.max(1, Math.min(2, image?.cropZoom ?? 1));

  return {
    objectPosition: `${x}% ${y}%`,
    ...(zoom > 1 ? { scale: zoom } : {}),
  };
}
