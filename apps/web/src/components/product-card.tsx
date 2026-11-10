'use client';

import { Badge, Card, Stack, Text } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPhotoOff,
  IconStarFilled,
} from '@tabler/icons-react';
import Link from 'next/link';
import { type MouseEvent, type TouchEvent, useEffect, useRef, useState } from 'react';

import { useWishlistVariantIds } from '../hooks/use-wishlist';
import { imageCropStyle } from '../lib/image-crop';
import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';
import { useCurrency } from '../providers/currency-provider';
import { useAuthStore } from '../store/auth-store';
import { LinkButton } from './link-button';
import { QuickAddButton } from './quick-add-button';
import { WishlistButton } from './wishlist-button';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    displayPrice?: number;
    createdAt?: string;
    images?: {
      url?: string;
      smallUrl?: string;
      thumbnailUrl?: string;
      focalPointX?: number;
      focalPointY?: number;
      cropZoom?: number;
    }[];
    variants?: {
      id?: string;
      sku?: string;
      size?: string | null;
      color?: string | null;
      stockMode?: string;
      inStock?: boolean;
      availableQuantity?: number;
      priceAdjustment?: number;
    }[];
    averageRating?: number;
    reviewCount?: number;
  };
  isInWishlist?: boolean;
  /** Producto desactivado o sin stock: se muestra atenuado y sin CTA. */
  isUnavailable?: boolean;
  variant?: 'default' | 'minimal' | 'editorial';
}

type ProductCardImage = NonNullable<ProductCardProps['product']['images']>[number];

type CarouselNavigationStyle = 'arrows' | 'dots' | 'both';
type ProductImageRatio = 'standard' | 'square' | 'portrait' | 'landscape';

const IMAGE_RATIOS: Record<Exclude<ProductImageRatio, 'standard'>, string> = {
  square: '1 / 1',
  portrait: '4 / 5',
  landscape: '4 / 3',
};

interface ProductCardImageCarouselProps {
  images: ProductCardImage[];
  alt: string;
  height: number | '100%';
  variant?: 'card' | 'editorial';
  navigationStyle?: CarouselNavigationStyle;
  swipeEnabled?: boolean;
  fit?: 'cover' | 'contain';
}

