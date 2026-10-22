'use client';

import type { components } from '@ecommerce/api-client';
import { Button, Container, Grid, GridCol, Group, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconBolt } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '../lib/api';
import { parseStorefrontConfig } from '../lib/storefront-config';
import type { StoreConfig, TemplateConfig } from '../providers/config-provider';
import { useCurrency } from '../providers/currency-provider';
import { ProductCard } from './product-card';
import { UiButton } from './ui/button';

export type HomeSection =
  | 'hero'
  | 'collectionShowcase'
  | 'categories'
  | 'featuredProducts'
  | 'promoBanner'
  | 'countdown'
  | 'newsletter'
  | 'productSpotlight'
  | 'identity';

export interface HomeSectionProps {
  config: StoreConfig;
  products: components['schemas']['ProductListResponseDto']['data'];
  categories: components['schemas']['CategoryDto'][];
}

function HeroBadge({ text, center }: { text: string; center: string }) {
  const pathId = 'nova-hero-badge-path';
  return (
    <div
      aria-hidden="true"
      className="nova-hero-badge"
      style={{
        position: 'absolute',
        top: 'clamp(16px, 4vw, 48px)',
        right: 'clamp(16px, 4vw, 48px)',
        width: 124,
        height: 124,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <svg viewBox="0 0 124 124" width="124" height="124" className="nova-spin-slow">
        <defs>
          <path id={pathId} d="M62,62 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" fill="none" />
        </defs>
        <circle cx="62" cy="62" r="60" fill="#fcf9f8" />
        <text
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: 1.4,
            fill: '#0d0d0d',
            textTransform: 'uppercase',
          }}
        >
          <textPath href={`#${pathId}`}>{text}</textPath>
        </text>
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
          fontSize: 34,
          lineHeight: 1,
          color: '#0d0d0d',
        }}
      >
        {center}
      </span>
    </div>
  );
}

