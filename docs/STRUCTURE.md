# Estructura del proyecto

> Vista general del monorepo, organización de carpetas y responsabilidad de cada módulo.

## Monorepo

```
Mono2/
├── apps/
│   ├── api/                 # Backend NestJS + Prisma + PostgreSQL
│   ├── web/                 # Storefront Next.js (público)
│   └── admin/               # Panel administrativo Next.js
├── packages/
│   ├── api-client/          # Cliente HTTP tipado generado desde OpenAPI
│   ├── shared/              # Constantes, enums, tipos y schemas Zod
│   ├── tsconfig/            # Configuraciones TypeScript compartidas
│   ├── eslint-config/       # Configuración ESLint flat config
│   └── ui/                  # Theme/preset base de Mantine (poco uso actual)
├── docs/                    # Documentación (setup, ADRs, modelo ER)
├── specs/                   # Especificaciones de funcionalidades
├── docker-compose.yml       # PostgreSQL + Redis
├── turbo.json               # Pipeline de build/test/lint/typecheck
└── pnpm-workspace.yaml      # Workspaces de pnpm
```

## `apps/api`

Backend construido con **NestJS**. La estructura sigue módulos de dominio.

```
apps/api/
├── src/
│   ├── app.module.ts        # Módulo raíz y registro de guards globales
│   ├── main.ts              # Bootstrap, Swagger, CORS, static assets
│   ├── auth/                # JWT, login, registro, refresh, verificación de email
│   ├── users/               # Perfiles de usuario
│   ├── addresses/           # Direcciones de envío/facturación
│   ├── catalog/             # Catálogo público (productos, categorías)
│   ├── admin-catalog/       # CRUD de productos, categorías, variantes, imágenes, stock
│   ├── cart/                # Carrito autenticado y merge
│   ├── checkout/            # Iniciar orden, cupones, confirmar pago
│   ├── orders/              # Historial de órdenes del cliente
│   ├── admin-orders/        # Gestión de órdenes, tracking, cancel/reembolso
│   ├── admin-users/         # Listado/suspensión de usuarios
│   ├── admin-coupons/       # CRUD de cupones con reglas avanzadas
│   ├── admin-dashboard/     # Métricas y tendencias
│   ├── custom-designs/      # Diseños personalizados y moderación
│   ├── design-templates/    # Plantillas para el personalizador
│   ├── assets/              # Subida de archivos y registro de assets
│   ├── storage/             # Implementación de almacenamiento R2/local
│   ├── store-config/        # Configuración global de la tienda (branding, flags, template)
│   ├── pages/               # Páginas estáticas editables
│   ├── email/               # Envío de emails transaccionales
│   ├── newsletter/          # Suscripción a newsletter
│   ├── audit/               # Registro y consulta de AuditLog
│   ├── payment/             # Integración base con Stripe
│   ├── prisma/              # PrismaService y PrismaModule
│   └── database/seeds/      # Seeds de roles, admins, catálogo, demo
├── test/                    # Tests e2e con Jest + Supertest
├── prisma/
│   ├── schema.prisma        # Modelo de datos
│   └── migrations/          # Migraciones aplicadas
└── uploads/                 # Archivos locales cuando R2 no está configurado
```

### Módulos clave de imágenes y almacenamiento

- **`storage/`**: contiene `R2StorageService` y el fallback a disco. Es el único punto que interactúa con `@aws-sdk/client-s3`.
- **`assets/`**: expone `AssetsService` para que otros módulos suban y registren archivos (`POST /admin/assets/upload`, `POST /assets/upload-custom`).
- **`admin-catalog/`**: utiliza `AssetsService` para asociar imágenes a productos y variantes; incluye endpoints de reorder/delete.

### Proveedores configurables

- **`email/providers/`**: interfaz `EmailProvider` + implementaciones `SmtpEmailProvider` y `ResendEmailProvider`. La selección se lee de `StoreConfig.emailProvider` en runtime.
- **`payment/providers/`**: interfaz `PaymentProvider` + implementación `StripePaymentProvider`. La selección se lee de `StoreConfig.paymentProvider` en runtime.

## `apps/web`

Storefront público construido con **Next.js** (App Router).

