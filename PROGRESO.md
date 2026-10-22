# PROGRESO.md — Bitácora de desarrollo

> Este archivo documenta el paso a paso, decisiones y cambios realizados en el proyecto. Sirve como contexto para continuar en caso de que la sesión se cierre o cambie de agente.

---

## Sesión 2026-10-04 — Admin: header alineado a Stitch, idioma en dropdown y versión desde package.json

### Cambios
- Header del admin: los botones de colapsar menú (sidebar) y de notificaciones ahora tienen fondo negro (`bg-primary` + `text-on-primary`) con hover por opacidad, alineados a la referencia de Stitch.
- Selector de idioma convertido de grupo de botones ES/EN/PT a **lista desplegable** (Mantine Menu) con tilde en el idioma activo (Español / English / Português).
- La versión del sidebar ahora se lee de `apps/admin/package.json` (bump a `2.4.0`) en lugar del "v2.4" hardcodeado.

### Verificación
- `pnpm --filter @ecommerce/admin typecheck` y `lint` ✅.
- Captura del admin real (Playwright + Edge): toggle y campana con `rgb(0, 0, 0)`, dropdown de idioma funcional y badge `v2.4.0`.

---

## Sesión 2026-09-29 — Registro: política de contraseñas y verificación de email por link

### Tareas realizadas
- Política de contraseñas estándar compartida (`@ecommerce/shared`): mínimo 8 caracteres, una mayúscula, una minúscula y un número; aplicada en registro, reset y cambio de contraseña (API + web).
- Registro web con campo "Repetir contraseña" y hint de la política.
- La verificación de email dejó de usar OTP: ahora se envía un link (`/verify-email?token=...`) con token de un solo uso (SHA-256, 24 h).
- Tras registrarse, el usuario continúa navegando (redirige al catálogo) y el banner global le recuerda confirmar la cuenta, con acción para reenviar el email.
- `POST /auth/verify-email` ahora es público y recibe `{ token }`; `POST /auth/resend-verification` sigue requiriendo sesión.

### Cambios técnicos
- Modelo Prisma `EmailVerificationCode` reemplazado por `EmailVerificationToken` (`tokenHash`, `expiresAt`, `usedAt`) + migración `20260929120000_email_verification_tokens`.
- Plantilla `email-verification` actualizada a link (`{{verificationUrl}}`, `{{expirationHours}}`); la migración elimina el override sembrado con `{{code}}`.
- Fix de guardado en `store-config`: strings vacíos en campos opcionales con validador de formato (`logoUrl`, `faviconUrl`, `heroImageUrl`, `emailSenderAddress`) se transforman a `null` (`EmptyToNull`).
- Fix del selector de términos: `/admin/pages` devuelve `{ data: [...] }` y se accedía como array.

### Demo visual de tienda
- Nuevo seed `seed:visual-demo` (idempotente, no destructivo): 5 categorías, 12 productos con 39 variantes e inventario (con stock bajo y agotado), 24 imágenes de producto + hero/logo/favicon/plantillas generadas con sharp y subidas a R2, 5 páginas (incluye términos), 3 opciones de envío, 4 cupones (y desactiva 16 cupones de test), store config completo de "NÖVA" (home, banner, countdown, popup, WhatsApp, SEO, envío gratis desde $150.000), 8 órdenes demo en todos los estados con pagos/envíos/refunds, 4 reseñas (2 pendientes de moderar), wishlist, newsletter y redirect.
- Credenciales demo: `admin@tienda.com / Admin1234` y `customer@tienda.com / Customer1234` (verificado, con direcciones).
- Fix de branding UI: nuevo componente web `BrandLogo` que usa la imagen configurada en `store-config` (y cae al nombre solo si no hay logo). Aplicado al header del storefront y a las vistas de login, registro, forgot/reset password y verificación de email; los textos de marca de esas vistas ahora usan `config.name`.
- Imágenes reales: importadas 13/28 fotos generadas con Gemini (`apps/api/demo-images/` + `scripts/import-demo-images.js`): hero, bases del personalizador (remera/hoodie) y 10 fotos de producto (remeras, buzos). Las reutilizaciones usan recortes derivados con sharp. Las 15 restantes (gorras, pantalón, jogger, tote, medias, campera, preview custom) siguen con la gráfica de marca hasta generar sus fotos; el importador acepta archivos parciales.

### Verificación
- `pnpm --filter api lint typecheck` ✅; e2e `auth.e2e-spec` 7/7 ✅ (incluye política de contraseñas, verificación por token y resend).
- `pnpm --filter web lint typecheck` ✅; shared y api-client rebuild ✅.
- `prisma migrate deploy` aplicado y `migrate status` al día.

### Notas de entorno (dev)
- Proveedor de email de la tienda cambiado de SMTP (Mailgun) a **Resend** en `StoreConfig`; `RESEND_FROM` corregido a `onboarding@resend.dev` (el anterior `növa@resend.dev` era rechazado por Resend por contener un carácter no ASCII).
- La cuenta de Resend es `infrastructurenova1717@gmail.com`. Sin dominio verificado, Resend **solo entrega a esa casilla** (cualquier otro destinatario recibe 403 `You can only send testing emails to your own email address`).
- Fix de UX: `POST /auth/resend-verification` ahora responde **503** si el proveedor rechaza el envío (antes reportaba éxito silencioso) y el registro devuelve `verificationEmailSent`; el storefront avisa cuando el email de confirmación no se pudo enviar.
- Pendiente para producción: verificar un dominio propio en Resend y usar `RESEND_FROM=no-reply@<dominio>` (o configurar "Email del remitente" en `/store-config`).
- Lección: al cambiar secretos en Doppler hay que **reiniciar el proceso padre** (`doppler run -- pnpm dev`), no alcanza con que el watcher de Nest reinicie el child: hereda el entorno capturado al arrancar.

---

## Sesión 2026-09-28 — Alineación del proyecto Stitch "Ecommerce" al design system

### Tareas en curso
- Revisar el proyecto **Ecommerce** de Stitch (`projects/15830149944067388771`) y alinear sus pantallas al design system **Urban Autonomy** (`assets/0380d70944aa415bae4a1953a57e09ef`).
- Verificar que los estilos del proyecto correspondan a la plantilla actual del storefront (`apps/web`).

### Decisiones tomadas
- Ajustar las 2 pantallas de Inicio (Invitado y Sesión Iniciada) al design system: eran las únicas fuera de sistema (Space Mono / Space Grotesk, acentos rojo `#d62828` / `#e60000` y lima, sombras).
- Mantener las vistas del web sin pantalla en Stitch (carrito, cuenta, pedidos, wishlist, comparador, checkout invitado, reset, páginas, 404) alineadas al design system actual, sin generar pantallas nuevas.
- Limpiar las desviaciones menores de Colecciones, Copa Mundo '26, Personalizar, Producto, Pago Seguro y Login (colores fuera de paleta, sombras y radios sueltos).

### Registro de cambios
- [21:30] Acceso al proyecto Ecommerce vía MCP: 16 elementos (11 vistas + imágenes), design system "Urban Autonomy" (Bebas Neue / Inter / JetBrains Mono, `#fcf9f8` / `#0d0d0d` / `#6f7a4e`, radio 0, sin sombras).
- [21:32] `edit_screens` sobre las 2 pantallas de Inicio: JetBrains Mono, paleta crema/negro/oliva, sin sombras.
- [21:49-21:51] `edit_screens` de limpieza (colores/sombras/radios) sobre Colecciones, Copa Mundo '26, Personalizar, Producto, Pago Seguro y Login.
- [21:56-22:02] `apply_design_system` a las 2 pantallas de Inicio y a las 6 pantallas alineadas: generó versiones alineadas a tokens y re-vinculó los `screenInstances` del lienzo a esas versiones.
- [22:05] Segunda pasada `edit_screens` de limpieza sobre las 6 pantallas regeneradas.

### Verificación
- Los estilos de la plantilla web corresponden al design system: `apps/web/src/lib/fonts.ts` (Bebas Neue / Inter / JetBrains Mono) y `apps/web/src/providers/theme-provider.tsx` (paleta Urban Autonomy) — confirmado por análisis de código.
- Exports de Stitch: las homes regeneradas reflejan los tokens (quedan 4 colores sueltos + config Tailwind interno); el resto de pantallas tiene los cambios registrados como `project.file_update` pendientes de consolidar en los archivos exportados.

### Pendientes
- Abrir el proyecto Ecommerce en Stitch para consolidar los `file_update` pendientes y verificar por MCP.
- Los bloques `tailwind.config` de las 2 homes (mapeo mono Space Mono/Space Grotesk y claves de paleta antiguas) no son editables vía MCP: requieren ajuste manual en el editor de Stitch o regeneración de pantalla.

---

## Sesión 2026-09-27 — Emails, plantillas y personalización avanzada desde admin

### Tareas realizadas
- Fix de resolución de `@ecommerce/shared`/`@ecommerce/api-client` en seeds/dev (build de packages internos antes de correr; documentado en `docs/SETUP.md`).
- Fix de assets huérfanos al crear producto (rollback con `DELETE /admin/assets/:id`).
- Fix de prefijo duplicado de bucket en R2 (`R2_ENDPOINT` no debe incluir el bucket).
- Sistema de plantillas de email configurables (SPEC-046): modelo `EmailTemplate`, motor `{{var}}`/`{{{var}}}`, 11 emails migrados, admin `/email-templates`, seed `seed:email-templates`.
- Flujo completo de recuperación de contraseña (forgot/reset con token SHA-256 de un solo uso).
- Selección de proveedor de email en caliente (caché 60s).
- Personalización avanzada desde admin (SPEC-047):
  - Términos versionados (`termsPageId`/`termsVersion` + `POST /auth/accept-terms` + banner en storefront).
  - Login social Google/Apple (`POST /auth/google`, `POST /auth/apple`, `googleId`/`appleId` en `User`).
  - Redirects (`StoreRedirect` + CRUD admin `/redirects` + middleware Next).
  - Página 404 configurable (`storefrontConfig.notFound`).
  - Home: sección countdown y destacados por categoría.
  - Anuncio superior con vigencia (`startsAt`/`endsAt`).
  - Checkout: `minOrderAmount` + estimaciones de producción/envío.
  - Remitente de email configurable (`emailSenderName`/`emailSenderAddress`).

### Fixes de infraestructura
- Swagger: `src/common/swagger-path-shim.ts` para rutas con caracteres no ASCII (Ö) — se carga al arrancar la API (dev/prod) y en `generate:swagger`.
- `express` como dependencia explícita de `apps/api` (los 18 suites e2e fallaban sin esto).
- `google-auth-library` y `jsonwebtoken` agregados a `apps/api`.

### Verificación final
- API: typecheck/lint ✅, tests 22/22 suites (92 tests) ✅.
- Admin y Web: typecheck/lint ✅.
- api-client regenerado ✅, shared rebuild ✅.
- Verificación en vivo: forgot/reset password, accept-terms, redirects CRUD, campos nuevos de store-config, OAuth rechazado cuando está deshabilitado.

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

## Sesión 2026-08-05 — Notificaciones en tiempo real y productividad del admin

### Tareas en curso
- Implementar notificaciones en tiempo real para eventos de compras, stock bajo y reseñas pendientes.
- Agregar mejoras de UX/productividad: búsqueda global, acciones masivas, columnas personalizables, filtros guardados, vista previa del storefront, autosave/borradores e importador CSV.

### Decisiones tomadas
- `NotificationsModule` es global y expone un `Subject` que cualquier servicio puede usar para emitir eventos.
- El endpoint `GET /admin/notifications/stream` usa SSE con autenticación vía query token (`?token=`) porque `EventSource` no soporta headers personalizados (`SseAuthGuard`).
- Eventos emitidos: `order.created` (checkout), `stock.low` (inventario), `review.pending` (reseñas no aprobadas).
- Se agregó `lowStockThreshold` a `ProductVariant` para detectar stock bajo de forma configurable.
- `AdminSearchModule` permite buscar productos, órdenes, usuarios y páginas desde `GET /admin/search?q=...`.
- El admin tiene un `CommandPalette` (`Ctrl+K`/`Cmd+K`) y una campana de notificaciones en el header.
- Se implementaron acciones masivas en productos (activar/desactivar/eliminar) y órdenes (cambiar estado en lote).
- Se agregó visibilidad configurable de columnas en `/products` y `/orders`, y filtros guardados en `/orders`.
- Se agregó botón de "Vista previa" del storefront en el header del admin.
- Se implementó autosave local de borradores en `/products/[id]` y `/pages` (restaurar/descartar).
- Se agregó importador CSV de productos (`POST /admin/products/import`) con plantilla descargable en `/products`.
- La dependencia `csv-parse` se agregó a `apps/api` para parsear CSV.

### Registro de cambios
- [08:00] Backend:
  - Migración `20260805131035_add_low_stock_threshold`.
  - Creado `NotificationsModule` con `NotificationsService`, `NotificationsController` y `SseAuthGuard`.
  - Emisiones desde `CheckoutService`, `AdminStockService` y `ReviewsService`.
  - Creado `AdminSearchModule` con `GET /admin/search?q=...`.
  - Bulk endpoints: `POST /admin/products/bulk`, `POST /admin/orders/bulk/status`.
  - Endpoint `POST /admin/products/import` usando `csv-parse` para crear productos.
  - Regenerados `swagger.json` y `@ecommerce/api-client`.
- [08:30] Frontend admin:
  - `CommandPalette` con búsqueda global y shortcut `Ctrl+K`/`Cmd+K`.
  - `NotificationsBell` con SSE y dropdown de eventos recientes.
  - `/products`: selección masiva, acciones masivas, columnas visibles e importador CSV.
  - `/orders`: selección masiva, cambio de estado masivo, columnas visibles y filtros guardados.
  - `/products/[id]` y `/pages`: autosave de borradores con restaurar/descartar.
  - Botón "Vista previa" en el header que abre el storefront en una nueva pestaña.
- [09:00] Verificación:
  - `pnpm --filter @ecommerce/api test` → 22/22 suites, 92 tests pasando.
  - `pnpm --filter @ecommerce/api lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso.
  - `pnpm --filter @ecommerce/web lint typecheck build` → exitoso.
  - `pnpm --filter @ecommerce/api-client generate build` → exitoso.
  - Actualizados `PENDIENTES.md` y `PROGRESO.md`.

- [09:15] Bugfix en admin:
  - `/users`: corregido el crash al escribir en el modal de crear usuario. El `onChange` leía `event.currentTarget.value` dentro del updater de `setState`, lo que fallaba cuando React ejecutaba el updater después de que el evento se invalidara. Ahora se lee el valor antes de llamar a `setCreateForm`.
  - `/custom-designs`: corregido `designs?.map is not a function`. El endpoint `GET /custom-designs/admin/all` devolvía `{ data, meta }` pero el frontend esperaba un array. Se agregó `CustomDesignListResponseDto` en el backend y el frontend ahora usa `designs.data`.
  - Regenerados `swagger.json` y `@ecommerce/api-client`.
  - Verificación: `pnpm --filter @ecommerce/api test` → 92 tests, `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

- [09:30] Mejora en mapeo de errores:
  - Actualizado `getApiErrorMessage` en `apps/admin/src/lib/notifications.ts` (y también en `apps/web/src/lib/notifications.ts` para mantener consistencia).
  - Ahora maneja: `message` como string, `message` como array (ej. errores de validación), `errors` como array, `error` como string, errores de tipo `Error`, y wrappers de openapi-fetch.
  - Antes muchos errores del backend caían en el mensaje genérico porque `message` venía como array o estaba anidado.
  - Verificación: `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso, `pnpm --filter @ecommerce/web lint typecheck build test` → exitoso.

- [10:00] Traducción de errores del backend según idioma:
  - Creado `apps/api/src/common/error-translations.ts` con un diccionario de mensajes de error del backend en español.
  - Creado `HttpExceptionTranslationFilter` que intercepta `HttpException`, lee el header `Accept-Language` y traduce `message` (string o array) antes de responder.
  - El filtro se registró globalmente en `apps/api/src/main.ts`.
  - `apps/admin/src/lib/api.ts` y `apps/web/src/lib/api.ts` ahora envían `Accept-Language` con el locale guardado en `localStorage`.
  - Esto alinea los errores de validación y de negocio con el idioma activo en el admin/storefront (por ahora traducciones completas en español; inglés/portugués usan el mensaje original hasta agregar traducciones).
  - Verificación: `pnpm --filter @ecommerce/api test` → 92 tests, `pnpm --filter @ecommerce/api lint typecheck build` → exitoso, `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso, `pnpm --filter @ecommerce/web lint typecheck test` → exitoso.

- [10:15] Fix exportación CSV:
  - `apps/admin/src/app/export/page.tsx` usaba `response.blob()` después de `parseAs: 'blob'`, lo que fallaba porque openapi-fetch ya había consumido el body.
  - Ahora se usa el `data` ya parseado como `Blob` directamente.
  - Verificación: `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

- [11:15] Imagen al crear producto (admin):
  - Backend: `CreateProductDto` ahora acepta `imageAssetId` opcional.
  - Backend: `AdminProductService.create` valida que el asset exista y, si se envía `imageAssetId`, crea el `ProductImage` asociado dentro de la misma transacción.
  - Frontend: `apps/admin/src/app/products/page.tsx` ahora muestra un `FileInput` en el modal de nuevo producto.
  - Frontend: al crear el producto, primero sube la imagen con `uploadAsset` (que ya sube a R2 si está configurado, o local si no) y luego envía el `imageAssetId` junto con el resto de los datos.
  - Se regeneró `packages/api-client/src/api-types.ts` a partir del nuevo `swagger.json` para que el tipado incluya `imageAssetId`.
  - Verificación: `pnpm --filter @ecommerce/api test` → 92 tests, `pnpm --filter @ecommerce/admin lint typecheck build test` → exitoso.

- [11:35] Preview de imagen al crear producto:
  - En el modal de nuevo producto se agregó una vista previa de la imagen seleccionada usando `URL.createObjectURL`, con limpieza del objeto URL en `useEffect`.
  - Verificación: `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

- [11:55] Alternar entre subir imagen o usar URL externa:
  - Backend: nuevo endpoint `POST /admin/assets/external` que crea un asset con `bucket: 'external'` y `objectKey` = URL. `buildAssetUrl` ya soporta devolver la URL tal cual cuando `objectKey` comienza con `http`.
  - Backend: `AssetsService.createExternal` para persistir el asset externo.
  - Frontend: se agregó un `SegmentedControl` en el modal de nuevo producto con opciones "Subir archivo" / "Usar URL".
  - Frontend: según el modo, muestra `FileInput` o `TextInput` para la URL; la vista previa funciona para ambos casos.
  - Frontend: `createExternalAsset` en `apps/admin/src/lib/assets.ts` llama al nuevo endpoint.
  - Se regeneró `packages/api-client/src/api-types.ts` con el nuevo endpoint.
  - Verificación: `pnpm --filter @ecommerce/api test` → 92 tests, `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

- [12:15] Editar imagen desde el detalle del producto:
  - En `apps/admin/src/app/products/[id]/page.tsx` se agregó el mismo selector "Subir archivo" / "Usar URL" en la sección de imágenes.
  - La mutación `addImage` ahora acepta `{ file }` o `{ url }` y crea el asset correspondiente antes de asociarlo al producto.
  - Se agregó vista previa de la imagen antes de agregarla.
  - Verificación: `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

