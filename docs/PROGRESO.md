# Progreso del proyecto

## Última actualización
2026-08-05


## Estado general
- El monorepo tiene base estable: backend (`apps/api`), storefront (`apps/web`) y panel administrativo (`apps/admin`) compilan, pasan lint, typecheck y tests.
- La mayoría de módulos del MVP están implementados y verificados.
- Se completó la personalización avanzada del storefront desde el admin (tema, layout, productos, catálogo, carrito y checkout).
- La documentación inicial está en `docs/`: `SETUP.md`, `STRUCTURE.md`, modelo ER y ADRs.

## Módulos completados

### Backend (`apps/api`)
- Autenticación JWT (login, registro, refresh, verificación de email, logout).
- Roles con permisos granulares; `@RequirePermission` en endpoints admin; `ADMIN` tiene todos los permisos; `CUSTOMER` no tiene permisos.
- Permisos directos por usuario, combinados con los de su rol. El admin puede asignar y quitar permisos individuales a un usuario desde `/users`.
- Creación de usuarios desde el admin con rol y permisos iniciales configurables; por defecto se asignan permisos mínimos de solo lectura.
- CRUD de usuarios y direcciones.
- Catálogo público (`/catalog`) con filtros, paginación y rating promedio por producto.
- CRUD de productos, variantes, categorías e imágenes (`admin-catalog`).
- Gestión de stock con dos modos (`MADE_TO_ORDER` / `TRACKED`) configurable por variante.
- Carrito autenticado y merge de carritos.
- Checkout con cupones, cálculo de totales y políticas de envío configurables.
- Reintentos de pago sin duplicar órdenes.
- Órdenes del cliente y gestión administrativa de órdenes.
- Cupones con reglas avanzadas (`admin-coupons`).
- Configuración global de la tienda (`store-config`): branding, feature flags, modo mantenimiento, plantilla activa.
- Personalización de prendas (`custom-designs`, `design-templates`).
- Subida de archivos e imágenes con fallback a R2/local (`assets` + `storage`).
- Páginas estáticas editables (`pages`).
- Campos SEO en productos y categorías (`metaTitle`, `metaDescription`).
- Newsletter y emails transaccionales (`email`) con proveedores agnósticos (SMTP / Resend).
- Pasarela de pagos con proveedor agnóstico (`payment`) — Stripe implementado.
- Reembolsos (`refunds`) con registro en base de datos y proveedor.
- Auditoría (`audit`) con logs de `before`/`after` para productos, categorías, opciones de envío, config de tienda, usuarios/roles y permisos.
- Cola de producción (`production`) con asignación de responsables y filtro por asignado.
- Estimación de fecha de entrega calculada desde el lead time de los ítems de la orden.
- Envíos (`shipments`) con URL de rastreo por courier y generación automática del link.
- Opciones de envío (`shipping-options`) configurables desde admin, con selección en checkout y fallback a la política de envío anterior.
- Cache de catálogo con Redis (`CacheModule` + `RedisCacheStore`), con invalidación en mutaciones de admin, productos, stock y reviews.
- Optimización de imágenes (`GET /images/:filename`) con transformaciones `sharp` y variantes `thumbnail/small/medium` en el cliente.
- Reseñas de producto (`reviews`) con fotos adjuntas (`ReviewAsset`, `AssetPurpose.REVIEW_IMAGE`).
- Multi-moneda: modelo `Currency`, endpoints públicos y admin CRUD.
- Tema del storefront configurable desde admin: paleta completa de colores + modo claro/oscuro/sistema (`appearanceMode`, CSS variables, `MantineProvider`).
- Analytics (`analytics`) con reportes de ventas, productos top y conversión.
- Exportación de pedidos y productos a CSV (`export`).
- Wishlist (`wishlist`).
- Búsqueda predictiva (`search-suggestions`).
- Comparador de productos.
- Checkout como invitado (`guest-checkout`).
- Jobs con BullMQ (`queues`).
- Health checks (`health`).
- Backups manuales de base de datos (`backup`).
- Seeds de roles, admins, catálogo, dataset completo de demo y moneda base `COP`.