export function HeroSection({ config }: { config: StoreConfig }) {
  const templateConfig: TemplateConfig = config.templateConfig ?? {};
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const heroTitle = config.heroTitle || config.name;
  const heroSubtitle = config.heroSubtitle || config.description || '';
  const heroEyebrow = templateConfig.heroEyebrow ?? "Nueva Colección 24'";
  const primaryLabel = templateConfig.heroPrimaryLabel ?? 'Explorar Ahora';
  const primaryHref = templateConfig.heroPrimaryHref ?? '/catalogo';
  const secondaryLabel = templateConfig.heroSecondaryLabel ?? 'Personalizar';
  const secondaryHref = templateConfig.heroSecondaryHref ?? '/catalogo';

  // Badge giratorio del hero: texto y centro configurables; por defecto se
  // arman con el nombre de la tienda y el título del promo banner ("Drop 01").
  const promoTitle = storefront.promoBanner?.title?.trim() ?? '';
  const showHeroBadge = templateConfig.showHeroBadge !== false;
  const badgeCenter = templateConfig.heroBadgeCenter ?? promoTitle.match(/\d+/)?.[0] ?? '01';
  const badgeText = (
    templateConfig.heroBadgeText ??
    `${config.name} • ${promoTitle ? promoTitle.replace(/\s*[—–-]\s*/g, ' • ') : 'Nueva Colección'} • `
  ).toUpperCase();

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: templateConfig.heroLayout === 'split' ? 'left' : 'center',
        padding: '64px 16px',
        backgroundImage: config.heroImageUrl ? `url(${config.heroImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#0d0d0d',
        color: '#fcf9f8',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(13,13,13,0.55)',
        }}
      />
      {showHeroBadge && <HeroBadge text={badgeText} center={badgeCenter} />}
      <Stack gap="xl" style={{ position: 'relative', zIndex: 1 }} maw={900}>
        <Text
          size="sm"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          {heroEyebrow}
        </Text>
        <Title
          order={1}
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: 'clamp(64px, 12vw, 120px)',
            lineHeight: 0.9,
            letterSpacing: '-0.02em',
          }}
        >
          {heroTitle}
        </Title>
        <Text size="lg" maw={600} mx="auto" style={{ color: '#e4e2e1' }}>
          {heroSubtitle}
        </Text>
        <Group justify="center" gap="md" mt="md">
          <UiButton
            href={primaryHref}
            size="lg"
            iconRight="arrow-forward"
            style={{
              backgroundColor: '#fcf9f8',
              color: '#0d0d0d',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            {primaryLabel}
          </UiButton>
          <UiButton
            href={secondaryHref}
            variant="outline"
            size="lg"
            style={{
              borderColor: '#fcf9f8',
              color: '#fcf9f8',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            {secondaryLabel}
          </UiButton>
        </Group>
      </Stack>
    </section>
  );
}

export function CollectionShowcaseSection({
  products,
  config,
}: {
  products: components['schemas']['ProductListResponseDto']['data'];
  config: StoreConfig;
}) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const showcase = storefront.collectionShowcase;
  const { format } = useCurrency();

  const { data: categoryProducts } = useQuery({
    queryKey: ['home-showcase', showcase.categorySlug],
    enabled: !!showcase.categorySlug,
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/products', {
        params: {
          query: {
            categorySlug: showcase.categorySlug,
            limit: 3,
            sort: 'newest',
          },
        },
      });
      return (data?.data ?? []) as components['schemas']['ProductListResponseDto']['data'];
    },
  });

  const items = (showcase.categorySlug ? categoryProducts ?? [] : products).slice(0, 3);
  if (items.length === 0) return null;

  const [large, tall, small] = items;
  const story = showcase.story;

  const renderCard = (
    product: components['schemas']['ProductListResponseDto']['data'][number],
    options: { large?: boolean } = {},
  ) => {
    const image = product.images?.[0];
    const imageUrl = image?.smallUrl ?? image?.thumbnailUrl ?? image?.url;
    const sku = product.variants?.[0]?.sku;
    return (
      <div className="showcase-card" key={product.id}>
        <div className={`showcase-media${options.large ? ' is-large' : ''}`}>
          {imageUrl ? <img src={imageUrl} alt={product.name} loading="lazy" /> : null}
          {options.large && product.category?.name && (
            <span className="showcase-badge">{product.category.name}</span>
          )}
        </div>
        <div className="showcase-info">
          <div style={{ minWidth: 0 }}>
            <Text
              component="span"
              style={{
                display: 'block',
                fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                fontSize: 20,
                lineHeight: 1.05,
                letterSpacing: '0.02em',
              }}
            >
              {product.name}
            </Text>
            <Text
              component="span"
              style={{
                display: 'block',
                marginTop: 4,
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#747878',
              }}
            >
              {sku ? `SKU: ${sku}` : (product.category?.name ?? '')}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Text
              component="span"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {format(product.displayPrice ?? product.basePrice)}
            </Text>
            <Link className="showcase-buy" href={`/producto/${product.slug}`}>
              Comprar
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section style={{ padding: '96px 16px', backgroundColor: '#fcf9f8' }}>
      <Container size="xl" px={0}>
        <Group justify="space-between" align="flex-end" mb="xl" gap="md" wrap="wrap">
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            {showcase.title}
          </Title>
          <Link
            href={showcase.linkHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              paddingBottom: 6,
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#0d0d0d',
              textDecoration: 'underline',
            }}
          >
            {showcase.linkLabel}
            <IconArrowRight size={14} aria-hidden="true" />
          </Link>
        </Group>

        <div className="showcase-grid">
          <div className="showcase-left">
            {large && renderCard(large, { large: true })}
            <div className="showcase-bottom">
              {small && renderCard(small)}
              {story.enabled && (
                <div className="showcase-story">
                  <div>
                    <IconBolt size={28} color="#6f7a4e" aria-hidden="true" />
                    <Title order={3} mt="sm" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                      {story.title}
                    </Title>
                    <Text size="sm" mt="xs" style={{ color: '#c9c6c5' }}>
                      {story.text}
                    </Text>
                  </div>
                  <Link className="showcase-story-link" href={story.linkHref}>
                    {story.linkLabel}
                    <IconArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          {tall && <div className="showcase-right">{renderCard(tall)}</div>}
        </div>
      </Container>
    </section>
  );
}

export function CategoriesSection({ categories }: { categories: components['schemas']['CategoryDto'][] }) {
  if (categories.length === 0) return null;
  return (
    <section style={{ padding: '96px 16px', backgroundColor: '#fcf9f8' }}>
      <Container size="xl" px={0}>
        <Title order={2} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
          Categorías
        </Title>
        <Grid gap="md">
          {categories.map((category) => (
            <GridCol span={{ base: 12, sm: 6, md: 4 }} key={category.id}>
              <Link href={`/catalogo?category=${category.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    padding: '48px 24px',
                    border: '1px solid #0d0d0d',
                    backgroundColor: '#f6f3f2',
                    textAlign: 'center',
                  }}
                >
                  <Text size="lg" style={{ fontFamily: 'var(--font-bebas-neue)', letterSpacing: '0.02em' }}>
                    {category.name}
                  </Text>
                </div>
              </Link>
            </GridCol>
          ))}
        </Grid>
      </Container>
    </section>
  );
}

