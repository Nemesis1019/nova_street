'use client';

import { Badge, Card, Image, Stack, Text } from '@mantine/core';
import { IconPhotoOff, IconStarFilled } from '@tabler/icons-react';
import Link from 'next/link';

import { useWishlistVariantIds } from '../hooks/use-wishlist';
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
    images?: { url?: string; smallUrl?: string; thumbnailUrl?: string }[];
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
  variant?: 'default' | 'minimal';
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
    <Badge key={label} color={color} variant="filled" radius={0} style={{ backgroundColor: '#fcf9f8', color: '#0d0d0d', border: '1px solid #0d0d0d' }}>
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
  const price = product.displayPrice ?? product.basePrice;
  const firstImage = product.images?.[0];
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
            border: '1px solid #0d0d0d',
            borderRadius: 0,
            backgroundColor: 'transparent',
            color: '#0d0d0d',
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
            color: '#5f5f58',
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
      className={`nova-product-card${unavailable ? ' is-unavailable' : ''}`}
      style={{
        border: '1px solid #0d0d0d',
        boxShadow: 'none',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        cursor: unavailable ? 'default' : 'pointer',
      }}
    >
      <Card.Section style={{ position: 'relative', height: IMAGE_HEIGHT, backgroundColor: '#f6f3f2' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            height={IMAGE_HEIGHT}
            fit="cover"
            style={{ transition: 'transform 0.4s ease' }}
            className="nova-card-image"
          />
        ) : (
          <div
            style={{
              height: IMAGE_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c9c6c5',
            }}
          >
            <IconPhotoOff size={38} stroke={1.2} />
          </div>
        )}

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
              border: '1px solid #0d0d0d',
              backgroundColor: '#fcf9f8',
              color: '#0d0d0d',
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
          <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
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
          <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
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
                border: '1px solid #0d0d0d',
                backgroundColor: '#0d0d0d',
                color: '#fcf9f8',
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
            color: unavailable ? '#8f8d8c' : '#5f5f58',
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
