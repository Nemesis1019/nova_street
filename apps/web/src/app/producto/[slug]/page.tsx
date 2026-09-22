import type { components } from '@ecommerce/api-client';
import { Container, Grid, GridCol, Group, Image, Stack, Text, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AddToCartButton } from '../../../components/add-to-cart-button';
import { PriceText } from '../../../components/price-text';
import { ProductCard } from '../../../components/product-card';
import { ProductRating } from '../../../components/product-rating';
import { StoreFooter } from '../../../components/store-footer';
import { StoreHeader } from '../../../components/store-header';
import { WishlistButton } from '../../../components/wishlist-button';
import { apiClient } from '../../../lib/api';
import { buildProductSeoMetadata } from '../../../lib/seo';
import { parseStorefrontConfig } from '../../../lib/storefront-config';
import type { StoreConfig } from '../../../providers/config-provider';
import { ProductReviews } from './product-reviews';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  const [{ data: product }, { data: config }] = await Promise.all([
    apiClient.GET('/catalog/products/{slug}', { params: { path: { slug } } }),
    apiClient.GET('/store-config'),
  ]);

  if (!product) {
    return { title: 'Producto no encontrado' };
  }

  return buildProductSeoMetadata(config as StoreConfig | undefined, {
    name: product.name,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    images: product.images,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const [{ data: product }, { data: config }] = await Promise.all([
    apiClient.GET('/catalog/products/{slug}', { params: { path: { slug } } }),
    apiClient.GET('/store-config'),
  ]);

  if (!product) {
    notFound();
  }

  const productId = product.id;
  const variants = product.variants ?? [];
  const price = product.displayPrice ?? product.basePrice;
  const storefront = parseStorefrontConfig((config as StoreConfig | undefined)?.storefrontConfig);
  const relatedConfig = storefront.relatedProducts;
  const crossSellConfig = storefront.crossSell;

  async function fetchProducts(query: {
    categorySlug?: string;
    limit: number;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
  }) {
    try {
      const { data: response } = await apiClient.GET('/catalog/products', { params: { query } });
      return (response?.data ?? []).filter((p) => p.id !== productId);
    } catch {
      return [];
    }
  }

  let relatedProducts: components['schemas']['ProductListResponseDto']['data'] = [];
  if (relatedConfig.enabled && relatedConfig.strategy === 'sameCategory' && product.category?.slug) {
    relatedProducts = await fetchProducts({ categorySlug: product.category.slug, limit: relatedConfig.limit });
  }

  let crossSellProducts: components['schemas']['ProductListResponseDto']['data'] = [];
  if (crossSellConfig.enabled) {
    if (crossSellConfig.strategy === 'sameCategory' && product.category?.slug) {
      crossSellProducts = await fetchProducts({ categorySlug: product.category.slug, limit: crossSellConfig.limit });
    } else if (crossSellConfig.strategy === 'bestSelling') {
      crossSellProducts = await fetchProducts({ limit: crossSellConfig.limit, sort: 'newest' });
    }
  }

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="xl" px={0}>
          <Grid gap="xl" align="flex-start">
            <GridCol span={{ base: 12, md: 7 }}>
              {product.images && product.images.length > 0 ? (
                <Image
                  src={product.images[0].mediumUrl ?? product.images[0].url}
                  alt={product.name}
                  radius={0}
                  fit="cover"
                  style={{ border: '1px solid #0d0d0d' }}
                />
              ) : (
                <div
                  style={{
                    aspectRatio: '4/5',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #0d0d0d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text c="dimmed">Sin imagen</Text>
                </div>
              )}
            </GridCol>
            <GridCol span={{ base: 12, md: 5 }}>
              <Stack gap="xl" pt={{ md: 'xl' }}>
                <Stack gap="xs">
                  <Text
                    size="xs"
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {config?.name || 'NÖVA'} Original
                  </Text>
                  <Title
                    order={1}
                    style={{
                      fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                      fontSize: 'clamp(40px, 5vw, 64px)',
                      lineHeight: 0.95,
                    }}
                  >
                    {product.name}
                  </Title>
                  <Group align="center">
                    <PriceText
                      amount={price}
                      size="xl"
                      style={{
                        fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                      }}
                    />
                    {storefront.featureFlags.enableWishlist && variants[0]?.id && (
                      <WishlistButton productVariantId={variants[0].id} />
                    )}
                  </Group>
                  <ProductRating
                    averageRating={product.averageRating}
                    reviewCount={product.reviewCount}
                    size="md"
                  />
                  {variants.some((v) => v.productionLeadTimeDays) && (
                    <Text size="sm" c="dimmed">
                      Tiempo de producción:{' '}
                      {Math.max(...variants.map((v) => v.productionLeadTimeDays ?? 0))} días
                    </Text>
                  )}
                </Stack>

                {product.description && (
                  <Text size="md" style={{ color: '#444748', lineHeight: 1.6 }}>
                    {product.description}
                  </Text>
                )}

                <div
                  style={{
                    padding: '24px',
                    border: '1px solid #0d0d0d',
                    backgroundColor: '#f6f3f2',
                  }}
                >
                  <AddToCartButton
                    product={{
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      basePrice: product.displayPrice ?? product.basePrice,
                      variants,
                    }}
                  />
                </div>

                <Stack gap="xs">
                  <Group gap="xl">
                    <Text size="xs" c="dimmed">
                      ENVÍOS GLOBAL
                    </Text>
                    <Text size="xs" c="dimmed">
                      SOPORTE 24/7
                    </Text>
                  </Group>
                </Stack>
              </Stack>
            </GridCol>
          </Grid>

          {relatedProducts.length > 0 && (
            <div style={{ marginTop: 80 }}>
              <Title order={2} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                Productos relacionados
              </Title>
              <Grid gap="xl">
                {relatedProducts.map((related) => (
                  <GridCol span={{ base: 12, sm: 6, lg: 3 }} key={related.id}>
                    <ProductCard product={related} />
                  </GridCol>
                ))}
              </Grid>
            </div>
          )}

          {crossSellProducts.length > 0 && (
            <div style={{ marginTop: 80 }}>
              <Title order={2} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                {crossSellConfig.title}
              </Title>
              <Grid gap="xl">
                {crossSellProducts.map((item) => (
                  <GridCol span={{ base: 12, sm: 6, lg: 3 }} key={item.id}>
                    <ProductCard product={item} />
                  </GridCol>
                ))}
              </Grid>
            </div>
          )}

          {storefront.featureFlags.enableReviews && (
            <div style={{ marginTop: 80 }}>
              <ProductReviews productId={product.id} />
            </div>
          )}
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
