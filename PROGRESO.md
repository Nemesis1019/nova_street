# PROGRESO.md — Bitácora de desarrollo

> Este archivo documenta el paso a paso, decisiones y cambios realizados en el proyecto. Sirve como contexto para continuar en caso de que la sesión se cierre o cambie de agente.

---

## Contexto inicial

- **Proyecto:** Plataforma de e-commerce de ropa con personalización.
- **Documento de referencia:** `skills.md` (SKILL.md — Desarrollo Spec Driven para E-commerce de Ropa con Personalización).
- **Stack oficial:**
  - Monorepo con pnpm workspaces + Turborepo.
  - `apps/web`: Next.js + TypeScript + Mantine + React Hook Form + Zod + TanStack Query + Zustand.
  - `apps/admin`: Next.js + TypeScript + Mantine + Mantine DataTable.
  - `apps/api`: NestJS + TypeScript + Prisma + PostgreSQL + JWT + Swagger/OpenAPI.
  - `packages/shared`: tipos, enums, constantes y schemas Zod compartidos.
  - `packages/api-client`: cliente HTTP tipado generado desde OpenAPI del backend.
  - `packages/ui`, `packages/eslint-config`, `packages/tsconfig`: utilidades compartidas.
- **Estado inicial:** directorio vacío salvo por `skills.md`.
- **Enfoque:** Spec Driven Development. Cada módulo requiere spec antes de implementar.

---

## Sesión actual

### Fecha
2026-06-28

### Tareas en curso
1. Crear monorepo base con pnpm workspaces + Turborepo.
2. Estructurar carpetas `apps/` y `packages/`.
3. Inicializar `apps/web`, `apps/admin` y `apps/api`.
4. Crear paquetes compartidos base.
5. Verificar builds iniciales.

### Decisiones tomadas
- El `admin` vivirá como aplicación independiente dentro del monorepo, tal como indica `skills.md`, compartiendo paquetes pero desplegable por separado.
- Se seguirá estrictamente la regla de no duplicar DTOs/tipos entre frontend y backend; los tipos de dominio irán a `packages/shared` y el cliente HTTP a `packages/api-client`.
- No se implementará funcionalidad de negocio sin spec previa. La sesión actual se limita a la base del monorepo.

### Pendientes identificados
- Definir specs iniciales para los módulos críticos (catálogo, carrito, checkout, usuarios/auth, personalización).
- Crear ADRs en `docs/decisions/`.
- Configurar Prisma y PostgreSQL.
- Implementar autenticación JWT base.
- Configurar Docker Compose para desarrollo.
- Configurar Prettier para formateo consistente en todo el monorepo.
- Agregar plugin de Next.js a la configuración compartida de ESLint (advertencia actual, no bloqueante).

---

## Registro de cambios

- [19:05] Verificación de herramientas: Node v24.15.0, npm 11.12.1, pnpm 11.9.0, git 2.49.0. Ambiente listo para monorepo con pnpm.
- [19:10] Creado `package.json` raíz con `packageManager: pnpm@11.9.0`, scripts de Turborepo y `.gitignore`.
- [19:12] Creado `pnpm-workspace.yaml` y `turbo.json` con pipeline de build, dev, lint, typecheck, test.
- [19:15] Creados paquetes compartidos:
  - `@ecommerce/tsconfig`: configuraciones base, node, react, nextjs.
  - `@ecommerce/eslint-config`: configuración flat config para ESLint 9 con typescript-eslint, import, simple-import-sort, prettier.
  - `@ecommerce/shared`: enums (`OrderStatus`, `PaymentStatus`, `StockMode`, etc.), tipos de dominio base y schemas Zod iniciales.
  - `@ecommerce/ui`: preset/theme de Mantine compartido.
  - `@ecommerce/api-client`: placeholder para cliente generado desde OpenAPI.
- [19:25] Creadas aplicaciones base:
  - `apps/web`: Next.js + Mantine + imports de `@ecommerce/shared` y `@ecommerce/ui`.
  - `apps/admin`: Next.js + Mantine + `mantine-datatable` + imports de paquetes compartidos.
  - `apps/api`: NestJS + Swagger/OpenAPI + health check + test e2e con supertest.
- [19:35] Resueltos errores de versiones de dependencias (`@nestjs/cli`, zod, etc.) y configuración de builds nativos en pnpm 11 (`onlyBuiltDependencies` en `pnpm-workspace.yaml`).
- [19:45] Corregida configuración TypeScript para NestJS (`moduleResolution: node`, `experimentalDecorators`, `emitDecoratorMetadata`).
- [19:55] Corregidos scripts lint para usar ESLint CLI directamente y creados `eslint.config.mjs` en paquetes y apps.
- [20:00] Separada configuración TypeScript de `apps/api` en `tsconfig.json` (dev/tests) y `tsconfig.build.json` (build NestJS con `rootDir: src`).
- [20:05] Ejecutada verificación final completa:
  - `pnpm turbo run build typecheck lint test --force`: 19/19 tareas exitosas.
  - Builds: @ecommerce/shared, @ecommerce/ui, @ecommerce/api-client, @ecommerce/api, @ecommerce/web, @ecommerce/admin.
  - Typechecks: todos los packages y apps.
  - Lint: todos los packages y apps.
  - Tests: 1 test e2e en `apps/api` (`/health`) pasando.
- [20:15] Creada guía de inicialización en `docs/SETUP.md` y archivos `.env.example` para `apps/web`, `apps/admin` y `apps/api`.
- [20:20] Verificación paso a paso de la guía:
  - `node --version` y `pnpm --version` correctos.
  - `pnpm install` sin errores.
  - Copia de `.env.example` a `.env` en las tres apps.
  - `pnpm turbo run build typecheck lint test`: 19/19 tareas exitosas.
  - Confirmado: no hay errores hasta este punto; solo advertencias de webpack cache y plugin Next.js no críticas.
- [20:25] Creadas specs iniciales críticas:
  - `SPEC-001-autenticacion-y-usuarios.md`
  - `SPEC-002-catalogo.md`
  - `SPEC-003-carrito.md`
  - `SPEC-004-checkout.md`
  - `SPEC-005-stock.md`
- [20:30] Creado índice de specs en `specs/README.md`.
- [20:35] Creados ADRs iniciales en `docs/decisions/`:
  - `ADR-001-payment-provider.md` (pendiente)
  - `ADR-002-storage-cloudflare-r2.md`
  - `ADR-003-auth-and-permissions.md`
  - `ADR-005-stock-mode-strategy.md`
  - `ADR-006-monorepo-structure.md`
  - `ADR-008-admin-app-en-monorepo.md`
  - `ADR-009-api-client-generation-strategy.md`
- [20:45] Configurado Prisma + PostgreSQL:
  - Creado `docker-compose.yml` con PostgreSQL (puerto 5433) y Redis.
  - Resuelto conflicto de puerto con PostgreSQL nativo del host cambiando a 5433.
  - Creado `prisma/schema.prisma` con modelos base según specs.
  - Creada migración inicial `20260629003722_init` aplicada correctamente.
  - Creados `PrismaService` y `PrismaModule` globales.
  - Actualizado `docs/SETUP.md` con pasos de Docker y migraciones.
- [20:50] Verificación post-Prisma: `pnpm turbo run build typecheck lint test` -> 19/19 exitosas.
- [20:55] Implementada autenticación JWT base según `SPEC-001`:
  - Instaladas dependencias: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `argon2`.
  - Creados módulos `AuthModule` y `UsersModule`.
  - Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
  - Guards JWT y Roles.
  - Hashing de passwords con Argon2.
  - Refresh tokens almacenados en base de datos con rotación.
  - Seed de roles `CUSTOMER` y `ADMIN`.
  - Tests e2e para registro y login (`test/auth.e2e-spec.ts`).
- [21:05] Verificación final con autenticación: `pnpm turbo run build typecheck lint test --force` -> 19/19 tareas exitosas, 3 tests pasando.
- [21:10] Estado: base del monorepo, documentación, specs, ADRs, Prisma/PostgreSQL y autenticación JWT listos y verificados.
- [21:20] Servidores de desarrollo levantados en segundo plano:
  - API: http://localhost:4000 (health OK, auth endpoints disponibles)
  - Web (storefront): http://localhost:3002 (puerto 3000 ocupado por otro proceso)
  - Admin: http://localhost:3001
- [21:25] Fin de sesión. Próximos pasos sugeridos: implementar catálogo/productos, admin CRUD, checkout, o **actualizar Next.js de ^15.2.0 a ^16.x**.

---

## Sesión 2026-06-29

### Tareas en curso
- Actualizar Next.js a ^16.x en `apps/web` y `apps/admin`.
- Verificar builds, typecheck, lint y tests tras el upgrade.

### Decisiones tomadas
- Se actualizó Next.js de `^15.2.0` a `^16.2.9` en ambas aplicaciones Next.js.
- No fue necesario actualizar React ni @types/react (ya estaban en versiones compatibles).
- Los tests de `apps/api` requieren que Docker/PostgreSQL esté corriendo; una vez levantado, pasan correctamente.

