# Guía de inicialización del proyecto

Esta guía explica cómo levantar el monorepo desde cero en un entorno de desarrollo local.

## Requisitos previos

- **Node.js** v20 o superior (recomendado v24 LTS).
- **pnpm** v11.9.0 o compatible (gestionado automáticamente por el campo `packageManager` del `package.json`).
- **Git**.
- (Opcional pero recomendado) **Docker Desktop** o motor Docker para levantar PostgreSQL y Redis.

> Nota: el proyecto usa `packageManager: "pnpm@11.9.0"` en la raíz. Si tu sistema tiene otra versión de pnpm, puedes activar la correspondiente con `corepack enable` o instalarla manualmente.

## 1. Clonar o ubicarse en el repositorio

```bash
cd Mono2
```

## 2. Instalar dependencias

```bash
pnpm install
```

Durante la primera instalación, pnpm puede pedir aprobación para ejecutar scripts de compilación nativa (argon2, prisma, sharp, esbuild, etc.). En este repositorio ya se configuran automáticamente mediante `settings.onlyBuiltDependencies` en `pnpm-workspace.yaml`.

Si por algún motivo ves el aviso `ERR_PNPM_IGNORED_BUILDS`, ejecuta:

```bash
pnpm approve-builds
```

y selecciona los paquetes sugeridos.

## 3. Levantar servicios de infraestructura

```bash
docker compose up -d
```

Esto levanta PostgreSQL en el puerto `5433` y Redis en `6379`. El puerto `5433` se usa para evitar conflictos con posibles instancias locales de PostgreSQL.

## 4. Configurar variables de entorno

Cada aplicación tiene su propio archivo `.env`. Copia los ejemplos:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/api/.env.example apps/api/.env
```

Luego edita los valores según tu entorno local. Ver las secciones de cada app más abajo.

## 5. Aplicar migraciones de Prisma

```bash
pnpm --filter @ecommerce/api exec prisma migrate dev
```

## 6. Seeds (opcional pero recomendado)

El proyecto incluye seeds para roles, admins demo, catálogo y datos de ejemplo:

```bash
# Roles básicos (CUSTOMER, ADMIN)
pnpm --filter @ecommerce/api seed:roles

# Admins por defecto: admin@tienda.com / Admin1234 y admin2@tienda.com / Admin2345
pnpm --filter @ecommerce/api seed:admins

# Catálogo y productos de ejemplo
pnpm --filter @ecommerce/api seed:catalog

# Dataset completo de demo (roles, admins, config, categorías, productos, cupones, plantilla de diseño)
pnpm --filter @ecommerce/api seed:demo
```

## 7. Verificar la base del monorepo

Ejecuta el conjunto de verificación base:

```bash
pnpm turbo run build typecheck lint test
```

Debe terminar con todas las tareas exitosas (build de packages y apps, typecheck, lint y test e2e de `apps/api`).

Si tienes problemas de memoria con Turbo, ejecuta los comandos por app:

```bash
pnpm --filter @ecommerce/api run lint && pnpm --filter @ecommerce/api run typecheck && pnpm --filter @ecommerce/api run build && pnpm --filter @ecommerce/api run test
pnpm --filter @ecommerce/admin run lint && pnpm --filter @ecommerce/admin run typecheck && pnpm --filter @ecommerce/admin run build && pnpm --filter @ecommerce/admin run test
pnpm --filter @ecommerce/web run lint && pnpm --filter @ecommerce/web run typecheck && pnpm --filter @ecommerce/web run build && pnpm --filter @ecommerce/web run test
```

## 8. Levantar en modo desarrollo

### Backend (`apps/api`)

```bash
pnpm --filter @ecommerce/api dev
```

Por defecto escucha en el puerto `4000`.

Endpoints de interés:

- Health check: `GET http://localhost:4000/health`
- Documentación Swagger: `http://localhost:4000/api/docs`
- Archivos locales subidos: `http://localhost:4000/uploads/...`

### Storefront (`apps/web`)

En otra terminal:

```bash
pnpm --filter @ecommerce/web dev
```

