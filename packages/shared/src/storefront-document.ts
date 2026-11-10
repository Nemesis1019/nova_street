import { z } from 'zod';

/**
 * Contrato del storefront personalizable.
 *
 * El documento vive por tenant. Los presets y el renderer son compartidos; la
 * diferencia entre clientes sale de tokens + composición de secciones. Nada de
 * este schema contiene reglas de negocio (precio, stock, checkout).
 */

export const STOREFRONT_SCHEMA_VERSION = 2;

export const DEFAULT_STOREFRONT_TOKENS = {
  colors: {
    canvas: '#FCF9F8',
    surface: '#FFFFFF',
    surfaceMuted: '#F4EFE7',
    text: '#1F1B16',
    textMuted: '#6B6258',
    brand: '#1F1B16',
    accent: '#6F7A4E',
    border: '#DCD2C4',
    inverse: '#FCF9F8',
  },
  fonts: {
    display: 'Fraunces',
    heading: 'Fraunces',
    body: 'Inter',
    mono: 'JetBrains Mono',
  },
  shape: {
    radius: '0px',
    borderWidth: '1px',
    shadow: 'none',
  },
  spacing: {
    section: '96px',
    container: '1400px',
    gap: '24px',
  },
  image: {
    productRatio: '4 / 5',
    heroOverlay: 0.4,
  },
  customCss: '',
} as const;

const ColorTokensSchema = z.object({
  canvas: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.canvas),
  surface: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.surface),
  surfaceMuted: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.surfaceMuted),
  text: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.text),
  textMuted: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.textMuted),
  brand: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.brand),
  accent: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.accent),
  border: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.border),
  inverse: z.string().default(DEFAULT_STOREFRONT_TOKENS.colors.inverse),
});

export const StorefrontTokensSchema = z.object({
  colors: ColorTokensSchema.default(DEFAULT_STOREFRONT_TOKENS.colors),
  fonts: z
    .object({
      display: z.string().default(DEFAULT_STOREFRONT_TOKENS.fonts.display),
      heading: z.string().default(DEFAULT_STOREFRONT_TOKENS.fonts.heading),
      body: z.string().default(DEFAULT_STOREFRONT_TOKENS.fonts.body),
      mono: z.string().default(DEFAULT_STOREFRONT_TOKENS.fonts.mono),
    })
    .default(DEFAULT_STOREFRONT_TOKENS.fonts),
  shape: z
    .object({
      radius: z.string().default(DEFAULT_STOREFRONT_TOKENS.shape.radius),
      borderWidth: z.string().default(DEFAULT_STOREFRONT_TOKENS.shape.borderWidth),
      shadow: z.string().default(DEFAULT_STOREFRONT_TOKENS.shape.shadow),
    })
    .default(DEFAULT_STOREFRONT_TOKENS.shape),
  spacing: z
    .object({
      section: z.string().default(DEFAULT_STOREFRONT_TOKENS.spacing.section),
      container: z.string().default(DEFAULT_STOREFRONT_TOKENS.spacing.container),
      gap: z.string().default(DEFAULT_STOREFRONT_TOKENS.spacing.gap),
    })
    .default(DEFAULT_STOREFRONT_TOKENS.spacing),
  image: z
    .object({
      productRatio: z.string().default(DEFAULT_STOREFRONT_TOKENS.image.productRatio),
      heroOverlay: z.number().min(0).max(1).default(DEFAULT_STOREFRONT_TOKENS.image.heroOverlay),
    })
    .default(DEFAULT_STOREFRONT_TOKENS.image),
  customCss: z.string().max(20_000).default(''),
});

export const STOREFRONT_MOTION_PRESET_VALUES = ['none', 'quiet', 'editorial', 'kinetic'] as const;
export type StorefrontMotionPreset = (typeof STOREFRONT_MOTION_PRESET_VALUES)[number];

export const StorefrontMotionSchema = z.object({
  preset: z.enum(STOREFRONT_MOTION_PRESET_VALUES).default('none'),
  speed: z.enum(['slow', 'normal', 'fast']).default('normal'),
  reveal: z.enum(['none', 'fade', 'rise', 'clip', 'scale']).default('none'),
  stagger: z.number().int().min(0).max(160).default(0),
  hover: z.enum(['none', 'lift', 'zoom', 'swap']).default('lift'),
  imageMotion: z.enum(['none', 'zoom']).default('none'),
  parallax: z.enum(['none', 'subtle', 'strong']).default('none'),
  marquee: z.enum(['paused', 'slow', 'normal', 'fast', 'reverse']).default('normal'),
  cta: z.enum(['none', 'arrow', 'lift']).default('arrow'),
  pageTransition: z.boolean().default(false),
});

