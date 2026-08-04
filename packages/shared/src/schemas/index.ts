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
    })
    .default({}),
  navigation: z.array(NavigationItemSchema).default([
    { label: 'Inicio', href: '/', newTab: false },
    { label: 'Catálogo', href: '/catalogo', newTab: false },
    { label: 'Personalizar', href: '/personalizar', newTab: false },
  ]),
  homeSections: z
    .array(z.enum(['hero', 'categories', 'featuredProducts', 'promoBanner', 'newsletter', 'identity']))
    .default(['hero', 'categories', 'featuredProducts', 'promoBanner', 'newsletter', 'identity']),
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
});

export type StorefrontConfig = z.infer<typeof StorefrontConfigSchema>;
export type NavigationItem = z.infer<typeof NavigationItemSchema>;
