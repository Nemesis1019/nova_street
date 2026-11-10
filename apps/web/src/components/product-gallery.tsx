'use client';

import { IconChevronLeft, IconChevronRight, IconPhotoOff } from '@tabler/icons-react';
import { type KeyboardEvent, type TouchEvent, useEffect, useRef, useState } from 'react';

import { imageCropStyle } from '../lib/image-crop';

export interface ProductGalleryImage {
  url?: string;
  smallUrl?: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  focalPointX?: number;
  focalPointY?: number;
  cropZoom?: number;
}

interface ProductGalleryProps {
  images: ProductGalleryImage[];
  alt: string;
  showThumbnails?: boolean;
  swipeEnabled?: boolean;
}

function imageSource(image: ProductGalleryImage, size: 'main' | 'thumb') {
  if (size === 'thumb') {
    return image.thumbnailUrl ?? image.smallUrl ?? image.url;
  }
  return image.mediumUrl ?? image.url ?? image.smallUrl;
}

export function ProductGallery({
  images,
  alt,
  showThumbnails = true,
  swipeEnabled = true,
}: ProductGalleryProps) {
  const usableImages = images.filter((image) => imageSource(image, 'main'));
  const [index, setIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const count = usableImages.length;

  useEffect(() => {
    setIndex(0);
    touchStartRef.current = null;
  }, [alt, count]);

  const goTo = (nextIndex: number) => {
    if (count === 0) return;
    setIndex((nextIndex + count) % count);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!swipeEnabled || count < 2) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !swipeEnabled || count < 2) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
    if (!isHorizontalSwipe) return;

    goTo(index + (deltaX < 0 ? 1 : -1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(index + 1);
    }
  };

  const current = usableImages[index] ?? usableImages[0];
  if (!current) {
    return (
      <div
        style={{
          aspectRatio: '4 / 5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--sf-color-text, #0d0d0d)',
          backgroundColor: 'var(--sf-color-surface-muted, #f6f3f2)',
          color: 'var(--sf-color-text-muted, #6b6258)',
        }}
      >
        <IconPhotoOff size={40} stroke={1.2} />
      </div>
    );
  }

  const arrowStyle = {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 3,
    width: 42,
    height: 42,
    padding: 0,
    borderRadius: '50%',
    border: '1px solid rgba(13, 13, 13, 0.16)',
    backgroundColor: 'rgba(252, 249, 248, 0.94)',
    color: 'var(--sf-color-text, #0d0d0d)',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`Galería de imágenes de ${alt}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--sf-color-text, #0d0d0d)',
          backgroundColor: 'var(--sf-color-surface-muted, #f6f3f2)',
          touchAction: 'pan-y',
        }}
      >
        <div
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} de ${count}`}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <img
            src={imageSource(current, 'main')}
            alt={count > 1 ? `${alt} — imagen ${index + 1} de ${count}` : alt}
            loading="eager"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              maxHeight: '82vh',
              objectFit: 'contain',
              ...imageCropStyle(current),
            }}
          />
        </div>

        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {count > 1 ? `Imagen ${index + 1} de ${count}` : ''}
        </span>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              title="Imagen anterior"
              style={{ ...arrowStyle, left: 12 }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goTo(index - 1);
              }}
            >
              <IconChevronLeft size={22} stroke={1.8} />
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              title="Imagen siguiente"
              style={{ ...arrowStyle, right: 12 }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goTo(index + 1);
              }}
            >
              <IconChevronRight size={22} stroke={1.8} />
            </button>
          </>
        )}
      </div>

      {showThumbnails && count > 1 && (
        <div
          role="group"
          aria-label="Miniaturas de la galería"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 2,
            scrollbarWidth: 'thin',
          }}
        >
          {usableImages.map((image, imageIndex) => (
            <button
              key={image.url ?? image.thumbnailUrl ?? imageIndex}
              type="button"
              aria-label={`Ver imagen ${imageIndex + 1} de ${count}`}
              aria-current={imageIndex === index ? 'true' : undefined}
              onClick={() => goTo(imageIndex)}
              style={{
                flex: '0 0 72px',
                width: 72,
                height: 90,
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                border:
                  imageIndex === index
                    ? '2px solid var(--sf-color-text, #0d0d0d)'
                    : '1px solid rgba(13, 13, 13, 0.18)',
                backgroundColor: 'var(--sf-color-surface-muted, #f6f3f2)',
              }}
            >
              <img
                src={imageSource(image, 'thumb')}
                alt=""
                aria-hidden="true"
                loading="lazy"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