export const StorefrontSectionMotionSchema = z.object({
  reveal: z.enum(['inherit', 'none', 'fade', 'rise', 'clip', 'scale']).default('inherit'),
  delay: z.enum(['none', 'short', 'medium']).default('none'),
  hover: z.enum(['inherit', 'none', 'lift', 'zoom', 'swap']).default('inherit'),
  parallax: z.enum(['inherit', 'none', 'subtle', 'strong']).default('inherit'),
  stickyMedia: z.boolean().default(false),
});

/**
 * Perfiles curados. El cliente elige una personalidad de movimiento y, si
 * quiere, ajusta campos puntuales; no arma timelines desde cero.
 */
export const STOREFRONT_MOTION_PROFILES = {
  none: {
    preset: 'none',
    speed: 'normal',
    reveal: 'none',
    stagger: 0,
    hover: 'none',
    imageMotion: 'none',
    parallax: 'none',
    marquee: 'paused',
    cta: 'none',
    pageTransition: false,
  },
  quiet: {
    preset: 'quiet',
    speed: 'slow',
    reveal: 'fade',
    stagger: 0,
    hover: 'lift',
    imageMotion: 'none',
    parallax: 'none',
    marquee: 'slow',
    cta: 'arrow',
    pageTransition: false,
  },
  editorial: {
    preset: 'editorial',
    speed: 'slow',
    reveal: 'rise',
    stagger: 80,
    hover: 'zoom',
    imageMotion: 'zoom',
    parallax: 'none',
    marquee: 'slow',
    cta: 'arrow',
    pageTransition: false,
  },
  kinetic: {
    preset: 'kinetic',
    speed: 'fast',
    reveal: 'clip',
    stagger: 50,
    hover: 'swap',
    imageMotion: 'zoom',
    parallax: 'none',
    marquee: 'fast',
    cta: 'lift',
    pageTransition: false,
  },
} as const satisfies Record<StorefrontMotionPreset, z.infer<typeof StorefrontMotionSchema>>;

export type StorefrontMotion = z.infer<typeof StorefrontMotionSchema>;
export type StorefrontSectionMotion = z.infer<typeof StorefrontSectionMotionSchema>;

export const StorefrontNavigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  newTab: z.boolean().default(false),
});

export type StorefrontNavigationItem = z.infer<typeof StorefrontNavigationItemSchema>;

export const StorefrontHeaderSchema = z.object({
  variant: z.enum(['classic', 'centered', 'minimal']).default('classic'),
  sticky: z.boolean().default(true),
  shrinkOnScroll: z.boolean().default(false),
  announcement: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().default(''),
      link: z.string().default(''),
      backgroundColor: z.string().default('#1F1B16'),
      textColor: z.string().default('#FCF9F8'),
      startsAt: z.string().default(''),
      endsAt: z.string().default(''),
    })
    .default({}),
  navigation: z.array(StorefrontNavigationItemSchema).default([]),
  showSearch: z.boolean().default(true),
});

export const StorefrontFooterSchema = z.object({
  variant: z.enum(['columns', 'minimal', 'editorial']).default('columns'),
  tagline: z.string().default(''),
  showNewsletter: z.boolean().default(true),
  showSocialLinks: z.boolean().default(true),
  copyrightText: z.string().default(''),
  extraLinks: z
    .array(z.object({ label: z.string().min(1), href: z.string().min(1) }))
    .default([]),
});

const CtaSchema = z.object({
  label: z.string().default('Ver más'),
  href: z.string().default('/catalogo'),
  style: z.enum(['solid', 'outline']).default('solid'),
});