### Registro de cambios
- [17:30] Actualizado `next` a `^16.2.9` en `apps/web/package.json` y `apps/admin/package.json`.
- [17:35] Primera verificación completa falló en tests de API por Docker no iniciado.
- [17:40] Docker iniciado y contenedores `ecommerce-postgres` y `ecommerce-redis` corriendo en puertos 5433 y 6379.
- [17:45] Verificación completa exitosa: `pnpm turbo run build typecheck lint test --force` -> 19/19 tareas exitosas, 3 tests pasando.
- [17:50] Next.js 16.2.9 confirmado y funcionando en `apps/web` y `apps/admin`.
- [18:00] Inicio implementación catálogo según `SPEC-002`:
  - Creados DTOs para categorías, productos y variantes en `apps/api/src/admin-catalog/dto/`.
  - Creado DTO de query para listado público en `apps/api/src/catalog/dto/`.
  - Creados servicios: `CatalogService`, `AdminCategoryService`, `AdminProductService`, `AdminProductVariantService`.
  - Creados controladores: `CatalogController` (público), `AdminCategoryController`, `AdminProductController`, `AdminProductVariantController` (protegidos con JWT + Roles).
  - Creado decorador `@Roles()` y actualizado `RolesGuard`.
  - Registrados módulos en `AppModule`.
  - Creado seed de catálogo de ejemplo en `src/database/seeds/seed-catalog.ts`.
  - Agregados scripts `seed:roles` y `seed:catalog` a `apps/api/package.json`.
  - Creados tests e2e para catálogo (`test/catalog.e2e-spec.ts`).
- [18:30] Verificación completa exitosa tras implementación de catálogo: `pnpm turbo run build typecheck lint test --force` -> 19/19 tareas exitosas, 8 tests pasando.
- [18:35] Inicio implementación carrito según `SPEC-003`:
  - Creados DTOs: `AddCartItemDto`, `UpdateCartItemDto`, `AnonymousCartItemDto`, `MergeCartDto`.
  - Creados `CartService` y `CartController` con endpoints:
    - `GET /cart`
    - `POST /cart/items`
    - `PATCH /cart/items/:itemId`
    - `DELETE /cart/items/:itemId`
    - `POST /cart/merge`
  - Registrado `CartModule` en `AppModule`.
  - Creado helper de test `test/utils/test-auth.ts`.
  - Creados tests e2e para carrito (`test/cart.e2e-spec.ts`).
- [19:00] Verificación completa exitosa tras implementación de carrito: `pnpm turbo run build typecheck lint test --force` -> 19/19 tareas exitosas, 12 tests pasando.
- [19:05] Inicio implementación checkout según `SPEC-004`:
  - Creados DTOs: `InitCheckoutDto`, `ApplyCouponDto`, `ConfirmPaymentDto`.
  - Creada interfaz `PaymentProvider` + `PlaceholderProvider`.
  - Creados `CheckoutService` y `CheckoutController` con endpoints:
    - `POST /checkout/init`
    - `POST /checkout/:orderId/apply-coupon`
    - `POST /checkout/:orderId/confirm-payment`
  - Creado `WebhookController` en `POST /webhooks/payments/:provider`.
  - Registrado `CheckoutModule` en `AppModule`.
  - Creados tests e2e para checkout (`test/checkout.e2e-spec.ts`).
- [19:35] Verificación completa exitosa tras implementación de checkout: `pnpm turbo run build typecheck lint test --force` -> 19/19 tareas exitosas, 15 tests pasando.
- [19:40] Inicio implementación stock configurable según `SPEC-005`:
  - Actualizado `prisma/schema.prisma` con modelo `StockReservation` y enum `StockReservationStatus`.
  - Creada y aplicada migración `20260629180004_add_stock_reservations`.
  - Creada interfaz `StockPolicy` + implementaciones `MadeToOrderStockPolicy` y `TrackedStockPolicy`.
  - Creado `StockPolicyResolver` y `StockModule`.
  - Integrado stock en `CartService` (validación de disponibilidad) y `CheckoutService` (reserva en init, commit en confirmación).
  - Creados `AdminStockService` y `AdminStockController` con endpoints:
    - `PATCH /admin/variants/:id/stock-mode`
    - `PATCH /admin/variants/:id/inventory`
    - `GET /admin/inventory`
  - Auditoría de cambios de modo e inventario en `AuditLog`.
  - Creados tests e2e para stock (`test/stock.e2e-spec.ts`).
  - Ajustado `jest.config.js` con `testTimeout: 15_000` para estabilidad de tests e2e.
- [20:15] Verificación completa final: `pnpm turbo run build typecheck lint test --force` -> 19/19 tareas exitosas, 17 tests pasando.
- [20:20] Plan definido para frontends transversales:
  - Crear specs `SPEC-006` (Theming y Configuración Transversal) y `SPEC-007` (Administración de Cupones).
  - Implementar backend de configuración y CRUD de cupones.
  - Generar `@ecommerce/api-client` desde OpenAPI.
  - Construir `apps/web` y `apps/admin` transversales, consumiendo config del backend.
- [20:25] Creadas specs `SPEC-006` y `SPEC-007`; actualizado `specs/README.md`.
- [20:30] Implementado backend de theming y cupones:
  - Modelo `StoreConfig` + migración.
  - Endpoints `GET/PATCH /store-config`.
  - Módulo `AdminCouponsModule` con CRUD de cupones.
  - Helper `test/utils/test-auth.ts` mejorado con `randomUUID()` y retry ante colisiones.
- [20:45] Verificación completa: `pnpm turbo run build typecheck lint test --force` -> 19/19 tareas exitosas, 21 tests pasando.

---

## Sesión 2026-06-29 (continuación)

### Tareas en curso
- Generar `@ecommerce/api-client` tipado desde OpenAPI.
- Construir storefront transversal en `apps/web` consumiendo `StoreConfig` y catálogo del backend.
- Dejar `apps/admin` transversal para otra sesión.

### Decisiones tomadas
- Se usa `openapi-fetch` en `@ecommerce/api-client` para tipado fuerte con `openapi-typescript`.
- Se configura el plugin `@nestjs/swagger` en `apps/api/nest-cli.json` para inferir `@ApiProperty` desde decoradores de `class-validator`.
- Se crea script `generate:swagger` en `apps/api` para exportar `swagger.json` desde la app compilada.
- Se crean DTOs de respuesta (`StoreConfigResponseDto`, `ProductListResponseDto`, `ProductDetailDto`, etc.) para exponer tipos de respuesta en OpenAPI.
- Se actualiza `@mantine/core` y `@mantine/hooks` a `^9.4.1` en `apps/web`, `apps/admin` y `@ecommerce/ui` para compatibilidad con Next.js 16/React 19.
- En Mantine v9, `Grid.Col` se reemplaza por `GridCol`.
- Se corrige `AdminStockService.updateStockMode` usando `inventory.upsert` para evitar colisión de unique constraint en tests e2e.

### Registro de cambios
- [21:00] Regenerado `@ecommerce/api-client` con tipos reales de respuesta.
- [21:15] Implementadas páginas del storefront:
  - `app/page.tsx`: home con hero y productos destacados.
  - `app/catalogo/page.tsx`: listado de productos.
  - `app/producto/[slug]/page.tsx`: detalle de producto con selector de variante.
  - `app/cart/page.tsx`: carrito anónimo con Zustand + localStorage.
- [21:25] Creados componentes y providers transversales:
  - `ConfigProvider` / `useStoreConfig`: provee config del backend a client components.
  - `ThemeProvider`: aplica colores dinámicos de `StoreConfig` vía `MantineProvider`.
  - `StoreHeader`, `StoreFooter`, `ProductCard`, `AddToCartButton`.
  - `QueryProvider` para TanStack Query.
  - Hooks `useStoreConfigQuery` y `useProductsQuery`.
- [21:35] Resuelto problema de renderizado: `Grid.Col` no existe en Mantine v9; se reemplazó por `GridCol`.
- [21:45] Verificación completa: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando.
- [21:50] Servidor de desarrollo de `apps/web` levantado y confirmado en `http://localhost:3000`.
- [21:55] Agregado a pendientes: construir panel admin transversal (`apps/admin`) con CRUD de productos, categorías, variantes, stock, cupones y edición de `StoreConfig`.
- [22:00] Creado seed de datos demo `src/database/seeds/seed-demo.ts`:
  - Roles ADMIN y CUSTOMER.
  - Usuarios de prueba: `admin@tienda.com / Admin1234` y `customer@tienda.com / Customer1234`.
  - StoreConfig demo activa con branding completo.
  - StoreSettings por defecto.
  - Categorías: Remeras, Gorras, Buzos.
  - 4 productos con variantes, imágenes placeholder y stock tracked/inventory donde corresponde.
  - 2 cupones de prueba.
  - 1 design template.
  - Script: `pnpm --filter @ecommerce/api seed:demo`.
- [22:10] Corregidos errores de hidratación en `apps/web` creando componentes client `LinkButton` y `LinkAnchor` para combinar Next.js Link con Mantine Button/Anchor.
- [22:15] Verificación completa: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando.
- [22:20] Inicio construcción panel admin transversal (`apps/admin`):
  - Agregados DTOs de respuesta para admin catalog, stock, cupones y auth.
  - Decorados controllers con `@ApiOkResponse` para tipar respuestas en OpenAPI.
  - Regenerado `@ecommerce/api-client` con tipos admin incluidos.
- [22:30] Implementado panel admin transversal:
  - Layout con `ConfigProvider`, `ThemeProvider`, `QueryProvider` y `AdminShell` (AppShell + navegación).
  - Login: `LoginForm` con email/contraseña y token JWT en memoria.
  - Páginas:
    - `/`: dashboard con accesos.
    - `/products`: listado, alta y toggle activo.
    - `/products/[id]`: edición de producto y CRUD de variantes.
    - `/categories`: CRUD de categorías.
    - `/inventory`: gestión de modo de stock e inventario.
    - `/coupons`: CRUD de cupones.
    - `/store-config`: edición de branding y configuración.
  - Pantalla de login en `/` cuando no hay token; credenciales demo: `admin@tienda.com / Admin1234`.
