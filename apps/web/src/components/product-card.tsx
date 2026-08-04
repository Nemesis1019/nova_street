'use client';

import { Badge, Card, Group, Image, Stack, Text } from '@mantine/core';

import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';
import { useCurrency } from '../providers/currency-provider';
import { CompareButton } from './compare-button';
import { LinkButton } from './link-button';
import { ProductRating } from './product-rating';
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
    variants?: { id?: string; sku?: string; stockMode?: string; inStock?: boolean; availableQuantity?: number }[];
    averageRating?: number;
    reviewCount?: number;
  };
  isInWishlist?: boolean;
  variant?: 'default' | 'minimal';
}

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

export function ProductCard({ product, isInWishlist, variant = 'default' }: ProductCardProps) {
  const { format } = useCurrency();
  const config = useStoreConfig();
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

  const badges = (
    <Group gap="xs">
      {isProductNew && (
        <Badge color="green" variant="outline" radius={0} style={{ width: 'fit-content' }}>
          Nuevo
        </Badge>
      )}
      {onSale && (
        <Badge color="orange" variant="outline" radius={0} style={{ width: 'fit-content' }}>
          Oferta
        </Badge>
      )}
      {lowStock && (
        <Badge color="yellow" variant="outline" radius={0} style={{ width: 'fit-content' }}>
          Pocas unidades
        </Badge>
      )}
      {outOfStock && (
        <Badge color="red" variant="outline" radius={0} style={{ width: 'fit-content' }}>
          Agotado
        </Badge>
      )}
    </Group>
  );

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
        {productCard.showSku && firstSku && (
          <Text size="xs" c="dimmed">
            SKU: {firstSku}
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
        {productCard.showRating && <ProductRating averageRating={product.averageRating} reviewCount={product.reviewCount} />}
        {productCard.showStockBadge && badges}
      </LinkButton>
    );
  }

  return (
    <Card
      padding="md"
      radius={0}
      withBorder
      style={{
        border: '1px solid #0d0d0d',
        boxShadow: 'none',
        backgroundColor: 'transparent',
      }}
    >
      {imageUrl && (
        <Card.Section style={{ overflow: 'hidden' }}>
          <Image
            src={imageUrl}
            alt={product.name}
            height={280}
            fit="cover"
            style={{
              transition: 'transform 0.4s ease',
            }}
            className="nova-card-image"
          />
        </Card.Section>
      )}
      <Stack gap="xs" mt="md">
        <Group justify="space-between" align="flex-start">
          <Text
            lineClamp={1}
            style={{
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              fontSize: '20px',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            {product.name}
          </Text>
          {productCard.showWishlist && featureFlags.enableWishlist && firstVariantId && (
            <WishlistButton productVariantId={firstVariantId} isInWishlist={isInWishlist} />
          )}
        </Group>
        {productCard.showSku && firstSku && (
          <Text size="xs" c="dimmed">
            SKU: {firstSku}
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
        {productCard.showRating && <ProductRating averageRating={product.averageRating} reviewCount={product.reviewCount} />}
        {productCard.showStockBadge && badges}
      </Stack>
      <LinkButton
        href={`/producto/${product.slug}`}
        fullWidth
        mt="md"
        size="sm"
        variant="outline"
        style={{
          borderColor: '#0d0d0d',
          color: '#0d0d0d',
          backgroundColor: 'transparent',
        }}
      >
        {productCard.showQuickView && featureFlags.enableQuickView ? 'Vista rápida' : 'Ver producto'}
      </LinkButton>
      {featureFlags.enableCompare && <CompareButton slug={product.slug} />}
    </Card>
  );
}
