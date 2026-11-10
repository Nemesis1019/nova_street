import {
  STOREFRONT_MOTION_PROFILES,
  STOREFRONT_PRESET_META,
  type StorefrontDocument,
  StorefrontDocumentSchema,
  type StorefrontNavigationItem,
  type StorefrontPresetKey,
} from '@ecommerce/shared';
import type { StoreConfig } from '@prisma/client';

type PresetConfig = Pick<
  StoreConfig,
  | 'name'
  | 'description'
  | 'logoUrl'
  | 'heroImageUrl'
  | 'heroTitle'
  | 'heroSubtitle'
  | 'contactEmail'
  | 'contactPhone'
  | 'storefrontConfig'
>;

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function navigationFromConfig(config: PresetConfig): StorefrontNavigationItem[] {
  const storefront = jsonRecord(config.storefrontConfig);
  const navigation = Array.isArray(storefront.navigation) ? storefront.navigation : [];
  const parsed = navigation
    .map((item) => {
      const record = jsonRecord(item);
      return {
        label: typeof record.label === 'string' ? record.label : '',
        href: typeof record.href === 'string' ? record.href : '',
        newTab: record.newTab === true,
      };
    })
    .filter((item) => item.label && item.href);

  return parsed.length
    ? parsed
    : [
        { label: 'Tienda', href: '/catalogo', newTab: false },
        { label: 'Nosotros', href: '/pagina/nuestra-historia', newTab: false },
      ];
}

function announcementFromConfig(config: PresetConfig) {
  const storefront = jsonRecord(config.storefrontConfig);
  const bar = jsonRecord(storefront.announcementBar);
  return {
    enabled: bar.enabled === true && typeof bar.text === 'string' && Boolean(bar.text),
    text: typeof bar.text === 'string' ? bar.text : '',
    link: typeof bar.link === 'string' ? bar.link : '',
    backgroundColor:
      typeof bar.backgroundColor === 'string' ? bar.backgroundColor : '#1F1B16',
    textColor: typeof bar.textColor === 'string' ? bar.textColor : '#FCF9F8',
  };
}

function footerFromConfig(config: PresetConfig, variant: 'columns' | 'minimal' | 'editorial') {
  const storefront = jsonRecord(config.storefrontConfig);
  const footer = jsonRecord(storefront.footer);
  return {
    variant,
    tagline: config.description ?? '',
    showNewsletter: footer.showNewsletter !== false,
    showSocialLinks: footer.showSocialLinks !== false,
    copyrightText: typeof footer.copyrightText === 'string' ? footer.copyrightText : '',
    extraLinks: [],
  };
}

function basePages(sections: unknown[]) {
  return {
    home: { sections },
    catalog: {
      productCardVariant: 'editorial' as const,
      columns: 3,
      showFilters: false,
      showSort: true,
    },
    product: {
      galleryLayout: 'left' as const,
      stickyBuyBox: true,
      showReviews: true,
      showRelated: true,
    },
  };
}

/**
 * Los presets no traen datos de negocio: solo seleccionan tokens y composición.
 * La copy base sale del StoreConfig existente para que el cambio se sienta del
 * cliente y no de una plantilla genérica.
 */