- [22:45] Verificación completa final: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando.

---

## Sesión 2026-06-29 (continuación II)

### Tareas en curso
- Mejorar UX del panel admin con notificaciones de éxito/error.
- Agregar paginación y búsqueda en listados del admin.
- Mantener pipeline verde.

### Decisiones tomadas
- Se usa `@mantine/notifications` para feedback toast en `apps/admin`.
- Se centraliza helper de notificaciones en `apps/admin/src/lib/notifications.ts`.
- Paginación y búsqueda se implementan del lado del cliente mediante hook reusable `useClientPagination`, evitando cambios de API en esta iteración.
- Se corrige test `cart.e2e-spec.ts` para filtrar variantes activas con producto activo, evitando fallos intermitentes por estado compartido de BD.

### Registro de cambios
- [23:00] Instalado `@mantine/notifications@^9.4.1` en `apps/admin` y agregado `Notifications` provider en `ThemeProvider`.
- [23:05] Creado `apps/admin/src/lib/notifications.ts` con `notifySuccess`, `notifyError` y `getApiErrorMessage`.
- [23:10] Aplicadas notificaciones en todas las mutaciones del admin: productos, variantes, categorías, stock/inventario, cupones, configuración de tienda y login.
- [23:20] Creado hook reusable `apps/admin/src/hooks/use-client-pagination.ts` para paginación y búsqueda local.
- [23:25] Agregadas barra de búsqueda y paginación en `/products`, `/categories`, `/coupons` e `/inventory`.
- [23:30] Corregido `test/cart.e2e-spec.ts`: `productVariant.findFirst` ahora filtra `{ isActive: true, product: { isActive: true } }`.
- [23:35] Verificación completa final: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando.

---

## Sesión 2026-06-29 (continuación III)

### Tareas en curso
- Pulir el storefront (`apps/web`) con autenticación, carrito autenticado, checkout real y subida de imágenes.

### Decisiones tomadas
- Se replica en `apps/web` el patrón de autenticación de `apps/admin`: token JWT en memoria + `localStorage` via Zustand persist.
- Se crea `AddressesModule` en backend para que el checkout pueda enviar `shippingAddressId` y `billingAddressId`.
- Se crean DTOs de respuesta para carrito y checkout para tipar correctamente el API client.
- Se implementa subida local de assets en `apps/api/uploads/` y se sirven estáticamente en `/uploads`.
- Las imágenes de producto se asocian via `POST /admin/products/:id/images`.

### Registro de cambios
- [00:00] Implementada autenticación en storefront:
  - `apps/web/src/lib/api.ts`: middleware de auth con `setAuthToken`/`getAuthToken`/`clearAuthToken`.
  - `apps/web/src/store/auth-store.ts`: Zustand persist con rehydratación segura para SSR.
  - Páginas `/login`, `/register` y `/account`.
  - `StoreHeader` muestra login/logout y acceso a cuenta.
- [00:10] Sincronización de carrito anónimo al iniciar sesión:
  - Tras login/register, si hay items en el carrito local, se envían a `/cart/merge` y se limpia el store local.
- [00:20] Creado `AddressesModule` en backend:
  - Modelo `Address` ya existía en Prisma.
  - Endpoints `POST /addresses`, `GET /addresses`, `DELETE /addresses/:id`.
  - Registrado en `AppModule`.
- [00:30] Implementado checkout real en storefront:
  - Página `/checkout` con flujo de dos pasos.
  - Creación/Selección de dirección de envío.
  - Iniciar orden con `POST /checkout/init`.
  - Aplicar cupón con `POST /checkout/:orderId/apply-coupon`.
  - Confirmar pago con `POST /checkout/:orderId/confirm-payment`.
- [00:40] Creados response DTOs para carrito (`CartResponseDto`) y checkout (`CheckoutSummaryResponseDto`, `ApplyCouponResponseDto`, `ConfirmPaymentResponseDto`).
- [00:45] Decorados `CartController` y `CheckoutController` con `@ApiOkResponse`/`@ApiCreatedResponse`.
- [00:50] Regenerado `@ecommerce/api-client` con tipos de carrito, checkout, direcciones y assets.
- [00:55] Implementada subida de imágenes/assets:
  - Backend: `AssetsModule` con `POST /admin/assets/upload` usando Multer, guardando en disco y creando registro `Asset`.
  - Backend: `POST /admin/products/:id/images` para asociar asset a producto.
  - Frontend admin: input file en `/products/[id]` para subir y asociar imagen.
- [01:00] Verificación completa final: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando.
- [01:05] Nota técnica: durante el build de `apps/web` aparece `ReferenceError: location is not defined` en SSR, pero no bloquea el build. Se agregó `AuthRehydrator` para manejar hidratación segura.

---

## Sesión 2026-06-29 (continuación IV)

### Tareas en curso
- Pulir storefront: imágenes reales, carrito autenticado, historial de pedidos.
- Levantar servidores locales para verificar visualmente.

### Decisiones tomadas
- El catálogo público devuelve `url` en cada imagen, soportando tanto URLs externas (placeholders) como archivos locales subidos por el admin.
- El carrito del backend ahora incluye `productVariant` con datos del producto para mostrar nombres en el storefront.
- `AddToCartButton` agrega al backend si el usuario está autenticado, o al carrito local si no.
- Se crea `OrdersModule` con endpoints `GET /orders` y `GET /orders/:id` para el historial de pedidos.

### Registro de cambios
- [01:10] Catálogo y detalle de producto muestran imágenes reales usando `product.images[0].url`.
- [01:15] `CatalogService` y `AdminProductService` construyen `url` de imagen soportando objectKeys absolutos (placeholders) y locales (`/uploads/:key`).
- [01:20] Mejorado carrito autenticado:
  - `CartService.getCart` incluye `productVariant.product`.
  - `CartResponseDto` expone `productVariant` con nombre y SKU.
  - `AddToCartButton` postea a `/cart/items` cuando hay sesión.
  - `/cart` muestra carrito del backend con nombres de productos, permitiendo actualizar cantidad y eliminar.
- [01:25] Creado `OrdersModule` en backend y páginas `/orders` e `/orders/[id]` en el storefront.
- [01:30] `StoreHeader` agregó enlace a "Mis pedidos".
- [01:35] Verificación completa: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando.
- [01:40] Actualizado `seed-demo.ts` para limpiar datos de catálogo previos y garantizar que el storefront muestre solo productos demo con imágenes.
- [01:45] Servidores de desarrollo levantados y verificados:
  - API: http://localhost:4000 (health OK)
  - Storefront: http://localhost:3000
  - Admin: http://localhost:3001
- [01:50] Ajustados parámetros `limit` del catálogo a string para compatibilidad con `openapi-fetch`.
- [01:55] Reiniciados servidores de desarrollo tras ajustes; todos los endpoints verificados.
- [02:00] Corregido test de carrito (`cart.e2e-spec.ts`) para limpiar `StockReservation` previas antes de asegurar stock, eliminando intermitencia por estado compartido.
- [02:05] Eliminado warning `ReferenceError: location is not defined` durante el build SSR de `apps/web`:
  - Se movieron redirecciones `router.push('/login')` de render a `useEffect` en `/account`, `/orders` y `/orders/[id]`.
  - Se agregó flag `isHydrated` al `auth-store` para evitar redirigir antes de la rehidratación del token.
  - Se añadió config por defecto en `layout.tsx` para soportar build sin API disponible.
- [02:10] Implementado refresh token automático en el cliente del storefront:
  - `packages/api-client/src/client.ts` acepta `getRefreshToken`, `onTokenRefreshed` y `onRefreshFailed`.
  - El middleware `onResponse` intercepta HTTP 401, llama a `POST /auth/refresh` y reintenta la petición original con el nuevo `accessToken`.
  - `apps/web/src/lib/api.ts` conecta los callbacks con `useAuthStore.getState()`.
  - `auth-store.ts` expone `setTokens(accessToken, refreshToken)` para actualizar tokens sin perder el email.
- [02:15] Verificación completa: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando, sin warnings de `location`.
- [02:20] Bugfix en autenticación del storefront: se eliminó la variable global `authToken` y el middleware ahora lee `accessToken`/`refreshToken` directamente desde `useAuthStore.getState()`, evitando desincronización entre el store y las requests.
- [02:25] Añadido manejo de errores en `/` y `/catalogo` para que el build estático no falle cuando la API no esté disponible.
- [02:30] Verificación completa tras bugfix: `pnpm turbo run build typecheck lint test --force` -> 20/20 tareas exitosas, 21 tests pasando.
- [02:35] Revisión de cambios visuales aplicados por MCP/Stitch (README.md en `apps/web`):
  - Se identificó que el rediseño NÖVA agregó campos visuales `remember` en login y `terms`/`newsletter` en register.
  - Estos campos se enviaban en el body a `/auth/login` y `/auth/register`, causando errores `400 property ... should not exist`.
  - Se ajustaron `login/page.tsx` y `register/page.tsx` para mantener los checkboxes visuales pero enviar únicamente los campos esperados por el backend.
  - Se verificó que el resto de formularios (checkout, direcciones, carrito) mantengan concordancia con los DTOs del backend.