Por defecto en `http://localhost:3000`.

### Panel administrativo (`apps/admin`)

En otra terminal:

```bash
pnpm --filter @ecommerce/admin dev
```

Por defecto en `http://localhost:3001`.

## 9. Scripts útiles del workspace

| Script | Descripción |
|---|---|
| `pnpm install` | Instala/actualiza dependencias de todo el monorepo. |
| `pnpm turbo run build` | Compila todas las apps y packages respetando el grafo de dependencias. |
| `pnpm turbo run dev` | Levanta todas las apps en modo desarrollo (usa `persistent: true` en `turbo.json`). |
| `pnpm turbo run typecheck` | Verifica tipos en todos los packages y apps. |
| `pnpm turbo run lint` | Ejecuta ESLint en todos los packages y apps. |
| `pnpm turbo run test` | Ejecuta tests unitarios/e2e disponibles. |
| `pnpm turbo run clean` | Limpia `dist`, `.next` y `.turbo` de cada package. |
| `pnpm generate:api-client` | Regenera `packages/api-client` desde `apps/api/swagger.json`. |

## 10. Variables de entorno por app

### `apps/web/.env.example`

```txt
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
```

### `apps/admin/.env.example`

```txt
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

`NEXT_PUBLIC_WEB_URL` se usa para la vista previa de plantillas en `/templates`.

### `apps/api/.env.example`

```txt
NODE_ENV=development
PORT=4000

# Comma-separated list of frontend URLs allowed by CORS
FRONTEND_URL=http://localhost:3000,http://localhost:3001

# Base de datos (PostgreSQL via Docker Compose en puerto 5433)
DATABASE_URL=postgresql://ecommerce:ecommerce@localhost:5433/ecommerce?schema=public

# JWT (generar valores seguros para producción)
JWT_SECRET=change-me-jwt-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# SMTP configuration for transactional emails (Mailgun, SendGrid, Gmail, etc.)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@example.com
SMTP_PASS=change-me-smtp-password
SMTP_FROM=noreply@example.com
SMTP_SECURE=false

# Stripe payment configuration
STRIPE_SECRET_KEY=sk_test_change_me
STRIPE_WEBHOOK_SECRET=whsec_change_me
STRIPE_SUCCESS_URL=http://localhost:3000/orders?paid=success
STRIPE_CANCEL_URL=http://localhost:3000/catalogo

# Cloudflare R2 / S3-compatible storage
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=ecommerce-catalog-dev
R2_PUBLIC_URL=https://<your-cdn-domain>.com
# Legacy bucket names (kept for reference, currently R2_BUCKET is used)
R2_BUCKET_CATALOG=ecommerce-catalog-dev
R2_BUCKET_CUSTOM=ecommerce-catalog-dev
R2_BUCKET_PRINT=ecommerce-catalog-dev

# Email provider configuration (fallback values; the active provider is chosen from StoreConfig)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@example.com
SMTP_PASS=change-me-smtp-password
SMTP_FROM=noreply@example.com
SMTP_SECURE=false
# For Resend (optional):
RESEND_API_KEY=
RESEND_FROM=onboarding@resend.dev

