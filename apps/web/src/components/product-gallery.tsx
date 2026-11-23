'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconPhotoOff,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import { type KeyboardEvent, type TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { imageCropStyle } from '../lib/image-crop';
import { useProductVariantContext } from './product-variant-context';

export interface ProductGalleryImage {
  url?: string;
  smallUrl?: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  productVariantId?: string | null;
  focalPointX?: number;
  focalPointY?: number;
  cropZoom?: number;
}

interface ProductGalleryProps {
  images: ProductGalleryImage[];
  alt: string;
  showThumbnails?: boolean;
  swipeEnabled?: boolean;
  zoomEnabled?: boolean;
  videoUrl?: string | null;
  videoUrls?: string[];
  variantVideos?: Array<{ url: string; productVariantId?: string | null }> | null;
}

function imageSource(image: ProductGalleryImage, size: 'main' | 'thumb') {
  if (size === 'thumb') {
    return image.thumbnailUrl ?? image.smallUrl ?? image.url;
  }
  return image.mediumUrl ?? image.url ?? image.smallUrl;
}

function youtubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i,
  );
  return match?.[1] ?? null;
}

function vimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] ?? null;
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}

function videoEmbedUrl(url: string) {
  const youtube = youtubeId(url);
  if (youtube) return `https://www.youtube.com/embed/${youtube}`;
  const vimeo = vimeoId(url);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return null;
}

function videoThumbnail(url: string) {
  const youtube = youtubeId(url);
  return youtube ? `https://img.youtube.com/vi/${youtube}/hqdefault.jpg` : undefined;
}

function VideoMedia({ url }: { url: string }) {
  const embed = videoEmbedUrl(url);

  if (embed) {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
        <iframe
          src={embed}
          title="Video del producto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    );
  }

  if (isDirectVideo(url)) {
    return (
      <video
        src={url}
        controls
        playsInline
        style={{ display: 'block', width: '100%', maxHeight: '82vh', background: '#000' }}
      />
    );
  }

  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <a href={url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
        Abrir video
      </a>
    </div>
  );
}