export function buildStorefrontPreset(
  key: StorefrontPresetKey,
  config: PresetConfig,
): StorefrontDocument {
  const heroImage = config.heroImageUrl ?? '';
  const heroTitle = config.heroTitle ?? config.name;
  const heroSubtitle = config.heroSubtitle ?? config.description ?? '';
  const navigation = navigationFromConfig(config);
  const announcement = announcementFromConfig(config);

  const coffeeHero = {
    id: 'hero',
    type: 'hero',
    variant: 'asymmetric',
    settings: {
      eyebrow: 'Café de especialidad · Tostado en pequeños lotes',
      title: heroTitle,
      subtitle: heroSubtitle,
      imageUrl: heroImage,
      overlay: 0.32,
      align: 'left',
      minHeight: '84vh',
      ctas: [
        { label: 'Comprar café', href: '/catalogo', style: 'solid' },
        { label: 'Nuestra historia', href: '/pagina/nuestra-historia', style: 'outline' },
      ],
    },
  };

  const coffee = {
    schemaVersion: 2,
    presetKey: key,
    motion: STOREFRONT_MOTION_PROFILES.editorial,
    tokens: {
      colors: {
        canvas: '#F8F4EC',
        surface: '#FFFDF8',
        surfaceMuted: '#EFE7DA',
        text: '#201A15',
        textMuted: '#6F6256',
        brand: '#201A15',
        accent: '#7B8061',
        border: '#DDD2C2',
        inverse: '#FFFDF8',
      },
      fonts: {
        display: 'Fraunces',
        heading: 'Fraunces',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
      shape: { radius: '2px', borderWidth: '1px', shadow: 'none' },
      spacing: { section: '112px', container: '1360px', gap: '28px' },
      image: { productRatio: '4 / 5', heroOverlay: 0.32 },
      customCss: '',
    },
    header: {
      variant: 'centered',
      sticky: true,
      announcement: { ...announcement, enabled: false },
      navigation,
      showSearch: true,
    },
    footer: footerFromConfig(config, 'editorial'),
    pages: basePages([
      coffeeHero,
      {
        id: 'featured',
        type: 'productGrid',
        variant: 'editorial',
        settings: {
          eyebrow: 'Selección de la semana',
          title: 'Recién tostado',
          description: 'Lotes pequeños, tostados para tu próxima taza.',
          limit: 8,
          columns: 3,
          categorySlug: '',
          ctaLabel: 'Ver todo el café',
          ctaHref: '/catalogo',
        },
      },
      {
        id: 'story',
        type: 'story',
        variant: 'split',
        settings: {
          eyebrow: 'Nuestro proceso',
          title: 'Del origen a la taza',
          text: 'Seleccionamos cafés de finca, los tostamos en pequeños lotes y los enviamos cuando están en su mejor momento. Sin prisa, sin sobrestock.',
          imageUrl: heroImage,
          imagePosition: 'right',
          linkLabel: 'Conocé nuestra historia',
          linkHref: '/pagina/nuestra-historia',
        },
      },
      {
        id: 'categories',
        type: 'categories',
        variant: 'tiles',
        settings: {
          eyebrow: 'Explorá',
          title: 'Todo para tu ritual',
          description: 'Café, métodos y objetos para la mesa.',
        },
      },
      {
        id: 'promo',
        type: 'promo',
        variant: 'box',
        settings: {
          eyebrow: 'Club Grano',
          title: 'Suscripción de café',
          subtitle: 'Dos bolsas de 250 g por mes, con envío incluido y sin débito automático.',
          link: '/catalogo?category=suscripciones',
          buttonLabel: 'Conocer la suscripción',
          backgroundColor: '#7B8061',
          textColor: '#FFFDF8',
        },
      },
      {
        id: 'newsletter',
        type: 'newsletter',
        variant: 'inline',
        settings: {
          title: 'Una taza más',
          description: 'Nuevos orígenes, recetas y historias de finca.',
          buttonLabel: 'Suscribirme',
        },
      },
    ]),
  };

  const streetwearHero = {
    id: 'hero',
    type: 'hero',
    variant: 'fullBleed',
    settings: {
      eyebrow: 'Nueva colección',
      title: heroTitle,
      subtitle: heroSubtitle,
      imageUrl: heroImage,
      overlay: 0.52,
      align: 'center',
      minHeight: '82vh',
      showBadge: true,
      badgeText: '',
      badgeCenter: '01',
      ctas: [
        { label: 'Explorar ahora', href: '/catalogo', style: 'solid' },
        { label: 'Personalizar', href: '/personalizar', style: 'outline' },
      ],
    },
  };

  const streetwear = {
    schemaVersion: 2,
    presetKey: key,
    motion: STOREFRONT_MOTION_PROFILES.kinetic,
    tokens: {
      colors: {
        canvas: '#FCF9F8',
        surface: '#FFFFFF',
        surfaceMuted: '#F0EDED',
        text: '#0D0D0D',
        textMuted: '#5F5F58',
        brand: '#0D0D0D',
        accent: '#6F7A4E',
        border: '#0D0D0D',
        inverse: '#FCF9F8',
      },
      fonts: {
        display: 'Bebas Neue',
        heading: 'Bebas Neue',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
      shape: { radius: '0px', borderWidth: '1px', shadow: 'none' },
      spacing: { section: '80px', container: '1600px', gap: '24px' },
      image: { productRatio: '4 / 5', heroOverlay: 0.52 },
      customCss: '',
    },
    header: {
      variant: 'classic',
      sticky: true,
      announcement: { ...announcement, enabled: Boolean(announcement.text) },
      navigation,
      showSearch: true,
    },
    footer: footerFromConfig(config, 'columns'),
    pages: basePages([
      streetwearHero,
      {
        id: 'marquee',
        type: 'marquee',
        variant: 'default',
        settings: {
          items: ['Edición limitada', 'Envíos a todo el país', 'Drop 01 disponible'],
          backgroundColor: '#6F7A4E',
          textColor: '#FCF9F8',
        },
      },
      {
        id: 'showcase',
        type: 'showcase',
        variant: 'bento',
        settings: {
          eyebrow: 'Drop actual',
          title: 'La colección',
          linkLabel: 'Ver toda la colección',
          linkHref: '/catalogo',
          categorySlug: '',
          story: {
            enabled: true,
            title: 'Una colección, una actitud',
            text: 'Piezas oversized, gráficos de alto contraste y una edición que no vuelve.',
            linkLabel: 'Descubrir el proceso',
            linkHref: '/pagina/sobre-nosotros',
          },
        },
      },
      {
        id: 'featured',
        type: 'productGrid',
        variant: 'grid',
        settings: {
          eyebrow: 'Drop actual',
          title: 'Nueva colección',
          description: 'Piezas de tirada limitada. Una vez agotadas, no se reponen.',
          limit: 8,
          columns: 4,
          categorySlug: '',
          ctaLabel: 'Ver catálogo',
          ctaHref: '/catalogo',
        },
      },
      {
        id: 'promo',
        type: 'promo',
        variant: 'banner',
        settings: {
          eyebrow: 'Drop 01',
          title: 'Edición limitada',
          subtitle: 'Cuando se agota, no vuelve.',
          link: '/catalogo',
          buttonLabel: 'Comprar ahora',
          backgroundColor: '#0D0D0D',
          textColor: '#FCF9F8',
        },
      },
      {
        id: 'countdown',
        type: 'countdown',
        variant: 'panel',
        settings: {
          title: 'Próximo drop',
          targetAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
          finishedLabel: 'El drop ya está disponible',
          backgroundColor: '#0D0D0D',
          textColor: '#FCF9F8',
        },
      },
      {
        id: 'newsletter',
        type: 'newsletter',
        variant: 'inline',
        settings: {
          title: 'Entrá primero',
          description: 'Lanzamientos, restocks y contenido antes que nadie.',
          buttonLabel: 'Suscribirme',
        },
      },
      {
        id: 'spotlight',
        type: 'productSpotlight',
        variant: 'split',
        settings: {
          eyebrow: 'Prenda de la semana',
          title: '',
          text: '',
          productSlug: '',
          imagePosition: 'right',
          ctaLabel: 'Comprar ahora',
          showPrice: true,
          backgroundColor: '#0D0D0D',
          textColor: '#FCF9F8',
        },
      },
    ]),
  };

  const minimal = {
    schemaVersion: 2,
    presetKey: key,
    motion: STOREFRONT_MOTION_PROFILES.quiet,
    tokens: {
      colors: {
        canvas: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceMuted: '#F5F5F4',
        text: '#171717',
        textMuted: '#737373',
        brand: '#171717',
        accent: '#8A8A7A',
        border: '#E5E5E5',
        inverse: '#FFFFFF',
      },
      fonts: {
        display: 'Inter',
        heading: 'Inter',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
      shape: { radius: '0px', borderWidth: '1px', shadow: 'none' },
      spacing: { section: '120px', container: '1280px', gap: '32px' },
      image: { productRatio: '3 / 4', heroOverlay: 0.2 },
      customCss: '',
    },
    header: {
      variant: 'centered',
      sticky: true,
      announcement: { ...announcement, enabled: false },
      navigation,
      showSearch: true,
    },
    footer: footerFromConfig(config, 'minimal'),
    pages: basePages([
      {
        id: 'hero',
        type: 'hero',
        variant: 'minimal',
        settings: {
          eyebrow: 'Nueva temporada',
          title: heroTitle,
          subtitle: heroSubtitle,
          imageUrl: heroImage,
          overlay: 0.2,
          align: 'center',
          minHeight: '70vh',
          ctas: [{ label: 'Ver colección', href: '/catalogo', style: 'solid' }],
        },
      },
      {
        id: 'featured',
        type: 'productGrid',
        variant: 'grid',
        settings: {
          eyebrow: '',
          title: 'Selección',
          description: '',
          limit: 8,
          columns: 3,
          categorySlug: '',
          ctaLabel: '',
          ctaHref: '/catalogo',
        },
      },
      {
        id: 'story',
        type: 'story',
        variant: 'split',
        settings: {
          eyebrow: 'La marca',
          title: 'Menos, pero mejor',
          text: 'Materiales nobles, siluetas limpias y una producción consciente.',
          imageUrl: heroImage,
          imagePosition: 'right',
          linkLabel: 'Conocer más',
          linkHref: '/pagina/nuestra-historia',
        },
      },
      {
        id: 'categories',
        type: 'categories',
        variant: 'list',
        settings: { eyebrow: '', title: 'Explorar', description: '' },
      },
      {
        id: 'newsletter',
        type: 'newsletter',
        variant: 'inline',
        settings: {
          title: 'Novedades',
          description: 'Una carta breve, de vez en cuando.',
          buttonLabel: 'Suscribirme',
        },
      },
    ]),
  };

  const market = {
    schemaVersion: 2,
    presetKey: key,
    motion: STOREFRONT_MOTION_PROFILES.none,
    tokens: {
      colors: {
        canvas: '#F7F5F2',
        surface: '#FFFFFF',
        surfaceMuted: '#ECE8E2',
        text: '#1C1B19',
        textMuted: '#66625D',
        brand: '#1C1B19',
        accent: '#3F6B4A',
        border: '#D8D1C7',
        inverse: '#FFFFFF',
      },
      fonts: {
        display: 'Work Sans',
        heading: 'Work Sans',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
      shape: { radius: '4px', borderWidth: '1px', shadow: 'none' },
      spacing: { section: '72px', container: '1440px', gap: '20px' },
      image: { productRatio: '1 / 1', heroOverlay: 0.32 },
      customCss: '',
    },
    header: {
      variant: 'classic',
      sticky: true,
      announcement: { ...announcement, enabled: false },
      navigation,
      showSearch: true,
    },
    footer: footerFromConfig(config, 'columns'),
    pages: basePages([
      {
        id: 'hero',
        type: 'hero',
        variant: 'split',
        settings: {
          eyebrow: 'Tienda',
          title: heroTitle,
          subtitle: heroSubtitle,
          imageUrl: heroImage,
          overlay: 0.32,
          align: 'left',
          minHeight: '56vh',
          ctas: [{ label: 'Ver catálogo', href: '/catalogo', style: 'solid' }],
        },
      },
      {
        id: 'categories',
        type: 'categories',
        variant: 'tiles',
        settings: {
          eyebrow: 'Encontrá lo que buscás',
          title: 'Categorías',
          description: '',
        },
      },
      {
        id: 'featured',
        type: 'productGrid',
        variant: 'grid',
        settings: {
          eyebrow: '',
          title: 'Productos destacados',
          description: '',
          limit: 12,
          columns: 4,
          categorySlug: '',
          ctaLabel: 'Ver todo',
          ctaHref: '/catalogo',
        },
      },
      {
        id: 'promo',
        type: 'promo',
        variant: 'box',
        settings: {
          eyebrow: 'Beneficio',
          title: 'Envío gratis',
          subtitle: 'En compras superiores al monto mínimo de la tienda.',
          link: '/catalogo',
          buttonLabel: 'Comprar',
          backgroundColor: '#3F6B4A',
          textColor: '#FFFFFF',
        },
      },
      {
        id: 'newsletter',
        type: 'newsletter',
        variant: 'inline',
        settings: {
          title: 'Ofertas y novedades',
          description: 'Recibí las mejores propuestas en tu email.',
          buttonLabel: 'Suscribirme',
        },
      },
    ]),
  };

  const docs: Record<StorefrontPresetKey, unknown> = {
    'coffee-editorial': coffee,
    'streetwear-drop': streetwear,
    'minimal-boutique': minimal,
    'market-catalog': market,
  };

  return StorefrontDocumentSchema.parse(docs[key]);
}

/** Documento de arranque para tenants que todavía no publicaron un builder. */
export function buildLegacyStorefrontDocument(config: PresetConfig): StorefrontDocument {
  return buildStorefrontPreset('minimal-boutique', config);
}

export function isStorefrontPresetKey(value: string): value is StorefrontPresetKey {
  return STOREFRONT_PRESET_META.some((preset: { key: string }) => preset.key === value);
}