```
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Home con sistema de plantillas
│   │   ├── layout.tsx               # Root layout, fetch de StoreConfig
│   │   ├── globals.css              # Estilos globales (focus-visible)
│   │   ├── catalogo/
│   │   │   ├── page.tsx             # Listado de productos
│   │   │   └── catalog-filters.tsx  # Filtros (desktop + drawer mobile)
│   │   ├── producto/[slug]/         # Detalle de producto
│   │   ├── pagina/[slug]/           # Páginas estáticas
│   │   ├── cart/                    # Carrito
│   │   ├── checkout/                # Checkout y direcciones
│   │   ├── account/                 # Perfil
│   │   ├── account/addresses/       # Direcciones
│   │   ├── account/security/        # Cambio de contraseña
│   │   ├── orders/                  # Historial de pedidos
│   │   ├── personalizar/            # Personalizador de prendas
│   │   ├── login/                   # Inicio de sesión
│   │   ├── register/                # Registro
│   │   └── verify-email/            # Verificación de email
│   ├── components/
│   │   ├── templates/               # Plantillas del home (storefront-home)
│   │   ├── store-header.tsx
│   │   ├── store-footer.tsx
│   │   ├── product-card.tsx
│   │   ├── add-to-cart-button.tsx
│   │   └── ui/                      # Botones reutilizables
│   ├── providers/
│   │   ├── config-provider.tsx      # StoreConfig + tipos de template
│   │   ├── theme-provider.tsx       # Theme de Mantine (NÖVA)
│   │   └── query-provider.tsx       # TanStack Query
│   ├── store/
│   │   ├── auth-store.ts            # Estado de autenticación
│   │   └── cart-store.ts            # Carrito local (Zustand + persist)
│   └── lib/
│       ├── api.ts                   # apiClient con refresh token
│       ├── fonts.ts
│       └── notifications.ts
```

### Sistema de plantillas

- `providers/config-provider.tsx` define `TemplateName` y `TemplateConfig`.
- `app/page.tsx` switchea por `config.template` y renderiza el componente de plantilla correspondiente.
- `components/templates/storefront-home.tsx` es la única plantilla actual.
- Para agregar una nueva plantilla ver la guía en `PENDIENTES.md`.

## `apps/admin`

Panel administrativo construido con **Next.js** (App Router) + **Mantine**.

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout, fetch de StoreConfig
│   │   ├── page.tsx             # Dashboard
│   │   ├── products/            # Listado de productos
│   │   ├── products/[id]/       # Edición de producto, variantes e imágenes
│   │   ├── categories/          # CRUD de categorías
│   │   ├── inventory/           # Gestión de stock
│   │   ├── coupons/             # CRUD de cupones
│   │   ├── orders/              # Listado de órdenes
│   │   ├── orders/[id]/         # Detalle de orden
│   │   ├── users/               # Listado de usuarios
│   │   ├── users/[id]/          # Detalle de usuario
│   │   ├── custom-designs/      # Moderación de diseños
│   │   ├── audit-logs/          # Auditoría
│   │   ├── pages/               # Páginas estáticas
│   │   ├── templates/           # Configuración de plantillas + preview
│   │   └── store-config/        # Configuración global
│   ├── components/
│   │   ├── admin-shell.tsx      # Shell con navegación
│   │   ├── login-form.tsx
│   │   ├── empty-state.tsx
│   │   └── loading-state.tsx
│   ├── providers/
│   │   ├── config-provider.tsx
│   │   ├── theme-provider.tsx
│   │   └── query-provider.tsx
│   ├── lib/
│   │   ├── api.ts               # apiClient con refresh token
│   │   ├── auth.ts
│   │   ├── assets.ts            # Helper de subida de archivos
│   │   └── notifications.ts
│   └── hooks/
│       └── use-client-pagination.ts
```

## `packages/api-client`

Cliente tipado generado automáticamente desde `apps/api/swagger.json`.

```
packages/api-client/
├── src/
│   ├── index.ts
│   ├── client.ts                # createApiClient + middleware de refresh
│   └── api-types.ts             # Generado por openapi-typescript
├── swagger.json                 # Copia del contrato OpenAPI
└── dist/                        # Build CJS/ESM/DTS
```

Regenerar:

```bash
pnpm generate:api-client
```

o manualmente:

```bash
pnpm --filter @ecommerce/api generate:swagger
pnpm --filter @ecommerce/api-client generate
pnpm --filter @ecommerce/api-client build
```

## `packages/shared`

Código compartido entre apps:

```
packages/shared/
├── src/
│   ├── index.ts
│   ├── constants.ts             # DEFAULT_CURRENCY_CODE, etc.
│   ├── enums/                   # OrderStatus, PaymentStatus, StockMode, etc.
│   └── schemas/                 # Schemas Zod base
```

## Convenciones

- **No duplicar DTOs/tipos**: los tipos del backend se reflejan en `packages/api-client` vía OpenAPI.
- **Un solo `StoreConfig`**: todas las apps lo consumen del backend.
- **Assets**: cualquier archivo (imagen de producto, stock, diseño) pasa por `AssetsService` y `R2StorageService`.
- **Tests**: backend usa Jest + Supertest; frontend usa Vitest + React Testing Library.