const HeroSectionSchema = z.object({
  id: z.string(),
  type: z.literal('hero'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.enum(['fullBleed', 'split', 'asymmetric', 'minimal']).default('fullBleed'),
  settings: z.object({
    eyebrow: z.string().default(''),
    title: z.string().default(''),
    subtitle: z.string().default(''),
    imageUrl: z.string().default(''),
    imageFocalPoint: z
      .enum(['center', 'top', 'bottom', 'left', 'right'])
      .default('center'),
    imageScale: z.number().min(100).max(200).default(100),
    overlay: z.number().min(0).max(1).default(0.4),
    align: z.enum(['left', 'center']).default('center'),
    minHeight: z.string().default('78vh'),
    showBadge: z.boolean().default(false),
    badgeText: z.string().default(''),
    badgeCenter: z.string().default(''),
    ctas: z.array(CtaSchema).max(3).default([]),
  }),
});

const ProductGridSectionSchema = z.object({
  id: z.string(),
  type: z.literal('productGrid'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.enum(['grid', 'editorial', 'list']).default('grid'),
  settings: z.object({
    eyebrow: z.string().default(''),
    title: z.string().default('Productos'),
    description: z.string().default(''),
    limit: z.number().int().min(1).max(24).default(8),
    columns: z.number().int().min(2).max(6).default(4),
    categorySlug: z.string().default(''),
    ctaLabel: z.string().default(''),
    ctaHref: z.string().default('/catalogo'),
  }),
});

const CategoriesSectionSchema = z.object({
  id: z.string(),
  type: z.literal('categories'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.enum(['tiles', 'list']).default('tiles'),
  settings: z.object({
    eyebrow: z.string().default(''),
    title: z.string().default('Categorías'),
    description: z.string().default(''),
  }),
});

const StorySectionSchema = z.object({
  id: z.string(),
  type: z.literal('story'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.enum(['split', 'fullBleed', 'overlap']).default('split'),
  settings: z.object({
    eyebrow: z.string().default(''),
    title: z.string().default(''),
    text: z.string().default(''),
    imageUrl: z.string().default(''),
    imageFocalPoint: z
      .enum(['center', 'top', 'bottom', 'left', 'right'])
      .default('center'),
    imageScale: z.number().min(100).max(200).default(100),
    imagePosition: z.enum(['left', 'right']).default('left'),
    linkLabel: z.string().default(''),
    linkHref: z.string().default('/catalogo'),
  }),
});

const ShowcaseStorySchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().default(''),
  text: z.string().default(''),
  linkLabel: z.string().default('Conocer más'),
  linkHref: z.string().default('/catalogo'),
});

const ShowcaseSectionSchema = z.object({
  id: z.string(),
  type: z.literal('showcase'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.literal('bento').default('bento'),
  settings: z.object({
    eyebrow: z.string().default(''),
    title: z.string().default('Colección destacada'),
    linkLabel: z.string().default('Ver toda la colección'),
    linkHref: z.string().default('/catalogo'),
    categorySlug: z.string().default(''),
    story: ShowcaseStorySchema.default({}),
  }),
});

const CountdownSectionSchema = z.object({
  id: z.string(),
  type: z.literal('countdown'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.literal('panel').default('panel'),
  settings: z.object({
    title: z.string().default('Próximo drop'),
    targetAt: z.string().default(''),
    finishedLabel: z.string().default('El drop ya está disponible'),
    backgroundColor: z.string().default('#0D0D0D'),
    textColor: z.string().default('#FCF9F8'),
  }),
});

const ProductSpotlightSectionSchema = z.object({
  id: z.string(),
  type: z.literal('productSpotlight'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.literal('split').default('split'),
  settings: z.object({
    eyebrow: z.string().default(''),
    title: z.string().default(''),
    text: z.string().default(''),
    productSlug: z.string().default(''),
    imagePosition: z.enum(['left', 'right']).default('right'),
    ctaLabel: z.string().default('Comprar ahora'),
    showPrice: z.boolean().default(true),
    backgroundColor: z.string().default('#0D0D0D'),
    textColor: z.string().default('#FCF9F8'),
  }),
});

const ScrollStoryStepSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  text: z.string().default(''),
});

const ScrollStorySectionSchema = z.object({
  id: z.string(),
  type: z.literal('scrollStory'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.literal('pinned').default('pinned'),
  settings: z.object({
    imageUrl: z.string().default(''),
    imageFocalPoint: z
      .enum(['center', 'top', 'bottom', 'left', 'right'])
      .default('center'),
    imageScale: z.number().min(100).max(200).default(100),
    backgroundColor: z.string().default('#FCF9F8'),
    textColor: z.string().default('#1F1B16'),
    linkLabel: z.string().default(''),
    linkHref: z.string().default('/catalogo'),
    steps: z.array(ScrollStoryStepSchema).min(1).max(6).default([]),
  }),
});

const PromoSectionSchema = z.object({
  id: z.string(),
  type: z.literal('promo'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.enum(['banner', 'box']).default('banner'),
  settings: z.object({
    eyebrow: z.string().default(''),
    title: z.string().default(''),
    subtitle: z.string().default(''),
    link: z.string().default('/catalogo'),
    buttonLabel: z.string().default('Ver más'),
    backgroundColor: z.string().default('#6F7A4E'),
    textColor: z.string().default('#FCF9F8'),
    startsAt: z.string().default(''),
    endsAt: z.string().default(''),
  }),
});

const NewsletterSectionSchema = z.object({
  id: z.string(),
  type: z.literal('newsletter'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.literal('inline').default('inline'),
  settings: z.object({
    title: z.string().default('Una taza más'),
    description: z.string().default('Novedades, recetas y nuevos orígenes.'),
    buttonLabel: z.string().default('Suscribirme'),
  }),
});

const MarqueeSectionSchema = z.object({
  id: z.string(),
  type: z.literal('marquee'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.literal('default').default('default'),
  settings: z.object({
    items: z.array(z.string()).default([]),
    backgroundColor: z.string().default('#6F7A4E'),
    textColor: z.string().default('#FCF9F8'),
  }),
});

const FaqSectionSchema = z.object({
  id: z.string(),
  type: z.literal('faq'),
  visible: z.boolean().default(true),
  motion: StorefrontSectionMotionSchema.default({}),
  variant: z.enum(['accordion', 'columns']).default('accordion'),
  settings: z.object({
    title: z.string().default('Preguntas frecuentes'),
    items: z
      .array(z.object({ question: z.string().default(''), answer: z.string().default('') }))
      .default([]),
  }),
});

export const StorefrontSectionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  ProductGridSectionSchema,
  CategoriesSectionSchema,
  ShowcaseSectionSchema,
  StorySectionSchema,
  ScrollStorySectionSchema,
  CountdownSectionSchema,
  ProductSpotlightSectionSchema,
  PromoSectionSchema,
  NewsletterSectionSchema,
  MarqueeSectionSchema,
  FaqSectionSchema,
]);

export const StorefrontHomePageSchema = z.object({
  sections: z.array(StorefrontSectionSchema).max(25).default([]),
});

export const StorefrontCatalogPageSchema = z.object({
  productCardVariant: z.enum(['default', 'editorial', 'minimal']).default('default'),
  columns: z.number().int().min(2).max(6).default(4),
  showFilters: z.boolean().default(true),
  showSort: z.boolean().default(true),
});

export const StorefrontProductPageSchema = z.object({
  galleryLayout: z.enum(['left', 'right']).default('left'),
  showGalleryThumbnails: z.boolean().default(true),
  gallerySwipeEnabled: z.boolean().default(true),
  stickyBuyBox: z.boolean().default(false),
  showReviews: z.boolean().default(true),
  showRelated: z.boolean().default(true),
});

/**
 * Experimento A/B del storefront.
 *
 * El alcance inicial es el título de un hero. La asignación es estable por
 * visitante (cookie first-party) y el renderer aplica la variante antes del
 * paint. Los eventos se guardan por tenant para ver impresiones y clics.
 */
export const StorefrontExperimentSchema = z.object({
  id: z.string().min(1),
  name: z.string().default('Experimento del hero'),
  enabled: z.boolean().default(false),
  /**
   * heroTitle: variantA/B son títulos.
   * motion: variantA/B son claves de perfil (`none`, `quiet`, `editorial`, `kinetic`).
   */
  target: z.enum(['heroTitle', 'motion']).default('heroTitle'),
  /** Vacío = primer hero visible. */
  sectionId: z.string().default(''),
  variantA: z.string().default(''),
  variantB: z.string().default(''),
  /** Porcentaje de visitantes que ven la variante B. */
  split: z.number().int().min(1).max(99).default(50),
  startedAt: z.string().default(''),
  endedAt: z.string().default(''),
});

export const StorefrontDocumentSchema = z.object({
  schemaVersion: z.literal(STOREFRONT_SCHEMA_VERSION).default(STOREFRONT_SCHEMA_VERSION),
  presetKey: z.string().default('legacy'),
  tokens: StorefrontTokensSchema.default({}),
  motion: StorefrontMotionSchema.default({}),
  header: StorefrontHeaderSchema.default({}),
  footer: StorefrontFooterSchema.default({}),
  pages: z
    .object({
      home: StorefrontHomePageSchema.default({}),
      catalog: StorefrontCatalogPageSchema.default({}),
      product: StorefrontProductPageSchema.default({}),
      /** Páginas estáticas por slug (nosotros, envíos, FAQ, etc.). */
      staticPages: z
        .record(z.string().min(1), StorefrontHomePageSchema)
        .default({}),
    })
    .default({}),
  experiments: z.array(StorefrontExperimentSchema).max(10).default([]),
});

export type StorefrontTokens = z.infer<typeof StorefrontTokensSchema>;
export type StorefrontHeader = z.infer<typeof StorefrontHeaderSchema>;
export type StorefrontFooter = z.infer<typeof StorefrontFooterSchema>;
export type StorefrontSection = z.infer<typeof StorefrontSectionSchema>;
export type StorefrontHomePage = z.infer<typeof StorefrontHomePageSchema>;
export type StorefrontCatalogPage = z.infer<typeof StorefrontCatalogPageSchema>;
export type StorefrontProductPage = z.infer<typeof StorefrontProductPageSchema>;
export type StorefrontExperiment = z.infer<typeof StorefrontExperimentSchema>;
export type StorefrontDocument = z.infer<typeof StorefrontDocumentSchema>;
export type StorefrontSectionType = StorefrontSection['type'];

export const STOREFRONT_SECTION_LABELS: Record<StorefrontSectionType, string> = {
  hero: 'Hero',
  productGrid: 'Grilla de productos',
  categories: 'Categorías',
  showcase: 'Showcase de colección',
  story: 'Historia / imagen + texto',
  scrollStory: 'Scroll pinned',
  countdown: 'Countdown',
  productSpotlight: 'Producto destacado',
  promo: 'Banner promocional',
  newsletter: 'Newsletter',
  marquee: 'Marquee',
  faq: 'FAQ',
};

export const STOREFRONT_PRESET_META = [
  {
    key: 'coffee-editorial',
    name: 'Coffee Editorial',
    description: 'Café de especialidad: hero asimétrico, serif, fotografía amplia y clima editorial.',
  },
  {
    key: 'streetwear-drop',
    name: 'Streetwear Drop',
    description: 'Alto contraste, hero full-bleed, marquee y grilla de drops.',
  },
  {
    key: 'minimal-boutique',
    name: 'Minimal Boutique',
    description: 'Limpio, tipografía sans, mucho aire y foco en producto.',
  },
  {
    key: 'market-catalog',
    name: 'Market Catalog',
    description: 'Catálogo denso, categorías primero y grilla compacta.',
  },
] as const;

export type StorefrontPresetKey = (typeof STOREFRONT_PRESET_META)[number]['key'];

/**
 * Catálogo público de identidades. No contiene datos comerciales: sólo la
 * paleta, tipografías y una imagen de referencia para mostrar el preset.
 */
export const STOREFRONT_MARKETPLACE_PRESETS = [
  {
    key: 'coffee-editorial',
    name: 'Coffee Editorial',
    tagline: 'Café de especialidad, narrativa y fotografía amplia.',
    description:
      'Hero asimétrico, serif editorial, mucho aire y una composición pensada para contar origen y proceso.',
    heroImage:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80',
    palette: {
      canvas: '#F8F4EC',
      surface: '#FFFDF8',
      text: '#201A15',
      brand: '#201A15',
      accent: '#7B8061',
      border: '#DDD2C2',
    },
    fonts: { display: 'Fraunces', body: 'Inter' },
  },
  {
    key: 'streetwear-drop',
    name: 'Streetwear Drop',
    tagline: 'Alto contraste, full bleed y actitud de drop.',
    description:
      'Hero a sangre, tipografía condensada, marquee y una grilla de producto directa, sin ornamentos.',
    heroImage:
      'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1400&q=80',
    palette: {
      canvas: '#FCF9F8',
      surface: '#FFFFFF',
      text: '#0D0D0D',
      brand: '#0D0D0D',
      accent: '#6F7A4E',
      border: '#0D0D0D',
    },
    fonts: { display: 'Bebas Neue', body: 'Inter' },
  },
  {
    key: 'minimal-boutique',
    name: 'Minimal Boutique',
    tagline: 'Menos, pero mejor.',
    description:
      'Tipografía sans, fondos neutros y una puesta en página silenciosa que deja hablar al producto.',
    heroImage:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1400&q=80',
    palette: {
      canvas: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#171717',
      brand: '#171717',
      accent: '#8A8A7A',
      border: '#E5E5E5',
    },
    fonts: { display: 'Inter', body: 'Inter' },
  },
  {
    key: 'market-catalog',
    name: 'Market Catalog',
    tagline: 'Catálogo primero, compra sin fricción.',
    description:
      'Categorías visibles, grilla densa y una jerarquía funcional para tiendas con mucho inventario.',
    heroImage:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80',
    palette: {
      canvas: '#F7F5F2',
      surface: '#FFFFFF',
      text: '#1C1B19',
      brand: '#1C1B19',
      accent: '#3F6B4A',
      border: '#D8D1C7',
    },
    fonts: { display: 'Work Sans', body: 'Inter' },
  },
] as const;

export function getDefaultStorefrontDocument(): StorefrontDocument {
  return StorefrontDocumentSchema.parse({});
}
