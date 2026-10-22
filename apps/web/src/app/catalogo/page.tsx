import type { components } from '@ecommerce/api-client';
import { Badge, Container, Grid, GridCol, Group, Stack, Text, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ProductCard } from '../../components/product-card';
import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { UiButton } from '../../components/ui/button';
import { apiClient } from '../../lib/api';
import { buildCategorySeoMetadata, buildSeoMetadata } from '../../lib/seo';
import { parseStorefrontConfig } from '../../lib/storefront-config';
import type { StoreConfig } from '../../providers/config-provider';
import { CatalogFilters } from './catalog-filters';
import { CatalogFiltersProvider } from './catalog-filters-context';
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
    const storeConfig = config as StoreConfig | undefined;

    if (categorySlug) {
      const { data: category } = await apiClient.GET('/catalog/categories/{slug}', {
        params: { path: { slug: categorySlug } },
      });
      if (category) {
        return buildCategorySeoMetadata(storeConfig, category);
      }
    }

    return buildSeoMetadata(storeConfig, {
      title: storeConfig?.enableCustomDesigns === false ? 'Catálogo' : 'Colecciones',
      template: 'default',
    });
  } catch {
    return { title: 'Catálogo' };
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
    search: parseString(params.search) ?? parseString(params.q),
    sort: (parseString(params.sort) as 'newest' | 'price_asc' | 'price_desc' | 'name_asc') ?? defaultSort,
  };

  let products: components['schemas']['ProductListResponseDto']['data'] = [];
  let meta: components['schemas']['ProductListResponseDto']['meta'] | undefined;
  let categories: { slug: string; name: string; description?: string | null }[] = [];
  let enableCatalogFilters = true;

  try {
    const [{ data: productsResponse }, { data: categoriesResponse }] = await Promise.all([
      apiClient.GET('/catalog/products', { params: { query: query as never } }),
      apiClient.GET('/catalog/categories'),
    ]);
    products = productsResponse?.data ?? [];
    meta = productsResponse?.meta;
    categories = (categoriesResponse ?? []) as { slug: string; name: string; description?: string | null }[];
    enableCatalogFilters = catalogConfig.showFilters;
  } catch {
    products = [];
    categories = [];
  }

  // El modo "catálogo" (sin personalizador, ej. cafetería) usa la categoría
  // activa y el banner de suscripción. El modo fashion conserva la campaña.
  const fashionMode = configResponse?.enableCustomDesigns !== false;
  const activeCategory = query.categorySlug
    ? categories.find((category) => category.slug === query.categorySlug)
    : undefined;
  const catalogEyebrow = fashionMode ? 'Colección Exclusiva 2026' : configResponse?.name ?? 'Catálogo';
  const catalogTitle = fashionMode ? 'COPA MUNDO' : activeCategory?.name ?? 'Catálogo';
  const catalogSubtitle = fashionMode
    ? 'Edición limitada. Diseños exclusivos de tirada limitada impresos en algodón de alto gramaje.'
    : activeCategory?.description || configResponse?.description || '';
  const catalogBadge = fashionMode ? 'New Drop' : 'Novedades';

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
        <section style={{ padding: '96px 0 48px', borderBottom: '1px solid #0d0d0d' }}>
          <Container fluid px={{ base: 16, md: 64 }}>
            <Stack gap="xs">
              <Text
                size="xs"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {catalogEyebrow}
              </Text>
              <Title
                order={1}
                style={{
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                  fontSize: 'clamp(48px, 8vw, 96px)',
                  lineHeight: 0.9,
                }}
              >
                {catalogTitle}
              </Title>
              <Text size="lg" c="dimmed" maw={600}>
                {catalogSubtitle}
              </Text>
            </Stack>
          </Container>
        </section>

        {/* Filters + Grid */}
        <section style={{ padding: '64px 0 128px' }}>
          <Container fluid px={{ base: 16, md: 64 }}>
            <CatalogFiltersProvider
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
            >
              <div className="catalog-layout">
                {enableCatalogFilters && (
                  <aside className="catalog-sidebar">
                    <CatalogFilters sizes={sizes} colors={colors} />
                  </aside>
                )}
                <div className="catalog-content">
                  <Group mb="lg" gap="sm" justify="space-between" wrap="wrap">
                    <Group gap="sm" wrap="wrap">
                      <Badge variant="outline" color="dark" radius={0}>
                        {catalogBadge}
                      </Badge>
                      {enableCatalogFilters && activeFiltersCount > 0 && (
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
                  <div className="catalog-products">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
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
                </div>
              </div>
            </CatalogFiltersProvider>
          </Container>
        </section>

        {fashionMode ? (
          <section style={{ padding: '96px 0', backgroundColor: '#0d0d0d', color: '#fcf9f8' }}>
            <Container fluid px={{ base: 16, md: 64 }}>
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
        ) : storefront.promoBanner.enabled ? (
          <section
            style={{
              padding: '96px 0',
              backgroundColor: storefront.promoBanner.backgroundColor,
              color: storefront.promoBanner.textColor,
            }}
          >
            <Container fluid px={{ base: 16, md: 64 }}>
              <Stack align="center" ta="center" gap="md">
                <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                  {storefront.promoBanner.title}
                </Title>
                <Text size="lg" maw={600}>
                  {storefront.promoBanner.subtitle}
                </Text>
                <UiButton
                  href={storefront.promoBanner.link}
                  size="lg"
                  iconRight="arrow-forward"
                  style={{
                    backgroundColor: storefront.promoBanner.textColor,
                    color: storefront.promoBanner.backgroundColor,
                    fontFamily: 'var(--font-bebas-neue)',
                  }}
                >
                  Ver más
                </UiButton>
              </Stack>
            </Container>
          </section>
        ) : null}
      </main>
      <StoreFooter />
    </>
  );
}
