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
import { uniqueProductColors } from '../lib/product-colors';
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
      productVariantId?: string | null;
      focalPointX?: number;
      focalPointY?: number;
      cropZoom?: number;
    }[];
    variants?: {
      id?: string;
      sku?: string;
      size?: string | null;
      color?: string | null;
      colorHex?: string | null;
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

const CARD_DENSITIES = {
  compact: {
    padding: 'xs' as const,
    titleSize: 18,
    titleMinHeight: 40,
    stackGap: 'xs' as const,
    stackMarginTop: 'sm' as const,
    editorialPaddingTop: 10,
    editorialGap: 6,
    minimalPadding: 12,
  },
  comfortable: {
    padding: 'md' as const,
    titleSize: 20,
    titleMinHeight: 48,
    stackGap: 'xs' as const,
    stackMarginTop: 'md' as const,
    editorialPaddingTop: 14,
    editorialGap: 8,
    minimalPadding: 16,
  },
  roomy: {
    padding: 'lg' as const,
    titleSize: 22,
    titleMinHeight: 56,
    stackGap: 'sm' as const,
    stackMarginTop: 'lg' as const,
    editorialPaddingTop: 18,
    editorialGap: 10,
    minimalPadding: 20,
  },
};

function ColorSwatches({
  colors,
  activeColor,
  textAlign,
  onSelect,
}: {
  colors: ReturnType<typeof uniqueProductColors>;
  activeColor: string | null;
  textAlign: 'left' | 'center';
  onSelect: (color: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
        flexWrap: 'wrap',
        gap: 2,
        marginTop: 4,
      }}
    >
      {colors.map((option) => {
        const active = option.color.toLowerCase() === activeColor?.toLowerCase();
        return (
          <button
            key={option.color}
            type="button"
            aria-label={`Color ${option.color}`}
            aria-pressed={active}
            title={option.color}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelect(option.color);
            }}
            style={{
              width: 24,
              height: 24,
              padding: 0,
              border: 0,
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'block',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: option.hex,
                border: active
                  ? '2px solid var(--sf-color-text, #0d0d0d)'
                  : '1px solid rgba(13, 13, 13, 0.28)',
                boxShadow: active ? '0 0 0 2px var(--sf-color-surface, #fcf9f8)' : undefined,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

interface ProductCardImageCarouselProps {
  images: ProductCardImage[];
  alt: string;
  height: number | '100%';
  variant?: 'card' | 'editorial';
  navigationStyle?: CarouselNavigationStyle;
  swipeEnabled?: boolean;
  fit?: 'cover' | 'contain';
}

function SizeSwatches({
  sizes,
  activeSize,
  textAlign,
  onSelect,
}: {
  sizes: string[];
  activeSize: string | null;
  textAlign: 'left' | 'center';
  onSelect: (size: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
      }}
    >
      {sizes.map((size) => {
        const active = size === activeSize;
        return (
          <button
            key={size}
            type="button"
            aria-label={`Talle ${size}`}
            aria-pressed={active}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelect(size);
            }}
            style={{
              minWidth: 26,
              height: 22,
              padding: '0 5px',
              border: '1px solid var(--sf-color-text, #0d0d0d)',
              backgroundColor: active ? 'var(--sf-color-text, #0d0d0d)' : 'transparent',
              color: active ? 'var(--sf-color-surface, #fcf9f8)' : 'var(--sf-color-text, #0d0d0d)',
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              fontSize: 9,
              letterSpacing: '0.03em',
              cursor: 'pointer',
            }}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
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

const BADGE_TONES: Record<string, string> = {
  green: '#2f9e44',
  orange: '#f76707',
  yellow: '#f0b429',
};

function cornerBadge(
  label: string,
  tone: string,
  shape: 'square' | 'pill',
  style: 'outline' | 'solid',
) {
  const solid = style === 'solid';
  return (
    <Badge
      key={label}
      color={tone}
      variant="filled"
      radius={shape === 'pill' ? 999 : 0}
      style={{
        backgroundColor: solid ? BADGE_TONES[tone] ?? '#0d0d0d' : 'var(--sf-color-surface, #fcf9f8)',
        color: solid ? (tone === 'yellow' ? '#0d0d0d' : '#ffffff') : 'var(--sf-color-text, #0d0d0d)',
        border: solid ? '1px solid transparent' : '1px solid var(--sf-color-text, #0d0d0d)',
      }}
    >
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
  const hoverClass =
    productCard.hoverEffect === 'inherit' ? '' : ` nova-card-hover-${productCard.hoverEffect}`;
  const imageRatio =
    productCard.imageRatio === 'standard' ? null : IMAGE_RATIOS[productCard.imageRatio];
  const badgesOnRight = productCard.badgePosition === 'top-right';
  const price = product.displayPrice ?? product.basePrice;
  const density = CARD_DENSITIES[productCard.density];
  const allImages = (product.images ?? []).filter(
    (image) => image.smallUrl || image.thumbnailUrl || image.url,
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
  }, [product.id]);

  const colorVariants = (product.variants ?? []).filter(
    (variant): variant is typeof variant & { id: string } => typeof variant.id === 'string',
  );
  const colorOptions = uniqueProductColors(colorVariants);
  const activeColor = selectedColor ?? colorOptions[0]?.color ?? null;
  const activeColorKey = activeColor?.trim().toLowerCase();
  const colorVariantIds = new Set(
    (product.variants ?? [])
      .filter(
        (variant) =>
          !activeColorKey || variant.color?.trim().toLowerCase() === activeColorKey,
      )
      .map((variant) => variant.id),
  );
  const variantsForColor = colorVariants.filter((variant) =>
    activeColorKey ? variant.color?.trim().toLowerCase() === activeColorKey : true,
  );
  const sizeOptions = Array.from(
    new Set(
      variantsForColor
        .map((variant) => variant.size?.trim())
        .filter((size): size is string => Boolean(size)),
    ),
  );
  const activeSize =
    selectedSize ?? variantsForColor[0]?.size?.trim() ?? sizeOptions[0] ?? null;
  const activeVariant =
    variantsForColor.find((variant) => variant.size?.trim() === activeSize) ??
    (product.variants ?? []).find(
      (variant) => variant.id && colorVariantIds.has(variant.id),
    );
  const preferredVariantIds = activeVariant?.id
    ? new Set([activeVariant.id])
    : colorVariantIds;
  const preferredImages = allImages.filter(
    (image) => !image.productVariantId || preferredVariantIds.has(image.productVariantId),
  );
  const colorImages = allImages.filter(
    (image) => !image.productVariantId || colorVariantIds.has(image.productVariantId),
  );
  const images =
    preferredImages.length > 0
      ? preferredImages
      : colorImages.length > 0
        ? colorImages
        : allImages;
  const firstImage = images[0];
  const imageUrl = firstImage?.smallUrl ?? firstImage?.thumbnailUrl ?? firstImage?.url;
  const outOfStock = isOutOfStock(product.variants);
  const lowStock = isLowStock(product.variants, productBadges.lowStockThreshold);
  const isProductNew = productBadges.showNew && isNew(product.createdAt, productBadges.newDaysThreshold);
  const onSale = productBadges.showSale && isOnSale(product);
  const firstVariantId = activeVariant?.id;
  const firstSku = activeVariant?.sku;
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

  const selectCardColor = (color: string) => {
    setSelectedColor(color);
    const normalized = color.trim().toLowerCase();
    const availableSizes = (product.variants ?? [])
      .filter((variant) => variant.color?.trim().toLowerCase() === normalized)
      .map((variant) => variant.size?.trim());
    setSelectedSize((current) =>
      current && availableSizes.includes(current) ? current : null,
    );
  };

  const swatches =
    productCard.showColorSwatches && colorOptions.length > 1 ? (
      <ColorSwatches
        colors={colorOptions}
        activeColor={activeColor}
        textAlign={productCard.textAlign}
        onSelect={selectCardColor}
      />
    ) : null;
  const sizeSwatches =
    productCard.showSizeSwatches && sizeOptions.length > 1 ? (
      <SizeSwatches
        sizes={sizeOptions}
        activeSize={activeSize}
        textAlign={productCard.textAlign}
        onSelect={setSelectedSize}
      />
    ) : null;

  if (variant === 'editorial') {
    return (
      <Link
        href={`/producto/${product.slug}`}
        className={`sf-editorial-card${controlsAlways ? ' nova-card-controls-always' : ''}${hoverClass}`}
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
            <div
              style={{
                position: 'absolute',
                top: 12,
                ...(badgesOnRight ? { right: 12 } : { left: 12 }),
                zIndex: 7,
              }}
            >
              {cornerBadge(
                'Oferta',
                'orange',
                productCard.badgeShape,
                productCard.badgeStyle,
              )}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            justifyContent:
              productCard.textAlign === 'center' ? 'center' : 'space-between',
            gap: density.editorialGap,
            paddingTop: density.editorialPaddingTop,
            textAlign: productCard.textAlign,
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
        {swatches}
        {sizeSwatches}
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
            padding: density.minimalPadding,
            border: '1px solid var(--sf-color-text, #0d0d0d)',
            borderRadius: 0,
            backgroundColor: 'transparent',
            color: 'var(--sf-color-text, #0d0d0d)',
            textAlign: productCard.textAlign,
          },
          label: { display: 'block' },
        }}
      >
        <Text
          lineClamp={1}
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: density.titleSize - 2,
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
      padding={density.padding}
      radius={0}
      withBorder
      h="100%"
      className={`nova-product-card${unavailable ? ' is-unavailable' : ''}${controlsAlways ? ' nova-card-controls-always' : ''}${hoverClass}`}
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
              ...(badgesOnRight ? { right: 10, alignItems: 'flex-end' } : { left: 10, alignItems: 'flex-start' }),
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {isProductNew && cornerBadge('Nuevo', 'green', productCard.badgeShape, productCard.badgeStyle)}
            {onSale && cornerBadge('Oferta', 'orange', productCard.badgeShape, productCard.badgeStyle)}
            {lowStock && cornerBadge('Pocas unidades', 'yellow', productCard.badgeShape, productCard.badgeStyle)}
          </div>
        )}

        {/* Reseñas — esquina superior derecha (no altera el alto de la card) */}
        {productCard.showRating && hasReviews && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              ...(badgesOnRight ? { left: 10 } : { right: 10 }),
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

      <Stack gap={density.stackGap} mt={density.stackMarginTop} style={{ flex: 1 }}>
        <Text
          lineClamp={2}
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: density.titleSize,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            minHeight: density.titleMinHeight,
            textAlign: productCard.textAlign,
          }}
        >
          {product.name}
        </Text>
        {swatches}
        {sizeSwatches}
        {productCard.showSku && (
          <Text size="xs" c="dimmed" style={{ minHeight: 16, textAlign: productCard.textAlign }}>
            SKU: {firstSku ?? '—'}
          </Text>
        )}
        <Text
          size="sm"
          style={{
            marginTop: 'auto',
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            color: unavailable ? '#8f8d8c' : 'var(--sf-color-text-muted, #5f5f58)',
            textAlign: productCard.textAlign,
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
