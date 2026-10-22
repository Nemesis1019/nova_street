import { z } from 'zod';

import {
  AssetPurpose,
  CartItemType,
  CustomDesignElementType,
  CustomDesignStatus,
  OrderItemProductionStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ShipmentStatus,
  StockMode,
} from '../enums';

export const OrderStatusSchema = z.nativeEnum(OrderStatus);
export const PaymentStatusSchema = z.nativeEnum(PaymentStatus);
export const StockModeSchema = z.nativeEnum(StockMode);
export const OrderItemProductionStatusSchema = z.nativeEnum(
  OrderItemProductionStatus,
);
export const CartItemTypeSchema = z.nativeEnum(CartItemType);
export const CustomDesignStatusSchema = z.nativeEnum(CustomDesignStatus);
export const CustomDesignElementTypeSchema = z.nativeEnum(
  CustomDesignElementType,
);
export const AssetPurposeSchema = z.nativeEnum(AssetPurpose);
export const ShipmentStatusSchema = z.nativeEnum(ShipmentStatus);
export const RefundStatusSchema = z.nativeEnum(RefundStatus);

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const AddressSchema = z.object({
  label: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  zipCode: z.string().min(1),
  isDefault: z.boolean().default(false),
});

export const MoneySchema = z.number().int().min(0);

const NavigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  newTab: z.boolean().default(false),
});