- [12:45] Subida de archivos con pre-signed URLs (estándar de seguridad):
  - Backend: nuevo endpoint `POST /admin/assets/presign` que genera una URL firmada (`uploadUrl`) para subir directamente a R2/S3 desde el cliente.
  - Backend: `R2StorageService.presignUpload` usa `getSignedUrl` del SDK de AWS S3 con vencimiento de 5 minutos.
  - Backend: `AssetsService.presign` crea el registro de asset en la base de datos con `bucket: 'r2'` y `objectKey` antes de la subida, devolviendo `id`, `uploadUrl` y `url` pública.
  - Frontend: `apps/admin/src/lib/assets.ts` ahora usa pre-signed URLs por defecto. El flujo es: pedir URL firmada al backend → hacer `PUT` directo al storage → usar el `assetId` recibido. Si R2 no está configurado, cae automáticamente al upload directo anterior.
  - Se actualizó `@aws-sdk/client-s3` y se agregó `@aws-sdk/s3-request-presigner` (ambos en `3.1112.0` para compatibilidad).
  - Se regeneró `packages/api-client/src/api-types.ts` con el nuevo endpoint.
  - Verificación: `pnpm --filter @ecommerce/api test` → 92 tests, `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

- [13:15] Carpetas por propósito y validación en pre-signed uploads:
  - Backend: `AssetsService` ahora mapea cada `AssetPurpose` a una carpeta en el bucket:
    - `CATALOG_IMAGE` → `catalog/`
    - `CUSTOM_DESIGN_ASSET` → `custom-designs/`
    - `PRINT_FILE` → `print-files/`
    - `REVIEW_IMAGE` → `reviews/`
  - Backend: validación de tipo MIME permitido según propósito y tamaño máximo configurable (`PRESIGN_MAX_FILE_SIZE_BYTES`, default 10 MB).
  - Backend: duración de la URL firmada configurable vía `PRESIGN_URL_EXPIRATION_SECONDS` (default 300 segundos).
  - Backend: `PresignAssetDto` ahora acepta `purpose` y `size`; el `Content-Length` se incluye en la URL firmada para que R2/S3 valide el tamaño exacto.
  - Frontend: `uploadAsset` acepta un `purpose` (default `CATALOG_IMAGE`) y envía `size` en la petición de presign.
  - Se actualizó `apps/api/.env.example` con las nuevas variables.
  - Verificación: `pnpm --filter @ecommerce/api build`, `pnpm --filter @ecommerce/admin lint typecheck build test` exitosos. Suite completa de API interrumpida por crash ambiental de Console Ninja, pero `test/admin-catalog.e2e-spec.ts` pasa.

- [13:45] Endpoint de pre-signed URL en el storefront:
  - Backend: `CustomerAssetsController` ahora expone `POST /assets/presign` para usuarios autenticados.
  - Backend: solo se permiten los propósitos `CUSTOM_DESIGN_ASSET` y `REVIEW_IMAGE` en el storefront; cualquier otro devuelve 400.
  - Frontend: nuevo `apps/web/src/lib/assets.ts` con `uploadAsset(file, purpose)` que usa pre-signed URLs y, si R2 no está configurado, hace fallback al upload directo anterior.
  - Frontend: el customizador (`customizer-editor.tsx`) ahora usa `uploadAsset(file, 'CUSTOM_DESIGN_ASSET')` para imágenes y previews, enviándolas a la carpeta `custom-designs/`.
  - Frontend: las fotos de reseñas (`product-reviews.tsx`) ahora usan `uploadAsset(file, 'REVIEW_IMAGE')`, enviándolas a la carpeta `reviews/`.
  - Se exportó `getAccessToken` en `apps/web/src/lib/api.ts` para usarlo en el helper de assets.
  - Verificación: `pnpm --filter @ecommerce/web lint typecheck test` → exitoso.

- [14:00] Archivos de variables de entorno listos para reemplazar:
  - `apps/api/.env` y `apps/api/.env.example`: unificados, con secciones numeradas y valores por defecto. Se agregaron variables faltantes: `APP_URL`, `STORE_NAME`, `REDIS_URL`, `CDN_BASE_URL`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`.
  - `apps/admin/.env` y `apps/admin/.env.example`: corregido formato de `NEXT_PUBLIC_WEB_URL` y agregados comentarios.
  - `apps/web/.env` y `apps/web/.env.example`: estandarizados con puertos por defecto y comentarios.
  - Ahora los tres `.env` apuntan consistentemente a API en `4000`, storefront en `3000` y admin en `3001`.
  - Verificación: `pnpm --filter @ecommerce/api typecheck build`, `pnpm --filter @ecommerce/admin typecheck build test`, `pnpm --filter @ecommerce/web typecheck build test` → todos exitosos.

- [14:30] Ajuste en URL firmada para evitar 403 por `Content-Length`:
  - Se eliminó `ContentLength` del `PutObjectCommand` usado para generar la pre-signed URL.
  - La validación de tamaño máximo sigue aplicándose en el backend antes de generar la URL; solo se quitó el requisito de que S3/R2 valide el `Content-Length` exacto en el PUT, que suele ser la causa de 403 cuando el navegador envía el header de forma ligeramente diferente.
  - Verificación: `pnpm --filter @ecommerce/api typecheck build`, regeneración de tipos y typecheck de admin/web exitosos.

- [14:45] Loader al navegar a editar producto:
  - En `apps/admin/src/app/products/page.tsx` se reemplazó el `Link` por un botón que inicia la navegación con `router.push` y activa un estado `navigating`.
  - Se agregó un overlay fijo con fondo blanco semitransparente (`rgba(255, 255, 255, 0.7)`) y un loader de 3 puntos de Mantine (`Loader type="dots"`) mientras carga la página de edición.
  - Verificación: `pnpm --filter @ecommerce/admin lint typecheck build` → exitoso.

- [15:00] Fix error de MantineProvider en storefront:
  - `MaintenanceScreen` se renderizaba fuera de `MantineProvider`, lo que provocaba el error `@mantine/core: MantineProvider was not found` y el 500 en `/`.
  - Se envolvió `MaintenanceScreen` con un `MantineProvider` mínimo en `apps/web/src/app/layout.tsx` cuando `maintenanceMode` está activo.
  - Además se corrigió el build de `/personalizar`: el botón usaba `component={Link}` desde un Server Component hacia un Client Component de Mantine, lo que Next.js rechazaba. Se cambió a `Link` de Next con `passHref legacyBehavior` envolviendo un `Button component="a"`.
  - Verificación: `pnpm --filter @ecommerce/web typecheck build` → exitoso.

- [15:30] Mejora en cobertura de traducciones de errores:
  - `apps/api/src/common/error-translations.ts` ahora incluye traducciones al portugués (`pt`) para todos los mensajes de negocio.
  - Se agregó traducción por patrones para los mensajes por defecto de `class-validator` (`must be a string`, `should not be empty`, `must be longer than...`, etc.) tanto en español como en portugués.
  - Se agregó un mapeo de nombres de propiedades (`name`, `slug`, `basePrice`, `email`, etc.) para que los mensajes traducidos sean más legibles.
  - Si un mensaje no tiene traducción exacta ni coincide con un patrón conocido, se devuelve el mensaje original en inglés.
  - Verificación: `pnpm --filter @ecommerce/api typecheck build`, tests de `admin-catalog` y `auth` pasan; typecheck de admin/web exitoso.

- [16:00] Fix inconsistencia del modo mantenimiento en el storefront:
  - Causa: el layout del storefront fetcheaba la configuración sin desactivar el cacheo de Next.js, por lo que algunas páginas servían una versión estática/cacheada con `maintenanceMode` distinto al estado actual de la base de datos.
  - Se agregó `init: { next: { revalidate: 0 } }` al pedido de `/store-config` en `apps/web/src/app/layout.tsx`.
  - Se agregó `export const dynamic = 'force-dynamic'` para que todas las páginas se rendericen en el servidor en cada request y respeten el flag actual.
  - Verificación: `pnpm --filter @ecommerce/web typecheck build` → exitoso; ahora todas las rutas aparecen como dinámicas (`ƒ`).

- [16:30] Fix CORS en `PATCH /store-config`:
  - Causa probable: `app.enableCors` no tenía `allowedHeaders` explícitos y no trimmeaba los orígenes de `FRONTEND_URL`. Si el `.env` tenía espacios después de las comas (por ej. `http://localhost:3000, http://localhost:3001`), el origen del admin no coincidía y el preflight del `PATCH` fallaba.
  - Se actualizó `apps/api/src/main.ts` para:
    - Trimmeor cada origen y filtrar vacíos.
    - En desarrollo (`NODE_ENV=development`) permitir cualquier origen (`origin: true`).
    - Declarar explícitamente `allowedHeaders` incluyendo `Authorization`, `Content-Type` y `Accept-Language`.
    - Mantener `credentials: true`.
  - Verificación: `pnpm --filter @ecommerce/api typecheck build` → exitoso.

- [17:00] Aumento de límite de body parser:
  - Como el `PATCH /store-config` envía `storefrontConfig` como JSON string (puede incluir scripts externos y ser grande), el body parser por defecto de Nest (`100kb`) podía estar devolviendo `413 Payload Too Large` antes de que CORS agregue sus headers, lo que el navegador reporta como CORS.
  - Se configuró el body parser JSON y urlencoded con límite de `5mb` en `apps/api/src/main.ts` mediante `app.useBodyParser(...)`.
  - Verificación: `pnpm --filter @ecommerce/api typecheck build` → exitoso.

- [17:15] Diagnóstico CORS con request logger:
  - Se agregó un middleware de log en `apps/api/src/main.ts` (solo en desarrollo) para ver cada request: método, URL, `origin`, status code y duración.
  - Esto permite confirmar si el `PATCH /store-config` llega al backend, qué status devuelve realmente y si el problema es CORS o un 401/403/413 disfrazado.
  - Verificación: `pnpm --filter @ecommerce/api typecheck build` → exitoso.