- [02:40] Verificación de `apps/web`: `typecheck` y `lint` exitosos.
- [02:45] Implementado envío de emails y suscripción a newsletter:
  - Instalado `nodemailer` en `apps/api`.
  - Creado modelo `NewsletterSubscriber` en Prisma y aplicada migración `add_newsletter_subscriber`.
  - Creado `EmailModule` con `EmailService` genérico basado en variables SMTP; si no hay credenciales, loguea el email en desarrollo.
  - Creado `NewsletterModule` con `POST /newsletter/subscribe` que guarda el email, evita duplicados activos y reactiva suscripciones previas, enviando email de confirmación.
  - Registrados `EmailModule` y `NewsletterModule` en `AppModule`.
  - Actualizado `apps/api/.env.example` con variables SMTP.
  - Actualizado `apps/web/src/app/register/page.tsx` para llamar a `/newsletter/subscribe` tras registro exitoso si el usuario marcó el checkbox de newsletter.
  - Regenerados `swagger.json` y `@ecommerce/api-client` para tipar el nuevo endpoint.
  - Verificado build de `apps/web` y levantamiento de `apps/api` con el nuevo endpoint mapeado.

---

## Sesión 2026-07-03 — Verificación de email (OTP) y emails transaccionales

### Tareas en curso
- Implementar verificación obligatoria de email antes del checkout.
- Enviar emails transaccionales (bienvenida, verificación, confirmación de orden, pago confirmado).
- Ajustar tests e2e y builds para reflejar el nuevo flujo.

### Decisiones tomadas
- El registro crea cuentas con `emailVerified=false` y envía un OTP de 6 dígitos con 15 minutos de expiración.
- El checkout requiere email verificado mediante `VerifiedEmailGuard`; si no, se devuelve HTTP 403.
- El frontend muestra un banner persistente cuando el usuario autenticado no ha verificado su email.
- Si faltan credenciales SMTP, el servicio loguea el contenido del email en consola para no bloquear desarrollo/tests.
- Los tests e2e que inicializan checkout ahora verifican el email primero usando el código almacenado en `EmailVerificationCode`.
- El test de stock ahora crea su propia variante TRACKED para evitar condiciones de carrera con otros workers sobre datos compartidos.

### Registro de cambios
- [03:00] Modelado Prisma para verificación OTP:
  - Campo `emailVerifiedAt` en `User`.
  - Tabla `EmailVerificationCode` con `code`, `expiresAt` e índice único por usuario activo.
  - Migración `add_email_verification` aplicada.
- [03:05] Implementado `EmailService` con templates base:
  - `sendWelcome`
  - `sendEmailVerification`
  - `sendNewsletterConfirmation`
  - `sendOrderCreated`
  - `sendPaymentConfirmed`
  - Fallback a `jsonTransport` cuando no hay credenciales SMTP.
- [03:10] Añadido flujo de verificación en `AuthModule`:
  - `POST /auth/verify-email` (autenticado) valida OTP y marca `emailVerifiedAt`.
  - `POST /auth/resend-verification` (autenticado) genera nuevo código e invalida anteriores.
  - `JwtStrategy` expone `emailVerified` en el payload/request.
  - `AuthUserDto` incluye `emailVerified`.
- [03:15] Creado `VerifiedEmailGuard` y aplicado a `CheckoutController`.
- [03:20] Integrado envío de emails en checkout:
  - `CheckoutService.initiateCheckout` envía `sendOrderCreated`.
  - `CheckoutService.confirmPayment` envía `sendPaymentConfirmed`.
- [03:25] Actualizado frontend:
  - `auth-store.ts` persiste y expone `emailVerified` + `setEmailVerified`.
  - Creada página `/verify-email` con `PinInput`, reenvío de código y redirección post-verificación.
  - Creado `EmailVerificationBanner` mostrado en todas las páginas cuando aplica.
  - `register/page.tsx` redirige a `/verify-email` tras registro exitoso.
  - `checkout/page.tsx` bloquea el flujo si `emailVerified` es false.
- [03:30] Regenerados `swagger.json` y `@ecommerce/api-client` con endpoints y DTOs de verificación.
- [03:35] Corregido error de build SSR en `/verify-email` envolviendo `useSearchParams` en `<Suspense>`.
- [03:40] Ajustados tests e2e:
  - `test/utils/test-auth.ts`: `createVerifiedUserAndGetToken` y `verifyUserEmail`.
  - `checkout.e2e-spec.ts` y `stock.e2e-spec.ts` usan usuarios con email verificado.
  - `stock.e2e-spec.ts` crea su propia variante TRACKED en lugar de reutilizar `findFirst`.
- [03:45] Verificación completa:
  - `pnpm --filter @ecommerce/api test` → 8/8 suites, 21 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.

---

## Mejoras a futuro

Funcionalidades identificadas para próximas sesiones, en orden de impacto/técnica:

1. **Módulo de personalización de camisetas (en curso)**
   - Soporte para texto y clipart en el editor.
   - Generación de preview/mockup del diseño.
   - Panel admin para moderar diseños (aprobar/rechazar con notas).
   - Tests e2e del flujo completo de personalización.

2. **Gestión de imágenes en el panel admin**
   - Endpoint `DELETE /admin/products/:id/images/:imageId` para eliminar imágenes.
   - Posibilidad de reordenar imágenes (`sortOrder`) y marcar una como primaria.
   - Previsualización y carga progresiva en el storefront.

3. **Paginación server-side en listados admin**
   - Agregar `page`/`limit`/`search` a los endpoints de admin (`/admin/products`, `/admin/categories`, `/admin/coupons`, `/admin/inventory`).
   - Reemplazar `useClientPagination` por paginación real para soportar catálogos grandes.

4. **Refresh token automático en `apps/admin`**
   - Replicar el mecanismo de refresh implementado en `apps/web` para el panel admin.
   - Unificar lógica si ambas apps terminan compartiendo el mismo flujo de auth.

5. **Observabilidad y robustez**
   - Resolver el warning/leak de worker de Jest al finalizar los tests e2e (`--detectOpenHandles`).
   - Agregar rate limiting en auth y endpoints públicos.
   - Health check de dependencias (DB, Redis) en `/health`.

6. **Pasarela de pago real (base implementada, en pausa)**
   - Stripe Checkout ya integrado con sesión redirect y webhook.
   - Falta configurar credenciales, URLs de éxito/cancel y probar flujo end-to-end.

---

## Sesión 2026-07-06 — Checkboxes de autenticación funcionales

### Tareas en curso
- Hacer funcional el checkbox "Recordarme" en login del storefront.
- Persistir el consentimiento de términos desde el registro del storefront.

### Decisiones tomadas
- "Recordarme" controla si `auth-store` persiste tokens en `localStorage` (true) o solo en memoria (false). Si es false, la sesión se pierde al recargar la página.
- El consentimiento de términos se almacena en `User.acceptedTermsAt` y `User.acceptedTermsVersion`, con versión actual `"1.0"`.
- `RegisterDto` ahora requiere `acceptedTerms: boolean`.

### Registro de cambios
- [04:00] Implementado "Recordarme":
  - `auth-store.ts` agrega `rememberMe` y `setRememberMe`.
  - `safeStorage` condicional: no rehidrata ni guarda en `localStorage` si `rememberMe` es false.
  - `login/page.tsx` pasa `form.values.remember` a `setAuth`.
- [04:10] Persistido consentimiento de términos:
  - Migración Prisma `add_terms_consent` con `acceptedTermsAt` y `acceptedTermsVersion` en `User`.
  - `RegisterDto` incluye `acceptedTerms` requerido.
  - `AuthService.register` guarda timestamp y versión cuando `acceptedTerms` es true.
  - `register/page.tsx` envía `acceptedTerms: terms`.
- [04:20] Regenerados `swagger.json` y `@ecommerce/api-client` para reflejar el nuevo campo.
- [04:25] Actualizados tests e2e para enviar `acceptedTerms: true` en `/auth/register`.
- [04:30] Verificación completa:
  - `pnpm --filter @ecommerce/api test` → 8/8 suites, 21 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.

---

## Sesión 2026-07-06 (continuación) — Catálogo, Stripe y módulo de personalización

### Tareas en curso
- Agregar filtros y ordenamiento al catálogo del storefront.
- Integrar una pasarela de pago real (Stripe) en el checkout.
- Comenzar el módulo de personalización de camisetas.

### Decisiones tomadas
- Los filtros de catálogo se sincronizan con URL query params (`category`, `sizes`, `colors`, `minPrice`, `maxPrice`, `inStock`, `search`, `sort`).
- Stripe Checkout se implementó con sesión redirect y webhook; si no hay credenciales, el servicio se desactiva y devuelve error controlado.
- Se descartó continuar con la pasarela de pago por priorización del usuario; se dejó la base implementada.
- El módulo de personalización usa los modelos existentes `DesignTemplate`, `CustomDesign` y `CustomDesignElement`.
- El editor de personalización usa `react-konva` con carga dinámica para evitar problemas de SSR.
- Se limitó `maxWorkers: 2` en `apps/api/jest.config.js` para reducir intermitencias por memoria.

### Registro de cambios
- [05:00] Filtros de catálogo:
  - `ListProductsQueryDto` ampliado con `sizes`, `colors`, `garmentType`, `minPrice`, `maxPrice`, `inStock` y `search`.
  - `CatalogService.findProducts` aplica filtros combinados y ordenamiento.
  - `/catalogo` ahora es Server Component con `searchParams`.
  - `CatalogFilters` actualiza la URL y muestra filtros activos, categorías, tallas, colores, rango de precio y búsqueda.
  - Regenerados `swagger.json` y `@ecommerce/api-client`.