### Storefront (`apps/web`)
- Home con sistema de plantillas (`storefront` implementada).
- Catálogo con filtros (desktop y drawer móvil), metadatos SEO, rating promedio, paginación y selector de ítems por página.
- Detalle de producto con selector de variantes, galería y rating promedio.
- Carrito y checkout con direcciones, cupones, previsualización de envío y reintento de pago.
- Historial de pedidos con fecha estimada de entrega.
- Perfil, direcciones y seguridad de cuenta.
- Personalizador de prendas con carga lazy (wrapper cliente con `next/dynamic` `ssr: false`).
- Detalle de producto con tiempo de producción estimado.
- Páginas estáticas en `/pagina/[slug]`.
- Reseñas en detalle de producto con fotos y formulario de envío.
- Seguimiento de envíos en detalle de orden (usa URL de courier si está disponible).
- Wishlist y botón de favorito en catálogo.
- Búsqueda predictiva en el header.
- Comparador de productos (`/comparar`) con hook `useComparator` testeado.
- Checkout como invitado (`/checkout/guest`).
- Tarjetas de producto y detalle usan variantes optimizadas de imagen (`thumbnail`, `small`, `medium`).
- Multi-moneda: selector de moneda en header, conversiones en catálogo, carrito, checkout y órdenes (`CurrencyProvider`, `PriceText`).
- Internacionalización (i18n): selector de idioma en header, diccionarios `es/en/pt` y hook `useTranslation`.
- Accesibilidad: estilos de foco, `aria-labels`, `aria-current` y contraste revisado.
- Personalización avanzada desde `store-config`:
  - Modo de apariencia (`LIGHT`/`DARK`/`SYSTEM`) y tokens de color aplicados a través de CSS variables y `MantineProvider`.
  - Constructor de home: secciones configurables (`hero`, `categorías`, `productos destacados`, `banner promo`, `newsletter`, `identidad`).
  - Barra de anuncios configurable.
  - Footer configurable (newsletter, redes, copyright, links extra).
  - Tarjeta de producto configurable (variantes de diseño).
  - Badges automáticos (`Nuevo`, `Oferta`, `Pocas unidades`, `Agotado`).
  - Ordenamiento y filtros por defecto del catálogo.
  - Productos relacionados por categoría.
  - Badges de confianza y barra de progreso de envío gratis en el carrito.
  - Checkout configurable: teléfono obligatorio, campo de empresa, notas del pedido y mensaje de agradecimiento personalizado.
  - Menú de navegación configurable desde `store-config`.
  - Feature flags globales: wishlist, comparador, reseñas, personalizador, guest checkout, vista rápida.
  - Cross-sell / upsell en página de producto y carrito.
  - Logo vía URL y CSS personalizado inyectado en el storefront.
  - SEO por defecto configurable: templates de meta título, descripción e imagen OG para productos, categorías y páginas.
  - Scripts externos configurables en `<head>` y `<body>`.
  - Botón flotante de WhatsApp configurable.
  - Tipografías configurables desde el admin (títulos, cuerpo y monoespaciada) con carga de Google Fonts.
  - Popups configurables con disparadores inmediato, delay, scroll e intento de salida.
  - Múltiples opciones de envío configurables desde el admin y seleccionables en el checkout, con fallback a la configuración histórica de envío.

### Admin (`apps/admin`)
- Dashboard con métricas.
- Shell de navegación con rutas protegidas.
- Gestión de productos, categorías, variantes, imágenes y SEO.
- Gestión de inventario/stock.
- Gestión de cupones.
- Gestión de órdenes con cambio de estado y tracking.
- Listado y suspensión de usuarios.
- Moderación de diseños personalizados.
- Configuración de la tienda (`store-config`).
- Editor de páginas estáticas.
- Configurador de plantillas con vista previa en iframe (`/templates`).
- Logs de auditoría.
- Cola de producción (`/production`) con asignación de responsables y filtro por asignado.
- Gestión de envíos desde detalle de orden (transportista, número y URL de rastreo).
- Moderación de reseñas (`/reviews`) con miniaturas de fotos.
- Reembolsos desde detalle de orden y listado (`/refunds`).
- Configuración de proveedores de email, pagos y políticas de envío en `/store-config`.
- Gestión de opciones de envío en `/shipping-options`.
- Configuración de popups, scripts externos, WhatsApp, SEO, tipografías y más en `/store-config`.
- Dashboard con gráficos de analytics (`/admin`).
- Exportación de pedidos y productos a CSV (`/export`).
- Gestión de colas de jobs BullMQ.
- Health checks y backups desde admin.
- Gestión de monedas (`/currencies`) con CRUD y tasas de conversión.
- Internacionalización (i18n): selector de idioma en `AdminShell`, diccionarios `es/en/pt`.