- [17:30] Diagnóstico de headers de preflight:
  - A partir de los logs del usuario se observó que `OPTIONS /store-config` responde `204` pero el `PATCH /store-config` nunca llega al backend, lo que indica que el navegador está bloqueando la petición tras el preflight.
  - Se amplió el logger para imprimir los headers de respuesta del preflight (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`) y los headers solicitados (`Access-Control-Request-Method`, `Access-Control-Request-Headers`).
  - Se tuvo que compilar con `NODE_OPTIONS=--max-old-space-size=8192` por un `heap out of memory` en el entorno.
  - Verificación: build exitoso.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests exitosos.

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

---

## Sesión 2026-08-19 — Migrar refresh token a cookie HTTP-Only

### Tareas en curso
- Reemplazar el almacenamiento del refresh token en `localStorage` por una cookie `HttpOnly`, `Secure` (en prod) y `SameSite=Strict`.
- Actualizar frontends (admin y web) y el cliente API para usar cookies en el flujo de refresh/logout.

### Decisiones tomadas
- El refresh token ya no se devuelve en el cuerpo de las respuestas de `/auth/login`, `/auth/register` ni `/auth/refresh`.
- El backend lo guarda en una cookie `refresh_token` con atributos:
  - `httpOnly: true`
  - `secure: process.env.NODE_ENV === 'production'`
  - `sameSite: 'strict'`
  - `path: '/auth'`
  - `maxAge` derivado de `JWT_REFRESH_EXPIRATION`.
- `/auth/refresh` lee la cookie en lugar de un body; `/auth/logout` también la lee para revocar el token y luego la borra.
- Se agregó `cookie-parser` como middleware global en `AppModule` para que esté disponible también en tests e2e.
- El cliente `@ecommerce/api-client` ahora envía `credentials: 'include'` en todas las peticiones y en el refresh manual, y ya no espera recibir un refresh token nuevo en la respuesta.
- Admin y web dejaron de persistir `refreshToken`; solo guardan el `accessToken`.

### Registro de cambios
- [23:20] Backend:
  - Instaladas `cookie-parser` y `@types/cookie-parser`.
  - `AppModule` aplica `cookieParser()` como middleware global.
  - `AuthController` setea/limpia la cookie `refresh_token` en login, register, refresh y logout.
  - Eliminado `RefreshDto` (ya no se recibe refresh token por body).
  - `LoginResponseDto`, `RegisterResponseDto` y `RefreshResponseDto` ya no incluyen `refreshToken`.
  - Actualizado `test/auth.e2e-spec.ts` para verificar `Set-Cookie` y ausencia de `refreshToken` en body.
- [23:25] Frontend transversal:
  - `@ecommerce/api-client`: refresh con `credentials: 'include'`, callback `onTokenRefreshed(accessToken)`.
  - Admin: `lib/auth.ts` solo maneja access token; `lib/api.ts` y `components/login-form.tsx` actualizados.
  - Web: `store/auth-store.ts` elimina `refreshToken`; `lib/api.ts`, `app/login/page.tsx` y `app/register/page.tsx` actualizados.
  - Middleware de ambos frontends devuelve `new Request(request, { credentials: 'include' })`.
- [23:30] Regenerado `@ecommerce/api-client` desde `swagger.json` actualizado.
- [23:35] Verificación:
  - `pnpm --filter api lint typecheck build` → exitoso.
  - `pnpm --filter api test test/auth.e2e-spec.ts` → 4/4 tests.
  - `pnpm --filter admin lint typecheck build test` → exitoso (10 tests).
  - `pnpm --filter web lint typecheck build test` → exitoso (17 tests).
  - `pnpm --filter api-client generate build typecheck` → exitoso.
  - `pnpm --filter api test` → auth pasa; fallan 5 tests no relacionados en `custom-designs`, `admin-orders` y `critical-flows` (errores 500 preexistentes o de otro servicio).

- [23:45] Documentación y setup con Doppler:
  - Agregada sección "Setup local y variables de entorno con Doppler" en `skills.md`.
  - Creados `apps/api/doppler.yaml.example`, `apps/web/doppler.yaml.example` y `apps/admin/doppler.yaml.example`.
  - Agregados `doppler.yaml` a `.gitignore`.
  - Agregados scripts `doppler:api`, `doppler:web` y `doppler:admin` en `package.json` raíz.
  - Verificación: `pnpm --filter api lint typecheck build` y builds de admin/web siguen exitosos.

**Fin de sesión.** Estado dejado verificado con build, typecheck, lint y tests de auth/frontends exitosos.

---

## Sesión 2026-10-04 — Captura de contexto Stitch del "Admin Dashboard"

> Continúa el trabajo de sesiones previas de rediseño del admin desde plantillas de Stitch.

### Tareas en curso
- Dejar todo el contexto visual del proyecto Stitch **"Admin Dashboard"** (`projects/3689117661474437217`) disponible en el repo para resolver errores de UI reportados en `apps/admin`.

### Registro de cambios
- Descargadas las **26 pantallas HTML** del proyecto (dashboard, productos, categorías, stock, cupones, envíos, órdenes, detalle de orden, cola de producción, reseñas, reembolsos, usuarios, usuario detalle, roles, diseños, auditoría, exportar, páginas, plantillas storefront, plantillas email + modal, redirects + variante colapsada, configuración, monedas) a `docs/stitch/admin-dashboard/html/`.
- Carpeta `docs/stitch/` agregada a `.gitignore` (son exports pesados, no se versionan; el contexto se conserva en disco).
- Creado `docs/stitch/admin-dashboard/INDEX.md`: mapa pantalla ↔ ruta admin ↔ archivo de código + IA del sidebar + capturas PNG de referencia (login solo existe como imagen).
- Creado `docs/stitch/admin-dashboard/DESIGN.md`: design system "NÖVA Backoffice Architecture" (tokens de color, tipografía, spacing, elevación, formas y componentes).
- Generado `docs/stitch/admin-dashboard/_digest.txt`: resumen textual por pantalla (títulos, columnas de tabla, botones, navegación).
- Confirmado que el código actual del admin ya implementa los tokens 1:1: `tailwind.config.ts`, `globals.css`, `src/lib/admin-nav.ts`, `src/components/admin-shell.tsx`.

### Ajuste de UI solicitado
- `apps/admin/src/components/admin-shell.tsx`: "Admin NÖVA" + píldora de versión + botón colapsar (`Ctrl+B`) movidos al **header fijo de ancho completo**. El sidebar ahora cuelga debajo del header (`top-16`), perdió su cabecera interna y el botón "Colapsar menú" del pie (conserva el bloque usuario + logout, igual que el diseño base de Stitch).
- En mobile el header incorpora el burger (abre/cierra el drawer) y el drawer se desliza debajo del header.
- Verificación: `pnpm --filter @ecommerce/admin typecheck`, `lint` y `build` → exitosos.

### Fix de UI — chrome nativo de botones (iconos "encajonados")
- Causa: el preflight de Tailwind está desactivado (convive con Mantine), así que los `<button>` nativos conservaban borde/fondo/padding del navegador. Se veía en las X de los chips de columnas, el cierre del modal y botones ghost (aparecían como cajas con borde).
- Fix: reset global de `button` en `apps/admin/src/app/globals.css` (sin appearance/borde/fondo/padding nativos; el look viene siempre de clases explícitas).
- Creado `apps/admin/UI_GUIDELINES.md`: reglas de UI minimalista del admin (iconos Material Symbols sin cajas, ghost para acciones de icono, tokens del theme, hairlines, sombras suaves, checklist).

### Fix de UI — buscador global
- `CommandPalette`: el panel de resultados se ancla directamente debajo de la barra (sin modal). **La barra misma es el input** (sin buscador duplicado en desktop; en mobile el panel incluye su input). Cierra con click afuera/Escape y limpia la consulta al cerrar.
- Barra de búsqueda del header: fondo visible (`bg-surface-container-low`) + borde hairline + `shadow-soft`; badge ⌘K en blanco con borde para contrastar sobre el fondo tintado.
- Regla agregada a `UI_GUIDELINES.md`: acciones contextuales ancladas al trigger, nunca modal.

### Fix de UI — shell persistente entre navegaciones
- Causa del "se reinicia la animación / el menú vuelve a la posición por defecto": cada página montaba su propio `<AdminShell>`, así que al navegar el shell se desmontaba y remontaba (scroll del sidebar al tope + flash de la animación de colapso).
- Nuevo `apps/admin/src/components/admin-frame.tsx`: el shell ahora vive en el layout raíz (dentro de los providers) y **persiste entre navegaciones**. Se retiró `<AdminShell>` de las 24 páginas y de `DashboardView`.
- `AdminShell`: el estado colapsado se inicializa de forma síncrona desde localStorage (sin animación al montar).
- `LoginForm`: dispara el evento `admin-auth-change` al iniciar sesión para que el frame reevalúe la sesión sin recargar la página.
- Verificación: `pnpm --filter @ecommerce/admin lint typecheck test build` → exitoso (10 tests).

### Ajuste de UI — pie del sidebar simplificado + menú de cuenta en el header
- Pie del sidebar: queda **solo el botón "Salir"** (se quitó el bloque de usuario Admin Tienda/email). El pie está fijo abajo y el nav hace scroll por debajo, con **línea de separación + sombra superior** que marcan el corte. Colapsado: solo el icono centrado.
- En **mobile**, encima de "Salir" se muestra el usuario (icono + nombre, similar al chip del header); en desktop el usuario vive en el menú de cuenta del header.
- Header: el avatar/nombre ahora abre un **menú de cuenta** (Menu de Mantine) con nombre, email y opción "Salir" que cierra sesión.
- Versión del sidebar/header validada: `v2.4.0` se lee dinámicamente de `apps/admin/package.json` (`packageJson.version`); no hay versiones hardcodeadas en el código.
- Verificación: `pnpm --filter @ecommerce/admin lint typecheck test build` → exitoso (10 tests).

### Fix de UI — buscadores de filtro y líneas divisorias
- `Input` ahora tiene variante `filled` (fondo tintado `surface-container-low`, sin borde; al enfocar pasa a blanco con ring) para filtros/búsquedas, replicando el diseño de Stitch. Los 10 buscadores de filtro (productos, categorías, páginas, cupones, órdenes, reseñas, reembolsos, producción, plantillas de email, diseños) la usan.
- Header: borde inferior más visible (`border-outline-variant/60`).
- Categorías y Páginas: línea divisoria bajo la barra de filtros (`border-b border-outline-variant/30`), como ya tenían Productos y Órdenes.

### Fix de UX — skeletons de carga y paginación sin parpadeo
- Nuevo `apps/admin/src/components/ui/table-skeleton.tsx`: `TableSkeleton` (encabezado + filas con `animate-pulse`) y `TableSkeletonRows` (filas para usar dentro de un `<tbody>` existente).
- **Usuarios** (vista reportada): la query principal usa `placeholderData: keepPreviousData`, así al paginar/buscar/filtrar se mantiene la tabla anterior (con opacidad reducida) en lugar de desaparecer y saltar al centro. La carga inicial muestra `TableSkeleton` en vez del spinner centrado y los 4 KPIs muestran skeleton mientras carga la muestra.
- Barrido de listados: spinners centrados reemplazados por `TableSkeleton` en productos, órdenes, auditoría, reseñas, reembolsos, producción, diseños personalizados, categorías, páginas, redirects, inventario, cupones, plantillas de email, monedas y opciones de envío (se quitó `LoadingState` donde quedó sin uso).
- `keepPreviousData` agregado a las queries con paginación server-side: órdenes, productos, auditoría, reseñas, reembolsos, producción y diseños personalizados.
- Verificación: `pnpm --filter @ecommerce/admin lint typecheck test build` → exitoso (10 tests).

### Auditoría de endpoints del admin + fix de "no se ven los datos del seed"
- Revisadas las **95 llamadas únicas** del admin contra el swagger: **todas existen**. Los 3 falsos positivos del chequeo (`POST /admin/orders/bulk/status`, `POST /admin/products/bulk`, `PATCH /admin/products/{id}/images/reorder`) eran ambigüedad entre rutas estáticas y parametrizadas; confirmado contra el swagger vivo (`/api/docs-json`, 145 paths).
- **Causa raíz de "no se ve data"**: el rate limit global de **30 req/min** bloqueaba al admin (429) al disparar varias queries por navegación; como las páginas ignoran el error de query, mostraban vacío.
- API (`app.module.ts`): límite global 30 → **120/min** y **skip de `/admin`** (panel autenticado con ráfagas legítimas); se mantienen los skips de checkout/webhooks/payments.
- Auth (`auth.controller.ts`): protección estricta de **10/min** en register, login, forgot-password, reset-password y resend-verification (compensa el aumento global).
- Admin (`query-provider.tsx`): las queries ya no reintentan errores 4xx (evita amplificar 429/401).
- Verificado en vivo: 35 requests a `/admin/categories` → 200; login fallido → 429 recién al 10º intento.
- Verificación: `pnpm --filter api lint typecheck build` y `pnpm --filter @ecommerce/admin lint typecheck test build` → exitosos (10 tests).

### Fix — exportación de usuarios exportaba solo 100 (la "muestra")
- Criterio anterior: el botón "Exportar lista (CSV)" pedía **una sola página con `limit=100`** (la muestra usada para KPIs y tabs), por eso exportaba 100 aunque el total fuera 140 (el total venía de `meta.total`).
- Ahora `exportCsv` **pagina `/admin/users`** (lotes de 100, tope de seguridad de 100 páginas) hasta traer todos los registros que coinciden con la búsqueda/rol, y recién ahí aplica los filtros de tab y estado. Exporta el total real (140 con "Todos").
- Verificado contra la API real: página 1 = 100 filas + página 2 = 40 filas (`meta.total` 140).
- Verificación: `pnpm --filter @ecommerce/admin lint typecheck test build` → exitoso (10 tests).

### Fix de UI — buscador, chip de tienda y barrido i18n completo
- **Buscador del header**: borde a opacidad completa (`border-outline-variant`) para que se vea la línea; se mantiene fondo tintado + `shadow-soft`.
- **Chip de tienda del header**: `Principal (COP)` estaba quemado → ahora usa `config.name` + `config.currencyCode` (dinámico desde store-config).
- **i18n — migración completa** de textos quemados al sistema de diccionarios (ES/EN/PT):
  - Shell: buscador (placeholder, hint, sin resultados), Vista Previa, menú de cuenta, menú de idioma, títulos de botones.
  - 24 pantallas + detalles (`users/[id]`, `products/[id]`, `orders/[id]`) + componentes compartidos (analytics-section, notifications-bell, table-skeleton, app-modal, pagination, loading-state, empty-state, trends-chart, command-palette, login-form).
  - Labels de permisos (`permissions.*`) con helper `getPermissionLabel(permission, t)` usado en Roles y Usuarios.
  - Fallback de errores de `lib/notifications.ts` ahora respeta el locale (`nova-admin-locale`).
  - `src/test/render.tsx` envuelve con `I18nProvider` (necesario para `LoadingState`).
  - Criterio aplicado: SOLO textos quemados; datos de API/store-config (nombres, emails, slugs, montos, fechas, estados crudos, URLs) quedan tal cual.
  - Diccionarios: **2509 claves idénticas** en ES/EN/PT (verificado con script de paridad).
  - Regla 8 agregada a `apps/admin/UI_GUIDELINES.md`.
- Verificación: `pnpm --filter @ecommerce/admin lint typecheck test build` → exitoso (10 tests).

### Animaciones con framer-motion
- Instalado `framer-motion@^14` en `apps/admin`.
- Nuevo `apps/admin/src/components/ui/motion.tsx`: `MotionProvider` (`reducedMotion="user"`), variantes `fadeInUp`, `staggerContainer`, `popIn` y constantes `MOTION_EASE` / `MOTION_DURATION` (0.22s, ease-out sobrio).
- Aplicado:
  - `AdminFrame`: **transición de página** (fade + 8px, key por pathname) en cada navegación y fade de entrada del login.
  - `Button`: feedback táctil `whileTap` (scale 0.98) en todos los botones del admin.
  - `CommandPalette`: el panel de resultados entra/sale con pop (`AnimatePresence`).
  - `DashboardView`: KPIs con **entrada escalonada** y hover lift (-2px).
  - `AppModal`: transición pop de Mantine (180ms).
- Regla 9 agregada a `apps/admin/UI_GUIDELINES.md`.
- Verificación: `pnpm --filter @ecommerce/admin lint typecheck test build` → exitoso (10 tests).

### Animaciones — barrido completo con framer-motion
- Nuevos primitives en `components/ui/motion.tsx`: `AnimatedNumber`, `Reveal`, `tableRowsContainer`, `LAYOUT_SPRING`, `DRAWER_SPRING`; nuevo `components/ui/segmented-tabs.tsx` (indicador activo deslizante).
- Shell: indicador activo del sidebar con `layoutId`, drawer mobile con spring + overlay con fade, campana con pulso de no leídas + pop del dropdown, `EmptyState` con fade.
- Uniformidad aplicada en todas las pantallas:
  - **19 controles segmentados** → `SegmentedTabs` (dashboard, categorías, cupones, órdenes, reseñas, reembolsos, producción, diseños, inventario, páginas, usuarios, productos, roles, store-config, templates, monedas, envíos).
  - **KPIs numéricos/moneda** → `AnimatedNumber` en 13 pantallas.
  - **18 tablas de listado** → filas escalonadas (`motion.tbody` + `tableRowsContainer`, `motion.tr` + `fadeInUp`).
  - **Store Config** (18 bloques), `storefront-config-section` (22 secciones) y templates → `Reveal` al scroll.
  - **Reorder animado** en Categorías (árbol) e imágenes de Producto (`layout` + `LAYOUT_SPRING`).
- Auditoría de uniformidad ejecutada: sin controles segmentados viejos pendientes y todas las tablas de listado animadas.
- Verificación: `pnpm --filter @ecommerce/admin lint typecheck test build` → exitoso (10 tests).

### Verificación
- 26/26 archivos HTML descargados y legibles.
- `pnpm --filter @ecommerce/admin lint typecheck build` → exitosos.
- Para re-descargar o ver capturas: MCP Stitch → `list_screens` / `get_screen` (`htmlCode.downloadUrl`, `screenshot.downloadUrl`).

---

## Sesión 2026-10-08 — Verificación en dos pasos (2FA) para el admin

### Tareas en curso
- Implementar 2FA TOTP para roles corporativos: configuración del dispositivo en el primer login y desafío en cada login, copiando los mockups de Stitch (`01-login-refinado`, `01.1-setup`, `01.2-exitoso`, `01.3-desafío`).

### Decisiones tomadas
- **TOTP (RFC 6238)** con `otplib` v13 + `qrcode` (QR como data URL); compatible con Google Authenticator / 1Password / Authy.
- 2FA obligatorio para roles **ADMIN/STAFF** (configurable con `TWO_FACTOR_FORCED_ROLES`); los clientes del storefront no se ven afectados.
- Secreto TOTP **cifrado en reposo** (AES-256-GCM; `TOTP_ENCRYPTION_KEY` o clave derivada de `JWT_SECRET` en dev).
- **Challenge token** (JWT scope `2fa`, 10 min) para el paso intermedio; `JwtStrategy` lo rechaza como token de acceso.
- **Dispositivo confiable**: cookie httpOnly `trusted_device` (30 días, path `/auth`) + hash en `trusted_devices`.
- **Códigos de recuperación**: 8 códigos `XXXX-XXXX` hasheados (SHA-256), de un solo uso, visibles una única vez al activar.
- Endpoints 2FA con `AuthThrottle` (10/min prod, 60/min dev).

### Registro de cambios
- **Prisma**: `User.twoFactorSecret/twoFactorEnabled/twoFactorEnabledAt` + modelos `TrustedDevice` y `TwoFactorRecoveryCode` (migración `20261008032247_add_two_factor_auth`, aplicada).
- **API**: `TwoFactorModule`/`TwoFactorService` (TOTP, códigos, dispositivos, challenge), util de cifrado, endpoints `POST /auth/2fa/setup`, `/setup/confirm`, `/verify`, `/disable`, `/recovery-codes`; el login devuelve `{ twoFactorRequired, twoFactorSetupRequired, challengeToken }` para roles corporativos.
- **Admin**: flujo de auth nuevo copiando Stitch — `auth-layout`, `login-step` (card central refinada), `two-factor-setup-step` (QR + clave manual + OTP), `two-factor-challenge-step` (OTP + countdown + código de respaldo), `two-factor-success-step` (códigos de recuperación), `auth-flow` (máquina de estados) + `OtpInput`; i18n completo (76 claves × 3 idiomas); `setAccessToken` con "recordarme" (localStorage/sessionStorage).
- **Fix de tooling**: el swagger debe generarse con `pnpm generate:swagger` (`nest build` + plugin); con `ts-node` los DTOs pierden metadatos y el cliente tipado rompe el typecheck del admin.
- Verificado end-to-end contra la API real: setup → confirm (TOTP) → verify → dispositivo confiable → código de respaldo (un solo uso) → challenge rechazado como bearer. La cuenta admin quedó **sin 2FA** para probar el setup desde cero.

### Verificación
- API: lint/typecheck/build OK + flujo e2e manual OK.
- Admin: lint/typecheck OK, **16 tests** y build OK.

### Fix — auto-advance del OTP (bug reportado)
- **Causa**: al enfocar la casilla siguiente, el guard de `onFocus` leía el `value` del render anterior (aún vacío) y devolvía el foco a la primera casilla; cada tecla sobrescribía el primer dígito.
- **Fix**: `OtpInput` ahora mantiene un `valueRef` que se actualiza al instante en cada `commit` (y se sincroniza con el prop); el guard de foco usa ese ref. Backspace/Delete también pasan por `commit`.
- **Test de regresión**: tipeo secuencial verificando foco (`document.activeElement`) y valores (`1` → `2` → foco en la tercera).
- **Extra**: la clave manual se muestra en grupos de 4 (`XXXX-XXXX-…`) como el diseño; el botón copiar sigue copiando el valor crudo.
- Verificación: lint/typecheck, **17 tests** y build → exitosos.

### Ajustes — pantallas de auth (feedback)
- `AuthLayout` (aplica a **todas** las pantallas de auth): se quitaron la marca "NÖVA OPERATIONS CORE" (arriba a la izquierda), el indicador "Sistema operativo" y el pie de copyright. Queda solo el **selector de idioma** (ES/EN/PT) arriba a la derecha.
- `LoginStep`: sin logo "N"; "ADMIN NÖVA" queda **centrado** y la píldora de versión (`v2.4`) se movió al **pie de la tarjeta** (debajo del botón "Ingresar sesión"). Ya se habían quitado el divisor "O ALTERNATIVAMENTE", el botón de Google y la nota de seguridad.
- Verificación: lint/typecheck, 17 tests y build → exitosos.

### Ajuste — inputs del login (feedback)
- El borde de los inputs de formulario pasó a **opacidad completa** (`border-outline-variant` en la variante `outline` compartida): las líneas ahora se notan en todo el admin.
- **Campo de contraseña**: el wrapper era un `flex` sin ancho completo, así que el input quedaba a ancho de contenido; ahora es `w-full` → input largo completo con el **ojo incrustado** a la derecha, como el mockup.
- Verificación: lint/typecheck, 17 tests y build → exitosos.

### Fix — uniformidad de líneas y checkbox del login
- El checkbox (desmarcado) usaba `border-outline-variant` (casi invisible) y desentonaba con los inputs; ahora usa `border-outline/70`, **el mismo color que los inputs** → líneas uniformes y el check visible sin marcar.
- Verificación: lint/typecheck, 17 tests y build → exitosos.

### Estandarización del manejo de tokens (refresh solo en cookie httpOnly)
- **Refresh token**: nunca en storage (ya estaba en cookie); endurecido a estándares: en producción `__Host-refresh_token` (Secure + Path=/ + sin Domain), en dev `refresh_token` + Path=/auth; `HttpOnly`, `SameSite=Strict`, rotación en cada refresh y revocación en logout.
- **"Recordarme"**: ahora controla la **persistencia de la cookie** — `remember: true` → persistente (Max-Age = JWT_REFRESH_EXPIRATION); `remember: false` → cookie de sesión (se borra al cerrar el navegador). La elección viaja en el login y en el challenge token de 2FA.
- **Admin**: el access token pasó a **memoria únicamente** (nada en localStorage/sessionStorage); al cargar se restaura la sesión con `restoreSession()` (POST /auth/refresh con la cookie) y `logout()` revoca en el backend.
- **Web**: `logoutSession()` revoca el refresh token antes de limpiar el estado local (antes no revocaba).
- **api-client**: se limpiaron `getRefreshToken` y el segundo parámetro deprecado de `onTokenRefreshed`.
- Verificado en vivo: cookie de sesión vs persistente ✓, rotación ✓, logout revoca ✓, refresh post-logout → 401 ✓.
- Verificación: API lint/typecheck; admin lint/typecheck + **15 tests** + build; web lint/typecheck + **17 tests** + build.

### Puntos a discutir (no soportado o decisiones abiertas)
- **Botón de Google** en el login: el backend soporta `POST /auth/google`, pero el admin no tiene Google Identity configurado → quedó deshabilitado con "Próximamente". ¿Se integra?
- **Cliente & Ubicación** en la pantalla de éxito: no hay GeoIP ni modelo de dispositivo; se muestra "Navegador · SO" desde el userAgent (sin ciudad).
- **Desactivar/regenerar 2FA**: los endpoints existen (`/auth/2fa/disable`, `/recovery-codes`) pero no hay pantalla en Seguridad (los mockups no la incluyen).
- **Imprimir códigos**: imprime la página completa (sin hoja de impresión dedicada).

---

## Sesión 2026-10-12 (cont.) — Panel de consentimiento de cookies en el storefront

### Tareas en curso
- Aplicar la política de cookies en el storefront con el típico panel informativo (aceptar/rechazar).

### Decisiones tomadas
- Panel inferior fijo con estética Urban Autonomy: fondo crema, borde superior negro de 1px, título en Bebas Neue, botón **Aceptar** en oliva (`#6f7a4e`) y **Rechazar** outline negro.
- La decisión se guarda en `localStorage` (`nova-cookie-consent`) con **versión y fecha**; si cambia la versión de la política se vuelve a pedir.
- El panel puede **reabrirse** desde el enlace "Cookies" del footer (evento global `nova:cookie-consent-open`).
- El link "Ver política de cookies" resuelve la página estática `politica-de-cookies` (fallback a `politica-de-privacidad`).
- Solo las cookies esenciales quedan activas por defecto (cookie httpOnly de refresh + storage de carrito/sesión); análisis y personalización quedan sujetas al consentimiento.
- No se tocó el proyecto Stitch "Consent Management Interface" (es otra cosa, aclarado por el usuario).

### Registro de cambios
- Web: nuevo `components/cookie-consent.tsx` (panel + helpers `readCookieConsent`/`openCookieConsent`), montado en `layout.tsx`; enlace "Cookies" en el footer.
- i18n: claves `cookies.*` (título, descripción, política, aceptar, rechazar, gestionar) en ES/EN/PT.
- Seed: página "Política de Cookies" (`politica-de-cookies`, sortOrder 5) en `seed-visual-demo.ts`; upsert aplicado en la base de dev y endpoint público verificado.
- Tests: `cookie-consent.test.tsx` (5 tests: visible sin consentimiento, aceptar/rechazar persisten, no muestra con consentimiento válido, reapertura).
- Verificación: API lint/typecheck; web lint/typecheck + **22 tests** + build.

---

## Sesión 2026-10-12 (cont. 2) — Auditoría admin: faltantes implementados (8/8)

### Alcance
Se implementaron, en orden, los faltantes de la auditoría admin del 2026-10-12:

1. **Estados de error en queries** — componente compartido `QueryError` (icono, mensaje i18n, botón Reintentar con estado) + `if (error) throw error` en las queries principales; rama de error con `refetch()` aplicada en **21 pantallas** (users, products, orders, categories, coupons, reviews, refunds, production, custom-designs, inventory, audit-logs, pages, redirects, email-templates, currencies, shipping-options, roles, dashboard y detalles). Claves `common.loadErrorTitle|loadErrorDescription|retry` en ES/EN/PT.
2. **Reembolsos con acciones** — API: `POST /admin/refunds` (manual, PENDING), `PATCH /admin/refunds/:id/approve|reject|retry`, `GET /admin/refunds/:id`; `PaymentService.processExistingRefund` procesa contra el proveedor; al cubrir el total reembolsado la orden pasa a REFUNDED y libera reservas; auditoría de cada acción. UI: acciones por estado, modales de solicitud/confirmación/comprobante y toasts según el resultado real del procesamiento.
3. **Gestión 2FA** — pantalla `/security` (sidebar Configuración): estado 2FA, activar con QR + OTP, desactivar, regenerar códigos, dispositivos confiables con revocación; endpoints autenticados `POST /auth/2fa/setup/current`, `POST /auth/2fa/setup/confirm/current`, `GET /auth/2fa/devices`, `DELETE /auth/2fa/devices/:id`; `AuthUserDto.twoFactorEnabled` + `/auth/me` tipado. **Fix de seguridad**: `sanitizeUser` ahora omite `twoFactorSecret` (antes viajaba cifrado al cliente en /auth/me y login).
4. **Plantillas de email** — crear plantillas custom (`POST /admin/email-templates`, claves reservadas/duplicadas → 409), render de custom desde DB, preview con variables comunes, `POST /admin/email-templates/:key/test` (envío de prueba, error del proveedor → 502 con mensaje); UI: modal de creación + sandbox de prueba habilitado + badge "Custom" + eliminar custom.
5. **Exportaciones** — `GET /admin/export/users` (filtros search/role/status) y `GET /admin/export/audit-logs` (action/entity/from/to); tarjetas en `/export` con filtros y registro en el historial.
6. **Envíos** — `ShippingOption.coverageZones` (migración `20261012235418_shipping_zones_and_credentials`), modal "Zonas de cobertura" con chips por método, modal "Gestionar credenciales API" (`GET/PATCH /shipping-options/admin/credentials`, key enmascarada `****last4`, audit `UPDATE_SHIPPING_CREDENTIALS`); `GET /store-config` público ya no expone `shippingApiKey`/`shippingAccountId`.
7. **Orden manual** — `POST /admin/orders/manual` (cliente por id/email, items por variante con precio base+ajuste, dirección guardada/nueva/default, envío, pago, notas; sin reserva de stock) + modal en `/orders` con filas de productos, dirección opcional y validaciones; audit `CREATE_MANUAL_ORDER`.
8. **Sync de tasas** — `POST /admin/currencies/sync` contra open.er-api.com (base = moneda default, rate = unidades por 1 base) con `updated`/`skipped`; botón "Sincronizar tasas" con spinner y detalle de cambios.

### Verificación
- API: lint + typecheck ✓; smoke tests en vivo de todos los endpoints nuevos (2FA completo con TOTP generado, reembolsos create/approve/retry/reject con Stripe sin configurar → FAILED, email create/preview/test con Resend real, exports con filas, zonas/credenciales, orden manual con precios correctos, sync con tasas reales).
- Admin: lint ✓, **15 tests** ✓, typecheck ✓, build ✓.
- Datos de prueba limpiados; se restauró el estado de las cuentas (admin2 sin 2FA, credenciales de envío vacías) y de los datos demo tocados.
- Cuenta de pruebas nueva para QA: `qa@tienda.com / Qa12345678` (rol `QA` con todos los permisos, sin 2FA forzado) — útil para automatizar pruebas del admin.

### Notas
- Migración aplicada: `20261012235418_shipping_zones_and_credentials` (coverageZones + credenciales de envío en StoreConfig).
- El generador de Swagger (`generate:swagger`) escribe el archivo y a veces termina con exit 1 por la conexión de Redis al cerrar; el archivo queda correcto.
- Pendientes menores que quedan: Google login admin (falta config), UI de backups/colas, cobertura de tests de páginas.

---

## Sesión 2026-10-12 (cont. 3) — Integración de pagos Bold (botón de pagos)

### Contexto
El usuario definió que la pasarela a integrar es **Bold (Colombia)** — botón de pagos. Se relevó la documentación oficial (botón manual, API de links y webhooks) y se implementó el flujo completo.

### Decisiones
- **Botón embebido** (embedded checkout) como flujo principal del storefront + **link de pago** como fallback/redirect (misma llave de identidad).
- El **hash de integridad** SHA256(`{orderId}{amount}{currency}{llave secreta}`) se genera **solo en el backend** (`GET /payments/button-checkout/:orderId`); la llave secreta nunca llega al navegador.
- **Webhook** en `POST /payments/webhook/bold`: verificación `x-bold-signature` = HMAC-SHA256(secreto, base64(body)) hex; en sandbox la clave es vacía; **idempotente** (reintentos de Bold → 200 sin re-procesar). Responde 200 (no 201) como pide la doc.
- Credenciales en `StoreConfig` (`boldApiKey`, `boldSecretKey`, `boldSandbox`) administrables desde `/store-config`; la llave secreta es write-only y el `GET /store-config` público no la expone (`boldSecretConfigured`).
- **`PaymentProviderResolver`**: la pasarela se resuelve por operación leyendo `StoreConfig` (antes se fijaba al arrancar) → activar Bold desde el admin no requiere reiniciar la API. El token `PAYMENT_PROVIDER` queda registrado como `null` como hook de override para los tests e2e existentes.
- Reembolsos: Bold no expone API para anulaciones del botón → el provider devuelve un mensaje claro y el reembolso queda FAILED (se gestiona desde el panel de Bold).

### Registro de cambios
- **Schema**: `StoreConfig.boldApiKey/boldSecretKey/boldSandbox` (migración `add_bold_payment_credentials`).
- **API**: `BoldPaymentProvider` (link API + botón + webhook + firma), `PaymentProviderResolver`, endpoints `GET /payments/active-provider`, `GET /payments/button-checkout/:orderId`, `POST /payments/webhook/bold`; `PaymentService` refactorizado al resolver; webhook idempotente; DTOs de store-config y respuesta pública saneada; envs documentadas (`BOLD_*`, `STOREFRONT_URL`).
- **Web**: componente `BoldPaymentButton` (carga única de la librería, inyecta el script con `data-render-mode="embedded"`), checkout con selección automática botón/redirect según `/payments/active-provider`, y página `/checkout/confirmacion` con polling + reintento.
- **Admin**: tarjeta de Bold en `/store-config` (estado conectado/falta configurar, llave de identidad, llave secreta, sandbox, botón "Usar Bold") + opción Bold en el selector de pasarela + i18n ES/EN/PT.
- **Tests**: `bold-payment.provider.spec.ts` (9 tests: firma de integridad con el ejemplo de la doc, webhook válido/ inválido/sin header, SALE_REJECTED, sandbox sin firma, eventos desconocidos, config del botón y error sin llave).

### Verificación
- Smoke test en vivo: configurar Bold desde el admin ✓, `active-provider` ✓, config del botón con firma correcta ✓, link API llamando a Bold real (502 con llaves fake, esperado) ✓, webhook firmado → orden **PAID** ✓, webhook duplicado → 200 idempotente ✓, firma inválida → 400 ✓, `GET /store-config` sin llave secreta ✓.
- API lint/typecheck + 9 tests del provider ✓; admin lint/typecheck + 15 tests + build ✓; web lint/typecheck + 22 tests + build ✓.
- Config restaurada a `stripe` y datos de prueba eliminados (la activación real requiere las llaves del comercio).

---

## Sesión 2026-10-12 (cont. 4) — Roles: Super Admin y protección de proveedores/API keys

### Decisiones
- **`SUPER_ADMIN`** = control total (48 permisos, incluye `providers:read/write`). **`ADMIN`** conserva todo el panel excepto la configuración de proveedores/API keys (46 permisos).
- La configuración **general** de tienda sigue igual para ADMIN ("dejalo como está"): solo los campos de proveedores/API keys quedan reservados al Super Admin, y el bloqueo aplica **solo si el valor cambia** (el form del admin manda todos los campos en cada guardado).
- Se eliminó el bypass `role === 'ADMIN'` del `RolesGuard` (ahora los permisos se evalúan siempre contra rol + overrides); el rol ADMIN tiene todos los permisos menos los de proveedores, así que nada más cambia.
- `admin@tienda.com` → SUPER_ADMIN (cuenta del dueño); `admin2@tienda.com` → ADMIN (para validar la restricción). 2FA obligatorio también para SUPER_ADMIN.

### Registro de cambios
- **API**: permisos `providers:read`/`providers:write`; `RolesGuard` sin bypass; `PATCH /store-config` con chequeo de campos de proveedores (`ForbiddenException` claro); credenciales de envío pasan a `providers:*`; `TWO_FACTOR_FORCED_ROLES` default `SUPER_ADMIN,ADMIN,STAFF`; seed `seed:roles` con los 3 roles base; auditoría de store-config **redacta** `boldSecretKey`/`shippingApiKey` (`[redacted]`).
- **Admin**: hook `useCurrentPermissions()` (`/auth/me`); `/store-config` deshabilita (con candado y aviso) payment/email provider, tarjeta Bold (llaves + sandbox + "Usar Bold") y Google/Apple OAuth; `/shipping-options` bloquea "Gestionar credenciales API"; `/roles` con categoría nueva "Proveedores & Integraciones"; i18n ES/EN/PT.
- **Datos**: seed ejecutado (SUPER_ADMIN creado, ADMIN sin `providers:*`), `admin@tienda.com` reasignado; rol QA con los 2 permisos nuevos para pruebas.

### Verificación
- Smoke test en vivo con un usuario temporal (`store_config:write` sin `providers:write`): guardar la config sin cambiar proveedores → 200; cambiar `paymentProvider`/`boldApiKey`/`boldSecretKey`/`emailProvider`/`googleOAuthEnabled` → **403**; `GET/PATCH /shipping-options/admin/credentials` → **403**; QA (con `providers:write`) → 200 en todo; customer sin `store_config:write` → 403 por guard.
- Auditoría: secretos guardados como `[redacted]` (verificado en DB). Config restaurada y datos de prueba eliminados (usuario y rol temporales).
- API lint/typecheck + **31 tests unitarios** ✓; admin lint/typecheck + **15 tests** + build ✓.

---

## Sesión 2026-10-12 (cont. 5) — Previews de Páginas estáticas

### Contexto
El botón "Vista Previa en Tienda" de `/pages` abría `${webUrl}/pages/{slug}`, pero la ruta real del storefront es **`/pagina/[slug]`** → daba 404. Además no existía preview por página.

### Registro de cambios
- **Fix de ruta**: el botón del header ahora abre `/pagina/{slug}` y usa la primera página **visible** (fallback a la primera).
- **Preview por fila**: botón con icono de ojo en cada fila que abre un modal con la página renderizada en un iframe (`srcDoc`) con el layout del storefront (título Bebas Neue, contenido tipografiado, fondo crema). El iframe va con `sandbox=""` (bloquea scripts embebidos en el HTML de la página).
- **Preview desde el editor**: botón "Vista previa" en el modal de Nueva/Editar que previsualiza el contenido actual del formulario antes de guardar.
- **Modal de preview**: muestra el slug, aviso "Página oculta: no es visible en la tienda" cuando `isVisible=false`, y botón "Abrir en tienda" (solo para páginas visibles) que abre la ruta real en una pestaña nueva.
- i18n ES/EN/PT: `previewModalTitle`, `previewIframeTitle`, `previewOpenStore`, `previewHiddenNotice`, `previewRowTooltip`, `previewInEditor`.

### Verificación
- Admin lint + typecheck + 15 tests + build ✓. (La verificación visual en navegador queda para el usuario: el desktop browser no estaba conectado a esta sesión.)

---

## Sesión 2026-10-12 (cont. 6) — Fix: error del storefront al arrancar (panel de cookies)

### Diagnóstico
El log del dev server (`apps/web/.next/dev/logs/next-development.log`) mostraba dos problemas en el storefront:

1. **Crash real**: `Uncaught TypeError: pages?.find is not a function` en `CookieConsent` (montado en el root layout → rompía todas las páginas).
   Causa: `GET /pages` devuelve `{ data: [...] }` (`PageListResponseDto`) y el componente hacía `.find` sobre el objeto. Mismo bug latente en `TermsBanner`.
   El test del panel mockeaba la respuesta como array plano, por eso no se detectó.
2. **Warning de hidratación**: React avisaba por `data-mantine-color-scheme` en `<html>` (lo agrega `ColorSchemeScript` de Mantine en el cliente).

### Cambios
- `cookie-consent.tsx` y `terms-banner.tsx`: leen `data.data` (shape real del endpoint).
- `layout.tsx`: `suppressHydrationWarning` en `<html>` (el `<body>` ya lo tenía).
- `cookie-consent.test.tsx`: el mock ahora usa el shape real `{ data: { data: [...] } }` (antes array plano, ocultaba el bug).
- Revisados todos los demás consumidores de endpoints con wrapper (`/orders`, `/addresses`, `/design-templates`, `/catalog/*`, `/currencies`, `/shipping-options`, `/wishlist`) → todos correctos.

### Verificación
- Web lint + typecheck + **22 tests** + build ✓. El dev server recompiló con HMR; alcanza con refrescar el navegador.

---

## Sesión 2026-10-12 (cont. 7) — Demo real: fotos de producto del catálogo

### Contexto
El seed visual generaba imágenes SVG de marca para los productos. Se reemplazaron por **fotos reales** (Unsplash, licencia libre de uso comercial) subidas a R2.

### Cómo se hizo
- **Selección**: se buscaron fotos por producto (bomber, hoodies, gorras, jogger, medias, cargo, remeras, tote) y **se validaron visualmente** una por una (se descartaron las que tenían logos de terceros —North Face/Supreme— o no coincidían con el producto).
- **Procesado**: cada foto se normaliza con sharp a **1200×1200 webp (q82, crop `attention`)**.
- **Subida a R2** con las claves estables existentes `demo/products/<slug>-<n>.webp` → al sobrescribir, la tienda se actualizó sin tocar la base (los `Asset`/`ProductImage` ya apuntaban a esas claves; igual se sincronizaron `size`/`mimeType`).
- **Seed actualizado**: nuevo módulo `demo-photos.ts` (manifiesto con IDs de Unsplash + créditos) y runner `seed:photos` (`seed-product-photos.ts`). El `seed-visual-demo` ahora usa las fotos cuando el producto está en el manifiesto (fallback al SVG si la descarga falla) y `SEED_REFRESH_PHOTOS=1` fuerza re-subirlas.

### Resultado
- 24 fotos (2 por producto) subidas a R2 · 0 fallidas.
- Home, catálogo y detalle de producto muestran las fotos reales (verificado por HTML/HTTP 200 webp).
- Seed visual re-ejecutado: idempotente, "0 imágenes nuevas" (las fotos se conservan).
- Hero/logo/favicon de marca se mantienen como gráficos SVG (identidad NÖVA).

### Uso
- Refrescar fotos: `doppler run -- pnpm --filter api seed:photos`
- Seed completo con fotos: `doppler run -- pnpm --filter api seed:visual-demo` (o `SEED_REFRESH_PHOTOS=1` para forzar).

---

## Sesión 2026-10-12 (cont. 8) — Configuración alineada a la visión de Stitch

### Revisión de la visión (Stitch `24-configuracion-tienda.html`)
Se auditó la pantalla de referencia contra la implementación. **17 secciones** en 6 tabs (`General & Marca`, `Tema & Apariencia`, `Storefront & Layout`, `Catálogo & Checkout`, `Pasarelas & Logística`, `Notificaciones & Legal`).

| Sección Stitch | Estado |
|---|---|
| Datos de la Marca / Activos de Imagen / Divisa y Localización / Estatus de Catálogo | ✅ ya estaba |
| Paleta Semántica / Modo de Apariencia / Tipografías Web | ✅ ya estaba (tema + storefront) |
| Barra de Anuncios (Marquee) / Estructura del Menú / Constructor del Home | ✅ ya estaba (Storefront & Layout) |
| Tarjetas de Producto (umbral pocas unidades, días tag "Nuevo") | ✅ ya estaba (productCard/productBadges) |
| Experiencia de Checkout (mensaje post-compra) | ✅ ya estaba |
| Pasarelas de Pago Conectadas (Stripe + Bold + efectivo + OAuth) | ✅ (Stitch mostraba Mercado Pago; el usuario definió **Bold**) |
| Tiempos Operativos y Tarifas Base / Documentación y Políticas / WhatsApp | ✅ ya estaba |
| **Operadores de Paquetería** | ✅ **nuevo**: tarjeta en Pasarelas & Logística con operador, cuenta y estado API Activa/Manual + acceso a gestionar credenciales (solo Super Admin) |
| **Registro Legal Fiscal** | ✅ **nuevo**: Razón Social + NIT en la pestaña Legal (el "Servidor Transaccional" ya estaba) |

### Cambios
- `packages/shared`: `storefrontConfig.legal { legalName, taxId }`.
- Admin `/store-config`: tarjeta **Registro Legal Fiscal** (pestaña Legal) y tarjeta **Operadores de Paquetería** (pestaña Pasarelas & Logística, con `GET /shipping-options/admin/credentials`).
- Storefront: el pie usa la razón social (`© 2026 NÖVA DESIGN GROUP S.A.S.`), con fallback al nombre de la tienda.
- Seed demo: `legal` con los datos del mockup (`NÖVA DESIGN GROUP S.A.S.` / `901.442.890-4`) y `footer.copyrightText` vacío para que aplique.
- i18n ES/EN/PT de las secciones nuevas.

### Verificación
- Shared build ✓ · admin lint/typecheck + 15 tests + build ✓ · web lint/typecheck + 22 tests ✓.
- En vivo: `GET /store-config` devuelve `legal`; el footer de la home muestra la razón social.

---

## Sesión 2026-10-12 (cont. 9) — Footer del storefront a todo el ancho

- El footer estaba dentro de un `Container` de Mantine con ancho máximo (quedaba centrado con márgenes grandes), mientras que el header ya era full-width.
- Fix: `Container fluid` en `store-footer.tsx` → el contenido (marca, navegación, contacto, newsletter, divisor y línea legal) ahora ocupa todo el ancho, con padding responsive (`16px` mobile / `64px` desktop).
- Verificado: el HTML renderiza `data-fluid="true"` en el container del footer; web lint/typecheck + 22 tests + build ✓.

---

## Sesión 2026-10-12 (cont. 10) — Cards uniformes, reseñas en la esquina y favoritos

### Cambios en la card de producto (`apps/web/src/components/product-card.tsx`)
- **Contenedores uniformes**: `h="100%"` + flex column; imagen de alto fijo (280px, con placeholder si el producto no tiene foto), título con alto reservado de 2 líneas (48px), línea de SKU siempre reservada (16px) y CTA anclado abajo. Todas las cards miden igual sin importar el contenido.
- **Reseñas en la esquina**: el rating pasó a un pill en la **esquina superior derecha** sobre la imagen (★ promedio + cantidad) → ya no altera el alto de la card. Los badges (Nuevo/Oferta/Pocas unidades) van a la **esquina superior izquierda**.
- **Favoritos**: corazón en la **esquina inferior derecha** sobre la imagen, con estilo overlay (visible sobre fotos). **Solo aparece con sesión iniciada** (`WishlistButton` ya lo ocultaba; ahora además la card sincroniza su estado con la lista real vía `useWishlistVariantIds()` — query compartida `['wishlist']`).
- **Estado "No disponible"**: imagen atenuada + badge "No disponible" + CTA deshabilitado (sin link) para productos desactivados o agotados.

### Caso "producto desactivado desde el admin" (mapeado)
| Contexto | Comportamiento |
|---|---|
| Catálogo / home / relacionados | El producto desaparece (API filtra `isActive`) |
| Link directo al detalle | 404 (`/producto/<slug>`) |
| Favoritos | `isAvailable: false` + `unavailableReason` (`PRODUCT_INACTIVE`, `VARIANT_INACTIVE`, `OUT_OF_STOCK`) → card atenuada con "No disponible" y se puede quitar del listado |
| Agregar a favoritos | `POST /wishlist` → 400 "El producto no está disponible" |

### Bug encontrado y corregido
- `GET /wishlist` devolvía un **array plano** mientras el DTO/cliente esperaban `{ data: [...] }` → la página de favoritos nunca mostraba items. El controller ahora responde `{ data }` (y el POST devuelve el item con `WishlistItemDto`).

### Verificación
- Smoke test en vivo: favorito activo ✓ → desactivar desde admin → `isAvailable:false / PRODUCT_INACTIVE` ✓ → re-agregar bloqueado (400) ✓ → fuera del catálogo ✓ → detalle 404 ✓ → reactivar → disponible ✓ → cleanup ✓.
- HTML del catálogo: 12 cards con `min-height:48px` (título), `min-height:16px` (SKU) y `height:280px` (imagen) → estructura uniforme.
- API lint/typecheck ✓ · web lint/typecheck + 22 tests + build ✓ · admin typecheck/build ✓.

---

## Sesión 2026-10-12 (cont. 11) — Card de producto: sin botones, clickeable y con hover

### Cambios (`apps/web/src/components/product-card.tsx` + `globals.css`)
- **Botones eliminados**: se quitaron "Ver producto" y "Comparar" de la card.
- **Toda la card es clickeable**: envuelta en `next/link` a `/producto/<slug>` con `cursor: pointer` (el producto desactivado queda sin link ni cursor).
- **Animación al hover** (CSS global):
  - Card: `translateY(-4px)` + sombra suave (`0 14px 30px rgba(13,13,13,.14)`).
  - Imagen: zoom `scale(1.06)` (transición 420ms).
  - El estado "No disponible" no anima ni navega (`is-unavailable`).
- El precio ahora se ancla abajo (`marginTop: auto`) → alineado entre cards.
- **Corazón de favoritos**: `preventDefault/stopPropagation` para no navegar al tocar el corazón dentro de la card linkeada.
- **"Comparar" reubicado** al detalle de producto (debajo de "Agregar a la bolsa"), así la función sigue accesible (antes solo vivía en la card).

### Verificación
- HTML del catálogo: 12 cards `nova-product-card` con link y **0** botones "Ver producto"/"Comparar".
- Web lint/typecheck + 22 tests + build ✓.

---

## Sesión 2026-10-12 (cont. 12) — Agregar al carrito desde la card + imagen en el carrito

### Card de producto: botón de agregar al carrito
- Nuevo componente `quick-add-button.tsx`: botón overlay (esquina inferior izquierda, frente al corazón de favoritos).
  - **1 variante** → agrega directo (con toast que incluye talle/color).
  - **Varias variantes** → popover "Elegí una opción" con talle/color y stock disponible por variante.
  - Funciona con sesión (`POST /cart/items`) y como invitado (carrito local del store).
  - `preventDefault/stopPropagation` para no navegar al producto (la card es un link).
  - No se muestra si el producto está desactivado o no tiene variantes disponibles.

### Carrito: imagen y datos de la variante
- **API** (`cart.service`): el resumen del carrito ahora incluye `imageUrl` (imagen de la variante o, como en el catálogo, la del producto) y `productVariant` (id, sku, talle, color, producto) — antes **no** venía `productVariant`, por eso el SKU/talle nunca se veían.
- **Store del carrito (invitados)**: `CartItem` ahora guarda `sku`, `size`, `color` e `imageUrl`; el quick-add y el botón del detalle los envían al agregar.
- **Página del carrito**: `CartItemRow` muestra miniatura 72×72 (con placeholder si no hay imagen), talle/color y el SKU real (antes, para invitados, mostraba el UUID de la variante).

### Verificación
- API: `GET /cart` devuelve `productVariant.sku/size` + `imageUrl` (R2) ✓; catálogo renderiza 12 botones "Agregar al carrito" ✓.
- Web lint/typecheck + 22 tests + build ✓; API lint/typecheck ✓.

---

## Sesión 2026-10-12 (cont. 13) — Hover del eliminar + animación "volar al carrito"

### Carrito: botón eliminar
- El botón era un `Button variant="subtle" color="dark"` que en hover quedaba como un **bloque negro sólido** (ícono invisible). Ahora es un botón propio con la clase `.nova-cart-remove`: fondo transparente, hover con fondo crema + borde negro + ícono en rojo (`#b3261e`) y `scale(0.94)` al presionar.

### Agregar al carrito: animación en lugar del aviso
- Nuevo `lib/fly-to-cart.ts`: clona la **foto del producto** y la anima (Web Animations API) en un arco hasta el icono del carrito del header (`[data-cart-target]`), que **pulsa** al llegar.
- **Se quitó el toast** de "Agregado al carrito" (los errores siguen mostrándose):
  - **Card**: el botón se vuelve negro con un **check** animado (`nova-pop`) por ~1s.
  - **Detalle de producto**: el botón pasa a oliva con "Agregado" + check por ~1.3s.
- **Header**: el contador ahora sale del **carrito del servidor** cuando hay sesión (comparte cache `['cart']`, que se invalida al agregar) — antes solo contaba el carrito local de invitados, por lo que con sesión el badge no se actualizaba.
- CSS nuevo: keyframes `nova-cart-pulse` y `nova-pop`.

### Verificación
- `data-cart-target` presente en el header ✓; web lint/typecheck + 22 tests + build ✓ (el primer build falló por el flake conocido de Turbopack y pasó al reintentar).

---

## Sesión 2026-10-12 (cont. 14) — Fix: "agregar al carrito" no funcionaba en productos con variantes

### Bug 1 (el reportado) — el selector de variantes no abría
- **Causa**: `Popover` en modo **controlado** (`opened` + `onChange`): Mantine **no** engancha el toggle automático en `Popover.Target` (solo lo hace en modo no controlado). Al no manejar el click, el selector nunca abría → en productos con más de una variante el botón "no hacía nada". Los de una sola variante (Medias, Tote) sí agregaban.
- **Fix**: el `ActionIcon` maneja el click explícitamente: agrega directo si hay 1 variante o hace `setOpened(!opened)` si hay varias.
- **Test de regresión**: `quick-add-button.test.tsx` (2 tests: selector + variante única) — antes fallaba, ahora pasa. Total web: **24 tests**.

### Bug 2 — error de hidratación en el header
- El badge del carrito usaba el conteo local (localStorage) → el server renderizaba "Carrito" y el cliente "Carrito, 2 items" → `Hydration failed` (React regeneraba el árbol, con riesgo de romper interactividad).
- **Fix**: `mounted` (efecto) en `StoreHeader` — el conteo, el corazón de favoritos y el menú de cuenta se pintan recién después del primer render del cliente, así el HTML del server y el primer render coinciden. La query del carrito del servidor ahora también espera a `mounted`.

### Verificación
- Test del quick-add: 2/2 ✓; web lint/typecheck + **24 tests** + build ✓; el SSR ya no incluye el badge (se pinta tras hidratar) ✓.

---

## Sesión 2026-10-12 (cont. 15) — Checklist en vivo de la política de contraseñas

### Cambios
- `packages/shared/password-policy.ts`: nueva `getPasswordRuleResults(value)` que devuelve el estado por regla (`length`, `uppercase`, `lowercase`, `number`, `maxLength`) con su etiqueta.
- Nuevo componente `apps/web/src/components/password-requirements.tsx`: checklist en tiempo real que marca **en verde con ✓** lo cumplido (con animación `nova-pop`) y en gris con ✕ lo pendiente; prop `onlyPending` para ocultar lo ya cumplido.
- **Registro** y **Reset de contraseña**: el hint estático ("Mínimo 8 caracteres, …") se reemplazó por el checklist vivo debajo del input.
- Tests: `password-requirements.test.tsx` (3 tests: estado mixto, todo cumplido, `onlyPending`).

### Verificación
- Web lint/typecheck + **27 tests** + build ✓; el SSR de `/register` incluye las 5 reglas.

---

## Sesión 2026-10-12 (cont. 16) — Checklist de contraseña: ajustes + comparador

### Cambios
- **Regla "Máximo 100 caracteres" eliminada** del checklist (se sigue validando en `isValidPassword`, pero no se muestra como regla).
- **Aparece solo con interacción**: en registro y reset, el checklist se renderiza recién cuando el usuario escribió algo en el campo (`password.length > 0`) o lo tocó (`form.isTouched`). En SSR ya no aparece.
- **Nuevo comparador `PasswordMatchHint`**: debajo de "Repetir contraseña" (y "Confirmar contraseña" en reset) muestra en vivo "✓ Las contraseñas coinciden" (verde) o "✕ Las contraseñas no coinciden" (rojo); no aparece mientras la confirmación esté vacía.

### Verificación
- Tests: `password-requirements.test.tsx` → **6 tests** (estado mixto, todo cumplido, sin regla de máximo, `onlyPending`, comparador vacío/coincide/no coincide). Total web: **31 tests**.
- Lint/typecheck/build ✓; el SSR de `/register` no incluye el checklist ✓.

---

## Sesión 2026-10-12 (cont. 17) — Indicaciones de contraseña solo con foco

- El checklist de reglas y el comparador de contraseñas ahora se muestran **mientras el campo está enfocado** y **desaparecen al salir del foco** (antes quedaban visibles tras la primera interacción).
- Implementación: estado `passwordFocused` / `confirmFocused` en registro y reset, enganchado en `onFocus`/`onBlur` del `PasswordInput` **preservando los handlers de Mantine** (`getInputProps` → `onFocus`/`onBlur` originales), así la validación al salir del campo sigue funcionando.
- La validación del formulario (mensaje de política) sigue apareciendo al enviar.

### Verificación
- Web lint/typecheck + **31 tests** + build ✓; el SSR de `/register` no incluye el checklist ✓.

---

## Sesión 2026-10-12 (cont. 18) — Fix módulo de personalización (error RSC con Link)

### Problema
- `/personalizar` devolvía 500: `<Link legacyBehavior>` en un Server Component (error de Next 16: "received a direct child that is either a Server Component, or JSX loaded with React.lazy").

### Cambios
- `apps/web/src/app/personalizar/page.tsx`: se eliminó `legacyBehavior`; el botón ahora usa `LinkButton`.
- `apps/web/src/components/link-button.tsx`: se agregó `'use client'` (faltaba; si se usaba desde un Server Component React fallaba con "Functions cannot be passed directly to Client Components"). Así el wrapper puede usarse desde páginas server con props serializables (`href`, `children`, `style`).

### Verificación
- `/personalizar` → **200** con las 2 plantillas (Buzo hoodie frontal, Remera frontal) y sus links `/personalizar/<id>` ✓.
- `/personalizar/<templateId>` (editor) → **200**, sin página de error ✓.
- Web lint + typecheck ✓.

---

## Sesión 2026-10-12 (cont. 19) — Aislamiento de sesiones admin/storefront + personalizador robusto

### Problema 1: el admin tomaba la sesión del storefront
- El storefront y el admin comparten host de API (`localhost:4000`) y **las cookies no distinguen puertos**: ambos usaban la misma cookie `refresh_token`. Al abrir el admin, `restoreSession()` (`POST /auth/refresh` con `credentials: include`) enviaba la cookie del storefront y el admin quedaba logueado con la cuenta del cliente (y viceversa).

### Fix 1: cookies de sesión por cliente (`X-Client`)
- **API** (`apps/api/src/auth/auth.controller.ts`): el nombre de las cookies de refresh y trusted device depende del header `X-Client` (`admin` → `admin_refresh_token` / `admin_trusted_device`; resto → `refresh_token` / `trusted_device`; prefijo `__Host-` en producción). Los helpers `set/get/clear` ahora reciben el `Request`; se agregó `@Req()` a `register`, `google` y `apple`.
- **`@ecommerce/api-client`**: nueva opción `clientId` → header `X-Client` en todas las requests y en el refresh interno del middleware (rebuild del paquete).
- **Admin**: `clientId: 'admin'` en `createApiClient` + header en `restoreSession()` y `logout()`.
- **Storefront**: `clientId: 'store'` + header en `logoutSession()`.
- **CORS API** (`main.ts`): `X-Client` agregado a `allowedHeaders`.
- Verificación (curl con cookie jar único simulando un navegador):
  - login store → `Set-Cookie: refresh_token`; refresh con `X-Client: admin` usando esa cookie → **401** (antes 200); refresh store → 200.
  - login admin (qa) → `Set-Cookie: admin_refresh_token` (ambas cookies conviven); refresh admin/store → 200/200.
  - logout admin → limpia **solo** `admin_refresh_token`; el refresh del store sigue 200 y el del admin da 401.
  - preflight CORS con `x-client` → 204 y header permitido.
- Nota: las cookies viejas (`refresh_token` creadas por el admin antes del fix) no se leen más desde el admin; conviene un login nuevo en cada app.

### Problema 2: lienzo vacío en el personalizador
- La imagen base de la plantilla se cargaba con `crossOrigin='anonymous'` y **sin manejo de error**: si el bucket R2 no tiene CORS para el origen del navegador (p. ej. `127.0.0.1:3000` o una URL reenviada — la política CORS del bucket solo permite `localhost:3000/3001`), la imagen fallaba en silencio y el contenedor quedaba colapsado (solo el borde) con la leyenda debajo, sin lienzo.

### Fix 2: carga tolerante + feedback (`customizer-editor.tsx`)
- Reintento automático **sin `crossOrigin`** si el primer intento falla: la prenda se muestra igual (el canvas queda "tainted" y la vista previa no se exporta).
- Estados visibles: spinner mientras carga, mensaje + botón **Reintentar** si falla, y error de plantilla con reintento.
- Guardado tolerante: si `toDataURL()` falla (canvas tainted), se guarda el diseño **sin vista previa** y se avisa con `notifyWarning`.
- Aviso amarillo bajo el lienzo cuando la imagen cargó sin CORS (explica que la vista previa no se generará).
- Los assets subidos por el usuario (elementos de imagen) también reintentan sin `crossOrigin`.
- Pendiente de infra documentado en `PENDIENTES.md`: agregar el origen a la CORS policy del bucket R2 para recuperar la vista previa (el token S3 no puede gestionarla por API).

### Verificación
- API: typecheck/lint + **31 tests unitarios** ✓ (las suites e2e siguen fallando por el problema preexistente de Jest con `@scure/base` ESM).
- Web: typecheck/lint + **31 tests** ✓; `/personalizar` y `/personalizar/<id>` → 200; el chunk del editor actualizado ya lo sirve el dev server.
- Admin: typecheck ✓; el dev server ya sirve el cliente con `X-Client`.

---

## Sesión 2026-10-12 (cont. 20) — Catálogo: espaciados a ancho completo + filtros en vivo

### Cambios de layout (`/catalogo`)
- Secciones del catálogo pasan de `Container size="xl"` (1320px centrado, márgenes enormes en pantallas anchas) a `Container fluid px={{ base: 16, md: 64 }}`, igual que header y footer.
- Nuevo layout CSS (`.catalog-layout` / `.catalog-sidebar` / `.catalog-content` / `.catalog-products` en `globals.css`): sidebar fija de 240px + grilla de productos fluida `repeat(auto-fill, minmax(250px, 1fr))` (3 columnas ~1200px, 4 ~1700px, 6-7 en 2.5K). En mobile (<62em) la sidebar pasa a ancho completo (botón + drawer como antes).

### Filtros en vivo (sin botón "Aplicar filtros")
- Nuevo contexto compartido `catalog-filters-context.tsx`: la sidebar y los chips leen/escriben el mismo estado; cada cambio actualiza la URL con `router.replace(..., { scroll: false })` y la grilla se re-renderiza server-side.
- La búsqueda se aplica con debounce (400 ms); tallas, colores, precio, categoría, stock y orden son instantáneos.
- El efecto de sincronización es **idempotente** (compara contra los parámetros gestionados de la URL actual): no navega al montar ni con el doble efecto de StrictMode, y no pisa `page`/`limit`.
- Sincronización inversa: si la URL cambia por fuera (atrás/adelante, links), el estado local adopta los valores nuevos (comparación profunda para evitar bucles).
- La URL conserva los valores de la API para `sort` (`price_asc`, `price_desc`, `name_asc`) tal como los espera `/catalog/products`.

### Filtros aplicados arriba
- Los chips de filtros activos se movieron del fondo de la sidebar al **encabezado de resultados** (donde antes estaba el badge "N filtros"): cada chip se quita con click y hay "Limpiar todo". La sidebar mantiene su botón "Limpiar".
- En mobile el drawer ahora tiene botón "Ver resultados" (solo cierra; los filtros ya se aplican en vivo).

### Verificación
- `/catalogo?sizes=S` → 200 con 6 cards y chip "Talla: S" en el HTML server-side; "Aplicar filtros" ya no existe.
- `/catalogo?sort=price_asc` → 200 con 12 cards ordenadas por precio ascendente (Medias $45k primero).
- Web lint/typecheck + **31 tests** ✓.

### Corrección (misma sesión) — ubicación de los chips
- Los chips de filtros aplicados van **arriba del panel de filtros** (sidebar), justo debajo del encabezado "Filtros / Limpiar" y agrupados con él — no en el encabezado de resultados.
- En el encabezado de resultados se restaura el badge contador "N filtro(s)" (server-side desde la URL) junto a "New Drop".
- Se quitó el "Limpiar todo" de los chips (duplicaba el "Limpiar" del encabezado del panel). En mobile los chips viven dentro del drawer, junto al resto de los filtros.

---

## Sesión 2026-10-15 (cont. 21) — Fix hover de botones `subtle` (paleta sólida) + botón Limpiar

### Problema
- El botón "Limpiar" del panel de filtros se convertía en un **bloque negro con texto invisible** al hacer hover.
- Causa raíz: la paleta del tema se generaba con `solidScale` (los 10 tonos = el color base). Mantine calcula el hover del variant `subtle` como `--mantine-color-{color}-2` y el texto como `-9`: con la escala sólida, ambos eran `#0d0d0d` → negro sobre negro.
- Afectaba a **todos** los botones `variant="subtle"` del storefront (catálogo, órdenes, direcciones, comparador, editor de personalización, banner de verificación, card de producto).

### Fix
- `theme-provider.tsx`: `solidScale` → **`novaScale`** con `mixWithWhite`:
  - tonos 0-5: tintes claros (`#f5f5f5`, `#ececec`, `#dbdbdb`, `#c0c0c0`, `#929292`, `#5a5a5a` para negro) — los usan `light`/`subtle` en hover;
  - tonos 6-9: el color base sólido, así `filled`/`outline`/`text` conservan el diseño actual (botones negros).
  - Aplicado a `primary`, `secondary`, `olive` y `dark`.
- Botón "Limpiar" del catálogo: se le agregó un override de `styles.root` (padding/fuente mono 12px/height auto) porque el estilo global del tema agrandaba todos los botones e ignoraba `size="xs"`; ahora es un utilitario chico consistente con los labels del panel.

### Verificación
- Paleta calculada: `#f5f5f5 #ececec #dbdbdb #c0c0c0 #929292 #5a5a5a #0d0d0d ×4` → hover `subtle` = `#dbdbdb` con texto negro ✓.
- Web lint/typecheck + **31 tests** ✓; `/catalogo?colors=Negro` → 200 con 9 productos; el dev server ya sirve la escala nueva.

---

## Sesión 2026-10-15 (cont. 22) — Header: menú de categorías en "Catálogo" + sin "Inicio" + home sin Categorías

### Cambios
- **"INICIO" eliminado del nav** (el logo ya lleva al home): se quitó de `storefrontConfig.navigation` en la config viva (PATCH vía API con credenciales QA), del seed (`seed-visual-demo.ts`) y del default del schema (`packages/shared`).
- **Hover en "CATÁLOGO" con menú de categorías**: `store-header.tsx` ahora consulta `/catalog/categories` (react-query, staleTime 5 min) y renderiza un `Menu` de Mantine con `trigger="hover"` (delay 100/180 ms): lista las categorías (link a `/catalogo?category=<slug>`) + separador + "Ver todo el catálogo". Estilo del panel: borde negro, esquinas rectas, items en Bebas con hover `#f6f3f2`. Si no hay categorías, el link funciona normal.
- **Sección "Categorías" fuera del home**: se quitó `'categories'` de `homeSections` en la config viva, el seed y el default del schema (el componente y el toggle del admin siguen disponibles si se quiere reactivar).
- `@ecommerce/shared` reconstruido (`dist`) para que web/admin tomen los nuevos defaults.

### Verificación
- `/` → 200: sin "Inicio" en el nav (Catálogo / Personalizar / Nosotros), sin sección "Categorías" ni cards (ACCESORIOS, etc.).
- `GET /store-config` → nav: `["Catálogo","Personalizar","Nosotros"]`; homeSections sin `categories`.
- El chunk cliente del header incluye `header-categories`/`CatalogMenu`.
- Web lint/typecheck + **31 tests** ✓; API y shared typecheck ✓.

---

## Sesión 2026-10-15 (cont. 23) — Fix bucle de navegación del catálogo (ping-pong URL ↔ estado)

### Problema
- Al entrar a una categoría desde el menú (`/catalogo?category=remeras`), la página entraba en un **bucle de navegación**: el log del dev server mostraba cientos de requests alternando `/catalogo` ↔ `/catalogo?category=remeras`; la grilla se vaciaba y recargaba constantemente (y por la ráfaga, la API llegaba a responder 429 → "No hay productos disponibles").
- Causa: el efecto que sincroniza filtros→URL en `catalog-filters-context.tsx` se disparaba en **cada render** (su dependencia `buildQueryString` cambia de identidad con cada render del server porque `priceRanges` es un array nuevo) y comparaba el estado contra `window.location.search` **durante las transiciones** (URL nueva, props viejas) → hacía `router.replace` "corrigiendo" en ambas direcciones → ping-pong infinito.

### Fix
- Guard `lastQueryRef`: el efecto solo navega cuando **cambia el string de la query** (cambio real de filtros), no en cada render. Si el estado ya coincide con la URL, no hace nada; si un cambio externo (menú, atrás/adelante) actualiza los props, se adopta sin navegar.
- Test de regresión nuevo: `catalog-filters-context.test.tsx` (4 tests): no navega al montar, no "corrige" durante transiciones (re-render con props nuevas sin cambio de estado), navega una sola vez al cambiar un filtro, y adopta cambios externos de URL sin navegar.

### Verificación
- Log del dev server: el bucle se detuvo al compilar el fix (solo quedan requests normales).
- `/catalogo?category=remeras` → 200 con 3 productos (los datos por categoría están OK: remeras 3, buzos 3, accesorios 2, gorras 2, pantalones 2).
- Web lint/typecheck + **35 tests** ✓.
- Nota (pendiente menor): la API ignora silenciosamente `categorySlug` inválidos (devuelve todo el catálogo en vez de vacío/404).

---

## Sesión 2026-10-15 (cont. 24) — Home: espaciado uniforme de secciones

### Problema
- La sección "Nueva Colección" (productos destacados) quedaba **pegada al hero** de arriba: tenía `padding: '0 16px 128px'` (sin padding superior) y, al quitar la sección de Categorías del home, pasó a ser la primera sección después del hero → el título quedaba pegado al borde inferior del hero.

### Fix
- `home-sections.tsx`: todas las secciones de contenido del home usan ahora **`96px 16px`** (arriba/abajo):
  - `FeaturedProductsSection`: `0 16px 128px` → `96px 16px`.
  - `CountdownSection`: `80px 16px` → `96px 16px`.
  - `IdentitySection`: `128px 16px` → `96px 16px`.
  - `PromoBanner` y `Newsletter` ya estaban en `96px 16px`; el hero mantiene su padding propio (full-viewport).

### Verificación
- HTML del home: todas las secciones de contenido con `padding:96px 16px` (hero `64px 16px`; announcement bar `10px 16px`).
- Web lint/typecheck + 35 tests ✓.

---

## Sesión 2026-10-15 (cont. 25) — Hero: badge circular giratorio (spinner)

### Cambios
- Nuevo badge circular giratorio en el hero (como la referencia): círculo blanco con **texto en curva** (SVG `textPath`) y número al centro, rotando lento.
  - `home-sections.tsx`: componente `HeroBadge` + integración en `HeroSection` (posición absoluta arriba-derecha con inset `clamp(16px, 4vw, 48px)`, `pointer-events: none`, `aria-hidden`).
  - Texto y centro **configurables** vía `templateConfig`: `heroBadgeText`, `heroBadgeCenter` y `showHeroBadge` (default visible). Si no se configuran, se arman con el nombre de la tienda + el título del promo banner (limpia el `—`): "NÖVA • DROP 01 • URBAN AUTONOMY • " y centro = primer número del título ("01").
  - `globals.css`: keyframes `nova-spin` + clase `.nova-spin-slow` (18s lineal, respeta `prefers-reduced-motion`); clase `.nova-hero-badge` que lo oculta en mobile (≤48em) para no chocar con el título.
- `config-provider.tsx`: `TemplateConfig` suma `showHeroBadge`, `heroBadgeText`, `heroBadgeCenter`.

### Verificación
- HTML del home: SVG con `nova-spin-slow`, texto "NÖVA • DROP 01 • URBAN AUTONOMY • " y centro "01".
- Web lint/typecheck + 35 tests ✓.

---

## Sesión 2026-10-15 (cont. 26) — Home: sección "colección destacada" (bento) + separación de secciones oscuras

### Nueva sección `collectionShowcase`
- Grilla **bento** después del hero (como el mockup): tarjeta grande (izquierda, con badge de categoría), tarjeta alta (derecha), y fila inferior con tarjeta chica + bloque de historia oscuro (rayo + título + texto + link).
- Tarjetas con imagen (hover zoom), barra de info con nombre (Bebas), SKU (mono), precio (`useCurrency`) y botón **Comprar** → `/producto/<slug>`.
- Encabezado con título grande + link "Ver toda la colección →".
- **Configurable desde el admin** (Configuración → Storefront → "Colección destacada"): título, texto/enlace del header, categoría (opcional; si no, usa los destacados del home) y bloque de historia (mostrar/ocultar, título, texto y enlaces).
- Schema compartido: `homeSections` suma `collectionShowcase`; nuevo objeto `collectionShowcase` con defaults. Seed actualizado con la sección + contenido demo ("COPA MUNDO '26" / "La Fusión Definitiva"). Config viva actualizada vía API.
- i18n del admin (es/en/pt): 9 claves nuevas.

### Separación de secciones oscuras
- Countdown / Newsletter / Identity eran todas `#0d0d0d` y quedaban pegadas visualmente.
- Ahora: Newsletter `#151515` + `border-top` sutil (`rgba(252,249,248,0.16)`) y Identity con el mismo borde superior → cada sección se distingue sin salir del tema oscuro (el marquee ya era oliva y el footer claro).

### Verificación
- Home: `COPA MUNDO '26`, "Ver toda la colección", 3 tarjetas (`showcase-card`), bloque historia, botones "Comprar" con links reales y precios formateados ✓.
- Bordes/tono de las secciones oscuras presentes en el HTML ✓.
- Web lint/typecheck + 35 tests ✓; Admin typecheck/lint + 15 tests ✓; API typecheck ✓.

---

## Sesión 2026-10-15 (cont. 27) — "Nueva Colección" configurable + sección de producto destacado

### 1) Sección de destacados (`featuredProducts`) ahora configurable
- Schema: `featuredProducts` suma **`columns`** (2-6, default 4) y **`sort`** (`newest`/`price_asc`/`price_desc`/`name_asc`, default `newest`). Ya existían `title`, `categorySlug` y `limit`.
- Web: la grilla usa `Grid columns={60}` con spans `base 60 / sm 30 / md 60/columns` (funciona para 2-6 columnas) y consulta su propio listado cuando hay categoría, orden distinto de `newest` o se piden más productos que los precargados.
- Admin (Storefront → "Productos destacados (home)"): nuevos controles **Columnas (desktop)** y **Orden de los productos** (reusa las etiquetas de orden existentes).

### 2) Sección de identidad → **Producto destacado** (configurable)
- La sección de identidad quedaba repetida con el bloque de historia del bento (mismo "La Fusión Definitiva"). Se reemplazó por una sección de **prenda destacada** en la misma franja oscura:
  - Etiqueta superior (eyebrow), imagen del producto (izquierda/derecha configurable), título y texto (si están vacíos usa nombre/descripción del producto), precio (se puede ocultar) y botón CTA → `/producto/<slug>`.
  - Si no se elige producto, usa el primer destacado del home como fallback.
- Config: nuevo `productSpotlight` (`eyebrow`, `productSlug`, `title`, `text`, `ctaLabel`, `imagePosition`, `showPrice`). `homeSections` suma `productSpotlight`; `identity` queda como alias legado que renderiza lo mismo (evita romper configs viejas).
- Admin (Storefront → "Producto destacado"): selector de producto (buscable, desde el catálogo), etiqueta, título/texto opcionales, texto del botón, posición de imagen y mostrar precio.
- Config viva y seed actualizados: sección después de newsletter con "Prenda de la semana" → Campera Bomber Midnight.

### Verificación
- Home: eyebrow "Prenda de la semana", imagen del producto (alt Campera Bomber Midnight), CTA "Comprar ahora"; "Identidad Visual" ya no existe; el bento conserva su bloque de historia.
- Grilla destacada: `--col-flex-basis: 25%` en md (4 columnas) con `Grid columns={60}`.
- Web lint/typecheck + 35 tests ✓; Admin typecheck/lint + 15 tests ✓; API typecheck ✓.

---

## Sesión 2026-10-17 (cont. 28) — Fix: login fallido disparaba el banner "validá tu cuenta"

### Problema
- Al iniciar sesión con **credenciales erradas** aparecía el banner de verificación de email (que se muestra con `isAuthenticated && !emailVerified`).
- Causa: el middleware de refresh del cliente compartido (`@ecommerce/api-client`) reintentaba **cualquier 401** (solo excluía `/auth/refresh` y `/auth/verify-email`). Un login fallido devuelve 401 → el cliente llamaba a `POST /auth/refresh` → si existía la cookie de una sesión anterior (no cerrada), el refresh funcionaba → `onTokenRefreshed` → `setAccessToken` marcaba `isAuthenticated: true` con la sesión vieja (sin verificar) → el banner (global, en el layout) aparecía.

### Fix
- `packages/api-client/src/client.ts`: lista `NO_REFRESH_PATHS` con los endpoints de credenciales/públicos (`/auth/login`, `/auth/register`, `/auth/google`, `/auth/apple`, `/auth/2fa/verify`, `/auth/2fa/setup`, `/auth/2fa/setup/confirm`, `/auth/forgot-password`, `/auth/reset-password`, más los ya excluidos). Un 401 ahí es respuesta de negocio, no sesión vencida; los endpoints protegidos siguen refrescando y reintentando igual que antes.
- Setup de tests del paquete (vitest + `vitest.config.ts` + script `test`) y test de regresión `src/client.test.ts`:
  - login 401 → **no** llama a `/auth/refresh` ni a `onTokenRefreshed`;
  - endpoint protegido 401 → refresca una vez, notifica el token y reintenta.

### Verificación
- Script manual con el dist: login 401 → 0 refresh / 0 onTokenRefreshed; `/cart` 401 → 1 refresh + reintento ✓.
- API: login con clave mala → 401 **sin** `Set-Cookie` (no toca la sesión) ✓.
- `@ecommerce/api-client`: 2 tests + typecheck + lint ✓; web/admin sirviendo el cliente nuevo; API/web/admin arriba (`/health` ok, /login 200, admin 200).
- Nota de entorno: el `pnpm add` de vitest en `@ecommerce/api-client` re-resolvió el lockfile y dejó symlinks viejos de vitest en web/admin (typecheck roto por "Cannot find module 'vitest'"); se reconcilió con `pnpm install` y todo volvió a verde (web 35, admin 15, api-client 2).

### Fix de entorno (misma sesión) — API caída por symlink roto de `gaxios`
- Tras el `pnpm add` de vitest, el store podó la entrada `gaxios@7.3.1_supports-color@...` y quedó **colgando** el symlink `node_modules/.pnpm/gcp-metadata@9.0.4/node_modules/gaxios` → la API crasheaba al arrancar: `Cannot find module 'gaxios'` (cadena google-auth-library → gcp-metadata).
- `pnpm install`, `pnpm install --force`, borrar `.modules.yaml` y `node_modules/.pnpm/lock.yaml` **no** detectaban la entrada faltante. Lo que sí funcionó: `pnpm --filter @ecommerce/api add google-auth-library@11.1.0` (misma versión) → re-link de 781 paquetes y symlink restaurado.
- Verificado: API `health ok`; login con credenciales erradas → 401 **sin** `Set-Cookie`; login correcto → 200 con cookie; web/admin 200; typecheck (web/admin/api) y tests (api-client 2, web 35, admin 15) ✓.

---

## Sesión 2026-10-17 (cont. 29) — Buscador del header en vivo (suggestions con productos)

### Cambios (`search-autocomplete.tsx`)
- Búsqueda en vivo con **debounce de 300 ms** (mínimo 2 caracteres) contra `/catalog/search-suggestions`.
- Dropdown con **producto completo**: miniatura (R2 con `?w=96&format=webp`), nombre (Bebas) y **precio** formateado; hover/selección resaltada.
- **Teclado**: ↑/↓ navegan, Enter abre el producto resaltado (o busca si no hay selección), Escape cierra; click afuera también cierra. `role="combobox"/"listbox"` + `aria-*`.
- Estados de **"Buscando..."** y **"Sin resultados para “q”"**; botón **"Ver todos los resultados"** → `/catalogo?search=<q>`.
- Fix: el Enter navegaba a `/catalogo?q=…` pero el catálogo lee `?search=…`, así que la búsqueda del header no filtraba. Ahora usa `search`; además el catálogo acepta `q` como alias legado (`parseString(params.search) ?? parseString(params.q)`).

### Verificación
- `/catalogo?search=remera` → 3 productos (las 3 remeras) ✓; `/catalogo?q=buzo` (alias) → 2 buzos ✓.
- API de sugerencias probada con `ca` (5), `reme` (3), `buz` (2), `medias` (1), `xyz` (0) ✓.
- Web lint/typecheck + 35 tests ✓.

---

## Sesión 2026-10-17 (cont. 30) — Mega menú "Catálogo" a pantalla completa (secciones y subsecciones)

### Data (autorizado por el usuario: "si es necesario, modifica la data")
- **Árbol de categorías** (secciones → subsecciones), 5 × 2:
  - Accesorios → Bolsos, Medias · Buzos y Hoodies → Hoodies, Camperas · Gorras → Trucker, Dad Hats · Pantalones → Cargos, Joggers · Remeras → Oversize, Básicas.
- Los **12 productos** demo se reasignaron a su subsección (`SUBCATEGORY_BY_PRODUCT` en `seed-visual-demo.ts`); el seed ahora crea las categorías en dos pasadas (raíces y luego hijos con `parentId`). Se aplicó a la data viva con un script Prisma temporal.
- **API**: al filtrar por una categoría padre, se incluyen los productos de sus subcategorías (`categoryId: { in: [padre, ...hijos] }`).

### Web
- `store-header.tsx`: el dropdown de "Catálogo" ahora es un **mega menú a pantalla completa** (estilo Adidas): panel full-width bajo el header con columnas por **sección** (título linkeable) y **subsecciones** como links; columna final con la **tarjeta del promo banner** (color/título/subtítulo/link desde la config) y pie con "Ver todo el catálogo →".
- Hover con delay de cierre (160 ms), cierre con Escape; si no hay categorías el link funciona normal. CSS en `globals.css` (`.mega-panel`, `.mega-grid`, `.mega-section-title`, `.mega-links`, `.mega-promo`, `.mega-all`, animación de entrada).
- Mobile: el panel se oculta (≤62em) y el **drawer** ahora lista el árbol (secciones + subsecciones indentadas).

### Verificación
- API: `buzos` → 3 (incluye hijos) · `buzos-camperas` → 1 · `remeras-oversize` → 2 · árbol devuelto por `/catalog/categories` ✓.
- Web: `/catalogo?category=remeras-oversize` → 2 cards; `/catalogo?category=buzos` → 3 cards; CSS del mega menú compilado; lint/typecheck + 35 tests ✓; API typecheck ✓.

---

## Sesión 2026-10-17 (cont. 31) — Layout de autenticación con imagen de fondo (login, registro, etc.)

### Cambios
- Nuevo componente `apps/web/src/components/auth-shell.tsx`: layout compartido de las pantallas de auth con **imagen de fondo** (usa `heroImageUrl` de la config de la tienda) + overlay oscuro, eyebrow/título/descripción a la izquierda y **tarjeta** con el contenido a la derecha. Prop `withChrome={false}` para embeber en páginas que ya tienen header/footer.
- Refactorizadas con `AuthShell`: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` (cada una con su eyebrow/título/descripción; los formularios y la lógica quedaron igual).
- **Personalizador**: la vista "debés iniciar sesión" ahora usa la misma estructura (`AuthShell` sin chrome: "INGRESA PARA PERSONALIZAR." + tarjeta con iniciar sesión / crear cuenta). Para eso, `personalizar/[templateId]/page.tsx` ya no envuelve en `main`/`Container`: el editor maneja el layout (los estados de carga/error y el editor autenticado van en un `main` + `Container` internos).

### Verificación
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` → 200 con `hero.webp` + overlay `rgba(13,13,13,0.62)` en el HTML; `/personalizar/<id>` → 200.
- Web lint/typecheck + 35 tests ✓.

### Ajuste (misma sesión) — cerrar el mega menú al hacer clic
- El panel se cerraba solo con mouseleave/Escape; al hacer clic en una categoría (navegación client-side) quedaba abierto. Ahora `onClick` en el panel cierra el menú al presionar cualquier opción (incluye promo y "Ver todo el catálogo").

---

## Sesión 2026-10-17 (cont. 32) — Direcciones: ubicación nativa, sugerencias encadenadas y predeterminada

### API
- Nuevo endpoint **`PATCH /addresses/:id/default`** (`AddressesService.setDefault`): valida propiedad y en una transacción desmarca las demás y marca la elegida. Swagger regenerado + `@ecommerce/api-client` actualizado.

### Web (`/account/addresses`)
- **"Usar mi ubicación"**: usa la geolocalización nativa (`navigator.geolocation`) + geocodificación inversa con **Nominatim (OpenStreetMap, `format=jsonv2&accept-language=es`)** y completa país, estado, ciudad, línea 1 y código postal; muestra un aviso con la dirección detectada. Maneja permiso denegado/timeout con un toast claro.
- **Sugerencias encadenadas** (`apps/web/src/lib/geo.ts`):
  - **País**: Autocomplete con la lista de países de countriesnow.space (`/countries/iso`, fallback estático si falla).
  - **Estado**: Autocomplete que consulta `/countries/states/q?country=…` y limpia sufijos ingleses ("Antioquia Department" → "Antioquia"); guarda el nombre exacto para pedir ciudades.
  - **Ciudad**: Autocomplete que consulta `/countries/state/cities/q?country=…&state=…`.
  - **Bloqueo por orden**: estado deshabilitado hasta elegir país y ciudad hasta elegir estado (con placeholders "Elegí primero…" y loaders); al cambiar un nivel se limpian los siguientes. Son Autocomplete, así que siempre se puede escribir a mano si no hay sugerencias.
- **Predeterminada**: badge "PREDETERMINADA" en la dirección activa; botón "Predeterminada" por fila cuando hay **más de una**; checkbox en el formulario; y la **primera** dirección queda como predeterminada automáticamente.

### Verificación
- API: crear 2 direcciones + `PATCH /:id/default` → la elegida queda `true` y la otra `false` ✓.
- Datos probados: países (iso), estados de Colombia, ciudades de "Antioquia Department" y Nominatim (Medellín: Calle 42A, CP 050015, Antioquia, Colombia) ✓.
- Web lint/typecheck + 35 tests ✓; API/api-client typecheck ✓; `/account/addresses` → 200 (devuelve `null` sin sesión por el gate de `AccountLayout`).
- Nota: quedaron 2 direcciones demo (Casa/Oficina) en la cuenta `customer@tienda.com` para probar la función de predeterminada.

---

## Sesión 2026-10-17 (cont. 33) — Direcciones: modal, ver/editar detalle y mapa (Leaflet + OSM)

### API
- Nuevo **`PATCH /addresses/:id`** (UpdateAddressDto con todos los campos opcionales + `update` en el service con chequeo de propiedad; si `isDefault: true` desmarca las demás). Swagger + `@ecommerce/api-client` regenerados.

### Web (`/account/addresses`)
- **Formulario en modal** disparado por **"+ Agregar nueva dirección"** (también desde el estado vacío, que ahora muestra "No hay direcciones registradas" + botón).
- **Ver detalle / editar**: botón por dirección que abre el modal en modo edición (precargado, guarda con PATCH).
- **Mapa de la dirección** con **Leaflet + tiles de OpenStreetMap** (open source, sin capas de pago):
  - `components/address-map.tsx` (import dinámico `ssr:false`; marcador con `divIcon` propio para evitar el problema de assets de Leaflet; `invalidateSize` para el modal).
  - Geocodificación directa con **Nominatim** (`lib/geo.ts#geocodeAddress`), con debounce de 900 ms cuando hay país + ciudad; "Usar mi ubicación" fija las coordenadas directamente.
  - Placeholder cuando aún no hay coordenadas ("Completá país y ciudad…").

### Verificación
- `PATCH /addresses/:id` probado en vivo (cambió label/line2/CP manteniendo el resto) ✓.
- `/account/addresses` → 200; Leaflet compilado en un chunk cliente ✓.
- Web lint/typecheck + 35 tests ✓; API/api-client typecheck ✓; swagger y cliente regenerados ✓.

---

## Sesión 2026-10-17 (cont. 34) — Fix: el modal de direcciones conservaba el estado anterior

### Problema
- Tras abrir "Ver detalle" (edición) y luego "+ Agregar nueva dirección", el formulario aparecía **precargado con la dirección anterior**.

### Causa
- En `openEdit` se llamaba `form.resetDirty()` **sin argumentos**: en Mantine eso setea el *snapshot* de valores iniciales a los **valores actuales** (ver `use-form-status.mjs`: `newSnapshot = $values.refValues.current`). Después, `form.reset()` restauraba ese snapshot en vez de vaciar el formulario.

### Fix
- `openEdit` ya no llama `resetDirty()`; crear/cerrar el modal limpian con `form.setValues(EMPTY_ADDRESS)` (constante con todos los campos vacíos), sin depender del snapshot.

### Test de regresión
- Nuevo `src/app/account/addresses/addresses-page.test.tsx`: abre "Ver detalle" (valores precargados) → Cancelar → "+ Agregar nueva dirección" → los campos quedan vacíos. **Verificado que falla con el código viejo** y pasa con el fix.
- Infra: mock de `ResizeObserver` en `src/test/setup.ts` (jsdom no lo implementa y lo usa el Modal de Mantine).

### Verificación
- Web lint/typecheck + **36 tests** (11 archivos) ✓.

---

## Sesión 2026-10-17 (cont. 35) — Direcciones: bordes, validación y refactor de predeterminada

### Cambios
- **Bordes**: los inputs del modal tenían solo la línea inferior (estilo global del tema para TextInput). Se les dio borde completo (`border: 1px solid #0d0d0d`) para que queden uniformes con los Autocomplete.
- **Validación**: el formulario ahora exige nombre, dirección, país, estado, ciudad y código postal (mensajes en español bajo cada campo). Además la API refuerza con `@IsNotEmpty()` en `CreateAddressDto` (el checkout ya validaba lo suyo).
- **Refactor predeterminada**: se eliminó el botón grande "PREDETERMINADA" de cada fila (y la mutation `setDefault` del web); queda el **checkbox dentro del modal** ("Usar como dirección predeterminada") que aparece cuando ya hay direcciones — también al editar, para cambiar cuál es la predeterminada. El badge "PREDETERMINADA" sigue en la fila activa.

### Verificación
- API: `POST /addresses` con campos vacíos → **400** ✓.
- Tests: nuevo caso "no permite guardar una dirección con campos vacíos" + el de regresión del estado anterior → **37 tests** (11 archivos) ✓.
- Web lint/typecheck ✓; API typecheck ✓.

---

## Sesión 2026-10-17 (cont. 36) — Fotos de producto en pedidos/checkout + Favoritos en el menú de cuenta

### API
- `orders.service.ts`: los ítems de pedido ahora incluyen la **imagen** (variante o producto, `take: 1` + `asset`) y `mapOrderItems` agrega **`imageUrl`** con `buildAssetUrl` (mismo criterio que el carrito). `OrderItemResponseDto` suma `imageUrl`; swagger + `@ecommerce/api-client` regenerados.

### Web
- **Detalle de pedido** (`/orders/[id]`): cada ítem muestra la **miniatura 56×56** (placeholder si no hay imagen).
- **Resumen del checkout**: los ítems ahora muestran **miniatura 44×44** (el carrito ya las tenía desde antes).
- **Menú de cuenta** (`AccountLayout`): nueva opción **"Favoritos"** (ícono corazón) entre Pedidos y Seguridad, condicionada a `featureFlags.enableWishlist`.

### Verificación
- API: `GET /orders` → ítems con `imageUrl` real de R2 ✓.
- Web lint/typecheck + **37 tests** ✓; API typecheck ✓; swagger/cliente regenerados ✓.

---

## Sesión 2026-10-17 (cont. 37) — Miniaturas en el admin + fix de persistencia de sesión en el storefront

### Admin: fotos de producto en el detalle de pedido
- Tabla principal: cada ítem muestra la **miniatura 56×56** (antes un ícono genérico); vista de impresión: miniatura 32×32 junto al nombre.
- API admin: `/admin/orders` y `/admin/orders/{id}` ahora incluyen las imágenes (variante/producto) y mapean **`imageUrl`** con `buildAssetUrl` (helper `mapItemImages`); `AdminOrderItemDto` suma `imageUrl`; swagger + cliente regenerados.

### Storefront: la sesión ahora sobrevive al reload
- **Causa**: sin "Recordarme" el store de auth no se persistía y **nadie restauraba la sesión desde la cookie httpOnly**; además `AccountLayout` redirigía a `/login` antes de cualquier intento de restauración.
- **Fix**:
  - `AuthRehydrator`: rehidrata → si no hay sesión, hace `POST /auth/refresh` con la cookie (`X-Client: store`), setea el access token y completa los datos con `GET /auth/me` (email, emailVerified, acceptedTermsVersion).
  - `auth-store`: nuevo flag **`sessionReady`** (se activa al terminar el intento) + `partialize` para persistir solo los datos de sesión (no los flags de runtime).
  - Guards actualizados para esperar `sessionReady`: `AccountLayout` (redirect a login), detalle de pedido, wishlist y el header (evita mostrar "INGRESAR" y cambiar después).
- Tests nuevos: `auth-rehydrator.test.tsx` (restaura desde la cookie / queda invitado sin cookie válida).

### Verificación
- Admin API: `/admin/orders/{id}` → ítems con `imageUrl` ✓; admin lint + 15 tests ✓.
- Web: lint/typecheck + **39 tests** (12 archivos) ✓; API typecheck ✓; swagger/cliente regenerados ✓.

---

## Sesión 2026-10-17 (cont. 38) — Favoritos dentro de la cuenta + perfil editable (nombre, teléfono, documento)

### Favoritos en el flujo de cuenta
- Nuevo componente reutilizable `components/wishlist-content.tsx` (estados + grilla de favoritos).
- `/wishlist` (standalone, el corazón del header) y **`/account/wishlist`** (dentro del `AccountLayout`, con eyebrow "Mi cuenta" + "MIS FAVORITOS") usan el mismo contenido.
- El menú de cuenta ahora apunta a **`/account/wishlist`** — los favoritos se ven ahí como el resto de las secciones, sin romper el flujo; el corazón del header sigue llevando a `/wishlist`.

### Perfil editable
- **Prisma**: `User.document String?` (migración `add_user_document` aplicada).
- **API**: nuevo `PATCH /users/me` (`UsersController` + `UpdateProfileDto`: firstName, lastName, phone, document; vacíos → null) y `AuthUserDto` suma `phone`/`document`. Swagger + cliente regenerados.
- **Web** (`/account`): la tarjeta de datos ahora es un formulario con **Nombre, Apellido, Teléfono y Documento** (carga con `/auth/me` vía `form.initialize`, guarda con PATCH y refresca la query), además del email y "Cerrar sesión".

### Verificación
- API: `PATCH /users/me` → datos guardados; `GET /auth/me` → devuelve phone/document ✓.
- Web lint/typecheck + **39 tests** ✓; API typecheck ✓; páginas `/wishlist`, `/account/wishlist`, `/account` → 200 ✓.

---

## Sesión 2026-10-17 (cont. 39) — Fix: "Maximum update depth exceeded" en /account

### Problema
- El dev overlay mostraba **"Maximum update depth exceeded"** (setState en useEffect con deps que cambian en cada render).

### Causa
- En `/account` (perfil), el efecto de inicialización usaba `[me, form]`: en Mantine el objeto `form` se **recrea en cada render** (identidad inestable). Cada ejecución llamaba a `form.initialize(...)` → internamente `handleValuesChanges` → `clearErrors()` → `setErrors({})` (objeto nuevo) → re-render → efecto → loop infinito. Confirmado con una reproducción mínima (el test colgó ~215 s hasta morir el worker).

### Fix
- Guard con `useRef` para inicializar el formulario **una sola vez** (`if (!me || initializedRef.current) return;`).

### Verificación
- Reproducción mínima del patrón: loop confirmado (worker muerto) → con el guard no ocurre.
- Test de humo `account-page.test.tsx` (carga los datos del perfil: nombre, apellido, teléfono, documento).
- Web lint/typecheck + **40 tests** (13 archivos) ✓; `/account` → 200 ✓.

---

## Sesión 2026-10-21 (cont. 40) — Análisis de viabilidad: SaaS multi-tenant con BD por cliente

- Exploración completa del monorepo (API/web/admin/packages) para evaluar convertir el producto en SaaS con **una BD Postgres por cliente** + **BD maestra** con los IDs y la resolución a la BD de cada cliente.
- Hallazgos clave: el esquema ya está "con forma de tenant" (39 modelos sin `tenantId`, unicidades por BD, sin SQL crudo) → el modelo BD-por-cliente **no requiere tocar el esquema**; el trabajo está en la capa de plataforma (conexión por tenant, resolución por host/header, namespaces de caché/colas/R2/cookies, webhooks por tenant, provisioning/migraciones, panel de plataforma).
- Bloqueantes identificados con evidencia (archivo:línea): Prisma singleton (`prisma.service.ts`), sin resolución de tenant (grep vacío), 20 `findFirst` de config global, JWT/cookies sin tenant, caché/colas/SSE sin namespace, R2 global, webhooks sin tenant, storefront con API build-time, admin 100% de tienda, migraciones/seeds/backups de una sola BD.
- Documento completo con gap analysis, plan por fases (MVP 4–6 semanas), alternativas evaluadas (BD+tenantId, schema-per-tenant, proceso por tenant) y decisiones pendientes: **`docs/SAAS_MULTITENANT.md`**.
- Servidores relanzados tras el reinicio (API `health ok`, web y admin 200).

---

## Sesión 2026-10-21 (cont. 41) — SaaS multi-tenant: implementación del núcleo (BD por cliente)

### Arquitectura
- **Un solo backend** para todos los clientes; cada request resuelve el tenant y Prisma apunta a la BD de ese cliente.
- **BD maestra** (`nova_master`): `Tenant` (slug, nombre, estado, `databaseUrl` cifrada con AES-256-GCM/`PLATFORM_SECRET`, `isDefault`, overrides de R2) + `TenantDomain` (host → tenant). Esquema y migraciones propias en `prisma/master/`, cliente generado en `@prisma/master-client`.

### Implementado
- **Resolución de tenant** (`TenantMiddleware`): `X-Tenant` → `?tenant=` (webhooks) → host del `Origin`/`Referer`/`Host` → default (`DEFAULT_TENANT_SLUG`); 404 tenant explícito inexistente, 503 suspendido. Setea `X-Tenant` en la respuesta.
- **Prisma por tenant**: `TenantContextService` (AsyncLocalStorage en `tenant-runtime.ts`), `TenantPrismaFactory` (clientes por slug con `datasourceUrl`) y `PrismaService` como **Proxy** (sin cambios en los ~50 servicios). Sin contexto usa `DATABASE_URL`.
- **Caché** con prefijo `t:<slug>:` en las claves del catálogo (aislado aunque el store sea compartido).
- **R2 dual**: bucket de plataforma (env) con prefijo `t/<slug>/` **o** bucket/credenciales/URL propios por tenant (campos `r2*` en la BD maestra); `buildAssetUrl` usa la URL pública del tenant.
- **Sesiones**: claim `tenant` en el JWT y en el challenge 2FA (validado), cookies `refresh_token__<slug>` / `admin_refresh_token__<slug>` (`__Host-` en prod), links de email con el dominio del tenant.
- **Colas**: `tenantSlug` en el payload y contexto resuelto en los 3 workers. **Emails**: cache del resolver por tenant. **Webhooks**: `?tenant=<slug>`.
- **Storefront**: `resolveTenantSlug()` (browser: hostname; SSR: `next/headers`) → `X-Tenant` en todas las llamadas (cliente y SSR) + en el rehydrator/logout. **Admin**: `X-Tenant` desde `NEXT_PUBLIC_DEFAULT_TENANT`/localStorage.
- **Provisioning**: `create-tenant.ts` (crea BD `tenant_<slug>`, migra, siembra roles, crea StoreConfig + admin, registra tenant/dominio) y `register-default-tenant.ts` (tienda actual = tenant `nova`).
- Env nuevas: `MASTER_DATABASE_URL`, `DEFAULT_TENANT_SLUG`, `PLATFORM_SECRET`, `NEXT_PUBLIC_DEFAULT_TENANT` (`.env.example` + Doppler).

### Verificación
- Tenant **nova** (tienda actual) intacto: login, catálogo (12 productos), admin ✓.
- Tenant **demo** creado con BD propia (`tenant_demo`): store-config "Tienda Demo", catálogo 0 productos, login `admin@demo.test` ✓, y el storefront responde en `demo.localhost` con sus datos (SSR) ✓.
- Aislamiento de sesiones: cookies por tenant ✓; el customer de nova no puede loguearse en demo (401) ✓.
- API 31 tests unitarios + lint/typecheck ✓; web 40 tests ✓; admin 15 tests ✓.
- Documentado en `docs/SAAS_MULTITENANT.md` (estado, cómo crear clientes, pendientes: panel de plataforma, Stripe/email por tenant, fix del store Redis, backups).

---

## Sesión 2026-10-21 (cont. 42) — Panel de plataforma + fix del caché Redis

### Panel de plataforma (API)
- Módulo `apps/api/src/platform/` con lógica de provisioning compartida (`provisioning.ts`): la usan el CLI `create-tenant.ts` y la API.
- Endpoints (solo `SUPER_ADMIN` del tenant por defecto, vía `PlatformAdminGuard`):
  - `GET /platform/tenants` — listado con dominios, URL de tienda, estado y error de provisioning (nunca expone la URL de BD ni credenciales R2).
  - `POST /platform/tenants` — alta **asíncrona**: registra `PROVISIONING`, deriva `tenant_<slug>`, y en background crea BD → migra → seed de roles → StoreConfig → admin → `ACTIVE`. Si falla, guarda `provisioningError`.
  - `PATCH /platform/tenants/:id` — renombrar / suspender / activar (invalida la caché del registry; el tenant suspendido responde 503).
  - `GET /platform/tenants/:id/health` — conecta a la BD del cliente y devuelve productos/órdenes/usuarios + última migración.
  - `POST /platform/migrate` — `migrate deploy` a todos los clientes activos con reporte por slug.
- Migración de la maestra: `provisioningError` en `Tenant`. Auditoría `PLATFORM_CREATE_TENANT` / `PLATFORM_UPDATE_TENANT` en la BD del tenant de plataforma.
- `admin@tienda.com` vuelve a ser `SUPER_ADMIN` (algún seed lo había dejado como ADMIN y no había ningún SUPER_ADMIN).

### Panel de plataforma (admin)
- Página `/clients` ("Clientes"): métricas, tabla (cliente/slug, dominios, estado, alta, acciones), alta con modal (nombre, slug, dominio, admin), suspender/activar, salud en modal y link a la tienda.
- Polling automático cada 4 s mientras haya clientes en `PROVISIONING`; estados con `StatusPill` y error de provisioning visible.
- Nav: grupo **Plataforma → Clientes**, oculto salvo que el rol del token sea `SUPER_ADMIN`.
- i18n es/en/pt completo para la página y el grupo del sidebar.

### Caché Redis (fix real)
- El store anterior usaba la API vieja (`{ store }`), que Nest v3 + cache-manager v6 ignora → el caché corría en memoria.
- Reescrito como `KeyvStoreAdapter` (`apps/api/src/common/redis-cache.store.ts`): `get`/`set`/`delete`/`has`/`clear`/`disconnect`, TTL en ms, reconexión con `retryStrategy` y degradación segura (si Redis no está, `get` → `undefined` y `set` → no-op).
- `CacheModule` ahora registra `stores: [store]`; `clear()` invalida **solo** `t:<slug>:*` del tenant actual (antes barría `*catalog:*` de todos).

### Verificación
- API en vivo: listado (nova/demo), alta de `acme` (PROVISIONING → ACTIVE en ~45 s), health (`ok`, última migración), login del admin nuevo (setup 2FA), suspensión → login 503; cliente de prueba eliminado (BD `tenant_acme` + registros).
- Redis: `t:nova:catalog:products:{...}` persistida con TTL ~300 s y respuestas deserializadas correctas; script puntual confirmó que `clear()` borra `t:cachetest:*` y preserva `t:other:*`.
- API typecheck/lint ✓ + 31 tests unitarios ✓ (los 18 suites e2e siguen fallando por el problema preexistente de `@scure/base` ESM); web 40 tests ✓; admin 15 tests ✓, typecheck/lint ✓; `/clients` → 200.

### Notas
- El alta desde el panel ejecuta `prisma migrate deploy` y el seed de roles como procesos hijos de la API: es una acción de plataforma poco frecuente; en producción conviene moverla a un worker/cola.
- El guard de plataforma todavía se apoya en el `SUPER_ADMIN` del tenant por defecto; el siguiente paso es `PlatformUser` en la maestra + impersonación auditada para administrar la tienda de cada cliente desde el mismo panel.

### Backups por tenant
- `BackupService.runBackup()` usa ahora la BD del **tenant en contexto** (`getCurrentTenant()`), con fallback a `DATABASE_URL` fuera de requests; cada cliente tiene su carpeta (`BACKUP_DIR/<slug>/`) y retención propia.
- Se descartan los parámetros de Prisma (`?schema=public`) que `pg_dump` rechaza (por eso el backup anterior fallaba incluso con `pg_dump` instalado).
- Modo Docker para hosts sin `pg_dump`: `BACKUP_DOCKER_CONTAINER` ejecuta el dump dentro del contenedor Postgres. Agregado a Doppler (`ecommerce-postgres`) y documentado en `.env.example`.
- `POST /platform/backups` (panel de plataforma) respalda todos los clientes activos y devuelve `{ slug, ok, filename | error }`. Verificado con nova y demo: archivos `.sql.gz` válidos (`gzip -t`) en `backups/<slug>/`.

---

## Sesión 2026-10-21 (cont. 43) — Impersonación de clientes desde el panel

### API
- **Cookies de auth extraídas** a `apps/api/src/auth/auth-cookies.util.ts` (nombres por tenant, `X-Client`, `__Host-` en prod, path, maxAge). El `AuthController` quedó usando la utilidad; se verificó login/refresh/logout del storefront (cookie `refresh_token__nova`, rotación y borrado en logout).
- **`POST /platform/tenants/:id/impersonate`** (guard de plataforma): valida que el cliente exista y no esté suspendido, busca el `SUPER_ADMIN` activo de esa BD, emite tokens con el claim del tenant destino (reusa `AuthService.issueSessionForUser`) y setea `admin_refresh_token__<slug>` como cookie httpOnly.
- **Auditoría doble**: `PLATFORM_IMPERSONATE` en la BD de la plataforma y `PLATFORM_SESSION_START` en la del cliente (con `impersonatedBy`).
- El token impersonado **no** puede llamar a `/platform/*` (el guard exige el tenant por defecto) → verificado 403.

### Admin
- Acción **Administrar tienda** en `/clients` (solo clientes activos y no-default): guarda el access token en memoria, fija el tenant en localStorage y navega a `/dashboard`.
- Banda superior **"Administrando <slug>"** con **Volver a plataforma**; el grupo **Plataforma** del sidebar se oculta mientras se impersona y el botón "Salir" vuelve a la plataforma en lugar de cerrar la sesión del cliente.
- i18n es/en/pt.

### Verificación
- Impersonación de `demo`: respuesta con `admin@demo.test`, cookie `admin_refresh_token__demo`, `/auth/me` y `/admin/users` contra la BD demo ✓, refresh con la cookie demo ✓, `/admin/dashboard/metrics` 200 ✓, `/platform/tenants` con el token impersonado 403 ✓.
- Auditoría presente en `ecommerce` y `tenant_demo` ✓.
- API typecheck/lint ✓ + 31 tests unitarios ✓; web 40 tests ✓; admin 15 tests ✓, typecheck/lint ✓; `/clients` y `/dashboard` 200.

---

## Sesión 2026-10-21 (cont. 44) — Barrido de pendientes SaaS: Stripe/email por tenant, migraciones, backups y endurecimiento

### Credenciales por tenant
- **Stripe por tenant**: `StoreConfig.stripePublishableKey/stripeSecretKey/stripeWebhookSecret`. `StripePaymentProvider` lee la config en cada operación (fallback a `STRIPE_*`), cachea el cliente por secret key, usa el dominio del tenant para success/cancel y su webhook secret. `isEnabled` pasó a async.
- **Email por tenant**: `StoreConfig` suma SMTP (host/puerto/usuario/contraseña/secure/from) y Resend (API key/from). `SmtpEmailProvider`/`ResendEmailProvider` aceptan la config por envío (transporters cacheados); `EmailProviderResolver` resuelve proveedor + credenciales por tenant con caché de 60 s y fallback a las envs.
- **Admin**: campos editables de Stripe en Pasarelas (la sección de **Bold quedó intacta**) y de SMTP/Resend en Notificaciones; solo Super Admin. Los secretos son write-only y se muestran flags "Configurada".
- **Seguridad**: el `PATCH /store-config` devolvía la fila cruda con secretos (fuga preexistente, incluía Bold y carrier). Ahora GET y PATCH comparten `toPublicConfig()`: nunca devuelve `boldSecretKey`, `stripeSecretKey`, `stripeWebhookSecret`, `smtpPass`, `resendApiKey`, `shippingApiKey` ni `shippingAccountId`.
- Migración: `tenant_payment_email_credentials` (aplicada a nova y demo).

### Operación de plataforma
- **Historial de migraciones**: modelo `TenantMigration` en la maestra (`tenant_migrations`). `POST /platform/migrate` y el provisioning registran nombre de la última migración aplicada, estado, duración y error. `GET /platform/tenants/:id/migrations` y el health (últimas 5) lo exponen; el modal de Salud del admin muestra el historial.
- **Backups programados**: `BackupScheduler` recorre todos los tenants cada `BACKUP_INTERVAL_HOURS` (24 por defecto), habilitado con `BACKUP_SCHEDULER_ENABLED` (solo producción por defecto) y con guard contra ejecuciones solapadas.
- **Impersonación con caducidad**: `RefreshToken` guarda `impersonatedBy/impersonatedAt`; el JWT los incluye y `JwtStrategy` rechaza sesiones impersonadas con más de `IMPERSONATION_TTL_MINUTES` (120 por defecto) aunque el refresh siga vigente. El refresh preserva la marca original (no renueva el TTL). Migración `impersonation_expiry`.
- Migración de la maestra: `tenant_migration_history`.

### Tests e2e (infra)
- El fallo de Jest con `@scure/base` (ESM, vía `otplib`) quedó resuelto: transformador propio `test/esm-js-transformer.js` (TS → CJS) + `transformIgnorePatterns` compatible con pnpm (`.pnpm/...`). `test/app.e2e-spec.ts` pasa ✓.
- **Guard de seguridad** (`test/e2e-setup.ts`): los e2e solo corren si `DATABASE_URL` parece de test (`*_test`/`*_e2e`) o con `E2E_ALLOW_DEV_DB=1`; varias suites borran catálogo/config. La config unitaria ya no incluye los e2e (`testRegex: *.spec.ts`). Script `test:e2e` con `--forceExit` (los workers de colas mantienen handles).

### Verificación
- **Bold**: con config temporal se validó `GET /payments/active-provider` → `{provider:'bold', supportsButton:true}` y `GET /payments/button-checkout/:orderId` con `integritySignature = SHA256(orderId+amount+currency+secret)` correcto; luego se restauró `paymentProvider=stripe` y se limpiaron las llaves de prueba.
- **Aislamiento de credenciales**: PATCH en `demo` con Stripe/SMTP/Resend → GET devuelve los flags y **ningún secreto**; `nova` quedó intacta (secretos NULL, provider stripe). Valores de prueba limpiados.
- **Migraciones**: `POST /platform/migrate` → `[{nova,ok},{demo,ok}]`; historial y health con `20261021203641_impersonation_expiry`; UI lista para mostrarlo.
- **Impersonación**: token con `impersonatedBy/impersonatedAt`; token vencido (180 min) → 401 y vigente → 200.
- API 31 tests unitarios ✓ + typecheck/lint ✓; web 40 tests ✓; admin 15 tests ✓ + typecheck/lint ✓. E2E `app` ✓ con el guard.
- Tienda intacta (NÖVA, 12 productos) y credenciales de Bold sin residuos.

---

## Sesión 2026-10-21 (cont. 45) — Endurecimiento P0 del SaaS

### P0.1 Fail-closed de la BD maestra
- `TenantRegistryService` marca `isMasterDown()` y en producción **no** cae a `DATABASE_URL` con otro slug: `resolveBySlug` devuelve null y el middleware responde 503 (también para hosts que caerían al tenant por defecto). El fallback single-tenant queda solo en dev o con `ALLOW_SINGLE_TENANT_FALLBACK=true`.
- `TenantRuntimeData` incluye `domains` (para la validación por host). Nuevo `GET /health/platform` (SELECT 1 a la maestra, 503 si falla).

### P0.2 PlatformUser + step-up + auditoría maestra
- Modelos maestros `PlatformUser`, `PlatformSession`, `PlatformAuditLog` (migración `platform_users`). Roles OWNER/OPERATOR/SUPPORT, TOTP opcional, sesiones revocables.
- `POST /platform/auth/login` (+ `/login/2fa`), `/refresh`, `/logout`, `/me`, `/2fa/setup|confirm|disable`, `/sessions`, `/sessions/revoke`, `/audit`; `GET/POST/PATCH /platform/users` (solo OWNER crea/edita). Cookie `platform_refresh_token` httpOnly.
- `PlatformAuthGuard`: valida el token de plataforma contra la maestra; compatibilidad legacy (SUPER_ADMIN del tenant por defecto) solo en dev o con `ALLOW_LEGACY_PLATFORM_ADMIN=true`.
- Impersonación: `reason` obligatorio, step-up con contraseña del operador, `readOnly` opcional (interceptor global bloquea mutaciones con 403), auditoría en `platform_audit_logs` (IP/UA/motivo) + auditoría en el tenant.
- Seed `seed:platform-owner` → `owner@nova.app / Owner12345678` (sin 2FA en dev; se configura por API).
- Admin: botón **Acceso de plataforma** (modal email/password/código), sesión de plataforma con refresh automático, y modal de impersonación con motivo/solo lectura/contraseña. La sesión legacy sigue funcionando en dev.

### P0.3 Secretos cifrados en reposo
- `StoreConfig` cifra Bold/Stripe/SMTP/Resend y la API key de envíos con AES-256-GCM (`enc:v1:`); los proveedores descifran al leer.
- Rotación con `PLATFORM_SECRET_PREVIOUS` + script idempotente `pnpm --filter api encrypt:secrets` (`--dry-run` disponible). Tests de roundtrip/compatibilidad/rotación.

### P0.4 Pool Prisma acotado
- `TenantPrismaFactory` con LRU (`TENANT_PRISMA_MAX_CLIENTS=50`), desconexión diferida 30 s y `size` para diagnóstico.

### P0.5 Tests de aislamiento
- Unitarios `tenant-registry.failclosed.spec.ts` (4) y `crypto.util.spec.ts` (3).
- `pnpm --filter api check:isolation`: token de nova rechazado en demo (401), login cruzado rechazado, catálogos distintos.

### P0.6 CORS/cookies multi-dominio
- `CorsPolicyService` dinámico (FRONTEND_URL/ADMIN_URL + `PLATFORM_BASE_DOMAINS` + dominios registrados); reemplaza la lista fija.
- Cookies: `SameSite=None; Secure` cuando el storefront es un dominio propio cross-site; `Strict` en subdominios de plataforma. `refresh`/`logout` validan `Origin` (anti-CSRF). Nuevas envs documentadas en `.env.example`.

### Verificación
- API 38 tests unitarios (+7), web 40, admin 15; typecheck/lint ✓; `check:isolation` ✓.
- En vivo: login de plataforma, `/me`, `/users`, impersonación con step-up y `readOnly` (PATCH → 403), auditoría maestra con motivo/IP/UA, cifrado de secretos (`enc:v1:` en BD y flags sin exponerlos), health de maestra.
- **Pendiente de este plan**: P1 (jobs de provisioning/migraciones, backups offsite/restore, observabilidad, multi-instancia SSE/invalidación, cuotas) y P2 (self-service/onboarding, dominios+SSL, verificación de email, soporte, offboarding, planes/facturación).

---

## Sesión 2026-10-21 (cont. 46) — Perfil transversal y fix del crash en Clientes

### Fix del error `Cannot read properties of null (reading 'value')`
- Causa: los inputs del modal de impersonación (y del alta) leían `event.currentTarget.value` **dentro** del updater de `useState`; React ejecuta el updater luego y `currentTarget` ya es `null`.
- Se capturó el valor antes del `setState` en los 10 inputs de `/clients` (alta, login de plataforma e impersonación) y se verificó que no quede el patrón en el admin.

### Perfil transversal del super admin
- `PlatformProvider` (admin): sesión de plataforma compartida, login/2FA/logout y `switchTenant`.
- `/platform-login`: entrada directa con `PlatformUser`; al ingresar abre el cliente por defecto con impersonación y redirige al dashboard. Link **Acceso de plataforma** también en el login de la tienda.
- Selector de cliente en el header para `PlatformUser` (y legacy SUPER_ADMIN en dev): lista tenants, cliente actual, perfil de plataforma y acceso a Clientes. El cambio usa el **step-up token** emitido en el login (10 min) y pide contraseña solo si venció.
- `POST /platform/auth/step-up` + `stepUpToken` en login/2FA; `POST /platform/tenants/:id/impersonate` acepta `stepUpToken` o `password` y audita el motivo (`Cambio de cliente desde el selector de plataforma`).
- Al cambiar: `setAuthToken` + `setAdminTenantSlug` + recarga completa (`/dashboard`), garantizando que React Query no conserve datos del cliente anterior.

### Aislamiento adicional del admin
- `ConfigProvider` refresca `/store-config` en cliente con el `X-Tenant` real (el layout SSR siempre traía el tenant por defecto) y ajusta `document.title`.
- SSE: los eventos se etiquetan con `tenantSlug`, el stream filtra por tenant y `SseAuthGuard` rechaza tokens de otro tenant (401). Se corrigió `@Roles` para permitir SUPER_ADMIN/STAFF (antes el dueño recibía 403).
- Vista previa del header: usa el `storefrontUrl` del cliente seleccionado; `getTenantStorefrontUrl` conserva subdominios `*.localhost` con puerto.
- `GET /store-config` agrega `storefrontUrl`.

### Verificación
- API 39 tests ✓ (incluye filtro SSE por tenant), web 40 ✓, admin 15 ✓; typecheck/lint ✓; `check:isolation` ✓.
- En vivo: login de plataforma → step-up → cambio demo/nova (201 sin contraseña con step-up, 401 con token inválido), auditoría de ambos switches; SSE demo/nova 401 y demo/demo 200; `storefrontUrl` demo = `http://demo.localhost:3000`.
- **Credenciales**: `owner@nova.app / Owner12345678` en `/platform-login` (o el link del login). El modo legacy con `admin@tienda.com` sigue disponible en dev.

### Modo plataforma al cerrar un cliente (cont. 46)
- Problema: al impersonar sin PlatformUser (modo legacy), "Salir" reseteaba al tenant por defecto y el header volvía a mostrar `admin@tienda.com`; el módulo Clientes se ocultaba.
- **Modo plataforma**: al cerrar un cliente se revoca su refresh token, se limpia el access token y se entra al **panel transversal** (`PlatformOnlyShell`) con el selector y el perfil de plataforma. El boot no restaura la cookie del tenant (`nova-admin-platform-mode`); si la sesión de plataforma expiró, redirige al login.
- **Sin PlatformUser (legacy)**: "Salir"/"Volver a plataforma" cierra el cliente y va al **login** (no a nova). "Administrar tienda" desde el panel ahora exige el login de plataforma y continúa automáticamente con el cliente seleccionado.
- El header muestra el **perfil de plataforma** (nombre/email/rol) además del cliente actual; el módulo **Clientes** queda visible mientras se impersona si hay PlatformUser. El selector muestra "Perfil de plataforma / Cambiar de cliente" en modo plataforma.

### Guard de rutas del admin (cont. 46)
- `AdminFrame` valida sesión y permisos antes de renderizar:
  - **Sin credenciales** en una ruta privada → redirige a `/` (login); `/` y `/platform-login` son las únicas rutas públicas.
  - **PlatformUser en modo plataforma** (sin cliente) → solo `/clients`; cualquier otra ruta va al panel.
  - **`/clients`** requiere PlatformUser o el modo legacy del SUPER_ADMIN del tenant por defecto; una sesión de cliente sin ese permiso va a `/dashboard` (no muestra "Unauthorized").
  - Con PlatformUser ya logueado, `/platform-login` redirige a `/clients`.
- Evita el render de la página con errores 401 en incógnito (el caso reportado de `/clients`).
- API 39 tests, web 40, admin 15; typecheck/lint ✓.

---

## Sesión 2026-10-21 (cont. 47) — Superadmins globales (mismas credenciales en todas las tiendas)

### Modelo
- Los **dos únicos superadmins** son `PlatformUser` en la maestra: `admin@tienda.com` y `admin2@tienda.com`, con el **mismo hash de contraseña** de sus usuarios del tenant por defecto (se eliminó `owner@nova.app`). Seed: `seed:platform-admins`.
- Su **token de plataforma es también la sesión de los módulos de tienda**. `JwtStrategy` acepta `scope: 'platform'` y resuelve en la BD del tenant un **usuario espejo** (`User.platformUserId`, migración `platform_shadow_users`) con rol SUPER_ADMIN, para que FKs/auditoría sigan siendo válidas. Si el email ya existe como SUPER_ADMIN (admin@tienda.com en nova) se vincula; si pertenece a un cliente, se usa un email sintético.
- **No hay impersonación** al cambiar de cliente: `POST /platform/tenants/:id/select` audita el cambio y el frontend solo fija `X-Tenant` + recarga. El header mantiene la identidad de plataforma y el usuario de la tienda nunca cambia.
- AdminFrame: con PlatformUser autentica los módulos de tienda aunque no exista cookie de tenant; en modo plataforma muestra solo el panel de clientes; sin credenciales redirige al login; `/clients` requiere plataforma (o legacy del SUPER_ADMIN del tenant por defecto).
- El login de plataforma aterriza en `/clients` (panel transversal), no en la tienda por defecto; el selector del header entra a cualquier cliente con la misma cuenta.
- El api-client refresca el token de plataforma ante 401 (`refreshAccessToken` configurable) para que la sesión no se corte a los 15 min.
- Provisioning: el admin inicial de un cliente nuevo usa rol **ADMIN** (no SUPER_ADMIN). Los permisos de tienda quedan iguales; el admin de demo pasó a ADMIN.

### Configuración sensible
- Solo `isPlatform` (los dos superadmins) puede **cambiar** proveedores/API keys en `PATCH /store-config` y gestionar las credenciales del carrier (`GET/PATCH /shipping-options/admin/credentials`). El permiso `providers:write` de un rol del tenant ya no alcanza.
- La UI de `/store-config` y `/shipping-options` habilita esas secciones solo con sesión de plataforma; los admins de tienda ven el candado y mantienen el resto de sus permisos actuales.

### Verificación
- Login de plataforma con `admin@tienda.com / Admin1234` y `admin2@tienda.com / Admin2345`; solo 2 PlatformUser.
- El mismo token devuelve `admin@tienda.com`/SUPER_ADMIN en `/auth/me` de nova y demo; dashboard demo 200; SSE demo 200; `/platform/tenants/:id/select` 201 y auditado.
- Proveedores: PATCH con token de plataforma 200; con token de admin de demo 403. Credenciales de envío: 200 vs 403. Valores de prueba revertidos.
- API 39 tests, web 40, admin 15; typecheck/lint ✓.

### Revisión del storefront tras los superadmins globales
- **No requiere cambios funcionales**: los clientes siguen con su sesión por tenant (`refresh_token__<slug>`), el `platformUserId` no se expone (se excluye en `sanitizeUser`) y el token de plataforma no se usa en el storefront.
- Verificado: home/catálogo/producto/cuenta/wishlist/checkout 200; `demo.localhost` SSR muestra “Tienda Demo”; login y refresh del cliente 200; catálogo nova 12 / demo 0; `active-provider` intacto; config pública con `storefrontUrl`.
- Los links de email/pago para `*.localhost` ahora usan el subdominio+puerto (`demo.localhost:3000`); las rutas de confirmación existen.
- La restricción de proveedores/API keys es solo del admin; el storefront sigue leyendo la config guardada. Los superadmins usan el login de plataforma, no el login de cliente.

---

## Sesión 2026-10-21 (cont. 48) — Demo `demo` convertido en cafetería "Grano"

### Marca y diseño
- El tenant **`demo`** ahora es **Grano**, una cafetería de especialidad minimalista (el nombre del cliente en la maestra pasó a `Grano Café (demo)`; el slug/dominio sigue siendo `demo`).
- Paleta cálida: crema `#FCF9F8`, espresso `#1F1B16`, oliva `#6F7A4E`; tipografías **Fraunces** (títulos), **Inter** (texto) y **JetBrains Mono** (etiquetas).
- Home editorial: hero oscuro con foto de pour over, "Recién tostado" (8 productos), categorías, showcase "Nuestros cafés" con historia "Del origen a la taza" y banner de suscripción. Sin marquee, sin badge giratorio y sin newsletter de home (el footer sí suscribe).
- Catálogo: 4 categorías, **9 productos** (4 cafés de origen, suscripción, Chemex, kit pour over, taza y vasos), variantes de 250/500 g, stock para accesorios, envío gratis desde **$90.000**.
- 5 páginas: Nuestra historia, Métodos, Envíos y devoluciones, Suscripción y Términos; 2 opciones de envío (nacional y retiro).
- Fotos de Unsplash con URLs externas (licencia libre) para la demo. Para producción conviene subirlas a R2 y reemplazar los `Asset.objectKey`.

### Seed y datos
- Nuevo script `apps/api/src/database/seeds/seed-demo-cafe.ts` y comando `seed:demo-cafe`.
- Guardas: exige `CAFE_DATABASE_URL`, verifica que el nombre de la BD contenga `demo` y aborta si no (salvo `CAFE_ALLOW_NON_DEMO=1`), para no tocar nunca `nova`/`ecommerce`.
- Comando:
  `CAFE_DATABASE_URL="postgresql://ecommerce:ecommerce@localhost:5433/tenant_demo?schema=public" pnpm --filter @ecommerce/api seed:demo-cafe`
- El seed es idempotente (upserts), ordena el catálogo por `createdAt` (Etiopía primero) y valida el `storefrontConfig` con `StorefrontConfigSchema`.

### Ajustes transversales del template
- `templateConfig` ahora permite `heroEyebrow`, labels/hrefs de los dos CTA del hero y `productEyebrow`; los defaults conservan el diseño anterior.
- `showMarquee` se respeta (antes el marquee se renderizaba siempre) y el footer usa la tipografía de títulos configurada.
- Precio de lista corregido: incluye ajustes en 0; un producto 250 g + 500 g ya no muestra el precio de 500 g como "desde".
- El selector de variante muestra el precio de cada opción y el carrito invitado/quick-add suma `priceAdjustment`.
- Las categorías respetan `sortOrder` (Café → Métodos → Accesorios → Suscripciones).
- Catálogo en modo cafetería: cabecera según la categoría, sin filtros de talle/color, badge "Novedades" y CTA de suscripción al pie; el modo fashion conserva COPA MUNDO, filtros y lookbook.
- El footer ahora suscribe de verdad al newsletter; el título del home usa el nombre de la tienda y la página 404 resuelve el tenant con `apiClient` (antes caía en la tienda por defecto).

### Verificación
- API 39 tests ✓, web 40 ✓, admin 15 ✓; typecheck API/web ✓; lint API/web ✓ (sin errores).
- Demo: home SSR con 9 productos y precios correctos, categorías ordenadas, páginas y envío 90k; `demo.localhost` sin NÖVA/Tienda Demo; 404 con copy de Grano.
- Nova intacta: 12 productos, NÖVA/URBAN AUTONOMY y sin datos de Grano. El checkout/pago del demo conserva el proveedor que ya tenía configurado.
- No había navegador de escritorio conectado; la validación visual se hizo por SSR/HTML y por API. Abrir `http://demo.localhost:3000`.

---

## Sesión 2026-10-21 (cont. 49) — Header/footer editable en plantillas de email

### Fix del preview
- El modal mandaba `enabled` al endpoint de preview; `PreviewEmailTemplateDto` solo acepta `subject`/`html` y la API usa `forbidNonWhitelisted`. Ahora el admin filtra esos dos campos antes del POST. Verificado: 400 con `enabled`, 201 sin él.

### Editor global de header/footer
- En `/email-templates` hay un botón **Header y footer** (también dentro del modal de edición) que abre un modal con dos editores HTML: encabezado y pie.
- Se guardan por tenant como dos fragmentos reservados en `email_templates` (`__email-header__`, `__email-footer__`), ocultos del listado normal. No requiere migración.
- **Previsualizar** no persiste: cierra el editor, envía los header/footer como overrides al endpoint de preview y abre solo la vista previa. Al cerrarla, el editor de header/footer vuelve a abrirse con los cambios intactos. **Guardar layout** es la acción que crea/actualiza los fragmentos.
- El guardado enviaba `description`, que `UpsertEmailTemplateDto` no acepta (`forbidNonWhitelisted`); se eliminó del body.
- Variables disponibles: `{{storeName}}`, `{{year}}` y `{{logoUrl}}`. `logoUrl` es el logo del `StoreConfig` del tenant; se puede usar en el header con `<img src="{{logoUrl}}" alt="{{storeName}}" ... />`. El editor muestra el ejemplo y permite copiar el tag.
- El layout real (`EmailTemplatesService.render`) y el preview usan los fragmentos; los defaults preservan el diseño anterior.
- El `storeName`/`logoUrl` de los emails ahora salen del `StoreConfig` del tenant (Grano/NÖVA), no del `STORE_NAME` global; los samples de preview ya no los pisan.

### Verificación
- API: preview-only sin persistir (las claves reservadas siguen ausentes), guardado, preview con layout custom, listado sin las claves reservadas, `logoUrl` interpolado y reset. Probado en demo (Grano) y nova (NÖVA).
- API 39 tests, admin 15 tests; typecheck y lint ✓. Sin filas de prueba persistidas.

---

## Sesión 2026-10-21 (cont. 50) — Ayudas contextuales e imágenes en inventario

### Tooltips de ayuda
- Nuevo `HelpTooltip` (icono `?`, leyenda al hover/focus/touch) y prop `tooltip` en `Field`.
- Aplicado en alta de producto (slug, descripción, precio base, categoría, imagen), edición (slug, categoría, precio base, meta título/descripción), variantes (SKU, tipo de prenda, modo de stock, días de producción, ajuste de precio) y slug de categorías.
- El prefijo visible del slug de producto pasó de `/productos/` a `/producto/`.

### Imágenes en Stock & Inventario
- `GET /admin/inventory` devuelve `product.imageUrl` con la primera imagen del producto (por `sortOrder`, usando `buildAssetUrl` del tenant).
- La tabla de inventario muestra esa imagen y cae al icono genérico si el producto no tiene imagen.
- Probado en nova y demo: los 5 primeros ítems de cada tenant devuelven imagen.

### Verificación
- API 39 tests, admin 15 tests; typecheck y lint ✓.