- [05:30] Integración Stripe (base):
  - Instalado `stripe` en `apps/api`.
  - Creado `PaymentModule`, `PaymentService` y `PaymentController`.
  - Endpoints `POST /payments/create-checkout-session/:orderId` y `POST /payments/webhook`.
  - `CheckoutService` expone `markOrderPaid` para ser usado por el webhook.
  - `main.ts` habilita `rawBody` para verificación de firma del webhook.
  - Actualizado `apps/api/.env.example` con variables Stripe.
  - Frontend checkout redirige a Stripe tras crear la orden.
- [06:00] Inicio del módulo de personalización:
  - Creada spec `SPEC-007-customizer.md`.
  - Creados `DesignTemplatesModule` y `CustomDesignsModule` en `apps/api`.
  - Endpoints: `GET /design-templates`, `GET /design-templates/:id`, `POST /custom-designs`, `GET /custom-designs`, `GET /custom-designs/:id`, `PATCH /custom-designs/:id`, `POST /custom-designs/:id/submit`, `POST /custom-designs/:id/add-to-cart`, `GET /custom-designs/admin/all`, `PATCH /custom-designs/admin/:id/status`.
  - Endpoint `POST /assets/upload-custom` para que usuarios suban imágenes de personalización.
  - Página `/personalizar` lista plantillas.
  - Página `/personalizar/[templateId]` con editor Konva: subir imagen, mover/escalar/rotar, guardar y agregar al carrito.
  - Regenerados `swagger.json` y `@ecommerce/api-client`.
- [06:30] Verificación:
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.
  - Tests e2e pasan con `maxWorkers: 2`, aunque ocasionalmente hay intermitencia en `checkout` por estado compartido de DB.
- [07:00] Editor de personalización avanzado:
  - Migración `add_custom_design_color_size_and_font` con `color`, `size`, `fontSize` y `fill`.
  - `CustomDesignElementDto` soporta `fontSize` y `fill`.
  - `CustomDesignsService` almacena color/talla y mapea nuevas propiedades de elementos.
  - Creados `CustomDesignResponseDto` y `CustomDesignElementResponseDto` para documentar respuestas.
  - Editor refactorizado para manejar múltiples elementos: imágenes subidas, texto y cliparts (⭐/❤️).
  - Panel lateral: agregar texto, cliparts, subir imágenes, seleccionar elemento, escalar, rotar, cambiar orden de capas y eliminar.
  - Guardar diseño genera un preview con `stage.toDataURL()`, lo sube a `/assets/upload-custom` y persiste `previewImageUrl`.
- [07:30] Verificación:
  - `pnpm --filter @ecommerce/api test` → 8/8 suites, 21 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.
- [08:00] Panel admin de diseños personalizados:
  - Nueva ruta `/custom-designs` en `apps/admin` con tabla, filtro por estado, preview y acciones de aprobar/rechazar.
  - Agregado ítem y card de acceso en el admin shell.
- [08:30] Tests e2e de personalización:
  - `test/custom-designs.e2e-spec.ts` cubre creación, actualización, submit, aprobación por admin y add-to-cart.
  - Helper `getAdminToken` en `test/utils/test-auth.ts` para autenticar al admin de seed.
- [09:00] Verificación:
  - `pnpm --filter @ecommerce/api test` → 9/9 suites, 23 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
- [09:30] Panel de administración de productos:
  - Backend: endpoints `DELETE /admin/products/{id}/images/{imageId}` y `PATCH /admin/products/{id}/images/reorder`.
  - Backend: paginación server-side y búsqueda en `GET /admin/products`.
  - Frontend admin: en `/products/[id]` se puede eliminar y reordenar imágenes (arriba/abajo).
  - Frontend admin: en `/products` se usa paginación y búsqueda server-side.
  - Nuevos DTOs y regeneración de `api-types`.
- [10:00] Tests e2e de admin catalog:
  - `test/admin-catalog.e2e-spec.ts` valida add/reorder/remove de imágenes.
- [10:30] Verificación:
  - `pnpm --filter @ecommerce/api test` → 10/10 suites, 24 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
- [11:00] Refresh token automático en admin:
  - Nuevo `apps/admin/src/lib/auth.ts` para guardar `admin_access_token` y `admin_refresh_token` en `localStorage`.
  - `apps/admin/src/lib/api.ts` configura `createApiClient` con `getRefreshToken`, `onTokenRefreshed` y `onRefreshFailed`.
  - Middleware de admin agrega el access token actual a cada request.
  - Al recibir 401, el cliente intenta refresh; si falla, limpia tokens y redirige al login.
  - Login persiste ambos tokens; logout los limpia y redirige.
  - Dashboard y `/custom-designs` ahora usan `getAccessToken()` en lugar de la vieja `admin_token`.
- [11:30] Verificación:
  - `pnpm --filter @ecommerce/api test` → 10/10 suites, 24 tests pasando.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
- [12:00] UI de cuenta de usuario:
  - `/account/addresses`: listado, creación y eliminación de direcciones con estilo NÖVA.
  - `/account/security`: cambio de contraseña funcional con validación de coincidencia.
  - Backend: nuevo endpoint `PATCH /auth/change-password` con revocación de refresh tokens.
- [12:30] Corrección de estabilidad de tests e2e:
  - Reduje los parámetros de `argon2.hash` bajo `NODE_ENV=test` para evitar OOM con varios workers.
  - Test e2e de cambio de contraseña agregado a `test/auth.e2e-spec.ts`.
- [13:00] Verificación:
  - `pnpm --filter @ecommerce/api test` → 10/10 suites, 25 tests pasando.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
- [14:00] Ajustes de UI restantes (Stitch / NÖVA):
  - Theme provider: overrides para `Slider`, `Switch`, `Checkbox`, `Modal`, `Drawer`, `Stepper`, `Pagination`, `FileInput`, `ColorSwatch` y `Anchor` alineados con NÖVA.
  - Checkout: textos en español, métodos de pago genéricos, botón "Confirmar y pagar" en vez de "Pagar con Stripe".
  - Carrito / checkout / orden: el backend ahora devuelve `name` en items (`CartResponseDto` y `OrderResponseDto`) para mostrar nombres de productos y diseños en lugar de IDs.
  - Editor de personalización: mapa de colores más completo, precio total con recargo por elementos y persistencia del `surcharge` al guardar.
- [14:30] Verificación:
  - `pnpm --filter @ecommerce/api test` → 10/10 suites, 25 tests pasando.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

---

- [22:00] Panel de administración de órdenes:
  - Backend: nuevo `AdminOrdersModule` con `GET /admin/orders` (paginado, filtrado por `status`, `paymentStatus` y búsqueda por email), `GET /admin/orders/{id}`, `PATCH /admin/orders/{id}/status` y `PATCH /admin/orders/{id}/payment-status`.
  - DTOs de respuesta tipados (`AdminOrderListResponseDto`, `AdminOrderDetailResponseDto`) y regeneración de `packages/api-client`.
  - Frontend admin: nueva ruta `/orders` con tabla paginada, filtros y modal de detalle/edición de estados.
  - Frontend admin: página `/orders/[id]` para ver una orden directamente.
  - Agregado ítem "Órdenes" en el shell y card en el dashboard.
  - Test e2e `test/admin-orders.e2e-spec.ts` cubre listado, detalle, filtrado y actualización de estados.
- [22:30] Verificación:
  - `pnpm --filter @ecommerce/api test` → 11/11 suites, 26 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.

---

- [23:00] Tracking de envíos en órdenes:
  - Migración `add_order_tracking` con `trackingNumber`, `carrier` y `shippedAt` en el modelo `Order`.
  - Backend: endpoint `PATCH /admin/orders/{id}/tracking`; al pasar a `SHIPPED` se setea `shippedAt`.
  - Frontend admin: campos de tracking en el modal de órdenes y en `/orders/[id]`.
  - Storefront: `OrderResponseDto` expone tracking y `/orders/[id]` muestra número de seguimiento.

- [23:15] Emails de actualización de estado:
  - `EmailService.sendOrderStatusUpdate` envía notificación cuando el admin cambia el estado de una orden, incluyendo tracking si existe.

- [23:30] Panel de usuarios en admin:
  - Backend: `AdminUsersModule` con `GET /admin/users`, `GET /admin/users/{id}` y `PATCH /admin/users/{id}/role`.
  - Frontend admin: rutas `/users` (listado paginado con búsqueda/filtro por rol) y `/users/[id]`; modal para cambiar rol.

- [23:45] Dashboard de métricas:
  - Backend: `AdminDashboardModule` con `GET /admin/dashboard/metrics` (órdenes totales, ingresos, órdenes hoy, pendientes, usuarios, stock bajo, órdenes recientes).
  - Frontend admin: dashboard reemplazado por métricas reales y tabla de órdenes recientes.

- [24:00] Tests e2e nuevos:
  - `test/admin-users.e2e-spec.ts` valida listado, detalle y cambio de rol.
  - `test/admin-dashboard.e2e-spec.ts` valida métricas.

