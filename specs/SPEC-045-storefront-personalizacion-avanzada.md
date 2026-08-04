# SPEC-045: Personalización avanzada del storefront desde el admin

## Objetivo
Permitir que el administrador configure desde un solo lugar (`/store-config`) múltiples aspectos del storefront: layout del home, contenido del footer y anuncios, apariencia de tarjetas de producto, filtros/ordenamiento del catálogo, cross-sell, badges automáticos, campos del checkout y mensajes de confianza en el carrito.

## Alcance
- Extender `StoreConfig` con un campo JSON `storefrontConfig`.
- Definir un schema Zod en `@ecommerce/shared` para validar y tipar la configuración.
- Agregar secciones en el admin para editar cada grupo de opciones.
- Aplicar la configuración en los componentes del storefront.

## Modelo de datos

### Campo nuevo en `StoreConfig`
- `storefrontConfig`: `Json?` con valores por defecto.

### Estructura de `StorefrontConfig`

```ts
interface StorefrontConfig {
  // Layout y contenido
  announcementBar?: {
    enabled: boolean;
    text: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  homeSections: Array<'hero' | 'categories' | 'featuredProducts' | 'promoBanner' | 'newsletter' | 'identity'>;
  footer?: {
    showNewsletter: boolean;
    showSocialLinks: boolean;
    copyrightText: string;
    extraLinks: Array<{ label: string; href: string }>;
  };

  // Productos y catálogo
  productCard: {
    showSku: boolean;
    showRating: boolean;
    showStockBadge: boolean;
    showWishlist: boolean;
    showQuickView: boolean;
  };
  productBadges: {
    showNew: boolean;
    showSale: boolean;
    showLowStock: boolean;
    lowStockThreshold: number;
    newDaysThreshold: number;
  };
  catalog: {
    defaultSort: 'newest' | 'priceAsc' | 'priceDesc' | 'nameAsc' | 'bestSelling';
    defaultPageSize: number;
    showFilters: boolean;
  };
  relatedProducts: {
    enabled: boolean;
    strategy: 'sameCategory' | 'sameCollection' | 'none';
    limit: number;
  };

  // Carrito y checkout
  cart: {
    trustBadges: string[];
    showFreeShippingProgress: boolean;
  };
  checkout: {
    requirePhone: boolean;
    showCompanyField: boolean;
    showOrderNotes: boolean;
    thankYouMessage: string;
  };
}
```

## API
- `GET /store-config` devuelve `storefrontConfig` dentro del objeto de configuración.
- `PATCH /store-config` acepta `storefrontConfig` como string JSON (igual que `templateConfig`).

## Frontend

### Admin
- Nuevas secciones en `/store-config`:
  - **Home**: lista ordenable/toggleable de secciones.
  - **Anuncios**: textos/colores de la barra de anuncios.
  - **Footer**: copyright, links extra, toggles de newsletter/redes.
  - **Tarjeta de producto**: switches para SKU, rating, stock, favoritos, vista rápida.
  - **Badges**: configuración de `Nuevo`, `Oferta`, `Pocas unidades`.
  - **Catálogo**: ordenamiento por defecto, tamaño de página, mostrar filtros.
  - **Relacionados/cross-sell**: estrategia y cantidad.
  - **Carrito**: badges de confianza y envío gratis.
  - **Checkout**: campos opcionales y mensaje de agradecimiento.

### Storefront
- `config-provider` y `useStoreConfig` exponen `storefrontConfig` parseado.
- Helper `getStorefrontConfig(config)` devuelve configuración con defaults.
- `AnnouncementBar` nuevo componente leído desde la config.
- `StorefrontHome` renderiza secciones según `homeSections`.
- `StoreFooter` usa `footer` config.
- `ProductCard` aplica `productCard` y `productBadges`.
- `CatalogPage` usa `catalog.defaultSort` y `catalog.defaultPageSize`.
- Página de producto muestra relacionados según `relatedProducts`.
- `CartPage` muestra badges de confianza y barra de envío gratis.
- `CheckoutPage` muestra/oculta campos según `checkout` config y mensaje en la confirmación.

## Tests
- Tests e2e de `store-config` actualizados para enviar `storefrontConfig`.
- Tests unitarios del helper `getStorefrontConfig`.
- Tests de `ProductCard` según configuración.

## Pendientes futuros
- Constructor visual drag-and-drop del home.
- Editor de páginas de políticas.
- Popups configurables.
- Scripts externos.