# Payment provider configuration (fallback values; the active provider is chosen from StoreConfig)
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_change_me
STRIPE_WEBHOOK_SECRET=whsec_change_me
STRIPE_SUCCESS_URL=http://localhost:3000/orders?paid=success
STRIPE_CANCEL_URL=http://localhost:3000/catalogo
```

## 11. Imágenes y almacenamiento

El proyecto soporta dos modos de almacenamiento de imágenes:

1. **Cloudflare R2** (producción / staging con credenciales).
2. **Disco local** (desarrollo sin credenciales o fallback).

### Cómo funciona

- `R2StorageService` en `apps/api/src/storage/` implementa la interfaz S3 con `@aws-sdk/client-s3`.
- Si faltan `R2_ENDPOINT`, `R2_ACCESS_KEY_ID` o `R2_SECRET_ACCESS_KEY`, el servicio guarda archivos en `apps/api/uploads/` y sirve estáticamente en `/uploads`.
- `AssetsService` crea registros `Asset` vinculados a productos, variantes o diseños personalizados.

### Flujos principales

- **Catálogo**: en `/admin/products/[id]` se puede subir/eliminar/reordenar imágenes del producto. El storefront las muestra desde `product.images[].url`.
- **Stock con imagen**: al agregar stock desde `/inventory` se puede adjuntar una imagen que queda vinculada a la variante.
- **Diseños personalizados**: el editor de `/personalizar` sube previews y assets de usuario a `/assets/upload-custom`.

Ver `docs/decisions/ADR-002-storage-cloudflare-r2.md` para más detalles.

## 12. Proveedores configurables

La tienda permite elegir el proveedor de email y la pasarela de pagos desde `/store-config` en el admin. Los valores se guardan en `StoreConfig` y el backend los lee en runtime para inyectar la implementación correspondiente.

- **Email**: `smtp` (por defecto, compatible con Mailgun, Gmail, etc.) o `resend`. Las credenciales siguen viviendo en variables de entorno por seguridad.
- **Pagos**: `stripe` (por defecto). La abstracción `PaymentProvider` permite agregar más pasarelas sin modificar el dominio de checkout.

Los archivos de proveedores viven en:

- `apps/api/src/email/providers/`
- `apps/api/src/payment/providers/`

## 13. Funcionalidades recientes

- **Plantillas del storefront**: configura la plantilla activa y su configuración desde `/templates` en el admin.
- **Páginas estáticas**: crea páginas editables (FAQ, términos, políticas) desde `/pages` en el admin; se muestran en `/pagina/[slug]`.
- **SEO por producto/categoría**: edita `metaTitle` y `metaDescription` en `/products/[id]` y `/categories`; se usan en los metadatos del storefront.
- **Control de storefront**: modo mantenimiento y feature flags (`enableCustomDesigns`, `enableNewsletter`, `enableCatalogFilters`) desde `/store-config`.
- **Cola de producción**: avanza ítems de orden por estados de producción desde `/production`.
- **Envíos**: registra envíos y actualiza estados desde el detalle de orden en `/orders/[id]`.
- **Reseñas**: los clientes pueden dejar reseñas en productos; el admin las aprueba desde `/reviews`.

## 14. Solución de problemas comunes

### `ERR_PNPM_IGNORED_BUILDS`

Significa que pnpm no tiene permiso para compilar dependencias nativas. Ejecuta:

```bash
pnpm approve-builds
```

o verifica que `pnpm-workspace.yaml` contenga la sección `settings.onlyBuiltDependencies`.

### Error de autenticación de Prisma (`P1000`)

Si tienes una instancia local de PostgreSQL en el puerto `5432`, el contenedor de Docker usa `5433` para evitar conflictos. Asegúrate de que `DATABASE_URL` apunte a `localhost:5433`.

### TypeScript no encuentra decoradores en `apps/api`

La configuración compartida `@ecommerce/tsconfig/node.json` ya incluye `experimentalDecorators` y `emitDecoratorMetadata`. Si editas la config base, asegúrate de conservarlos.

### `request is not a function` en tests de `apps/api`

El import correcto de supertest es:

```ts
import request from 'supertest';
```

no `import * as request from 'supertest'`.

### Warnings de webpack cache al compilar Next.js

Los mensajes `Serializing big strings (...) impacts deserialization performance` son advertencias de optimización, no errores. No bloquean el build.

### Problemas de memoria al correr `pnpm turbo run ... --force`

El monorepo tiene varias apps grandes. Si ves workers de Next.js o Jest fallando por memoria, corre las verificaciones por app individualmente o reduce workers de Jest (`apps/api/jest.config.js` ya usa `maxWorkers: 1`).

## 15. Próximos pasos después de la inicialización

1. Levantar servicios con Docker Compose.
2. Aplicar migraciones y seeds.
3. Verificar todo con `pnpm turbo run build typecheck lint test`.
4. Empezar a trabajar en los pendientes de `PENDIENTES.md`.