- [24:15] Verificación final:
  - `pnpm --filter @ecommerce/api test` → 13/13 suites, 28 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/shared lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/ui lint typecheck build` → exitoso.

- [00:30] Cambio de estilos en admin (inicio):
  - Creado design system "Admin NÖVA B&W Minimal" en Stitch y aplicado/refinadas las pantallas del admin (login, dashboard, productos, editar producto, categorías, stock, cupones, órdenes, detalle de orden, usuarios, diseños, configuración, detalle de usuario).
  - Actualizado `apps/admin/src/providers/theme-provider.tsx` con paleta blanco y negro, tipografía Inter, botones con mayúsculas/tracking, badges outlined rectangulares, inputs con bordes finos.
  - Actualizado `apps/admin/src/components/admin-shell.tsx`: header y sidebar blancos con bordes `#E5E5E5`, navegación activa con fondo negro y texto blanco, área principal en `#FAFAFA` y contenido en tarjeta blanca.
  - Actualizado `apps/admin/src/components/login-form.tsx`: login centrado en una tarjeta blanca con bordes finos.
- [01:00] Aplicación de estilos B&W a todas las páginas del admin:
  - Dashboard, Productos, Editar producto, Categorías, Stock, Cupones, Órdenes, Detalle de orden, Usuarios, Detalle de usuario, Diseños personalizados, Configuración.
  - Todas las tablas ahora usan `withTableBorder`, `striped`, `highlightOnHover`.
  - Los botones de acción pasaron a `variant="outline"` (negro o rojo).
  - Cada sección de contenido se envolvió en `Paper` para mantener la estética de tarjetas blancas con borde fino.
- [01:15] Verificación:
  - `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

---

- [02:00] Aplicación de design system desde Stitch:
  - Proyecto `Admin NÖVA E-commerce Manager` en Stitch.
  - Se aplicó el design system `NÖVA Admin` a las 9 pantallas del admin: Configuración, Usuarios, Categorías, Detalle de Orden, Diseños Personalizados, Login, Productos, Editar Producto y Cupones.
  - Todas las pantallas quedaron en estado `COMPLETE` tras el rediseño.

---

- [02:30] Implementación de tareas pendientes del admin:
  - **Design system en código**: actualizado `theme-provider.tsx` con tokens de Stitch (surface, primary, typography); `admin-shell.tsx` ahora tiene link a Dashboard en el título y nav item "Dashboard".
  - **Ruta `/dashboard`**: creada con `DashboardView` compartido; la raíz `/` lo reutiliza.
  - **Estados empty/loading unificados**: creados `EmptyState` y `LoadingState` y aplicados en todas las páginas admin.
  - **Modales de confirmación**: en `/orders` y `/orders/[id]` se pide confirmación antes de cambiar a `CANCELLED` o `REFUNDED`.
  - **Responsive sidebar**: el `AppShell` ya colapsa la navbar en mobile con el burger toggle; se marcó como verificado.
  - **Edición en `/orders/[id]`**: ahora permite cambiar estado, estado de pago y tracking directamente desde la página de detalle.
  - **Historial en `/users/[id]`**: muestra las órdenes del usuario buscando por email.
  - **Gráficos en dashboard**: endpoint `GET /admin/dashboard/trends` (últimos 7 días) + componente `TrendsChart` con `recharts`.
  - **Tests de frontend**: configurado Vitest + React Testing Library en `apps/admin`; tests para `EmptyState`, `LoadingState` y `LoginForm`.
  - **Layout robusto**: `apps/admin/src/app/layout.tsx` ahora tiene fallback a configuración por defecto si la API no está disponible durante el build estático.
  - Regenerados `swagger.json` y `@ecommerce/api-client`.
- [03:00] Barrido de verificación:
  - `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso (6 tests pasando).
  - `pnpm --filter @ecommerce/api lint typecheck test` → 13/13 suites, 28 tests pasando.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.

---

- [04:00] Resolución de mejoras pendientes de API y Web (alta y media prioridad):
  - **API**:
    - Agregados tests e2e para `/admin/dashboard/trends` y flujo de tracking de órdenes.
    - Aislamiento de tests e2e con `maxWorkers: 1`.
    - Creado endpoint `GET /admin/users/{id}/orders` y DTOs.
    - Normalización de fechas en DTOs de admin con `@Transform`.
    - Regenerados `swagger.json` y `@ecommerce/api-client`.
  - **Web**:
    - Mejorada `/orders/[id]` con loading, mensaje para no autenticado, link al carrier y manejo de error.
    - Creados componentes `LoadingState`, `EmptyState` y `ErrorState`.
    - Unificados empty/loading en `/orders` y `account/addresses`.
    - Agregados `error.tsx` en `/orders`, `/producto/[slug]` y `/personalizar/[templateId]`.
    - Configurado Vitest + RTL en `apps/web`; 7 tests iniciales pasando.
  - **Admin**:
    - Actualizado `/users/[id]` para consumir el nuevo endpoint de órdenes por usuario.
- [04:30] Barrido de verificación:
  - `pnpm --filter @ecommerce/api lint typecheck test` → 13/13 suites, 29 tests pasando.
  - `pnpm --filter @ecommerce/web lint typecheck build test` → exitoso (7 tests pasando).
  - `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso (6 tests pasando).
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.
  - Actualizado `PENDIENTES.md` con tareas resueltas y pendientes de baja prioridad.

---

- [05:00] Resolución de tareas de baja prioridad (sin tocar la pasarela de pagos):
  - **API**:
    - Rate limiting con `@nestjs/throttler`: 30 req/min, desactivado en tests, omite `/checkout`, `/webhooks` y `/payments`.
  - **Web**:
    - Centralizada moneda por defecto en `@ecommerce/shared` (`DEFAULT_CURRENCY_CODE = 'PYG'`) y aplicada en web, admin, API y seed.
    - Metadatos dinámicos por producto en `/producto/[slug]` (título, descripción, OpenGraph).
    - Ampliados tests de frontend en web (9 tests).
  - **Shared**:
    - Agregada constante `DEFAULT_CURRENCY_CODE` y rebuild del paquete.
- [05:30] Barrido de verificación:
  - `pnpm --filter @ecommerce/shared lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/api lint typecheck test` → 13/13 suites, 29 tests pasando.
  - `pnpm --filter @ecommerce/web lint typecheck build test` → exitoso (9 tests pasando).
  - `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso (6 tests pasando).
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.
  - Actualizado `PENDIENTES.md` con tareas resueltas y remanentes de pulido.

---

- [06:00] Cierre de sesión:
  - Se resolvieron tareas de alta, media y baja prioridad de `apps/api` y `apps/web` sin modificar la pasarela de pagos.
  - Estado final verificado: shared, admin, api y web pasan lint, typecheck, build y tests.

---

- [06:30] Documentación del modelo ER:
  - Creado `docs/ER_MODEL.md` con descripción de entidades, relaciones, enums y notas.
  - Creado `docs/er-diagram.puml` con la fuente del diagrama.
  - Generado `docs/er-diagram.png` desde el schema de Prisma.
  - Agregado `docs/generate_er.py` para regenerar la imagen con PlantUML.

---

## Cierre de sesión 2026-07-08

- Se actualizó `PENDIENTES.md` marcando la documentación del modelo ER como resuelta.
- Quedan pendientes de baja prioridad: reducción de warnings en dev (API), revisión de responsive/accesibilidad en web y ampliación de tests de frontend.
- Estado final verificado: shared, api, admin y web pasan lint, typecheck, build y tests.
- Servidor no levantado; solo se generó documentación y se actualizaron bitácoras.

---

## Sesión 2026-07-11 — Agregar stock desde admin y reflejar en storefront

### Tareas en curso
- Permitir agregar stock directamente desde el panel de admin.
- Reflejar la disponibilidad de stock en el storefront (catálogo y detalle de producto).

### Decisiones tomadas
- Se agregó el endpoint `POST /admin/variants/{id}/add-stock` que incrementa el inventario de una variante `TRACKED` y registra la acción en `AuditLog`.
- Se mantiene el endpoint anterior `PATCH /admin/variants/{id}/inventory` para ajustes absolutos, pero la UI de admin ahora usa el flujo de agregar stock.
- El catálogo público ahora expone `quantity`, `reservedQuantity`, `availableQuantity` e `inStock` en cada variante.
- El storefront muestra estado de stock por variante, deshabilita la compra cuando no hay stock y ajusta el máximo de cantidad según disponibilidad.
- La tarjeta de producto en catálogo muestra badge "Agotado" cuando todas las variantes son `TRACKED` y están sin stock.

### Registro de cambios
- [07:00] Backend:
  - Creado `AddStockDto` y endpoint `POST /admin/variants/{id}/add-stock` en `AdminStockController`.
  - Implementado `AdminStockService.addStock` con validación de modo `TRACKED`, `inventory.upsert` con `increment` y auditoría `ADD_STOCK`.
  - Ampliado `ProductVariantDto` y `CatalogService` para exponer datos de inventario en el catálogo público.
- [07:30] Frontend admin:
  - Actualizada `/inventory` para mostrar botón "Agregar stock" por variante.
  - Modal de agregar stock muestra stock actual/reservado y permite ingresar cantidad a sumar.
- [08:00] Frontend storefront:
  - `AddToCartButton` muestra badge de disponibilidad, deshabilita botón/cantidad sin stock y limita cantidad al stock disponible.
  - `ProductCard` muestra badge "Agotado" cuando aplica.
- [08:30] Regenerados `swagger.json` y `@ecommerce/api-client`.
- [09:00] Tests e2e:
  - Agregados tests en `test/stock.e2e-spec.ts` para agregar stock desde admin, reflejo en catálogo y carrito, y rechazo en variantes no tracked.
  - Tests: 13/13 suites, 31 tests pasando.
