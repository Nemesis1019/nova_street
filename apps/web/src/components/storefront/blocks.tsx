import type { components } from '@ecommerce/api-client';
import type {
  StorefrontDocument,
  StorefrontSection,
} from '@ecommerce/shared';
import Link from 'next/link';

import { apiClient } from '../../lib/api';
import { imageCropStyle } from '../../lib/image-crop';
import {
  isMotionEnabled,
  isStickyStoryMedia,
  marqueeMotion,
  resolveSectionHover,
  resolveSectionParallax,
  resolveSectionReveal,
  storefrontHoverVars,
} from '../../lib/storefront-motion';
import type { StoreConfig } from '../../providers/config-provider';
import { ProductCard } from '../product-card';
import { StoreFooter } from '../store-footer';
import { StoreHeader } from '../store-header';
import { StorefrontCountdown } from './countdown';
import { MarqueeTrack } from './marquee-track';
import { StorefrontNewsletterForm } from './newsletter-form';

type Product = components['schemas']['ProductListResponseDto']['data'][number];
type Category = components['schemas']['CategoryDto'];
type ProductImage = {
  url?: string;
  smallUrl?: string;
  mediumUrl?: string;
  thumbnailUrl?: string;
  focalPointX?: number;
  focalPointY?: number;
  cropZoom?: number;
};
type SpotlightProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  displayPrice?: number;
  images?: ProductImage[];
};

const container: React.CSSProperties = {
  width: '100%',
  maxWidth: 'var(--sf-container, 1400px)',
  margin: '0 auto',
  padding: '0 24px',
};

const sectionPadding: React.CSSProperties = {
  paddingTop: 'var(--sf-space-section, 96px)',
  paddingBottom: 'var(--sf-space-section, 96px)',
};