### Paquetes compartidos
- `packages/shared`: constantes, enums y schemas Zod.
- `packages/api-client`: cliente HTTP tipado generado desde OpenAPI/Swagger.
- `packages/tsconfig` y `packages/eslint-config`: configuraciones compartidas.

### Infraestructura y calidad
- Docker Compose con PostgreSQL y Redis.
- Prisma como ORM con migraciones versionadas.
- Turborepo configurado para build, typecheck, lint, test y dev.
- ESLint y TypeScript configurados por app.
- Tests e2e en backend (Jest + Supertest): flujos críticos, permisos, stock policies, y suites existentes. Tests unitarios en frontends (Vitest + React Testing Library).
- CORS explícito usando `FRONTEND_URL` en el backend.

## Métricas de verificación (último barrido)
- `apps/api`: 21 suites, 87 tests OK.
- `apps/admin`: 4 test files, 10 tests OK.
- `apps/web`: 6 test files, 17 tests OK.
- `lint`, `typecheck` y `build` pasan en `@ecommerce/api`, `@ecommerce/web` y `@ecommerce/admin`.
- `packages/api-client` regenerado desde `apps/api/swagger.json`.
- Migraciones aplicadas: `20260726164423_add_review_assets_and_currencies`, `20260726181247_set_default_currency_cop`, `20260726182840_add_theme_tokens_and_appearance_mode`, `20260726185140_add_storefront_config`, `20260726214220_add_address_company_and_order_customer_notes`, `20260805013254_add_shipping_options`, `20260805021245_add_role_permissions`, `20260805025851_add_user_permissions` (más migraciones anteriores).
- Specs creadas: `specs/SPEC-017-estimacion-entrega.md`, `specs/SPEC-018-asignacion-responsables-produccion.md`, `specs/SPEC-019-analytics-reportes.md`, `specs/SPEC-020-dashboard-graficos.md`, `specs/SPEC-021-export-csv.md`, `specs/SPEC-022-guest-checkout.md`, `specs/SPEC-023-wishlist.md`, `specs/SPEC-024-busqueda-predictiva.md`, `specs/SPEC-025-comparador-productos.md`, `specs/SPEC-026-bullmq-jobs.md`, `specs/SPEC-027-cdn-assets.md`, `specs/SPEC-028-monitoreo-alertas.md`, `specs/SPEC-029-backups-base-datos.md`, `specs/SPEC-030-url-rastreo-couriers.md`, `specs/SPEC-031-url-rastreo-automatica.md`, `specs/SPEC-032-cache-catalogo-redis.md`, `specs/SPEC-033-paginacion-catalogo.md`, `specs/SPEC-034-lazy-loading-editor.md`, `specs/SPEC-035-optimizacion-imagenes.md`, `specs/SPEC-036-tests-flujos-criticos.md`, `specs/SPEC-037-tests-permisos.md`, `specs/SPEC-038-tests-stock-policy.md`, `specs/SPEC-039-tests-frontends.md`, `specs/SPEC-040-reviews-fotos.md`, `specs/SPEC-041-multi-moneda.md`, `specs/SPEC-042-i18n.md`, `specs/SPEC-043-tema-colores-modo-oscuro.md`, `specs/SPEC-045-storefront-personalizacion-avanzada.md`.

## Documentación actualizada
- `docs/SETUP.md`: variables de entorno, pasos de instalación, servicios, seeds, flujo de imágenes R2/local.
- `docs/STRUCTURE.md`: organización del monorepo y responsabilidad de cada módulo.
- `docs/decisions/ADR-001-payment-provider.md`: abstracción de pasarela de pagos con Stripe.
- `docs/decisions/ADR-002-storage-cloudflare-r2.md`: subida vía backend con fallback local.
- `docs/decisions/ADR-003-email-provider.md`: proveedores de email configurables (SMTP / Resend).
- `docs/decisions/ADR-004-permissions.md`: permisos granulares y audit trail en el admin.
- `docs/ER_MODEL.md` y `docs/er-diagram.png`: modelo de datos.
- `docs/PENDIENTES.md`: prioridades y estado de funcionalidades.

## Pendientes de alto nivel
Ver `docs/PENDIENTES.md` para el detalle de funcionalidades futuras.