export function FeaturedProductsSection({
  products,
  config,
}: {
  products: components['schemas']['ProductListResponseDto']['data'];
  config: StoreConfig;
}) {
  const templateConfig: TemplateConfig = config.templateConfig ?? {};
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const featured = storefront.featuredProducts;
  const columns = featured.columns ?? 4;

  // La sección consulta su propio listado si hay categoría, orden personalizado
  // o se piden más productos que los precargados por el home.
  const needsFetch = !!featured.categorySlug || featured.sort !== 'newest' || featured.limit > products.length;

  const { data: fetchedProducts } = useQuery({
    queryKey: ['home-featured', featured.categorySlug, featured.sort, featured.limit],
    enabled: needsFetch,
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/products', {
        params: {
          query: {
            categorySlug: featured.categorySlug,
            limit: featured.limit,
            sort: featured.sort,
          },
        },
      });
      return (data?.data ?? []) as components['schemas']['ProductListResponseDto']['data'];
    },
  });

  const visibleProducts = (needsFetch ? fetchedProducts ?? [] : products).slice(0, featured.limit);

  if (visibleProducts.length === 0) return null;
  return (
    <section style={{ padding: '96px 16px', backgroundColor: '#fcf9f8' }}>
      <Container size="xl" px={0}>
        <Title order={2} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
          {featured.title}
        </Title>
        <Grid columns={60} gap="xl">
          {visibleProducts.map((product) => (
            <GridCol span={{ base: 60, sm: 30, md: 60 / columns }} key={product.id}>
              <ProductCard product={product} variant={templateConfig.productCardVariant} />
            </GridCol>
          ))}
        </Grid>
      </Container>
    </section>
  );
}

export function CountdownSection({ config }: { config: StoreConfig }) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const countdown = storefront.countdown;
  const target = countdown.targetAt ? new Date(countdown.targetAt).getTime() : null;

  const [remainingMs, setRemainingMs] = useState(() => (target ? Math.max(0, target - Date.now()) : 0));

  useEffect(() => {
    if (!target) return;
    const update = () => setRemainingMs(Math.max(0, target - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!countdown.enabled || !target || remainingMs <= 0) {
    return null;
  }

  const days = Math.floor(remainingMs / 86_400_000);
  const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);

  const cells = [
    { value: days, label: 'Días' },
    { value: hours, label: 'Horas' },
    { value: minutes, label: 'Min' },
    { value: seconds, label: 'Seg' },
  ];

  return (
    <section style={{ padding: '96px 16px', backgroundColor: '#0d0d0d', color: '#fcf9f8' }}>
      <Container size="sm" px={0}>
        <Stack align="center" gap="lg">
          <Title order={2} ta="center" style={{ fontFamily: 'var(--font-bebas-neue)', letterSpacing: '0.05em' }}>
            {countdown.title}
          </Title>
          <Group gap="md" justify="center">
            {cells.map((cell) => (
              <div
                key={cell.label}
                style={{
                  minWidth: 72,
                  padding: '16px 8px',
                  border: '1px solid #fcf9f8',
                  textAlign: 'center',
                }}
              >
                <Text
                  size="xl"
                  fw={700}
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', lineHeight: 1 }}
                >
                  {String(cell.value).padStart(2, '0')}
                </Text>
                <Text size="xs" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7 }}>
                  {cell.label}
                </Text>
              </div>
            ))}
          </Group>
        </Stack>
      </Container>
    </section>
  );
}

export function PromoBannerSection({ config }: { config: StoreConfig }) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const banner = storefront.promoBanner;
  if (!banner.enabled) return null;

  return (
    <section style={{ padding: '96px 16px', backgroundColor: banner.backgroundColor, color: banner.textColor }}>
      <Container size="xl" px={0}>
        <Stack align="center" ta="center" gap="md">
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            {banner.title}
          </Title>
          <Text size="lg" maw={600}>
            {banner.subtitle}
          </Text>
          <Button
            component={Link}
            href={banner.link}
            style={{
              backgroundColor: banner.textColor,
              color: banner.backgroundColor,
              fontFamily: 'var(--font-bebas-neue)',
            }}
          >
            Ver más
          </Button>
        </Stack>
      </Container>
    </section>
  );
}