const FOCAL_POSITION: Record<string, string> = {
  center: 'center',
  top: 'center top',
  bottom: 'center bottom',
  left: 'left center',
  right: 'right center',
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--sf-font-mono, JetBrains Mono, monospace)',
  fontSize: 11,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--sf-color-text-muted, #6b6258)',
  margin: 0,
};

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  light?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
      {eyebrow ? (
        <p style={{ ...eyebrowStyle, color: light ? 'rgba(255,255,255,0.72)' : undefined }}>
          {eyebrow}
        </p>
      ) : null}
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--sf-font-display, serif)',
          fontSize: 'clamp(2.2rem, 5vw, 4.5rem)',
          fontWeight: 500,
          lineHeight: 0.98,
          letterSpacing: '-0.02em',
          color: light ? 'var(--sf-color-inverse, #fff)' : 'var(--sf-color-text, #1f1b16)',
        }}
      >
        {title}
      </h2>
      {description ? (
        <p
          style={{
            margin: 0,
            maxWidth: 620,
            fontFamily: 'var(--sf-font-body, sans-serif)',
            fontSize: 16,
            lineHeight: 1.65,
            color: light ? 'rgba(255,255,255,0.72)' : 'var(--sf-color-text-muted, #6b6258)',
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function Cta({
  href,
  children,
  style = 'solid',
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  style?: 'solid' | 'outline';
  light?: boolean;
}) {
  const solid = style === 'solid';
  return (
    <Link
      href={href}
      className="sf-cta"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 48,
        padding: '0 22px',
        border: `var(--sf-border-width, 1px) solid ${
          solid
            ? 'var(--sf-color-brand, #1f1b16)'
            : light
              ? 'rgba(255,255,255,0.7)'
              : 'var(--sf-color-border, #ddd2c2)'
        }`,
        borderRadius: 'var(--sf-radius, 0)',
        backgroundColor: solid
          ? 'var(--sf-color-brand, #1f1b16)'
          : 'transparent',
        color: solid ? 'var(--sf-color-inverse, #fcf9f8)' : light ? '#fff' : 'var(--sf-color-text, #1f1b16)',
        fontFamily: 'var(--sf-font-body, sans-serif)',
        fontSize: 12,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        textDecoration: 'none',
      }}
    >
      {children}
      <span className="sf-cta-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}

function ParallaxMedia({
  image,
  focalPoint,
  kind,
  parallax,
  zoom,
  scale,
}: {
  image: string;
  focalPoint: string;
  kind: 'hero' | 'story';
  parallax: 'none' | 'subtle' | 'strong';
  zoom: boolean;
  scale: number;
}) {
  const hasParallax = parallax !== 'none';

  return (
    <div
      className={hasParallax ? 'sf-parallax' : undefined}
      data-sf-parallax={hasParallax ? parallax : undefined}
      data-sf-parallax-kind={hasParallax ? kind : undefined}
      style={{
        position: 'absolute',
        inset: hasParallax ? '-8% 0' : 0,
      }}
    >
      <div
        className={zoom ? 'sf-image-zoom' : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: FOCAL_POSITION[focalPoint] ?? 'center',
          scale: scale > 100 ? scale / 100 : undefined,
        }}
      />
    </div>
  );
}

function formatStorefrontPrice(amount: number, config: StoreConfig) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: config.currencyCode || 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function StorefrontHeroBadge({
  text,
  center,
  id,
}: {
  text: string;
  center: string;
  id: string;
}) {
  const pathId = `nova-hero-badge-path-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
        <circle cx="62" cy="62" r="60" fill="var(--sf-color-surface, #fcf9f8)" />
        <text
          style={{
            fontFamily: 'var(--sf-font-mono, monospace)',
            fontSize: 10,
            letterSpacing: 1.4,
            fill: 'var(--sf-color-text, #0d0d0d)',
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
          fontFamily: 'var(--sf-font-display, serif)',
          fontSize: 34,
          lineHeight: 1,
          color: 'var(--sf-color-text, #0d0d0d)',
        }}
      >
        {center}
      </span>
    </div>
  );
}

function ShowcaseProductCard({
  product,
  config,
  large = false,
}: {
  product: Product;
  config: StoreConfig;
  large?: boolean;
}) {
  const image = product.images?.[0] as ProductImage | undefined;
  const imageUrl = image?.smallUrl ?? image?.thumbnailUrl ?? image?.url;
  const sku = product.variants?.[0]?.sku;
  const price = product.displayPrice ?? product.basePrice;

  return (
    <div
      className="showcase-card"
      style={{
        borderColor: 'var(--sf-color-border, #0d0d0d)',
        backgroundColor: 'var(--sf-color-surface, #fcf9f8)',
      }}
    >
      <div className={`showcase-media${large ? ' is-large' : ''}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            style={imageCropStyle(image)}
          />
        ) : null}
        {large && product.category?.name ? (
          <span
            className="showcase-badge"
            style={{
              borderColor: 'var(--sf-color-border, #0d0d0d)',
              backgroundColor: 'var(--sf-color-surface, #fcf9f8)',
              color: 'var(--sf-color-text, #0d0d0d)',
            }}
          >
            {product.category.name}
          </span>
        ) : null}
      </div>
      <div
        className="showcase-info"
        style={{
          borderColor: 'var(--sf-color-border, #0d0d0d)',
          backgroundColor: 'var(--sf-color-surface, #fcf9f8)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--sf-font-display, serif)',
              fontSize: 20,
              lineHeight: 1.05,
              letterSpacing: '0.02em',
            }}
          >
            {product.name}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: 4,
              fontFamily: 'var(--sf-font-mono, monospace)',
              fontSize: 10,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--sf-color-text-muted, #747878)',
            }}
          >
            {sku ? `SKU: ${sku}` : (product.category?.name ?? '')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span
            style={{
              fontFamily: 'var(--sf-font-mono, monospace)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {formatStorefrontPrice(price, config)}
          </span>
          <Link
            className="showcase-buy"
            href={`/producto/${product.slug}`}
            style={{
              borderColor: 'var(--sf-color-text, #0d0d0d)',
              backgroundColor: 'var(--sf-color-text, #0d0d0d)',
              color: 'var(--sf-color-surface, #fcf9f8)',
              fontFamily: 'var(--sf-font-display, serif)',
            }}
          >
            Comprar
          </Link>
        </div>
      </div>
    </div>
  );
}

async function ShowcaseBlock({
  section,
  config,
}: {
  section: Extract<StorefrontSection, { type: 'showcase' }>;
  config: StoreConfig;
}) {
  const { settings } = section;
  let products: Product[] = [];
  try {
    const { data } = await apiClient.GET('/catalog/products', {
      params: {
        query: {
          limit: 3,
          ...(settings.categorySlug ? { categorySlug: settings.categorySlug } : {}),
        },
      },
    });
    products = data?.data ?? [];
  } catch {
    products = [];
  }

  if (products.length === 0) return null;
  const [large, tall, small] = products;

  return (
    <section style={{ ...sectionPadding, backgroundColor: 'var(--sf-color-canvas, #fcf9f8)' }}>
      <div style={container}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
            marginBottom: 36,
            flexWrap: 'wrap',
          }}
        >
          <div>
            {settings.eyebrow ? <p style={eyebrowStyle}>{settings.eyebrow}</p> : null}
            <h2
              style={{
                margin: '8px 0 0',
                fontFamily: 'var(--sf-font-display, serif)',
                fontSize: 'clamp(2.2rem, 5vw, 4.5rem)',
                lineHeight: 0.98,
                letterSpacing: '-0.02em',
              }}
            >
              {settings.title}
            </h2>
          </div>
          <Link
            href={settings.linkHref}
            style={{
              fontFamily: 'var(--sf-font-mono, monospace)',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--sf-color-text, #1f1b16)',
              textDecoration: 'underline',
              textUnderlineOffset: 5,
            }}
          >
            {settings.linkLabel} ↗
          </Link>
        </div>

        <div className="showcase-grid">
          <div className="showcase-left">
            {large ? <ShowcaseProductCard product={large} config={config} large /> : null}
            <div className="showcase-bottom">
              {small ? <ShowcaseProductCard product={small} config={config} /> : null}
              {settings.story.enabled ? (
                <div
                  className="showcase-story"
                  style={{
                    backgroundColor: 'var(--sf-color-text, #0d0d0d)',
                    color: 'var(--sf-color-inverse, #fcf9f8)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 26, color: 'var(--sf-color-accent, #6f7a4e)' }}>✦</span>
                    <h3
                      style={{
                        margin: '12px 0 0',
                        fontFamily: 'var(--sf-font-display, serif)',
                        fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)',
                        lineHeight: 1,
                      }}
                    >
                      {settings.story.title}
                    </h3>
                    <p style={{ margin: '12px 0 0', fontFamily: 'var(--sf-font-body, sans-serif)', fontSize: 14, lineHeight: 1.6, opacity: 0.72 }}>
                      {settings.story.text}
                    </p>
                  </div>
                  <Link
                    className="showcase-story-link"
                    href={settings.story.linkHref}
                    style={{ fontFamily: 'var(--sf-font-display, serif)', color: 'inherit' }}
                  >
                    {settings.story.linkLabel} ↗
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
          {tall ? (
            <div className="showcase-right">
              <ShowcaseProductCard product={tall} config={config} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CountdownBlock({
  section,
}: {
  section: Extract<StorefrontSection, { type: 'countdown' }>;
}) {
  const { settings } = section;
  if (!settings.targetAt) return null;

  return (
    <StorefrontCountdown
      title={settings.title}
      targetAt={settings.targetAt}
      finishedLabel={settings.finishedLabel}
      backgroundColor={settings.backgroundColor}
      textColor={settings.textColor}
    />
  );
}

async function ProductSpotlightBlock({
  section,
  config,
}: {
  section: Extract<StorefrontSection, { type: 'productSpotlight' }>;
  config: StoreConfig;
}) {
  const { settings } = section;
  let product: SpotlightProduct | null = null;

  try {
    if (settings.productSlug) {
      const response = await apiClient.GET('/catalog/products/{slug}', {
        params: { path: { slug: settings.productSlug } },
      });
      product = (response.data ?? null) as SpotlightProduct | null;
    } else {
      const { data } = await apiClient.GET('/catalog/products', { params: { query: { limit: 1 } } });
      product = (data?.data?.[0] ?? null) as SpotlightProduct | null;
    }
  } catch {
    product = null;
  }

  if (!product) return null;
  const image = product.images?.[0];
  const imageUrl = image?.mediumUrl ?? image?.url ?? image?.smallUrl;
  const title = settings.title.trim() || product.name;
  const text = settings.text.trim() || product.description || '';
  const price = product.displayPrice ?? product.basePrice;
  const imageLeft = settings.imagePosition === 'left';

  return (
    <section
      style={{
        ...sectionPadding,
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
      }}
    >
      <div style={container}>
        <div
          className="sf-spotlight"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 'clamp(24px, 6vw, 88px)',
            alignItems: 'center',
          }}
        >
          <div style={{ order: imageLeft ? 1 : 2 }}>
            <div style={{ aspectRatio: '4 / 3', overflow: 'hidden', border: '1px solid currentColor', backgroundColor: 'rgba(255,255,255,0.08)' }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  loading="eager"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', ...imageCropStyle(image) }}
                />
              ) : null}
            </div>
          </div>
          <div style={{ order: imageLeft ? 2 : 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {settings.eyebrow ? (
              <p style={{ ...eyebrowStyle, color: settings.textColor, opacity: 0.62 }}>{settings.eyebrow}</p>
            ) : null}
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--sf-font-display, serif)',
                fontSize: 'clamp(2.4rem, 5vw, 5rem)',
                lineHeight: 0.94,
                letterSpacing: '-0.03em',
              }}
            >
              {title}
            </h2>
            {text ? (
              <p style={{ margin: 0, maxWidth: 560, fontFamily: 'var(--sf-font-body, sans-serif)', fontSize: 16, lineHeight: 1.65, opacity: 0.72 }}>
                {text}
              </p>
            ) : null}
            {settings.showPrice ? (
              <span style={{ fontFamily: 'var(--sf-font-mono, monospace)', fontSize: 18, fontWeight: 700 }}>
                {formatStorefrontPrice(price, config)}
              </span>
            ) : null}
            <Link
              href={`/producto/${product.slug}`}
              className="sf-cta"
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 48,
                padding: '0 22px',
                border: '1px solid currentColor',
                color: settings.textColor,
                fontFamily: 'var(--sf-font-body, sans-serif)',
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {settings.ctaLabel}
              <span className="sf-cta-arrow" aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <style>{`
          @media (max-width: 820px) {
            .sf-spotlight { grid-template-columns: 1fr !important; }
            .sf-spotlight > div { order: initial !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function HeroBlock({ section, config }: { section: Extract<StorefrontSection, { type: 'hero' }>; config: StoreConfig }) {
  const { settings, variant } = section;
  const image = settings.imageUrl || config.heroImageUrl || '';
  const title = settings.title || config.name;
  const align = settings.align;
  const motion = config.storefrontDoc?.motion;
  const heroMotion = isMotionEnabled(motion);
  const imageZoom = motion?.imageMotion === 'zoom';
  const parallax = resolveSectionParallax(motion, section.motion, 'hero');

  const content = (
    <div
      data-sf-hero={heroMotion ? 'true' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: align === 'center' ? 'center' : 'flex-start', textAlign: align }}
    >
      {settings.eyebrow ? <p style={eyebrowStyle}>{settings.eyebrow}</p> : null}
      <h1
        style={{
          margin: 0,
          maxWidth: 820,
          fontFamily: 'var(--sf-font-display, serif)',
          fontSize: 'clamp(3.4rem, 8vw, 7.5rem)',
          fontWeight: 500,
          lineHeight: 0.9,
          letterSpacing: '-0.035em',
          color: variant === 'fullBleed' ? '#fff' : 'var(--sf-color-text, #1f1b16)',
        }}
      >
        {title}
      </h1>
      {settings.subtitle ? (
        <p
          style={{
            margin: 0,
            maxWidth: 560,
            fontFamily: 'var(--sf-font-body, sans-serif)',
            fontSize: 'clamp(1rem, 1.6vw, 1.2rem)',
            lineHeight: 1.6,
            color: variant === 'fullBleed' ? 'rgba(255,255,255,0.8)' : 'var(--sf-color-text-muted, #6b6258)',
          }}
        >
          {settings.subtitle}
        </p>
      ) : null}
      {settings.ctas.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
          {settings.ctas.map((cta, index) => (
            <Cta key={`${cta.label}-${index}`} href={cta.href} style={cta.style} light={variant === 'fullBleed'}>
              {cta.label}
            </Cta>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (variant === 'fullBleed') {
    return (
      <section
        data-nova-hero="true"
        style={{
          position: 'relative',
          minHeight: settings.minHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: 'var(--sf-color-text, #1f1b16)',
          color: '#fff',
          padding: '88px 24px',
        }}
      >
        {image ? (
          <ParallaxMedia
            image={image}
            focalPoint={settings.imageFocalPoint}
            kind="hero"
            parallax={parallax}
            zoom={imageZoom}
            scale={settings.imageScale}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(10,10,10,${settings.overlay})` }} />
        {settings.showBadge ? (
          <StorefrontHeroBadge
            text={
              settings.badgeText ||
              `${config.name} • ${settings.eyebrow || 'Nueva colección'} •`
            }
            center={settings.badgeCenter || '01'}
            id={section.id}
          />
        ) : null}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1100, margin: '0 auto' }}>{content}</div>
      </section>
    );
  }

  if (variant === 'minimal') {
    return (
      <section
        data-nova-hero="true"
        style={{ ...sectionPadding, backgroundColor: 'var(--sf-color-canvas, #fcf9f8)' }}
      >
        <div style={{ ...container, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {content}
        </div>
        {image ? (
          <div style={{ ...container, marginTop: 56, overflow: 'hidden' }}>
            <img
              src={image}
              alt={settings.title || config.name}
              className={imageZoom ? 'sf-image-zoom' : undefined}
              style={{
                display: 'block',
                width: '100%',
                maxHeight: 520,
                objectFit: 'cover',
                scale: settings.imageScale > 100 ? settings.imageScale / 100 : undefined,
              }}
            />
          </div>
        ) : null}
      </section>
    );
  }

  // split y asymmetric comparten la lógica de dos columnas; asymmetric usa una
  // imagen más protagonista y el contenido alineado al borde inferior.
  const asymmetric = variant === 'asymmetric';
  return (
    <section
      data-nova-hero="true"
      style={{ backgroundColor: 'var(--sf-color-canvas, #fcf9f8)', padding: asymmetric ? '0' : '32px 0' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
          minHeight: settings.minHeight,
          backgroundColor: 'var(--sf-color-surface, #fff)',
        }}
        className="sf-hero-split"
      >
        <div
          style={{
            display: 'flex',
            alignItems: asymmetric ? 'flex-end' : 'center',
            padding: asymmetric ? 'clamp(32px, 6vw, 96px)' : 'clamp(32px, 5vw, 72px)',
            backgroundColor: 'var(--sf-color-canvas, #fcf9f8)',
          }}
        >
          {content}
        </div>
        <div
          style={{
            position: 'relative',
            minHeight: asymmetric ? settings.minHeight : '52vh',
            overflow: 'hidden',
            backgroundColor: 'var(--sf-color-surface-muted, #f4efe7)',
          }}
        >
          {image ? (
            <ParallaxMedia
              image={image}
              focalPoint={settings.imageFocalPoint}
              kind="hero"
              parallax={parallax}
              zoom={imageZoom}
              scale={settings.imageScale}
            />
          ) : null}
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .sf-hero-split {
            grid-template-columns: 1fr !important;
          }
          .sf-hero-split > div:last-child {
            min-height: 46vh !important;
          }
        }
      `}</style>
    </section>
  );
}

async function ProductGridBlock({
  section,
}: {
  section: Extract<StorefrontSection, { type: 'productGrid' }>;
}) {
  const { settings, variant } = section;
  let products: Product[] = [];
  try {
    const { data } = await apiClient.GET('/catalog/products', {
      params: {
        query: {
          limit: settings.limit,
          ...(settings.categorySlug ? { categorySlug: settings.categorySlug } : {}),
        },
      },
    });
    products = data?.data ?? [];
  } catch {
    products = [];
  }

  const columns = settings.columns;
  const cardVariant = variant === 'editorial' ? 'editorial' : 'default';

  return (
    <section style={{ ...sectionPadding, backgroundColor: 'var(--sf-color-canvas, #fcf9f8)' }}>
      <div style={container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 36 }}>
          <SectionHeading eyebrow={settings.eyebrow} title={settings.title} description={settings.description} />
          {settings.ctaLabel ? (
            <Link
              href={settings.ctaHref}
              style={{
                flexShrink: 0,
                fontFamily: 'var(--sf-font-mono, monospace)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--sf-color-text, #1f1b16)',
                textDecoration: 'underline',
                textUnderlineOffset: 5,
              }}
            >
              {settings.ctaLabel}
            </Link>
          ) : null}
        </div>
        {products.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(columns, 4)}, minmax(0, 1fr))`,
              gap: 'var(--sf-gap, 24px)',
            }}
            className="sf-product-grid"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} variant={cardVariant} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--sf-color-text-muted, #6b6258)' }}>No hay productos disponibles.</p>
        )}
        {products.length > 0 && variant === 'list' ? (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Cta href={settings.ctaHref || '/catalogo'}>{settings.ctaLabel || 'Ver catálogo'}</Cta>
          </div>
        ) : null}
        <style>{`
          @media (max-width: 900px) {
            .sf-product-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
          @media (max-width: 560px) {
            .sf-product-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

function CategoriesBlock({
  section,
  categories,
}: {
  section: Extract<StorefrontSection, { type: 'categories' }>;
  categories: Category[];
}) {
  if (categories.length === 0) return null;
  return (
    <section style={{ ...sectionPadding, backgroundColor: 'var(--sf-color-surface, #fff)' }}>
      <div style={container}>
        <SectionHeading
          eyebrow={section.settings.eyebrow}
          title={section.settings.title}
          description={section.settings.description}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sf-gap, 24px)' }}>
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/catalogo?category=${encodeURIComponent(category.slug)}`}
              style={{
                display: 'flex',
                minHeight: section.variant === 'list' ? 72 : 180,
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 20,
                padding: 24,
                border: `var(--sf-border-width, 1px) solid var(--sf-color-border, #ddd2c2)`,
                borderRadius: 'var(--sf-radius, 0)',
                backgroundColor: index === 0 ? 'var(--sf-color-brand, #1f1b16)' : 'var(--sf-color-canvas, #fcf9f8)',
                color: index === 0 ? 'var(--sf-color-inverse, #fff)' : 'var(--sf-color-text, #1f1b16)',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontFamily: 'var(--sf-font-mono, monospace)', fontSize: 11, letterSpacing: '0.12em', opacity: 0.65 }}>
                0{index + 1}
              </span>
              <span style={{ fontFamily: 'var(--sf-font-display, serif)', fontSize: 'clamp(1.35rem, 2.4vw, 2.1rem)', lineHeight: 1 }}>
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryBlock({ section, config }: { section: Extract<StorefrontSection, { type: 'story' }>; config: StoreConfig }) {
  const { settings, variant } = section;
  const image = settings.imageUrl || config.heroImageUrl || '';
  const motion = config.storefrontDoc?.motion;
  const imageZoom = motion?.imageMotion === 'zoom';
  const parallax = resolveSectionParallax(motion, section.motion, 'story');
  const stickyMedia = isStickyStoryMedia(section.motion) && variant !== 'fullBleed';
  const text = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
      <SectionHeading eyebrow={settings.eyebrow} title={settings.title} description={settings.text} light={variant === 'fullBleed'} />
      {settings.linkLabel ? (
        <div>
          <Cta href={settings.linkHref} style="outline" light={variant === 'fullBleed'}>
            {settings.linkLabel}
          </Cta>
        </div>
      ) : null}
    </div>
  );

  if (variant === 'fullBleed') {
    return (
      <section
        style={{
          position: 'relative',
          minHeight: '62vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          padding: '88px 24px',
          backgroundColor: 'var(--sf-color-text, #1f1b16)',
        }}
      >
        {image ? (
          <ParallaxMedia
            image={image}
            focalPoint={settings.imageFocalPoint}
            kind="story"
            parallax={parallax}
            zoom={imageZoom}
            scale={settings.imageScale}
          />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(8,8,8,0.58)' }} />
        <div style={{ ...container, position: 'relative', zIndex: 1 }}>{text}</div>
      </section>
    );
  }

  const imageOnRight = settings.imagePosition === 'right';
  return (
    <section style={{ ...sectionPadding, backgroundColor: 'var(--sf-color-canvas, #fcf9f8)' }}>
      <div
        style={{
          ...container,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 'clamp(24px, 5vw, 72px)',
          alignItems: 'center',
        }}
        className="sf-story-grid"
      >
        <div
          style={{
            order: imageOnRight ? 1 : 2,
            ...(stickyMedia ? { position: 'sticky', top: 96, alignSelf: 'start' } : {}),
          }}
        >
          <div
            style={{
              position: 'relative',
              minHeight: 440,
              overflow: 'hidden',
              backgroundColor: 'var(--sf-color-surface-muted, #f4efe7)',
            }}
          >
            {image ? (
              <ParallaxMedia
                image={image}
                focalPoint={settings.imageFocalPoint}
                kind="story"
                parallax={parallax}
                zoom={imageZoom}
                scale={settings.imageScale}
              />
            ) : null}
          </div>
        </div>
        <div style={{ order: imageOnRight ? 2 : 1 }}>{text}</div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .sf-story-grid {
            grid-template-columns: 1fr !important;
          }
          .sf-story-grid > div {
            order: initial !important;
          }
        }
      `}</style>
    </section>
  );
}

function ScrollStoryBlock({
  section,
  config,
}: {
  section: Extract<StorefrontSection, { type: 'scrollStory' }>;
  config: StoreConfig;
}) {
  const { settings } = section;
  const motion = config.storefrontDoc?.motion;
  const imageZoom = motion?.imageMotion === 'zoom';
  const parallax = resolveSectionParallax(motion, section.motion, 'scrollStory');
  const revealSteps = isMotionEnabled(motion) ? 'rise' : undefined;

  return (
    <section
      style={{
        ...sectionPadding,
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
      }}
    >
      <div style={container}>
        <div className="sf-scroll-story">
          <div className="sf-scroll-story-media">
            <div
              style={{
                position: 'relative',
                height: 'min(72vh, 680px)',
                overflow: 'hidden',
                backgroundColor: 'var(--sf-color-surface-muted, #f4efe7)',
              }}
            >
              {settings.imageUrl ? (
                <ParallaxMedia
                  image={settings.imageUrl}
                  focalPoint={settings.imageFocalPoint}
                  kind="story"
                  parallax={parallax}
                  zoom={imageZoom}
                  scale={settings.imageScale}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.08)' }} />
              )}
            </div>
          </div>

          <div>
            {settings.steps.map((step, index) => (
              <div
                key={`${step.title}-${index}`}
                className="sf-scroll-story-step"
                data-sf-reveal={revealSteps}
                data-sf-delay={revealSteps ? (index === 0 ? 'none' : 'short') : undefined}
              >
                {step.eyebrow ? (
                  <p style={{ ...eyebrowStyle, color: settings.textColor, opacity: 0.62 }}>
                    {step.eyebrow}
                  </p>
                ) : null}
                <h2
                  style={{
                    margin: '12px 0 0',
                    fontFamily: 'var(--sf-font-display, serif)',
                    fontSize: 'clamp(2.1rem, 4.8vw, 4.6rem)',
                    fontWeight: 500,
                    lineHeight: 0.96,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {step.title}
                </h2>
                <p
                  style={{
                    maxWidth: 560,
                    margin: '18px 0 0',
                    fontFamily: 'var(--sf-font-body, sans-serif)',
                    fontSize: 16,
                    lineHeight: 1.65,
                    opacity: 0.72,
                  }}
                >
                  {step.text}
                </p>
              </div>
            ))}

            {settings.linkLabel ? (
              <div style={{ display: 'flex', alignItems: 'center', minHeight: '32vh' }}>
                <Cta href={settings.linkHref} style="outline">
                  {settings.linkLabel}
                </Cta>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function PromoBlock({ section }: { section: Extract<StorefrontSection, { type: 'promo' }> }) {
  const { settings, variant } = section;
  const now = Date.now();
  const startsAt = settings.startsAt ? new Date(settings.startsAt).getTime() : null;
  const endsAt = settings.endsAt ? new Date(settings.endsAt).getTime() : null;
  if ((startsAt && startsAt > now) || (endsAt && endsAt < now)) return null;
  const box = variant === 'box';
  return (
    <section style={{ ...sectionPadding, backgroundColor: box ? 'var(--sf-color-canvas, #fcf9f8)' : settings.backgroundColor }}>
      <div style={container}>
        <div
          style={{
            padding: box ? 'clamp(32px, 6vw, 72px)' : '0',
            backgroundColor: settings.backgroundColor,
            color: settings.textColor,
            borderRadius: 'var(--sf-radius, 0)',
            display: 'flex',
            flexDirection: box ? 'column' : 'row',
            alignItems: box ? 'center' : 'center',
            justifyContent: 'space-between',
            gap: 32,
            textAlign: box ? 'center' : 'left',
          }}
          className="sf-promo"
        >
          <div style={{ maxWidth: 720 }}>
            {settings.eyebrow ? <p style={{ ...eyebrowStyle, color: settings.textColor, opacity: 0.7 }}>{settings.eyebrow}</p> : null}
            <h2 style={{ margin: '8px 0 0', fontFamily: 'var(--sf-font-display, serif)', fontSize: 'clamp(2.2rem, 4.5vw, 4.2rem)', lineHeight: 0.98 }}>{settings.title}</h2>
            {settings.subtitle ? <p style={{ margin: '16px 0 0', fontFamily: 'var(--sf-font-body, sans-serif)', fontSize: 16, lineHeight: 1.6, opacity: 0.82 }}>{settings.subtitle}</p> : null}
          </div>
          <Link
            href={settings.link}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 46,
              padding: '0 20px',
              border: `1px solid ${settings.textColor}`,
              color: settings.textColor,
              fontFamily: 'var(--sf-font-body, sans-serif)',
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {settings.buttonLabel}
          </Link>
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) {
          .sf-promo {
            flex-direction: column !important;
            align-items: flex-start !important;
            text-align: left !important;
          }
        }
      `}</style>
    </section>
  );
}