function ProductCardImageCarousel({
  images,
  alt,
  height,
  variant = 'card',
  navigationStyle = 'both',
  swipeEnabled = true,
  fit = 'cover',
}: ProductCardImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntilRef = useRef(0);
  const count = images.length;

  useEffect(() => {
    setIndex(0);
    touchStartRef.current = null;
    suppressClickUntilRef.current = 0;
  }, [alt, count]);

  if (count === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#c9c6c5',
        }}
      >
        <IconPhotoOff size={38} stroke={1.2} />
      </div>
    );
  }

  const current = images[index] ?? images[0];
  const imageUrl = current.smallUrl ?? current.thumbnailUrl ?? current.url;
  const hasMultiple = count > 1;
  const showArrows = hasMultiple && navigationStyle !== 'dots';
  const showDots = hasMultiple && navigationStyle !== 'arrows';

  const goTo = (event: MouseEvent<HTMLButtonElement>, nextIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    setIndex((nextIndex + count) % count);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!hasMultiple || !swipeEnabled) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !hasMultiple || !swipeEnabled) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

    if (!isHorizontalSwipe) return;

    // Evita que el gesto termine navegando al detalle del producto.
    suppressClickUntilRef.current = Date.now() + 500;
    setIndex((current) => (current + (deltaX < 0 ? 1 : -1) + count) % count);
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (Date.now() > suppressClickUntilRef.current) return;
    suppressClickUntilRef.current = 0;
    event.preventDefault();
    event.stopPropagation();
  };

  const controlStyle = {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 5,
    width: 34,
    height: 34,
    padding: 0,
    borderRadius: '50%',
    border: '1px solid rgba(13, 13, 13, 0.16)',
    backgroundColor: 'rgba(252, 249, 248, 0.92)',
    color: '#0d0d0d',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  };

  return (
    <div
      role={hasMultiple ? 'group' : undefined}
      aria-roledescription={hasMultiple ? 'carousel' : undefined}
      aria-label={hasMultiple ? `Galería de imágenes de ${alt}` : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null;
      }}
      onClickCapture={handleClickCapture}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        touchAction: 'pan-y',
        backgroundColor: 'var(--sf-color-surface-muted, #f6f3f2)',
      }}
    >
      <div
        role={hasMultiple ? 'group' : undefined}
        aria-roledescription={hasMultiple ? 'slide' : undefined}
        aria-label={hasMultiple ? `${index + 1} de ${count}` : undefined}
        style={{ width: '100%', height: '100%' }}
      >
        <img
          src={imageUrl}
          alt={count > 1 ? `${alt} — imagen ${index + 1} de ${count}` : alt}
          loading="lazy"
          className={variant === 'editorial' ? 'sf-editorial-primary' : 'nova-card-image'}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: fit,
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
        {hasMultiple ? `Imagen ${index + 1} de ${count}` : ''}
      </span>

      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Imagen anterior"
            title="Imagen anterior"
            className="nova-card-hover-control"
            style={{ ...controlStyle, left: 8 }}
            onClick={(event) => goTo(event, index - 1)}
          >
            <IconChevronLeft size={18} stroke={2} />
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            title="Imagen siguiente"
            className="nova-card-hover-control"
            style={{ ...controlStyle, right: 8 }}
            onClick={(event) => goTo(event, index + 1)}
          >
            <IconChevronRight size={18} stroke={2} />
          </button>
        </>
      )}

      {showDots && (
        <div
          role="group"
          aria-label="Navegación de imágenes"
          className="nova-card-hover-control"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 10,
            transform: 'translateX(-50%)',
            zIndex: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 7px',
            borderRadius: 999,
            backgroundColor: 'rgba(252, 249, 248, 0.88)',
            border: '1px solid rgba(13, 13, 13, 0.12)',
          }}
        >
          {images.map((image, dotIndex) => (
            <button
              key={image.url ?? image.smallUrl ?? dotIndex}
              type="button"
              aria-label={`Ir a la imagen ${dotIndex + 1} de ${count}`}
              aria-current={dotIndex === index ? 'true' : undefined}
              onClick={(event) => goTo(event, dotIndex)}
              style={{
                width: 7,
                height: 7,
                padding: 0,
                borderRadius: '50%',
                border: 0,
                cursor: 'pointer',
                backgroundColor:
                  dotIndex === index ? '#0d0d0d' : 'rgba(13, 13, 13, 0.32)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const IMAGE_HEIGHT = 280;
/** Alto reservado para el título (2 líneas) para que todas las cards midan igual. */
const TITLE_MIN_HEIGHT = 48;

function isOutOfStock(variants?: ProductCardProps['product']['variants']) {
  if (!variants || variants.length === 0) return false;
  return variants.every(
    (variant) => variant.stockMode === 'TRACKED' && variant.inStock === false,
  );
}

function isLowStock(variants?: ProductCardProps['product']['variants'], threshold = 5) {
  if (!variants || variants.length === 0) return false;
  return variants.some(
    (variant) =>
      variant.stockMode === 'TRACKED' &&
      variant.inStock !== false &&
      typeof variant.availableQuantity === 'number' &&
      variant.availableQuantity <= threshold,
  );
}

function isNew(createdAt?: string, thresholdDays = 7) {
  if (!createdAt) return false;
  const date = new Date(createdAt);
  const diff = Date.now() - date.getTime();
  return diff <= thresholdDays * 24 * 60 * 60 * 1000;
}

function isOnSale(product: ProductCardProps['product']) {
  return typeof product.displayPrice === 'number' && product.displayPrice < product.basePrice;
}

function cornerBadge(label: string, color: string) {
  return (
    <Badge key={label} color={color} variant="filled" radius={0} style={{ backgroundColor: 'var(--sf-color-surface, #fcf9f8)', color: 'var(--sf-color-text, #0d0d0d)', border: '1px solid var(--sf-color-text, #0d0d0d)' }}>
      {label}
    </Badge>
  );
}

export function ProductCard({ product, isInWishlist, isUnavailable = false, variant = 'default' }: ProductCardProps) {
  const { format } = useCurrency();
  const config = useStoreConfig();
  const { isAuthenticated } = useAuthStore();
  const { variantIds } = useWishlistVariantIds();
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const { productCard, productBadges, featureFlags } = storefront;
  const controlsAlways = productCard.controlsVisibility === 'always';
  const imageRatio =
    productCard.imageRatio === 'standard' ? null : IMAGE_RATIOS[productCard.imageRatio];
  const price = product.displayPrice ?? product.basePrice;
  const images = (product.images ?? []).filter(
    (image) => image.smallUrl || image.thumbnailUrl || image.url,
  );
  const firstImage = images[0];
  const imageUrl = firstImage?.smallUrl ?? firstImage?.thumbnailUrl ?? firstImage?.url;
  const outOfStock = isOutOfStock(product.variants);
  const lowStock = isLowStock(product.variants, productBadges.lowStockThreshold);
  const isProductNew = productBadges.showNew && isNew(product.createdAt, productBadges.newDaysThreshold);
  const onSale = productBadges.showSale && isOnSale(product);
  const firstVariantId = product.variants?.[0]?.id;
  const firstSku = product.variants?.[0]?.sku;
  const hasReviews = typeof product.reviewCount === 'number' && product.reviewCount > 0;
  const unavailable = isUnavailable || outOfStock;
  const inWishlist = isInWishlist ?? (firstVariantId ? variantIds.has(firstVariantId) : false);
  const quickAddVariants = (product.variants ?? [])
    .filter((variant): variant is typeof variant & { id: string } => typeof variant.id === 'string')
    .map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size ?? null,
      color: variant.color ?? null,
      stockMode: variant.stockMode,
      inStock: variant.inStock,
      availableQuantity: variant.availableQuantity,
      priceAdjustment: variant.priceAdjustment,
    }));

  if (variant === 'editorial') {
    return (
      <Link
        href={`/producto/${product.slug}`}
        className={`sf-editorial-card${controlsAlways ? ' nova-card-controls-always' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          color: 'var(--sf-color-text, #1f1b16)',
          textDecoration: 'none',
          opacity: unavailable ? 0.55 : 1,
        }}
      >
        <div
          className="sf-editorial-media"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: imageRatio ?? 'var(--sf-product-ratio, 4 / 5)',
            overflow: 'hidden',
            backgroundColor: 'var(--sf-color-surface-muted, #f4efe7)',
          }}
        >
          <ProductCardImageCarousel
            images={images}
            alt={product.name}
            height="100%"
            variant="editorial"
            navigationStyle={productCard.navigationStyle}
            swipeEnabled={productCard.swipeEnabled}
            fit={productCard.imageFit}
          />
          {onSale ? (
            <span
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 7,
                padding: '4px 8px',
                backgroundColor: 'var(--sf-color-brand, #1f1b16)',
                color: 'var(--sf-color-inverse, #fff)',
                fontFamily: 'var(--sf-font-mono, monospace)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Oferta
            </span>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            paddingTop: 14,
          }}
        >
          <span
            style={{
              minWidth: 0,
              fontFamily: 'var(--sf-font-display, serif)',
              fontSize: 'clamp(1.05rem, 1.7vw, 1.3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            {product.name}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--sf-font-mono, monospace)',
              fontSize: 11,
              color: 'var(--sf-color-text-muted, #6b6258)',
            }}
          >
            {format(price)}
          </span>
        </div>
        {productCard.showRating && hasReviews ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 6,
              fontFamily: 'var(--sf-font-mono, monospace)',
              fontSize: 10,
              color: 'var(--sf-color-text-muted, #6b6258)',
            }}
          >
            <IconStarFilled size={10} />
            {product.averageRating?.toFixed(1)} ({product.reviewCount})
          </span>
        ) : null}
      </Link>
    );
  }

  if (variant === 'minimal') {
    return (
      <LinkButton
        href={`/producto/${product.slug}`}
        variant="subtle"
        fullWidth
        styles={{
          root: {
            display: 'block',
            padding: '16px',
            border: '1px solid var(--sf-color-text, #0d0d0d)',
            borderRadius: 0,
            backgroundColor: 'transparent',
            color: 'var(--sf-color-text, #0d0d0d)',
            textAlign: 'left',
          },
          label: { display: 'block' },
        }}
      >
        <Text
          lineClamp={1}
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: '18px',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          {product.name}
        </Text>
        {productCard.showSku && (
          <Text size="xs" c="dimmed">
            SKU: {firstSku ?? '—'}
          </Text>
        )}
        <Text
          size="sm"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            color: 'var(--sf-color-text-muted, #5f5f58)',
          }}
        >
          {format(price)}
        </Text>
      </LinkButton>
    );
  }

  const cardBody = (
    <Card
      padding="md"
      radius={0}
      withBorder
      h="100%"
      className={`nova-product-card${unavailable ? ' is-unavailable' : ''}${controlsAlways ? ' nova-card-controls-always' : ''}`}
      style={{
        border: '1px solid var(--sf-color-text, #0d0d0d)',
        boxShadow: 'none',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        cursor: unavailable ? 'default' : 'pointer',
      }}
    >
      <Card.Section
        style={{
          position: 'relative',
          ...(imageRatio ? { aspectRatio: imageRatio } : { height: IMAGE_HEIGHT }),
          overflow: 'hidden',
          backgroundColor: 'var(--sf-color-surface-muted, #f6f3f2)',
        }}
      >
        <ProductCardImageCarousel
          images={images}
          alt={product.name}
          height={imageRatio ? '100%' : IMAGE_HEIGHT}
          navigationStyle={productCard.navigationStyle}
          swipeEnabled={productCard.swipeEnabled}
          fit={productCard.imageFit}
        />

        {/* Badges de estado — esquina superior izquierda */}
        {productCard.showStockBadge && !unavailable && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            {isProductNew && cornerBadge('Nuevo', 'green')}
            {onSale && cornerBadge('Oferta', 'orange')}
            {lowStock && cornerBadge('Pocas unidades', 'yellow')}
          </div>
        )}

        {/* Reseñas — esquina superior derecha (no altera el alto de la card) */}
        {productCard.showRating && hasReviews && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              border: '1px solid var(--sf-color-text, #0d0d0d)',
              backgroundColor: 'var(--sf-color-surface, #fcf9f8)',
              color: 'var(--sf-color-text, #0d0d0d)',
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            <IconStarFilled size={12} />
            {product.averageRating?.toFixed(1)}
            <span style={{ opacity: 0.6 }}>({product.reviewCount})</span>
          </span>
        )}

        {/* Agregar al carrito — esquina inferior izquierda */}
        {!unavailable && quickAddVariants.length > 0 && (
          <div
            className="nova-card-hover-control"
            style={{ position: 'absolute', bottom: 10, left: 10 }}
          >
            <QuickAddButton
              product={{
                name: product.name,
                basePrice: price,
                imageUrl,
                variants: quickAddVariants,
              }}
            />
          </div>
        )}

        {/* Favoritos — esquina inferior derecha, solo con sesión iniciada */}
        {productCard.showWishlist && featureFlags.enableWishlist && firstVariantId && isAuthenticated && (
          <div
            className="nova-card-hover-control"
            style={{ position: 'absolute', bottom: 10, right: 10 }}
          >
            <WishlistButton productVariantId={firstVariantId} isInWishlist={inWishlist} overlay />
          </div>
        )}

        {/* Producto desactivado / sin stock */}
        {unavailable && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(252, 249, 248, 0.74)',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                padding: '3px 8px',
                border: '1px solid var(--sf-color-text, #0d0d0d)',
                backgroundColor: 'var(--sf-color-text, #0d0d0d)',
                color: 'var(--sf-color-surface, #fcf9f8)',
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                fontSize: 12,
                lineHeight: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {isUnavailable ? 'No disponible' : 'Agotado'}
            </span>
          </>
        )}
      </Card.Section>

      <Stack gap="xs" mt="md" style={{ flex: 1 }}>
        <Text
          lineClamp={2}
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: '20px',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            minHeight: TITLE_MIN_HEIGHT,
          }}
        >
          {product.name}
        </Text>
        {productCard.showSku && (
          <Text size="xs" c="dimmed" style={{ minHeight: 16 }}>
            SKU: {firstSku ?? '—'}
          </Text>
        )}
        <Text
          size="sm"
          style={{
            marginTop: 'auto',
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            color: unavailable ? '#8f8d8c' : 'var(--sf-color-text-muted, #5f5f58)',
          }}
        >
          {format(price)}
        </Text>
      </Stack>
    </Card>
  );

  // Toda la card es clickeable (cursor pointer + animación al hover);
  // si el producto no está disponible no navega.
  if (unavailable) {
    return cardBody;
  }

  return (
    <Link
      href={`/producto/${product.slug}`}
      aria-label={product.name}
      style={{ display: 'block', height: '100%', textDecoration: 'none', color: 'inherit' }}
    >
      {cardBody}
    </Link>
  );
}