export function ProductGallery({
  images,
  alt,
  showThumbnails = true,
  swipeEnabled = true,
  zoomEnabled = true,
  videoUrl,
  videoUrls,
  variantVideos,
}: ProductGalleryProps) {
  const variantContext = useProductVariantContext();
  const selectedVariantId = variantContext?.selectedVariantId;
  const usableImages = useMemo(() => {
    const available = images.filter((image) => imageSource(image, 'main'));
    if (!selectedVariantId) return available;

    const variantImages = available.filter(
      (image) => image.productVariantId === selectedVariantId,
    );
    const generalImages = available.filter((image) => !image.productVariantId);

    if (variantImages.length > 0) return [...variantImages, ...generalImages];
    if (generalImages.length > 0) return generalImages;
    return available;
  }, [images, selectedVariantId]);

  const generalVideoUrls = (videoUrls?.length ? videoUrls : videoUrl ? [videoUrl] : [])
    .map((url) => url.trim())
    .filter(Boolean);
  const selectedVariantVideoUrls = (variantVideos ?? [])
    .filter(
      (video) => video.url?.trim() && (!selectedVariantId || video.productVariantId === selectedVariantId),
    )
    .map((video) => video.url.trim());
  const normalizedVideoUrls = Array.from(
    new Set([...selectedVariantVideoUrls, ...generalVideoUrls]),
  );
  const videoCount = normalizedVideoUrls.length;
  const hasVideo = videoCount > 0;
  const imageCount = usableImages.length;
  const count = imageCount + videoCount;
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    setIndex(0);
    touchStartRef.current = null;
  }, [alt, count, selectedVariantId]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (count > 1 && event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex((current) => (current - 1 + count) % count);
      }
      if (count > 1 && event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex((current) => (current + 1) % count);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, count]);

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

    suppressClickUntilRef.current = Date.now() + 500;
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

  const isVideo = hasVideo && index >= imageCount;
  const videoIndex = Math.max(0, index - imageCount);
  const currentVideo = isVideo ? normalizedVideoUrls[videoIndex] : undefined;
  const current = isVideo ? undefined : usableImages[index] ?? usableImages[0];
  const openLightbox = () => {
    if (isVideo || !zoomEnabled || Date.now() < suppressClickUntilRef.current) return;
    setLightboxOpen(true);
  };

  if (count === 0) {
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
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label={`Galería de medios de ${alt}`}
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
            {isVideo ? (
              <div style={{ width: '100%' }}>
                <VideoMedia url={currentVideo!} />
              </div>
            ) : (
              <button
                type="button"
                onClick={openLightbox}
                disabled={!zoomEnabled}
                aria-label={zoomEnabled ? `Ampliar ${alt}` : undefined}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                  padding: 0,
                  border: 0,
                  backgroundColor: 'transparent',
                  cursor: zoomEnabled ? 'zoom-in' : 'default',
                }}
              >
                <img
                  src={imageSource(current!, 'main')}
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
              </button>
            )}
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
            {count > 1
              ? `${isVideo ? `Video ${videoIndex + 1}` : `Imagen ${index + 1}`} de ${count}`
              : ''}
          </span>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Imagen anterior"
                title="Anterior"
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
                title="Siguiente"
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
            {normalizedVideoUrls.map((url, thumbIndex) => {
              const active = index === imageCount + thumbIndex;
              const thumbnail = videoThumbnail(url);
              return (
                <button
                  key={`${url}-${thumbIndex}`}
                  type="button"
                  aria-label={`Ver video ${thumbIndex + 1} del producto`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => goTo(imageCount + thumbIndex)}
                  style={{
                    flex: '0 0 72px',
                    width: 72,
                    height: 90,
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: active
                      ? '2px solid var(--sf-color-text, #0d0d0d)'
                      : '1px solid rgba(13, 13, 13, 0.18)',
                    backgroundColor: '#0d0d0d',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative',
                  }}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }}
                    />
                  ) : null}
                  <IconPlayerPlay
                    size={24}
                    style={{ position: 'absolute', inset: 0, margin: 'auto' }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightboxOpen &&
        current &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Imagen ampliada de ${alt}`}
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              backgroundColor: 'rgba(8, 8, 8, 0.94)',
              cursor: 'zoom-out',
            }}
          >
            <button
              type="button"
              aria-label="Cerrar imagen ampliada"
              onClick={() => setLightboxOpen(false)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                width: 42,
                height: 42,
                padding: 0,
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.55)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <IconX size={22} />
            </button>

            <img
              src={imageSource(current, 'main')}
              alt={alt}
              onClick={(event) => event.stopPropagation()}
              style={{
                display: 'block',
                maxWidth: '92vw',
                maxHeight: '88vh',
                objectFit: 'contain',
                backgroundColor: '#111',
                boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
              }}
            />

            {imageCount > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Imagen anterior"
                  onClick={(event) => {
                    event.stopPropagation();
                    goTo(index - 1);
                  }}
                  style={{ ...arrowStyle, left: 18, zIndex: 2, backgroundColor: '#fff' }}
                >
                  <IconChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  aria-label="Imagen siguiente"
                  onClick={(event) => {
                    event.stopPropagation();
                    goTo(index + 1);
                  }}
                  style={{ ...arrowStyle, right: 18, zIndex: 2, backgroundColor: '#fff' }}
                >
                  <IconChevronRight size={22} />
                </button>
                <span
                  style={{
                    position: 'absolute',
                    bottom: 22,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: '#fff',
                    fontFamily: 'var(--font-jetbrains-mono, monospace)',
                    fontSize: 12,
                    letterSpacing: '0.08em',
                  }}
                >
                  {index + 1} / {imageCount}
                </span>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