function NewsletterBlock({ section }: { section: Extract<StorefrontSection, { type: 'newsletter' }> }) {
  return (
    <section style={{ ...sectionPadding, backgroundColor: 'var(--sf-color-surface-muted, #f4efe7)' }}>
      <div style={{ ...container, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 }}>
        <p style={eyebrowStyle}>Newsletter</p>
        <h2 style={{ margin: 0, fontFamily: 'var(--sf-font-display, serif)', fontSize: 'clamp(2.2rem, 5vw, 4.4rem)', fontWeight: 500, letterSpacing: '-0.03em' }}>
          {section.settings.title}
        </h2>
        <p style={{ margin: 0, maxWidth: 560, fontFamily: 'var(--sf-font-body, sans-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--sf-color-text-muted, #6b6258)' }}>
          {section.settings.description}
        </p>
        <StorefrontNewsletterForm buttonLabel={section.settings.buttonLabel} />
      </div>
    </section>
  );
}

function MarqueeBlock({
  section,
  config,
}: {
  section: Extract<StorefrontSection, { type: 'marquee' }>;
  config: StoreConfig;
}) {
  const items = section.settings.items.length > 0 ? section.settings.items : ['Nueva colección'];
  const marquee = marqueeMotion(config.storefrontDoc?.motion);

  return (
    <div
      className="sf-marquee"
      style={{
        backgroundColor: section.settings.backgroundColor,
        color: section.settings.textColor,
        padding: '16px 0',
      }}
    >
      <MarqueeTrack
        duration={marquee.duration}
        direction={marquee.direction}
        pausedByDefault={marquee.pausedByDefault}
        allowControl={marquee.allowControl}
        label="marquee"
      >
        {[0, 1].map((group) => (
          <span key={group} aria-hidden={group === 1 ? true : undefined} style={{ display: 'inline-flex', gap: 48 }}>
            {items.map((item, index) => (
              <span
                key={`${group}-${index}-${item}`}
                style={{
                  fontFamily: 'var(--sf-font-mono, monospace)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {item} <span style={{ opacity: 0.5 }}>•</span>
              </span>
            ))}
          </span>
        ))}
      </MarqueeTrack>
    </div>
  );
}

function FaqBlock({ section }: { section: Extract<StorefrontSection, { type: 'faq' }> }) {
  return (
    <section style={{ ...sectionPadding, backgroundColor: 'var(--sf-color-canvas, #fcf9f8)' }}>
      <div style={{ ...container, maxWidth: 900 }}>
        <SectionHeading title={section.settings.title} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {section.settings.items.map((item, index) => (
            <details
              key={`${item.question}-${index}`}
              style={{
                borderTop: `var(--sf-border-width, 1px) solid var(--sf-color-border, #ddd2c2)`,
                padding: '20px 0',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontFamily: 'var(--sf-font-body, sans-serif)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--sf-color-text, #1f1b16)',
                }}
              >
                {item.question}
              </summary>
              <p style={{ margin: '14px 0 0', fontFamily: 'var(--sf-font-body, sans-serif)', color: 'var(--sf-color-text-muted, #6b6258)', lineHeight: 1.65 }}>
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionRenderer({
  section,
  config,
  categories,
}: {
  section: StorefrontSection;
  config: StoreConfig;
  categories: Category[];
}) {
  if (!section.visible) return null;
  switch (section.type) {
    case 'hero':
      return <HeroBlock section={section} config={config} />;
    case 'productGrid':
      return <ProductGridBlock section={section} />;
    case 'categories':
      return <CategoriesBlock section={section} categories={categories} />;
    case 'showcase':
      return <ShowcaseBlock section={section} config={config} />;
    case 'countdown':
      return <CountdownBlock section={section} />;
    case 'productSpotlight':
      return <ProductSpotlightBlock section={section} config={config} />;
    case 'story':
      return <StoryBlock section={section} config={config} />;
    case 'scrollStory':
      return <ScrollStoryBlock section={section} config={config} />;
    case 'promo':
      return <PromoBlock section={section} />;
    case 'newsletter':
      return <NewsletterBlock section={section} />;
    case 'marquee':
      return <MarqueeBlock section={section} config={config} />;
    case 'faq':
      return <FaqBlock section={section} />;
    default:
      return null;
  }
}

export function StorefrontSections({
  sections,
  config,
  categories,
}: {
  sections: StorefrontSection[];
  config: StoreConfig;
  categories: Category[];
}) {
  const motion = config.storefrontDoc?.motion;

  return (
    <>
      {sections.map((section) => {
        const reveal = resolveSectionReveal(motion, section.motion, section.type);
        const hoverOverride = resolveSectionHover(motion, section.motion);
        const hoverVars = storefrontHoverVars(
          section.motion?.hover && section.motion.hover !== 'inherit' ? hoverOverride : undefined,
        );

        return (
          <div
            key={section.id}
            data-sf-reveal={reveal !== 'none' ? reveal : undefined}
            data-sf-delay={reveal !== 'none' ? section.motion?.delay ?? 'none' : undefined}
            style={hoverVars as React.CSSProperties}
          >
            <SectionRenderer section={section} config={config} categories={categories} />
          </div>
        );
      })}
    </>
  );
}

export function StorefrontDocumentHome({
  doc,
  config,
  categories,
}: {
  doc: StorefrontDocument;
  config: StoreConfig;
  categories: Category[];
}) {
  return (
    <>
      <StoreHeader />
      <main>
        <StorefrontSections sections={doc.pages.home.sections} config={config} categories={categories} />
        {doc.pages.home.sections.length === 0 ? (
          <div style={{ ...container, ...sectionPadding, textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--sf-font-display, serif)' }}>Esta tienda todavía no tiene secciones.</h1>
          </div>
        ) : null}
      </main>
      <StoreFooter />
    </>
  );
}

export function StorefrontDocumentPage({
  doc,
  config,
  categories,
  slug,
  title,
}: {
  doc: StorefrontDocument;
  config: StoreConfig;
  categories: Category[];
  slug: string;
  title: string;
}) {
  const sections = doc.pages.staticPages?.[slug]?.sections ?? [];
  return (
    <>
      <StoreHeader />
      <main>
        <section style={{ ...sectionPadding, paddingTop: 64, paddingBottom: 32, backgroundColor: 'var(--sf-color-canvas, #fcf9f8)' }}>
          <div style={container}>
            <p style={eyebrowStyle}>Página</p>
            <h1
              style={{
                margin: '10px 0 0',
                fontFamily: 'var(--sf-font-display, serif)',
                fontSize: 'clamp(2.8rem, 6vw, 5.4rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                color: 'var(--sf-color-text, #1f1b16)',
              }}
            >
              {title}
            </h1>
          </div>
        </section>
        {sections.length > 0 ? (
          <StorefrontSections sections={sections} config={config} categories={categories} />
        ) : (
          <div style={{ ...container, ...sectionPadding }}>
            <p style={{ color: 'var(--sf-color-text-muted, #6b6258)' }}>Esta página todavía no tiene secciones.</p>
          </div>
        )}
      </main>
      <StoreFooter />
    </>
  );
}