- [09:15] Verificación:
  - `pnpm --filter @ecommerce/api lint typecheck test` → exitoso (31 tests).
  - `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso (6 tests).
  - `pnpm --filter @ecommerce/web lint typecheck build test` → exitoso (9 tests).
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.

---

## Sesión 2026-07-11 — Control de storefront y moderación de diseños

### Tareas en curso
- Darle al panel de admin control directo sobre el storefront.
- Mejorar la moderación de diseños personalizados con motivo de rechazo y notificación por email.

### Decisiones tomadas
- Se agregaron campos de control a `StoreConfig`: `maintenanceMode`, `maintenanceMessage`, `enableCustomDesigns`, `enableNewsletter`, `enableCatalogFilters`.
- El storefront lee esos flags y reacciona en tiempo real (página de mantenimiento, ocultar links, checkbox de newsletter, filtros de catálogo).
- Se agregaron `rejectionReason`, `reviewedById` y `reviewedAt` al modelo `CustomDesign`.
- El rechazo de diseños ahora exige un motivo y envía email al cliente (aprobado/rechazado).
- El resto de ideas de robustez administrativa quedan registradas como mejoras futuras en `PENDIENTES.md`.

### Registro de cambios
- [10:00] Backend:
  - Migración `add_maintenance_flags_and_design_moderation`.
  - `StoreConfig` ampliado con modo mantenimiento y feature flags; DTOs y servicio actualizados.
  - `CustomDesignsService` ahora registra motivo de rechazo, reviewer y fecha; envía emails vía `EmailService`.
  - Importado `EmailModule` en `CustomDesignsModule`.
- [10:45] Frontend admin:
  - `/store-config` ahora tiene switches para mantenimiento, personalizador, newsletter y filtros de catálogo.
  - `/custom-designs` muestra el motivo de rechazo y abre modal con textarea obligatorio al rechazar.
- [11:15] Frontend storefront:
  - `MaintenanceScreen` se muestra cuando `maintenanceMode` está activo.
  - `StoreHeader` oculta "Personalizar" si `enableCustomDesigns` es false.
  - `/register` oculta el checkbox de newsletter si `enableNewsletter` es false.
  - `/catalogo` oculta los filtros si `enableCatalogFilters` es false.
- [11:45] Tests e2e:
  - `test/store-config.e2e-spec.ts`: test de actualización de modo mantenimiento y feature flags.
  - `test/custom-designs.e2e-spec.ts`: test de rechazo con motivo obligatorio y campos de revisión.
  - Tests: 13/13 suites, 33 tests pasando.
- [12:00] Verificación:
  - `pnpm --filter @ecommerce/api run lint typecheck test` → exitoso (33 tests).
  - `pnpm --filter @ecommerce/admin run lint typecheck build test` → exitoso (6 tests).
  - `pnpm --filter @ecommerce/web run lint typecheck build test` → exitoso (9 tests).
  - `pnpm --filter @ecommerce/api-client run generate build` → exitoso.
  - Actualizado `PENDIENTES.md` con mejoras resueltas y futuras.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

---

## Sesión 2026-07-11 (continuación) — Stock con imagen, R2, admins por defecto y modelo ER

### Tareas en curso
- Permitir adjuntar una imagen al agregar stock desde el admin.
- Integrar almacenamiento en Cloudflare R2 con fallback local.
- Dejar usuarios administradores por defecto en los seeds.
- Documentar el modelo entidad-relación del sistema.
- Dejar todas las suites verdes tras los ajustes de dependencias.

### Decisiones tomadas
- `AssetsModule` ahora exporta `AssetsService` para que `AdminCatalogModule` pueda inyectarlo.
- `POST /admin/variants/{id}/add-stock` acepta un archivo `image`; si viene, se sube a R2/local y se vincula como `ProductImage` de la variante.
- El endpoint devuelve el inventario actualizado plano más el asset opcional (`{ ...inventory, asset }`).
- `StorageModule` + `R2StorageService` usan `@aws-sdk/client-s3`; cuando faltan credenciales se usa almacenamiento local.
- Seeds incluyen dos usuarios admin por defecto (`admin@tienda.com` / `Admin1234`, `admin2@tienda.com` / `Admin2345`) y script `seed:admins`.
- Creada documentación ER en `docs/ER_MODEL.md`, `docs/er-diagram.puml` y `docs/er-diagram.png`, con script `docs/generate_er.py`.

### Registro de cambios
- [13:00] Backend:
  - Agregado `exports: [AssetsService]` en `AssetsModule`.
  - Ajustado `AdminStockController.addStock` para retornar `{ ...inventory, asset }`.
  - Verificado `R2StorageService` y `AssetsService.upload` con fallback local.
  - Revisados `seed-demo.ts` y `seed-admins.ts` para crear admins por defecto.
- [13:30] Docs:
  - Generado modelo ER: `docs/ER_MODEL.md`, `docs/er-diagram.puml`, `docs/er-diagram.png`.
- [14:00] Regenerado `@ecommerce/api-client` desde `swagger.json`.
- [14:15] Verificación completa:
  - `pnpm --filter api lint typecheck build test` → 13/13 suites, 33 tests.
  - `pnpm --filter admin lint typecheck build test` → 6 tests.
  - `pnpm --filter web lint typecheck build test` → 9 tests.
  - `pnpm --filter api-client generate build` → exitoso.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

---

## Sesión 2026-07-11 (continuación II) — Gestión de órdenes, auditoría y suspensión de usuarios

### Tareas en curso
- Implementar las mejoras de administración pendientes: gestión de órdenes, auditoría y suspensión de usuarios.

### Decisiones tomadas
- Se amplió el modelo `Order` con `assignedToId`, `adminNotes`, `cancellationReason`, `cancelledAt`, `refundReason` y `refundedAt`.
- Se creó `AuditModule` + `AuditService` + `AuditController` para centralizar el registro y consulta de `AuditLog`.
- `AdminOrdersService` ahora registra auditoría en cada cambio de estado, pago, tracking, asignación, notas, cancelación y reembolso.
- Cancelación y reembolso liberan las reservas de stock activas asociadas a la orden.
- Se agregaron endpoints: `PATCH /admin/orders/{id}/assign`, `/notes`, `/cancel`, `/refund` y `GET /admin/orders/{id}/timeline`.
- Se creó `GET /admin/audit-logs` con filtros por entidad, ID, acción, usuario y rango de fechas.
- Se agregaron `isSuspended`, `suspendedAt` y `suspendedReason` a `User`; login y refresh rechazan cuentas suspendidas.
- Se agregaron `PATCH /admin/users/{id}/suspend` y `/unsuspend` con revocación de tokens.
- El admin muestra el timeline en el detalle de orden, permite asignar operador, editar notas, cancelar/reembolsar con motivo, suspender usuarios y navegar a `/audit-logs`.

### Registro de cambios
- [14:45] Backend:
  - Migraciones `add_order_management_and_user_suspension` y `add_audit_log_user_relation`.
  - Nuevos DTOs y servicios en `admin-orders`, `admin-users` y `audit`.
  - `AuthService.login` y `refresh` validan `isSuspended`.
- [15:15] Tests e2e:
  - `test/admin-orders.e2e-spec.ts`: asignación, notas, cancelación, reembolso, liberación de stock y timeline.
  - `test/admin-users.e2e-spec.ts`: suspensión y reactivación de usuarios.
  - `test/auth.e2e-spec.ts`: login rechaza usuarios suspendidos.
  - Tests: 13/13 suites, 36 tests.
- [15:45] Frontend admin:
  - Actualizada `/orders/[id]` con timeline, asignación, notas y acciones de cancel/reembolso.
  - Actualizada `/users` con acciones de suspender/reactivar.
  - Creada `/audit-logs` con filtros.
  - Agregado ítem "Auditoría" en el shell de navegación.
- [16:00] Regenerado `@ecommerce/api-client` desde `swagger.json`.
- [16:15] Verificación completa:
  - `pnpm --filter api lint typecheck build test` → 13/13 suites, 36 tests.
  - `pnpm --filter admin lint typecheck build test` → 6 tests.
  - `pnpm --filter web lint typecheck build test` → 9 tests.
  - `pnpm --filter api-client generate build` → exitoso.
  - Actualizado `PENDIENTES.md` y `PROGRESO.md`.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

---

## Sesión 2026-07-11 (continuación III) — Reglas avanzadas de cupones

### Tareas en curso
- Ampliar el sistema de cupones con reglas por categoría/producto, monto mínimo, límite por usuario y primera compra.

### Decisiones tomadas
- Se extendió el modelo `Coupon` con `appliesTo`, `categoryId`, `productId`, `minOrderAmount`, `maxUsesPerUser` e `isFirstPurchaseOnly`.
- Se creó el modelo `CouponUsage` para contabilizar usos por usuario y respetar `maxUsesPerUser`.
- La lógica de checkout ahora calcula el subtotal elegible según el alcance del cupón (todo, categoría o producto) y aplica el descuento solo sobre esa porción.
- Se validan monto mínimo, límite por usuario y cupones de primera compra al aplicar.
- El CRUD de cupones en el admin permite configurar todas las reglas y seleccionar categoría/producto.
- Se agregaron tests e2e para cada regla.

### Registro de cambios
- [16:30] Backend:
  - Migración `add_advanced_coupon_rules`.
  - DTOs y servicios de cupones actualizados con validaciones de categoría/producto.
  - `CheckoutService.applyCouponInternal` implementa lógica de elegibilidad y `CouponUsage`.
- [17:00] Frontend admin:
  - Actualizada `/coupons` con campos de alcance, monto mínimo, límite por usuario y primera compra.
- [17:15] Tests e2e:
  - `test/checkout.e2e-spec.ts`: tests para monto mínimo, cupón por categoría, por producto, límite por usuario y primera compra.
  - Tests: 13/13 suites, 41 tests.
- [17:30] Regenerado `@ecommerce/api-client` y actualizado `PENDIENTES.md`.
- [17:45] Verificación completa:
  - `pnpm --filter api lint typecheck build test` → 13/13 suites, 41 tests.
  - `pnpm --filter admin lint typecheck build test` → 6 tests (el build de admin se verificó individualmente tras un crash intermitente de Turbo por presión de memoria).
  - `pnpm --filter web lint typecheck build test` → 9 tests.
  - `pnpm --filter api-client generate build` → exitoso.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

---

## Sesión 2026-07-11 (continuación IV) — Sistema de plantillas del storefront

### Tareas en curso
- Convertir el home del storefront en una plantilla configurable desde el admin.
- Permitir que la misma base de código soporte múltiples disposiciones visuales sin duplicar lógica de negocio.

### Decisiones tomadas
- Se agregaron `template` y `templateConfig` al modelo `StoreConfig`; `template` es un string identificador (ej. `storefront`) y `templateConfig` es un JSON libre para opciones específicas de la plantilla.
- El backend recibe `templateConfig` como string JSON en `PATCH /store-config` y lo parsea antes de guardar; al leerlo se devuelve como objeto.
- Se extrajo el home actual a `apps/web/src/components/templates/storefront-home.tsx`.
- `apps/web/src/app/page.tsx` ahora selecciona la plantilla con un `switch` y pasa `config` + `products` al componente correspondiente.
- `StoreHeader` reacciona a `templateConfig.headerVariant` (`default`, `centered`, `minimal`).
- `ProductCard` acepta `variant` (`default` | `minimal`) controlado por `templateConfig.productCardVariant`.
- Se creó `/templates` en `apps/admin` para elegir la plantilla activa y editar su configuración.
- Por ahora solo existe la plantilla `storefront`; la idea `spa-store` se descartó como literal y quedó documentado cómo agregar nuevas plantillas.
- Se dejó documentado en `PENDIENTES.md` el paso a paso para crear o modificar una plantilla.

### Registro de cambios
- [18:00] Backend:
  - Migración `add_store_template` con `template` y `templateConfig` en `StoreConfig`.
  - DTOs y servicio actualizados para soportar lectura/escritura del template.
- [18:30] Frontend web:
  - Creado `components/templates/storefront-home.tsx` extrayendo el home existente.
  - Actualizado `app/page.tsx` para switchear por `template`.
  - `StoreHeader` y `ProductCard` responden a opciones del `templateConfig`.
  - Actualizado `config-provider.tsx` con tipos `TemplateName` y `TemplateConfig`.
- [19:00] Frontend admin:
  - Creada `app/templates/page.tsx` con selector de plantilla y campos de configuración.
  - Agregado ítem "Plantillas" en `admin-shell.tsx`.
- [19:30] Tests e2e:
  - `test/store-config.e2e-spec.ts`: test de actualización de `template` y `templateConfig`.
  - Tests: 13/13 suites, 42 tests.
- [20:00] Regenerado `@ecommerce/api-client` desde `swagger.json`.
- [20:15] Verificación completa:
  - `pnpm --filter api lint typecheck build test` → 13/13 suites, 42 tests.
  - `pnpm --filter admin lint typecheck build test` → 6 tests.
  - `pnpm --filter web lint typecheck build test` → 9 tests.
  - `pnpm --filter api-client generate build` → exitoso.
  - Actualizado `PENDIENTES.md` con guía para crear/modificar plantillas.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

---

## Sesión 2026-07-11 (continuación V) — Preview de plantilla en el admin

### Tareas en curso
- Agregar una vista previa del storefront dentro del panel `/templates` para ver los cambios de configuración sin salir del admin.

### Decisiones tomadas
- Se usa un `<iframe>` apuntando a `NEXT_PUBLIC_WEB_URL` (por defecto `http://localhost:3000`).
- Al guardar la plantilla se incrementa un `key` que fuerza el recargado del iframe.
- Se agregó también un botón "Recargar" para refrescar manualmente.
- Si `NEXT_PUBLIC_WEB_URL` no está configurado, se muestra una indicación en lugar del iframe.
- El layout de `/templates` se reorganizó en dos columnas: configuración a la izquierda y preview a la derecha (stack en mobile).

