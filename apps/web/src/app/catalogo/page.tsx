import type { components } from '@ecommerce/api-client';
import { Badge, Container, Grid, GridCol, Group, Stack, Text, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ProductCard } from '../../components/product-card';
import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { UiButton } from '../../components/ui/button';
import { apiClient } from '../../lib/api';
import { parseStorefrontConfig } from '../../lib/storefront-config';
import type { StoreConfig } from '../../providers/config-provider';
import { CatalogFilters } from './catalog-filters';
import { CatalogPagination } from './catalog-pagination';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = typeof params.category === 'string' ? params.category : undefined;

  try {
    const { data: config } = await apiClient.GET('/store-config');
    const storeName = config?.name ?? 'NÖVA';

    if (categorySlug) {
      const { data: category } = await apiClient.GET('/catalog/categories/{slug}', {
        params: { path: { slug: categorySlug } },
      });
      if (category) {
        return {
          title: category.metaTitle || `${category.name} — ${storeName}`,
          description: category.metaDescription || category.description || `Productos de ${category.name}`,
        };
      }
    }

    return {
      title: `Colecciones — ${storeName}`,
    };
  } catch {
    return { title: 'Colecciones' };
  }
}

function parseNumber(value: string | string[] | undefined): number | undefined {
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

function parseStringArray(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : value.split(',').filter(Boolean);
}

function parseLimit(value: string | string[] | undefined): number | undefined {
  const parsed = parseNumber(value);
  if (parsed === 12 || parsed === 24 || parsed === 48) return parsed;
  return undefined;
}

function mapSort(value: string): 'newest' | 'price_asc' | 'price_desc' | 'name_asc' {
  switch (value) {
    case 'priceAsc':
      return 'price_asc';
    case 'priceDesc':
      return 'price_desc';
    case 'nameAsc':
      return 'name_asc';
    case 'newest':
    default:
      return 'newest';
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  let configResponse: StoreConfig | undefined;
  try {
    const { data } = await apiClient.GET('/store-config');
    configResponse = (data as StoreConfig) ?? undefined;
  } catch {
    configResponse = undefined;
  }
  const storefront = parseStorefrontConfig(configResponse?.storefrontConfig);
  const catalogConfig = storefront.catalog;
  const defaultLimit = catalogConfig.defaultPageSize;
  const defaultSort = mapSort(catalogConfig.defaultSort);

  const query = {
    limit: parseLimit(params.limit) ?? defaultLimit,
    page: parseNumber(params.page) ?? 1,
    categorySlug: parseString(params.category),
    sizes: parseStringArray(params.sizes),
    colors: parseStringArray(params.colors),
    minPrice: parseNumber(params.minPrice),
    maxPrice: parseNumber(params.maxPrice),
    inStock: params.inStock === 'true',
    search: parseString(params.search),
    sort: (parseString(params.sort) as 'newest' | 'price_asc' | 'price_desc' | 'name_asc') ?? defaultSort,
  };

  let products: components['schemas']['ProductListResponseDto']['data'] = [];
  let meta: components['schemas']['ProductListResponseDto']['meta'] | undefined;
  let categories: { slug: string; name: string }[] = [];
  let enableCatalogFilters = true;

  try {
    const [{ data: productsResponse }, { data: categoriesResponse }] = await Promise.all([
      apiClient.GET('/catalog/products', { params: { query: query as never } }),
      apiClient.GET('/catalog/categories'),
    ]);
    products = productsResponse?.data ?? [];
    meta = productsResponse?.meta;
    categories = (categoriesResponse ?? []) as { slug: string; name: string }[];
    enableCatalogFilters = catalogConfig.showFilters;
  } catch {
    products = [];
    categories = [];
  }

  const sizes = ['S', 'M', 'L', 'XL'];
  const colors = ['Negro', 'Blanco', 'Gris', 'Azul', 'Rojo'];
  const priceRanges = [
    { label: '$100k - $150k COP', min: 100000, max: 150000 },
    { label: '$150k - $200k COP', min: 150000, max: 200000 },
    { label: '> $200k COP', min: 200000, max: Infinity },
  ];

  const activeFiltersCount =
    (query.categorySlug ? 1 : 0) +
    (query.sizes?.length ?? 0) +
    (query.colors?.length ?? 0) +
    (query.minPrice !== undefined || query.maxPrice !== undefined ? 1 : 0) +
    (query.inStock ? 1 : 0) +
    (query.search ? 1 : 0);

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8' }}>
        {/* Page header */}
        <section style={{ padding: '96px 16px 48px', borderBottom: '1px solid #0d0d0d' }}>
          <Container size="xl" px={0}>
            <Stack gap="xs">
              <Text
                size="xs"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Colección Exclusiva 2026
              </Text>
              <Title
                order={1}
                style={{
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                  fontSize: 'clamp(48px, 8vw, 96px)',
                  lineHeight: 0.9,
                }}
              >
                COPA MUNDO
              </Title>
              <Text size="lg" c="dimmed" maw={600}>
                Edición limitada. Diseños exclusivos de tirada limitada impresos en algodón de alto gramaje.
              </Text>
            </Stack>
          </Container>
        </section>

        {/* Filters + Grid */}
        <section style={{ padding: '64px 16px 128px' }}>
          <Container size="xl" px={0}>
            <Grid gap="xl">
              {enableCatalogFilters && (
                <GridCol span={{ base: 12, md: 3 }}>
                  <CatalogFilters
                    sizes={sizes}
                    colors={colors}
                    categories={categories}
                    priceRanges={priceRanges}
                    initialCategory={query.categorySlug}
                    initialSizes={query.sizes}
                    initialColors={query.colors}
                    initialMinPrice={query.minPrice}
                    initialMaxPrice={query.maxPrice}
                    initialInStock={query.inStock}
                    initialSearch={query.search}
                    initialSort={query.sort}
                  />
                </GridCol>
              )}
              <GridCol span={{ base: 12, md: enableCatalogFilters ? 9 : 12 }}>
                <Group mb="lg" gap="sm" justify="space-between">
                  <Group gap="sm">
                    <Badge variant="outline" color="dark" radius={0}>
                      New Drop
                    </Badge>
                    {activeFiltersCount > 0 && (
                      <Badge variant="filled" color="dark" radius={0}>
                        {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </Group>
                  {meta && (
                    <Text size="sm" c="dimmed">
                      {meta.total} producto{meta.total === 1 ? '' : 's'}
                    </Text>
                  )}
                </Group>
                <Grid gap="xl">
                  {products.map((product) => (
                    <GridCol span={{ base: 12, sm: 6, lg: 4 }} key={product.id}>
                      <ProductCard product={product} />
                    </GridCol>
                  ))}
                </Grid>
                {products.length === 0 && (
                  <Text c="dimmed" mt="xl">
                    No hay productos disponibles.
                  </Text>
                )}
                {meta && meta.total > query.limit && (
                  <Suspense fallback={null}>
                    <CatalogPagination
                      page={query.page}
                      limit={query.limit}
                      total={meta.total}
                    />
                  </Suspense>
                )}
              </GridCol>
            </Grid>
          </Container>
        </section>

        {/* Bottom CTA */}
        <section style={{ padding: '96px 16px', backgroundColor: '#0d0d0d', color: '#fcf9f8' }}>
          <Container size="xl" px={0}>
            <Grid gap="xl" align="center">
              <GridCol span={{ base: 12, md: 8 }}>
                <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                  Marca tu energía.
                </Title>
                <Text size="lg" mt="md" style={{ color: '#c9c6c5' }}>
                  La colección COPA MUNDO fusiona la intensidad del anime con la pasión del fútbol global.
                  Diseños exclusivos de tirada limitada impresos en algodón de alto gramaje.
                </Text>
              </GridCol>
              <GridCol span={{ base: 12, md: 4 }}>
                <UiButton
                  fullWidth
                  size="lg"
                  iconRight="arrow-forward"
                  style={{
                    backgroundColor: '#fcf9f8',
                    color: '#0d0d0d',
                    fontFamily: 'var(--font-bebas-neue)',
                  }}
                >
                  Ver Lookbook
                </UiButton>
              </GridCol>
            </Grid>
          </Container>
        </section>
      </main>
      <StoreFooter />
    </>
  );
}
