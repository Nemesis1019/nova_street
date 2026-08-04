'use client';

import type { components } from '@ecommerce/api-client';
import { Button, Container, Grid, GridCol, Group, Stack, Text, Title } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
import Link from 'next/link';

import { parseStorefrontConfig } from '../lib/storefront-config';
import type { StoreConfig, TemplateConfig } from '../providers/config-provider';
import { ProductCard } from './product-card';
import { UiButton } from './ui/button';

export type HomeSection = 'hero' | 'categories' | 'featuredProducts' | 'promoBanner' | 'newsletter' | 'identity';

export interface HomeSectionProps {
  config: StoreConfig;
  products: components['schemas']['ProductListResponseDto']['data'];
  categories: components['schemas']['CategoryDto'][];
}

export function HeroSection({ config }: { config: StoreConfig }) {
  const templateConfig: TemplateConfig = config.templateConfig ?? {};
  const heroTitle = config.heroTitle || 'MARCA TU ENERGÍA';
  const heroSubtitle =
    config.heroSubtitle ||
    'Prendas diseñadas para la autonomía creativa. Siluetas oversized que rompen la estructura convencional del streetwear moderno.';

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
      <Stack gap="xl" style={{ position: 'relative', zIndex: 1 }} maw={900}>
        <Text
          size="sm"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          Nueva Colección 24&apos;
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
            href="/catalogo"
            size="lg"
            iconRight="arrow-forward"
            style={{
              backgroundColor: '#fcf9f8',
              color: '#0d0d0d',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            Explorar Ahora
          </UiButton>
          <UiButton
            href="/catalogo"
            variant="outline"
            size="lg"
            style={{
              borderColor: '#fcf9f8',
              color: '#fcf9f8',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            Personalizar
          </UiButton>
        </Group>
      </Stack>
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
  if (products.length === 0) return null;
  return (
    <section style={{ padding: '0 16px 128px', backgroundColor: '#fcf9f8' }}>
      <Container size="xl" px={0}>
        <Title order={2} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
          Destacados
        </Title>
        <Grid gap="xl">
          {products.map((product) => (
            <GridCol span={{ base: 12, sm: 6, md: 3 }} key={product.id}>
              <ProductCard product={product} variant={templateConfig.productCardVariant} />
            </GridCol>
          ))}
        </Grid>
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
    <section style={{ padding: '96px 16px', backgroundColor: '#0d0d0d', color: '#fcf9f8' }}>
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

export function IdentitySection() {
  return (
    <section style={{ padding: '128px 16px', backgroundColor: '#0d0d0d', color: '#fcf9f8' }}>
      <Container size="xl" px={0}>
        <Grid gap="xl" align="center">
          <GridCol span={{ base: 12, md: 6 }}>
            <Stack gap="md">
              <IconBolt size={48} color="#6f7a4e" />
              <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                La Fusión Definitiva
              </Title>
              <Text size="lg" style={{ color: '#c9c6c5' }}>
                Nuestra colección intersecta la pasión del fútbol sudamericano con la intensidad visual del anime contemporáneo.
                Siluetas oversized construidas con algodón premium, diseñadas para dominar las calles.
              </Text>
              <Button
                variant="outline"
                style={{
                  alignSelf: 'flex-start',
                  borderColor: '#fcf9f8',
                  color: '#fcf9f8',
                  fontFamily: 'var(--font-bebas-neue)',
                }}
              >
                Descubre el Proceso
              </Button>
            </Stack>
          </GridCol>
          <GridCol span={{ base: 12, md: 6 }}>
            <div
              style={{
                aspectRatio: '4/3',
                backgroundColor: '#282828',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #fcf9f8',
              }}
            >
              <Text
                size="xl"
                style={{
                  fontFamily: 'var(--font-bebas-neue)',
                  letterSpacing: '0.1em',
                  color: '#6f7a4e',
                }}
              >
                Identidad Visual
              </Text>
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
    case 'categories':
      return <CategoriesSection categories={categories} />;
    case 'featuredProducts':
      return <FeaturedProductsSection products={products} config={config} />;
    case 'promoBanner':
      return <PromoBannerSection config={config} />;
    case 'newsletter':
      return <NewsletterSection config={config} />;
    case 'identity':
      return <IdentitySection />;
    default:
      return null;
  }
}