### Registro de cambios
- [20:30] Frontend admin:
  - Reorganizada `app/templates/page.tsx` con `Grid` de dos columnas.
  - Agregado iframe de preview con `key` controlado.
  - Agregada variable `NEXT_PUBLIC_WEB_URL` a `.env` y `.env.example`.
- [20:45] Verificación:
  - `pnpm --filter admin lint typecheck build test` → exitoso (6 tests).
  - `pnpm --filter web lint typecheck build` → exitoso.
  - `pnpm --filter api lint typecheck build test` → 13/13 suites, 42 tests.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

---

## Sesión 2026-07-11 (continuación VI) — Páginas estáticas editables

### Tareas en curso
- Permitir crear y editar páginas estáticas (FAQ, términos, políticas) desde el admin.
- Exponerlas públicamente en el storefront y mostrarlas en el footer.

### Decisiones tomadas
- Se creó el modelo `Page` en Prisma con `slug`, `title`, `content`, `metaTitle`, `metaDescription`, `isVisible` y `sortOrder`.
- El backend separa endpoints de admin (`/admin/pages`) y públicos (`/pages`, `/pages/:slug`).
- Las páginas invisibles (`isVisible: false`) no se exponen al público.
- El admin tiene una tabla con paginación local y un modal para crear/editar páginas.
- El storefront renderiza `/pagina/[slug]` con metadatos dinámicos y el footer lista automáticamente las páginas visibles.
- El contenido se renderiza como HTML; se asume que quien edita es de confianza (admin).

### Registro de cambios
- [21:00] Backend:
  - Migración `20260711213058_add_pages`.
  - Módulo `PagesModule` con `PagesController` (público) y `AdminPagesController`.
  - DTOs y servicio `PagesService` con CRUD completo.
- [21:30] Frontend admin:
  - Creada `app/pages/page.tsx` con tabla, búsqueda, paginación y modal de creación/edición.
  - Agregado ítem "Páginas" en `admin-shell.tsx`.
- [22:00] Frontend web:
  - Creada `app/pagina/[slug]/page.tsx` para mostrar páginas estáticas.
  - `StoreFooter` ahora consume `/pages` y muestra links a páginas visibles.
- [22:30] Tests e2e:
  - `test/pages.e2e-spec.ts`: listado público, CRUD admin, validación de páginas invisibles.
  - Tests: 14/14 suites, 45 tests.
- [23:00] Regenerado `@ecommerce/api-client` desde `swagger.json`.
- [23:15] Verificación completa:
  - `pnpm --filter api lint typecheck build test` → 14/14 suites, 45 tests.
  - `pnpm --filter admin lint typecheck build test` → exitoso (6 tests).
  - `pnpm --filter web lint typecheck build test` → exitoso (9 tests).
  - `pnpm --filter api-client generate build` → exitoso.
  - Actualizado `PENDIENTES.md`.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

---

## Sesión 2026-07-11 (continuación VII) — SEO por producto y categoría

### Tareas en curso
- Agregar campos SEO (`metaTitle`, `metaDescription`) a productos y categorías.
- Exponer esos campos en el catálogo público.
- Usarlos en los metadatos de `/producto/[slug]` y `/catalogo`.
- Permitir editarlos desde el admin.

### Decisiones tomadas
- Se agregaron `metaTitle` y `metaDescription` a los modelos `Product` y `Category`.
- Los DTOs de creación/actualización de admin y los DTOs de respuesta del catálogo incluyen los nuevos campos.
- Se agregó endpoint público `GET /catalog/categories/:slug` para obtener metadata de una categoría específica.
- `/producto/[slug]` usa `product.metaTitle`/`product.metaDescription` si existen; si no, fallback al nombre/descripción.
- `/catalogo` ahora tiene `generateMetadata`: si hay `?category=slug`, usa `category.metaTitle`/`metaDescription`; si no, título genérico.
- En el admin, `/products/[id]` y `/categories` tienen campos de SEO en sus formularios.

### Registro de cambios
- [23:30] Backend:
  - Migración `20260711215108_add_seo_fields`.
  - DTOs y servicios de `admin-catalog` y `catalog` actualizados con SEO.
  - Nuevo endpoint `GET /catalog/categories/:slug`.
- [00:00] Frontend web:
  - `app/producto/[slug]/page.tsx`: metadatos usan SEO del producto.
  - `app/catalogo/page.tsx`: `generateMetadata` dinámico según categoría.
- [00:30] Frontend admin:
  - `app/products/[id]/page.tsx`: campos Meta título/Meta descripción.
  - `app/categories/page.tsx`: campos Meta título/Meta descripción.
- [01:00] Tests e2e:
  - `test/catalog.e2e-spec.ts`: test de exposición de SEO en productos y categorías.
  - Tests: 14/14 suites, 46 tests.
- [01:15] Regenerado `@ecommerce/api-client` desde `swagger.json`.
- [01:30] Verificación completa:
  - `pnpm --filter api lint typecheck build test` → 14/14 suites, 46 tests.
  - `pnpm --filter admin lint typecheck build test` → exitoso (6 tests).
  - `pnpm --filter web lint typecheck build test` → exitoso (9 tests).
  - `pnpm --filter api-client generate build` → exitoso.
  - Actualizado `PENDIENTES.md`.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.