export function NewsletterSection({ config }: { config: StoreConfig }) {
  return (
    <section
      style={{
        padding: '96px 16px',
        backgroundColor: '#151515',
        borderTop: '1px solid rgba(252,249,248,0.16)',
        color: '#fcf9f8',
      }}
    >
      <Container size="xl" px={0}>
        <Stack align="center" ta="center" gap="md">
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Suscríbete a {config.name}
          </Title>
          <Text size="sm" c="dimmed">
            Recibe novedades, lanzamientos y promociones exclusivas.
          </Text>
          <Button
            component={Link}
            href="#"
            style={{
              backgroundColor: '#fcf9f8',
              color: '#0d0d0d',
              fontFamily: 'var(--font-bebas-neue)',
            }}
          >
            Suscribirme
          </Button>
        </Stack>
      </Container>
    </section>
  );
}

export function ProductSpotlightSection({
  products,
  config,
}: {
  products: components['schemas']['ProductListResponseDto']['data'];
  config: StoreConfig;
}) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const spotlight = storefront.productSpotlight;
  const { format } = useCurrency();

  const { data: spotlightProduct } = useQuery({
    queryKey: ['home-spotlight', spotlight.productSlug],
    enabled: !!spotlight.productSlug,
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/products/{slug}', {
        params: { path: { slug: spotlight.productSlug as string } },
      });
      return (data ?? null) as components['schemas']['ProductDetailDto'] | null;
    },
  });

  const product = spotlightProduct ?? products[0] ?? null;
  if (!product) return null;

  const image = product.images?.[0];
  const imageUrl = image?.mediumUrl ?? image?.url ?? image?.smallUrl;
  const title = spotlight.title.trim() || product.name;
  const text = spotlight.text.trim() || product.description || '';
  const price = product.displayPrice ?? product.basePrice;
  const imageLeft = spotlight.imagePosition === 'left';

  return (
    <section
      style={{
        padding: '96px 16px',
        backgroundColor: '#0d0d0d',
        borderTop: '1px solid rgba(252,249,248,0.16)',
        color: '#fcf9f8',
      }}
    >
      <Container size="xl" px={0}>
        <Grid gap="xl" align="center">
          <GridCol span={{ base: 12, md: 6 }} order={{ base: 1, md: imageLeft ? 2 : 1 }}>
            <Stack gap="md">
              {spotlight.eyebrow.trim() && (
                <Text
                  size="xs"
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: '#a9b47e',
                  }}
                >
                  {spotlight.eyebrow}
                </Text>
              )}
              <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                {title}
              </Title>
              {text && (
                <Text size="lg" style={{ color: '#c9c6c5' }}>
                  {text}
                </Text>
              )}
              {spotlight.showPrice && (
                <Text
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {format(price)}
                </Text>
              )}
              <Button
                component={Link}
                href={`/producto/${product.slug}`}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#fcf9f8',
                  color: '#0d0d0d',
                  fontFamily: 'var(--font-bebas-neue)',
                }}
              >
                {spotlight.ctaLabel}
              </Button>
            </Stack>
          </GridCol>
          <GridCol span={{ base: 12, md: 6 }} order={{ base: 2, md: imageLeft ? 1 : 2 }}>
            <div
              style={{
                aspectRatio: '4/3',
                overflow: 'hidden',
                border: '1px solid #fcf9f8',
                backgroundColor: '#282828',
              }}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={product.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
          </GridCol>
        </Grid>
      </Container>
    </section>
  );
}

export function HomeSectionRenderer({ section, config, products, categories }: HomeSectionProps & { section: HomeSection }) {
  switch (section) {
    case 'hero':
      return <HeroSection config={config} />;
    case 'collectionShowcase':
      return <CollectionShowcaseSection products={products} config={config} />;
    case 'categories':
      return <CategoriesSection categories={categories} />;
    case 'featuredProducts':
      return <FeaturedProductsSection products={products} config={config} />;
    case 'promoBanner':
      return <PromoBannerSection config={config} />;
    case 'countdown':
      return <CountdownSection config={config} />;
    case 'newsletter':
      return <NewsletterSection config={config} />;
    case 'productSpotlight':
    // `identity` es el valor legado: ahora renderiza el producto destacado.
    // falls through
    case 'identity':
      return <ProductSpotlightSection products={products} config={config} />;
    default:
      return null;
  }
}