export const StorefrontConfigSchema = z.object({
  announcementBar: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().default(''),
      link: z.string().optional(),
      backgroundColor: z.string().default('#0d0d0d'),
      textColor: z.string().default('#ffffff'),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    })
    .default({}),
  freeShippingNotice: z
    .object({
      enabled: z.boolean().default(false),
      message: z.string().default(''),
    })
    .default({}),
  navigation: z.array(NavigationItemSchema).default([
    { label: 'Catálogo', href: '/catalogo', newTab: false },
    { label: 'Personalizar', href: '/personalizar', newTab: false },
  ]),
  homeSections: z
    .array(
      z.enum([
        'hero',
        'collectionShowcase',
        'categories',
        'featuredProducts',
        'promoBanner',
        'countdown',
        'newsletter',
        'productSpotlight',
        'identity',
      ]),
    )
    .default([
      'hero',
      'collectionShowcase',
      'featuredProducts',
      'promoBanner',
      'countdown',
      'newsletter',
      'productSpotlight',
    ]),
  collectionShowcase: z
    .object({
      title: z.string().default('Nueva Colección'),
      linkLabel: z.string().default('Ver toda la colección'),
      linkHref: z.string().default('/catalogo'),
      categorySlug: z.string().optional(),
      story: z
        .object({
          enabled: z.boolean().default(true),
          title: z.string().default('La Fusión Definitiva'),
          text: z
            .string()
            .default(
              'Nuestra colección intersecta la pasión del fútbol sudamericano con la intensidad visual del anime contemporáneo. Siluetas oversized construidas con algodón premium, diseñadas para dominar las calles.',
            ),
          linkLabel: z.string().default('Descubre el proceso'),
          linkHref: z.string().default('/pagina/sobre-nosotros'),
        })
        .default({}),
    })
    .default({}),
  featuredProducts: z
    .object({
      title: z.string().default('Destacados'),
      categorySlug: z.string().optional(),
      limit: z.number().int().min(1).max(24).default(8),
      /** Columnas en desktop (2-6). */
      columns: z.number().int().min(2).max(6).default(4),
      sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
    })
    .default({}),
  productSpotlight: z
    .object({
      eyebrow: z.string().default('Prenda de la semana'),
      /** Slug del producto destacado; si está vacío usa el primer destacado del home. */
      productSlug: z.string().optional(),
      title: z.string().default(''),
      text: z.string().default(''),
      ctaLabel: z.string().default('Comprar ahora'),
      imagePosition: z.enum(['left', 'right']).default('right'),
      showPrice: z.boolean().default(true),
    })
    .default({}),
  countdown: z
    .object({
      enabled: z.boolean().default(false),
      title: z.string().default('Próximo drop'),
      targetAt: z.string().default(''),
    })
    .default({}),
  promoBanner: z
    .object({
      enabled: z.boolean().default(true),
      title: z.string().default('Colección exclusiva'),
      subtitle: z.string().default('Descubre piezas limitadas diseñadas para destacar.'),
      link: z.string().default('/catalogo'),
      backgroundColor: z.string().default('#6f7a4e'),
      textColor: z.string().default('#ffffff'),
    })
    .default({}),
  footer: z
    .object({
      showNewsletter: z.boolean().default(true),
      showSocialLinks: z.boolean().default(true),
      copyrightText: z.string().default(''),
      extraLinks: z
        .array(
          z.object({
            label: z.string().min(1),
            href: z.string().min(1),
          }),
        )
        .default([]),
    })
    .default({}),
  productCard: z
    .object({
      showSku: z.boolean().default(true),
      showRating: z.boolean().default(true),
      showStockBadge: z.boolean().default(true),
      showWishlist: z.boolean().default(true),
      showQuickView: z.boolean().default(false),
    })
    .default({}),
  productBadges: z
    .object({
      showNew: z.boolean().default(true),
      showSale: z.boolean().default(true),
      showLowStock: z.boolean().default(true),
      lowStockThreshold: z.number().int().min(0).default(5),
      newDaysThreshold: z.number().int().min(0).default(7),
    })
    .default({}),
  catalog: z
    .object({
      defaultSort: z.enum(['newest', 'priceAsc', 'priceDesc', 'nameAsc', 'bestSelling']).default('newest'),
      defaultPageSize: z.number().int().min(1).max(96).default(24),
      showFilters: z.boolean().default(true),
    })
    .default({}),
  relatedProducts: z
    .object({
      enabled: z.boolean().default(true),
      strategy: z.enum(['sameCategory', 'sameCollection', 'none']).default('sameCategory'),
      limit: z.number().int().min(0).max(12).default(4),
    })
    .default({}),
  cart: z
    .object({
      trustBadges: z.array(z.string()).default(['Envío seguro', 'Pago protegido', 'Atención al cliente']),
      showFreeShippingProgress: z.boolean().default(true),
    })
    .default({}),
  checkout: z
    .object({
      requirePhone: z.boolean().default(false),
      showCompanyField: z.boolean().default(false),
      showOrderNotes: z.boolean().default(false),
      thankYouMessage: z.string().default('Gracias por tu compra. Te enviaremos un email con los detalles de tu pedido.'),
    })
    .default({}),
  featureFlags: z
    .object({
      enableWishlist: z.boolean().default(true),
      enableCompare: z.boolean().default(true),
      enableReviews: z.boolean().default(true),
      enableCustomizer: z.boolean().default(true),
      enableGuestCheckout: z.boolean().default(true),
      enableQuickView: z.boolean().default(false),
    })
    .default({}),
  crossSell: z
    .object({
      enabled: z.boolean().default(true),
      title: z.string().default('También te puede interesar'),
      strategy: z.enum(['sameCategory', 'bestSelling', 'none']).default('sameCategory'),
      limit: z.number().int().min(0).max(12).default(4),
    })
    .default({}),
  branding: z
    .object({
      logoUrl: z.string().optional(),
      customCss: z.string().default(''),
    })
    .default({}),
  seo: z
    .object({
      defaultTitleTemplate: z.string().default('{title} | {storeName}'),
      defaultDescription: z.string().default(''),
      ogImageUrl: z.string().optional(),
      productTitleTemplate: z.string().default('{productName} — {storeName}'),
      categoryTitleTemplate: z.string().default('{categoryName} — {storeName}'),
      pageTitleTemplate: z.string().default('{pageTitle} — {storeName}'),
    })
    .default({}),
  externalScripts: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        placement: z.enum(['head', 'body']),
        code: z.string().default(''),
      }),
    )
    .default([]),
  whatsappButton: z
    .object({
      enabled: z.boolean().default(false),
      phone: z.string().default(''),
      message: z.string().default(''),
      position: z.enum(['bottomRight', 'bottomLeft']).default('bottomRight'),
    })
    .default({}),
  notFound: z
    .object({
      title: z.string().default('Página no encontrada'),
      message: z.string().default('La página que buscás no existe o fue movida.'),
    })
    .default({}),
  fonts: z
    .object({
      heading: z.string().default('Bebas Neue'),
      body: z.string().default('Inter'),
      mono: z.string().default('JetBrains Mono'),
    })
    .default({}),
  legal: z
    .object({
      /** Razón social para el pie y documentos legales. */
      legalName: z.string().default(''),
      /** NIT / identificador fiscal. */
      taxId: z.string().default(''),
    })
    .default({}),
  popups: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        enabled: z.boolean().default(true),
        trigger: z.enum(['immediate', 'exitIntent', 'afterDelay', 'scroll']).default('immediate'),
        delaySeconds: z.number().int().min(0).default(0),
        scrollPercent: z.number().int().min(0).max(100).default(50),
        title: z.string().default(''),
        content: z.string().default(''),
        buttonText: z.string().default(''),
        buttonLink: z.string().default(''),
        backgroundColor: z.string().default('#ffffff'),
        textColor: z.string().default('#0d0d0d'),
        showOnce: z.boolean().default(true),
      }),
    )
    .default([]),
});

export type StorefrontConfig = z.infer<typeof StorefrontConfigSchema>;
export type NavigationItem = z.infer<typeof NavigationItemSchema>;
