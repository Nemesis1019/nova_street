# Análisis de viabilidad — Convertir NÖVA en SaaS multi-tenant (BD por cliente)

> Fecha: 2026-10-21 · Alcance: monorepo completo (`apps/api`, `apps/web`, `apps/admin`, `packages/*`).
> Objetivo del negocio: reutilizar la base de código para distintos clientes, con **una base de datos Postgres por cliente** y una **base maestra** que registre los clientes y resuelva a qué BD ir.

---

## 1. Resumen ejecutivo

**Veredicto: viable, y el modelo de BD-por-cliente es el que MENOS cambios de esquema requiere en este código.**

El esquema de datos ya está "con forma de tenant": no existe `tenantId`/`storeId` en ningún modelo, no hay unicidades globales compartidas (todas las unicidades —`User.email`, `Product.slug`, `Coupon.code`, `Page.slug`, etc.— son *por base de datos*), y no hay SQL crudo que ate la conexión. Es exactamente lo que se quiere cuando cada cliente tiene su propia BD: cero migraciones de datos por multi-tenancy, cero filtros `tenantId` en queries, cero riesgo de fuga por un `where` olvidado.

Lo que falta **no está en el dominio, está en la capa de plataforma**:

| Área | Estado actual | Trabajo necesario |
|---|---|---|
| Esquema de datos | ✅ Ya es "una tienda por BD" | Ninguno (se agrega BD maestra aparte) |
| Conexión a BD | ❌ `PrismaService` singleton con un único `DATABASE_URL` | Ruteo por tenant (proxy + `AsyncLocalStorage` o proceso por tenant) |
| Resolución de tenant | ❌ No existe (no se lee `Host`, no hay `X-Tenant`) | Middleware + BD maestra (tenant, dominios) |
| Auth/sesiones | ⚠️ JWT sin tenant; cookies sin namespace | Claim `tenantId`, cookies por host o nombre por tenant |
| Caché/colas/notificaciones | ❌ Claves y jobs sin namespace | Prefijo `t:<tenant>:`, `tenantId` en payloads |
| Storage (R2) | ⚠️ Credenciales/bucket globales, claves sin tenant | Prefijo `t/<tenant>/` (simple) o bucket por cliente |
| Pagos/webhooks | ⚠️ Bold ya es por tienda (StoreConfig); Stripe global; webhook sin tenant | Tenant en la URL del webhook + credenciales por cliente |
| Emails | ⚠️ Sender por tienda; credenciales SMTP/Resend globales | Credenciales por cliente + dominio correcto en links |
| Storefront | ⚠️ `NEXT_PUBLIC_API_URL` build-time; no reenvía host | Resolver tienda por dominio (subdominio) |
| Admin | ❌ 100% de una sola tienda | Panel de plataforma + selector de cliente |
| Migraciones/seeds | ⚠️ Manuales, 41 migraciones, sin `migrate deploy` | Orquestador de provisioning por BD |
| Backups/health | ⚠️ De una sola BD | Por tenant + agregado |

**Recomendación de arquitectura inicial:** un **API compartido** con resolución de tenant y un **proxy de Prisma por `AsyncLocalStorage`** (detalle en §4), con el admin actual convertido en panel de plataforma con selector de cliente. Alternativa de menor riesgo inicial: **un proceso API por cliente** (casi cero refactor) + gateway que rutea; se puede empezar por ahí y migrar al modelo compartido cuando la operación lo justifique.

**Estimación gruesa (1 dev full-time):**
- MVP funcional (crear cliente → tienda aislada operativa): **4 a 6 semanas**.
- SaaS completo (facturación, dominios propios, self-service, observabilidad): **2 a 3 meses**.

---

## 2. Estado actual (lo que hay)

### 2.1 Monorepo
- `apps/api` — NestJS 11 + Prisma 6 (Postgres) + Redis (cache + BullMQ) + R2 (S3) + Stripe/Bold.
- `apps/web` — Next 16 (storefront, SSR con `force-dynamic`, config vía `/store-config`).
- `apps/admin` — Next 16 (panel de la tienda; auth JWT con cookie `admin_refresh_token`).
- `packages/api-client` (cliente tipado desde OpenAPI), `packages/shared` (schemas Zod + reglas), `packages/ui`.

### 2.2 Lo que ya juega a favor
- **Sin `tenantId` en el esquema**: `apps/api/prisma/schema.prisma` — 39 modelos, todos de una tienda. En BD-por-cliente no hay que tocarlos.
- **Unicidades por BD** (`User.email` línea 12, `Coupon.code`, `Page.slug`, `ProductVariant.sku`…): el mismo email/slug puede repetirse entre clientes sin conflicto.
- **Sin SQL crudo**: el único `$queryRaw` es `SELECT 1` en `apps/api/src/health/health.controller.ts:26`. Cambiar de conexión no rompe nada.
- **Configuración de tienda en BD** (`StoreConfig`, `StoreSettings`): branding, moneda, envío, Bold, OAuth, legal, feature flags. Es la "personalización" que cada cliente ya puede editar sin tocar código.
- **Bold ya es por tienda** (credenciales en `StoreConfig`, `apps/api/src/payment/providers/bold-payment.provider.ts:62-72`) — el primer proveedor multi-cliente ya está resuelto.
- **Permisos/roles en BD** (`Role.permissions`) — cada cliente puede tener sus roles.

### 2.3 Lo que asume una sola tienda (evidencia)
- `apps/api/src/prisma/prisma.service.ts:1-16` — cliente único, `$connect()` en `onModuleInit`, `PrismaModule` global.
- `apps/api/prisma/schema.prisma:5-8` — `url = env("DATABASE_URL")`.
- `StoreConfig.findFirst({ where: { isActive: true } })` en **17 lugares** (store-config, auth OAuth, checkout, shipping, email, payment…). `StoreSettings.findFirst()` en orders y seeds.
- JWT sin tenant: `apps/api/src/auth/strategies/jwt.strategy.ts:9-16` (`sub`, `email`, `role`, `permissions`, `scope`).
- Cookies sin tenant: `apps/api/src/auth/auth.controller.ts:49-97` (`refresh_token`, `admin_refresh_token`, `__Host-` en prod).
- Caché sin namespace: `apps/api/src/common/redis-cache.store.ts:3` (`catalog:`), `clear()` borra `catalog:*` de todos.
- Colas sin tenant: `apps/api/src/queues/queue-names.ts:1-5` + procesadores que inyectan el Prisma singleton.
- R2 global: `apps/api/src/storage/r2-storage.service.ts:28-49` (bucket/credenciales de env, claves `folder/uuid`).
- Webhooks sin tenant: `apps/api/src/payment/payment.controller.ts:91-113` (solo `orderId`; el resolver lee `StoreConfig` **antes** de saber de qué BD).
- Storefront sin host: `apps/web/src/lib/api.ts:24-33` (URL build-time), `apps/web/src/app/layout.tsx:52-61` (pide `/store-config` sin identificador), `apps/web/src/middleware.ts:9-29` (redirects cacheados globales).
- Admin de una tienda: `apps/admin/src/lib/admin-nav.ts:19-88` (todo es de tienda; no hay "clientes"/"plataforma").
- Backups de una BD: `apps/api/src/backup/backup.service.ts:16-27` (`pg_dump` con `DATABASE_URL` único).

---

## 3. El modelo propuesto (BD por cliente)

```
                        ┌────────────────────────────┐
   navegador ──host──▶  │  API (NestJS, compartido)  │
                        │  TenantResolver (Host /    │
                        │  X-Tenant / JWT.tenantId)  │
                        └───────┬───────────┬────────┘
                                │           │
                    ┌───────────▼──┐   ┌────▼─────────────────────────┐
                    │ BD MAESTRA   │   │  Pool de PrismaClients       │
                    │ tenants      │   │  (por tenant, LRU + límites) │
                    │ domains      │   └────┬───────┬───────┬─────────┘
                    │ platform_users│       │       │       │
                    │ provisioning │   ┌───▼──┐ ┌──▼───┐ ┌─▼────┐
                    └──────────────┘   │BD A  │ │BD B  │ │BD C  │
                                       └──────┘ └──────┘ └──────┘
```

### 3.1 BD maestra (nueva, ~4 tablas)
- `Tenant`: `id`, `name`, `slug` (subdominio), `status` (`PROVISIONING|ACTIVE|SUSPENDED|DELETED`), `databaseUrl` (**cifrada**), `plan`, `createdAt`, `ownerUserId`.
- `TenantDomain`: `tenantId`, `host` (único) — soporta `cliente.nova.app` y dominios propios.
- `PlatformUser`: operadores del SaaS (distintos de los admins de tienda), con roles `PLATFORM_OWNER` / `PLATFORM_SUPPORT`.
- `TenantEvent`/`ProvisioningJob`: bitácora de provisioning, migraciones aplicadas, estado de salud.

### 3.2 Resolución del tenant (el "redirección a la BD específica")
1. **Storefront**: por `Host` (`tienda-a.nova.app` o dominio propio) → `TenantDomain` → tenant.
2. **Admin**: el operador de plataforma elige cliente → el front manda `X-Tenant: <slug>` con su token de plataforma; los admins de tienda mandan su token normal (que ya trae `tenantId`).
3. **Webhooks**: tenant en la URL (`/payments/webhook/:tenantSlug/bold`) — necesario porque la firma se valida con la config de esa BD.
4. Un middleware global (lo primero del pipeline, antes de guards) resuelve el tenant y lo guarda en `AsyncLocalStorage`; si no resuelve → 404/400 claro.

---

## 4. Decisión clave: API compartido vs un proceso por cliente

| | **API compartido** (recomendado a mediano plazo) | **Proceso API por cliente** |
|---|---|---|
| Cambios en el código | Prisma proxy + middleware + namespaces (caché/colas/R2/cookies) | Casi ninguno (`DATABASE_URL` por proceso) |
| Aislamiento | Lógico (un bug en el ruteo puede mezclar) | Físico (procesos separados) |
| Operación | 1 deploy, N BD | N deploys, N contenedores |
| Escala | Pool de conexiones por tenant en un proceso (cuidado con `max_connections`) | Pool acotado por proceso |
| Costo infra | Menor | Mayor (memoria/CPU por cliente) |
| Provisioning | Insertar tenant + crear BD | Insertar tenant + crear BD + levantar proceso |
| Ideal para | 10–500 clientes | Pocos clientes grandes / requisitos de aislamiento fuerte |

**Patrón técnico para el API compartido (clave para que sea viable):**
- `PrismaService` se convierte en un **proxy**: los ~50 servicios siguen inyectando `PrismaService` sin cambios, pero cada acceso (`this.prisma.product.findMany(...)`) resuelve el cliente del tenant actual desde `AsyncLocalStorage`. Se implementa con un `Proxy` de JS que delega a `getClientForTenant(tenantId)`.
- Cache de clientes: `Map<tenantId, PrismaClient>` con LRU + `connection_limit` bajo por cliente (p. ej. 3–5) y `$disconnect()` al desalojar. Con PgBouncer por BD se elimina el problema de conexiones.
- `AsyncLocalStorage` se setea en un middleware (host/header) y también al arrancar jobs de BullMQ (el payload lleva `tenantId`).

---

## 5. Gap analysis detallado por área

### 5.1 Prisma / conexiones (bloqueante #1)
- `prisma.service.ts` singleton + `PrismaModule` `@Global()` → introducir la factoría/proxy (§4).
- Seeds: 7 scripts con `new PrismaClient()` propio (`seed-roles.ts:5`, `seed-visual-demo.ts:32`, …) → parametrizar con `--tenant` o `DATABASE_URL` inyectada.
- `CurrenciesService.onModuleInit()` (`currencies.service.ts:29-47`) y `StoreConfigService.findOrCreateDefault()` (`store-config.service.ts:15-54`) corren una vez por proceso → en API compartido deben ejecutarse **por tenant** (en provisioning o lazy por tenant).
- `GET /store-config` público hace una **escritura** (`findOrCreateDefault`) → en multi-tenant conviene separar lectura de creación.

### 5.2 Auth / sesiones / cookies (bloqueante #3)
- JWT: agregar `tenantId` al payload (access y challenge 2FA) y validar en la estrategia.
- Refresh tokens: viven en la BD del tenant ✓ (ya aislados); las **cookies** no: con API compartido en un mismo host, dos tenants en el mismo navegador se pisan. Opciones: (a) API por subdominio de tenant (`api.tienda-a.nova.app`) → `__Host-` aislada por host; (b) nombre de cookie por tenant (`refresh_token__<slug>`).
- `SameSite=Strict` + dominios distintos (API vs storefront) rompe el envío de cookies → si el API no comparte sitio con el storefront, hay que pasar a `SameSite=None; Secure` (con las limitaciones de cookies de terceros en Safari/Chrome) o servir el API en el mismo dominio (`/api` reverse-proxy) — **recomendado: mismo dominio con reverse proxy**.
- Identidad: `User.email` único por BD → la misma persona puede tener cuentas separadas por tienda (normal en este modelo). No hay SSO entre tiendas (decisión de producto).
- Roles: `SUPER_ADMIN` es de tienda; hace falta el rol de **plataforma** en la BD maestra.

### 5.3 Redis: caché, colas, notificaciones (bloqueante #6)
- Caché: prefijar todas las claves (`t:<tenant>:catalog:...`) y `clear()` acotado al prefijo del tenant (`redis-cache.store.ts`).
- BullMQ: `tenantId` en cada payload; los procesadores setean el contexto (ALS) antes de tocar Prisma/Email; o colas por tenant (`bulk-email:<tenant>`) si se quiere aislamiento total.
- `EmailProviderResolver` cachea 60 s una sola config (`email-provider.resolver.ts:24,52-76`) → cache por tenant.
- SSE de notificaciones: filtrar por tenant (hoy llega a todos los admins).

### 5.4 Storage R2 (bloqueante #5)
- **Opción simple (recomendada)**: un bucket compartido con prefijo `t/<tenantId>/...` en `assets.service.ts` (hoy `folder/uuid`); `Asset.bucket` puede seguir diciendo `r2`.
- **Opción aislada**: bucket/credenciales por cliente → agregar campos al `StoreConfig` del tenant (o a la BD maestra) y construir el `S3Client` por tenant.
- Fallback local (`uploads/`) y `/images/:filename` no tienen aislamiento → limitar a dev o prefijar por tenant.

### 5.5 Pagos y webhooks (bloqueante #4)
- Bold: ya por tienda ✓ (creds en `StoreConfig`). El webhook necesita tenant en la URL para saber con qué secreto validar.
- Stripe: hoy 100% env (`stripe-payment.provider.ts:19-26,48-49,80`) → mover `secretKey`, `webhookSecret`, `success/cancel URL` a configuración por tienda (como Bold) o a la BD maestra.
- `PaymentProviderResolver` lee `StoreConfig` → queda bien con el tenant resuelto.
- `STOREFRONT_URL`/`FRONTEND_URL` para callbacks → por tenant (dominio del cliente).

### 5.6 Emails (bloqueante #7)
- Sender ya es por tienda (`StoreConfig.emailSenderName/Address`); **credenciales** (SMTP/Resend) son globales → moverlas a config por tienda (cifradas) o a un proveedor único de plataforma con subdominios de envío.
- Links de verificación/reset usan el primer `FRONTEND_URL` (`auth.service.ts:220-224,250`) → deben usar el dominio del tenant que originó la acción.

### 5.7 Storefront (bloqueante #8)
- Resolver la tienda por dominio: en el layout/middleware leer `host` (Next `headers()`) y pedir la config con `X-Tenant`/`Host` al API.
- `NEXT_PUBLIC_API_URL` build-time → usar **una sola URL de plataforma** (`api.nova.app`) y resolver por host; o un rewrite/proxy `/api/*` por tenant.
- `middleware.ts` cachea redirects globalmente → cachear por host.
- `localStorage` (carrito anónimo, sesión): aislado por origen ✓ si cada tienda tiene su dominio/subdominio (no usar multi-tenant por path).
- SEO: `metadataBase` y canonical por tienda.

### 5.8 Admin / panel de plataforma (bloqueante #9)
- El admin actual queda como **admin de tienda** (con `X-Tenant` + token de tienda o de plataforma).
- Nuevas pantallas de plataforma: Clientes (listado/alta/suspensión), Provisioning (estado, migraciones, salud), Dominios, Planes/Facturación (fase posterior), Operadores de plataforma + auditoría global, Impersonación (con auditoría).
- Selector de cliente en el shell del admin (el token de plataforma + `X-Tenant`).

### 5.9 Provisioning, migraciones y seeds (bloqueante #11)
Flujo de alta de un cliente (automatizable en un endpoint `POST /platform/tenants`):
1. Insertar `Tenant` (estado `PROVISIONING`) + dominio `slug.nova.app`.
2. `CREATE DATABASE tenant_<slug>` en el Postgres de plataforma.
3. `prisma migrate deploy` con `DATABASE_URL` de esa BD (registrar versión aplicada).
4. Seeds obligatorios: `seed:roles` (sin `CUSTOMER` el registro falla — `auth.service.ts:58-64`), monedas, `StoreConfig` inicial, email templates, páginas legales.
5. Crear el **admin del cliente** (usuario owner) + email de bienvenida.
6. Estado → `ACTIVE`; guardar `databaseUrl` cifrada.
- **Migraciones en masa**: comando `platform:migrate-all` que itera tenants activos, aplica `migrate deploy` pendiente y reporta fallos; guardar el estado por tenant (tabla `TenantMigration` en la maestra).

### 5.10 Backups, salud y operación (bloqueante #12)
- `BackupService` (`backup.service.ts:16-27`) es de una BD → por tenant (iterar) + retención por plan. **Ojo**: hoy interpola la URL en un shell; al venir de la maestra, sanitizar (evitar inyección).
- `HealthController` → health agregado (maestra + tenants + Redis + R2) y un endpoint de salud por tenant.
- Observabilidad: logs con `tenantId`, métricas por tenant (requests, errores, latencia).

### 5.11 Seguridad y secretos (bloqueante #14)
- `StoreConfig` guarda `boldSecretKey` y `shippingApiKey` **en claro**; la maestra guardará `databaseUrl` y credenciales → **cifrar en reposo** (AES-GCM con clave de plataforma) y nunca exponerlas en la API pública (hoy `GET /store-config` ya excluye secretos ✓).
- Auditoría: `AuditService` es por BD; la plataforma necesita su propia auditoría (acciones de operadores sobre clientes).
- Aislamiento: un test de "fuga" por cada área global (caché/colas/SSE/storage) antes de abrir a clientes reales.

### 5.12 Reporting / identidad cross-tenant (bloqueante #15)
- Dashboards/analytics/exports son por BD → el panel de plataforma necesita métricas agregadas (consultas fan-out o ETL a un almacén) y facturación por uso (GMV, órdenes, storage).

---

## 6. Plan recomendado por fases

### Fase 0 — Preparación (2–3 días)
- Congelar el esquema actual como "schema de tenant v1"; documentar el flujo de provisioning.
- Cifrado de secretos (util reutilizable) + decisión de dominio (`*.nova.app` con reverse proxy al API).

### Fase 1 — Núcleo multi-tenant (1,5–2 semanas)
- BD maestra con Prisma separado (`prisma/master.prisma` o proyecto aparte) + migraciones propias.
- Módulo `platform` en la API: tenants CRUD + provisioning (crear BD, migrar, seed, admin owner).
- `TenantResolver` (middleware por `Host`/`X-Tenant`/`JWT.tenantId`) + `AsyncLocalStorage`.
- `PrismaService` proxy con caché LRU de clientes y límites de pool.
- Namespaces: caché (`t:<id>:`), colas (`tenantId` en payload), R2 (`t/<id>/`).

### Fase 2 — Auth y flujos por cliente (1–2 semanas)
- `tenantId` en JWT/2FA + cookies (subdominio por tenant o nombre por tenant) + CORS dinámico por dominio registrado.
- Webhooks con tenant en la URL + Stripe/credenciales por tienda.
- Emails: credenciales por tienda + links con el dominio correcto.
- Storefront: resolución por host + `middleware` por host + SEO.

### Fase 3 — Panel de plataforma (2–3 semanas)
- Admin: sección **Clientes** (listado, alta con provisioning en vivo, suspender/activar), **Dominios**, **Salud** (migraciones/BD/backups), **Operadores** y **Auditoría de plataforma**.
- Selector de cliente + impersonación auditada.
- Backups/health por tenant; migraciones en masa con reporte.

### Fase 4 — SaaS completo (3–4 semanas)
- Planes/límites, facturación (suscripción y/o uso), onboarding self-service, dominios propios + SSL automático, emails transaccionales de plataforma, métricas y alertas.

---

## 7. Alternativas evaluadas

| Modelo | Pros | Contras en ESTE código | Veredicto |
|---|---|---|---|
| **BD por cliente** (propuesto) | Aislamiento total; cero cambios de esquema; backups/restores por cliente; el esquema ya está listo | Provisioning/migraciones fan-out; pool de conexiones; operación | ✅ **Recomendado** |
| Una BD + `tenantId` en todo | 1 BD, migraciones simples | Tocar los 39 modelos y **todas** las queries; riesgo de fugas; RLS o filtros manuales; borrar un cliente es delicado | ❌ Más trabajo aquí, más riesgo |
| Schema por tenant (Postgres schemas) | Aislamiento medio, 1 BD | Prisma no soporta multi-schema de forma nativa (clientes con `?schema=`); mismo fan-out que BD-per-tenant sin sus ventajas | ⚠️ No aporta |
| Proceso API por cliente | Casi cero refactor; aislamiento físico | N deploys/contenedores; costo; gateway para el admin multi-cliente | ⚠️ Buen punto de partida con pocos clientes |

---

## 8. Riesgos principales

1. **Fuga cross-tenant por estado global** (caché, colas, SSE, storage) — mitigar con namespaces + tests de aislamiento.
2. **Conexiones Postgres** (pool por tenant) — límites bajos + PgBouncer por BD.
3. **Migraciones fan-out** — runner con estado por tenant y modo "dry-run"/rollback.
4. **Cookies/sesión en dominios cruzados** — reverse proxy del API en el mismo dominio del storefront.
5. **Secretos** (BD, pagos, SMTP) — cifrado en reposo + rotación.
6. **Provisioning manual** — automatizar desde el día 1 (idempotente y reanudable).
7. **Costos de infra** — medir por tenant (storage, emails, conexiones) para planes.

---

## 9. Decisiones que conviene tomar antes de arrancar

1. **Modelo de API**: compartido (recomendado) o proceso por cliente para los primeros clientes.
2. **Dominios**: subdominio de plataforma (`cliente.nova.app`) y/o dominios propios; reverse proxy del API en el mismo dominio.
3. **Storage**: bucket compartido con prefijos (simple) o bucket por cliente (aislado).
4. **Emails**: credenciales por cliente o un proveedor único de plataforma con subdominios.
5. **Planes/facturación**: desde el inicio (aunque sea manual) para no rediseñar el modelo después.
6. **Alcance del MVP**: ¿el primer cliente ya necesita todo (dominios propios, facturación) o alcanza con "crear cliente + tienda aislada + admin multi-cliente"?

---

## 10. Conclusión

La conversión es **viable y natural** para este código: el dominio ya está modelado como "una tienda por base de datos", así que el modelo de BD-por-cliente evita la parte más costosa y riesgosa (meter `tenantId` en 39 modelos y todas las queries). El trabajo es de **capa de plataforma**: BD maestra, resolución de tenant, conexiones por tenant, namespaces de infraestructura, provisioning/migraciones automatizadas y panel de plataforma. Con el plan por fases, un MVP con clientes reales es alcanzable en **4–6 semanas** de trabajo de un desarrollador.

---

## 11. Estado de implementación (2026-10-21)

Se implementó el **núcleo multi-tenant** con un solo backend para todos los clientes y BD por cliente. La tienda actual quedó como **tenant #1 (`nova`)** y se creó un **tenant de prueba (`demo`)** con su propia BD para validar el aislamiento.

### 11.1 Qué quedó funcionando

| Pieza | Implementación |
|---|---|
| **BD maestra** | `apps/api/prisma/master/schema.prisma` (+ migraciones en `prisma/master/migrations`): `Tenant` (slug, nombre, estado, `databaseUrl` **cifrada**, `isDefault`, overrides de R2) y `TenantDomain` (host único → tenant). Cliente propio: `MasterPrismaService` (import `@prisma/master-client`). |
| **Resolución de tenant** | `TenantMiddleware` global (antes de los guards): `X-Tenant` → `?tenant=` (webhooks) → host del `Origin`/`Referer` → `Host` → tenant por defecto (`DEFAULT_TENANT_SLUG` / `isDefault`). Sla 404 si el tenant explícito no existe y 503 si está suspendido. Setea `X-Tenant` en la respuesta. |
| **Conexión por tenant** | `TenantContextService` (AsyncLocalStorage) + `TenantPrismaFactory` (cache de `PrismaClient` por slug con `datasourceUrl`) y `PrismaService` convertido en **Proxy**: los ~50 servicios siguen usando `this.prisma.<modelo>` sin cambios y cada llamada va a la BD del tenant actual. Sin contexto (boot/scripts) usa `DATABASE_URL` (tenant por defecto). |
| **Sesiones** | JWT con claim `tenant` (validado contra el tenant del request), challenge 2FA con tenant, y **cookies por tenant** (`refresh_token__<slug>`, `admin_refresh_token__<slug>`, `__Host-…` en prod). |
| **Caché** | Claves con prefijo `t:<slug>:` (catálogo) — aislamiento aunque el store sea compartido. Store Redis reescrito como `KeyvStoreAdapter` (cache-manager v6): TTL en ms, `clear()` borra solo `t:<slug>:*` del tenant actual y, si Redis no está disponible, degrada a no-op sin romper requests. |
| **R2 dual** | `R2StorageService` resuelve por tenant: si el tenant tiene bucket propio (campos `r2*` en la BD maestra) usa sus credenciales/bucket/URL sin prefijo; si no, usa el bucket de la plataforma (env) con prefijo `t/<slug>/`. `buildAssetUrl` usa la URL pública del tenant cuando existe. |
| **Emails** | `EmailProviderResolver` resuelve proveedor **y credenciales por tenant** (SMTP host/puerto/usuario/contraseña/from o Resend API key/from en `StoreConfig`, caché 60 s, fallback a las envs de la plataforma). Los links de verificación/reset usan el dominio del tenant. |
| **Pagos por tenant** | **Bold** (botón embebido + link de pago + hash de integridad server-side) y **Stripe** (checkout + webhook + reembolsos) leen sus credenciales de `StoreConfig` en cada operación; los clientes HTTP de Stripe se cachean por secret key. Cada cliente puede usar su propia cuenta sin reiniciar la API. |
| **Colas** | `tenantSlug` en el payload de cada job; los workers resuelven el tenant y procesan dentro del contexto (bulk-email, design-preview, payment-reconciliation). |
| **Webhooks** | Aceptan `?tenant=<slug>` (recomendado para configurar en Bold/Stripe) además de los headers. |
| **Storefront** | `resolveTenantSlug()` (cliente: hostname; SSR: `next/headers`) → `X-Tenant` en todas las llamadas (cliente y servidor). `demo.localhost` carga la tienda demo. |
| **Admin** | Envía `X-Tenant` del cliente configurado (`NEXT_PUBLIC_DEFAULT_TENANT` / `localStorage`), listo para un selector de clientes. |
| **Provisioning** | `apps/api/src/platform/provisioning.ts` (lógica compartida): crea la BD (`tenant_<slug>`), aplica migraciones, siembra roles, crea `StoreConfig` inicial y el admin del cliente. `create-tenant.ts` (CLI) y `POST /platform/tenants` (panel) usan la misma función. `register-default-tenant.ts` registra la tienda actual. |
| **Panel de plataforma** | `GET/POST /platform/tenants`, `PATCH /platform/tenants/:id`, `GET /platform/tenants/:id/health` (incluye últimas migraciones), `GET /platform/tenants/:id/migrations`, `POST /platform/migrate`, `POST /platform/backups`. Alta **asíncrona**: registra el tenant en `PROVISIONING` y provisiona en background (la lista muestra el error si falla). Guard: solo `SUPER_ADMIN` del tenant por defecto. Página **Clientes** (`/clients`) en el admin, visible solo para esa cuenta: listar, crear, suspender/activar, salud (conteos + última migración) y abrir tienda. |
| **Perfil transversal + selector** | El super admin entra por `/platform-login` con su `PlatformUser`, el sistema abre el cliente por defecto (impersonación) y el header muestra un **selector de cliente**. Al cambiar se emite una sesión del admin de ese tenant (con `step-up` de 10 min), se fija `X-Tenant` y se **recarga completa** para que ninguna pantalla conserve datos del cliente anterior. El menú del selector incluye el **perfil de plataforma** (identidad, rol, 2FA, cliente actual, logout). |
| **Aislamiento del admin** | La config de tienda se refresca en cliente con el `X-Tenant` real (el SSR no conoce el tenant) y el título; las notificaciones SSE se etiquetan y filtran por tenant (el guard valida el claim del token); la vista previa apunta al storefront del cliente seleccionado. |
| **Impersonación** | `POST /platform/tenants/:id/impersonate`: abre una sesión del `SUPER_ADMIN` activo de ese cliente (tokens con el claim del tenant destino + cookie `admin_refresh_token__<slug>`), con auditoría `PLATFORM_IMPERSONATE` en la plataforma y `PLATFORM_SESSION_START` en el cliente. El admin muestra la acción **Administrar tienda**, una banda "Administrando <slug>" y **Volver a plataforma** (la sesión de la plataforma se conserva en su propia cookie). El token impersonado no puede llamar a `/platform/*` (403) y **caduca a los `IMPERSONATION_TTL_MINUTES`** (120 por defecto) aunque el refresh siga vigente. |
| **Backups** | `BackupService` usa la BD del **tenant actual** y guarda en `BACKUP_DIR/<slug>/<slug>-<fecha>.sql.gz` (retención `BACKUP_RETENTION_DAYS` por carpeta). `POST /platform/backups` respalda todos los clientes activos y devuelve el reporte por slug. Si el host no tiene `pg_dump`, `BACKUP_DOCKER_CONTAINER` lo ejecuta dentro del contenedor Postgres (dev). `BackupScheduler` corre solo en producción (`BACKUP_SCHEDULER_ENABLED`/`BACKUP_INTERVAL_HOURS`, 24 h) e itera todos los tenants. |
| **Migraciones** | `POST /platform/migrate` aplica `migrate deploy` a todos los clientes activos y guarda cada ejecución en `tenant_migrations` (nombre de la última migración, estado, duración, error) en la BD maestra; el panel de salud muestra el historial. |

### 11.2 Cómo crear un cliente

```bash
cd apps/api
doppler run -- npx ts-node --transpile-only src/database/scripts/create-tenant.ts \
  --slug=acme --name="Acme Store" --domain=acme.nova.app \
  --admin-email=admin@acme.com --admin-password='...'
```

- Crea la BD `tenant_acme` en el mismo Postgres de la maestra (o usar `--database-url` para una BD existente).
- El storefront responde en `acme.nova.app` (o `acme.localhost` en dev) y el admin administra ese cliente enviando `X-Tenant: acme`.
- Para usar un bucket R2 propio: actualizar los campos `r2*` del tenant en la BD maestra (el bucket de la plataforma se sigue usando por defecto).

También se puede hacer desde el admin: **Plataforma → Clientes → Nuevo cliente** (nombre, slug, dominio, email y contraseña del admin). El alta corre en segundo plano (~1 min: crea BD, migra y siembra); la tabla se refresca sola y muestra `PROVISIONING` → `ACTIVE` (o el error). El botón **Salud** verifica la conexión a la BD del cliente y muestra productos/órdenes/usuarios y la última migración aplicada.

Para administrar la tienda de un cliente sin sus credenciales, usar **Administrar tienda** en la fila del cliente: el panel emite una sesión de su admin (con auditoría en ambas BDs) y muestra la banda "Administrando <slug>". **Volver a plataforma** restaura la sesión original; mientras se impersona, el grupo **Plataforma** del sidebar se oculta y "Salir" también vuelve a la plataforma.

### 11.3 Endurecimiento P0 (2026-10-21)

| Mejora | Implementación |
|---|---|
| **Fail-closed de la maestra** | Si la BD maestra no responde, en producción **no** se cae a `DATABASE_URL`: un slug/host desconocido devuelve 503 (evita servir la BD del tenant por defecto bajo otro dominio). El fallback single-tenant solo aplica en dev o con `ALLOW_SINGLE_TENANT_FALLBACK=true`. Health: `GET /health/platform`. |
| **PlatformUser** | Identidad propia en la maestra (OWNER/OPERATOR/SUPPORT, 2FA TOTP, sesiones revocables). `POST /platform/auth/login`, `/login/2fa`, `/refresh`, `/logout`, `/me`, `/2fa/*`, `/sessions`, `/audit`; `GET/POST/PATCH /platform/users`. Access token corto + refresh opaco hasheado en `platform_sessions`. El panel acepta la cuenta nueva y, en dev, el modo legacy (SUPER_ADMIN del tenant) con `ALLOW_LEGACY_PLATFORM_ADMIN`. |
| **Step-up + impersonación auditada** | `POST /platform/tenants/:id/impersonate` exige `reason` y, con PlatformUser, la contraseña del operador. `readOnly` emite una sesión sin mutaciones (interceptor global → 403). Auditoría centralizada en `platform_audit_logs` (actor, tenant, motivo, IP, UA). |
| **Secretos cifrados** | `boldSecretKey`, `stripeSecretKey`, `stripeWebhookSecret`, `smtpPass`, `resendApiKey` y `shippingApiKey` se guardan AES-256-GCM (`enc:v1:`) y se descifran en los proveedores. `PLATFORM_SECRET_PREVIOUS` + `pnpm --filter api encrypt:secrets` permiten rotar la clave. |
| **Pool acotado** | `TenantPrismaFactory` usa un LRU (`TENANT_PRISMA_MAX_CLIENTS=50`) con desconexión diferida; evita crecer sin límite con muchos clientes. |
| **CORS/cookies multi-dominio** | CORS dinámico: orígenes de plataforma + subdominios de `PLATFORM_BASE_DOMAINS` + dominios registrados. Cookies `SameSite=None; Secure` cuando el storefront es un dominio propio cross-site y `Strict` en subdominios de plataforma; `refresh`/`logout` validan el `Origin` (anti-CSRF). |
| **Tests de aislamiento** | Unitarios de fail-closed y crypto; script `check:isolation` (token cruzado, login cruzado, catálogos distintos). |

### 11.4 Qué falta para el SaaS completo

- **P1 — Operación**: provisioning/migraciones como jobs en cola (hoy `execFileSync` bloquea el event loop), backups offsite cifrados con restore drills, observabilidad por tenant (métricas/trazas/alertas), SSE e invalidación multi-instancia, cuotas/fairness por tenant.
- **P2 — Producto**: portal self-service + onboarding, dominios propios con verificación DNS/SSL, verificación SPF/DKIM/DMARC, notas/tickets de soporte, offboarding/export/purga y planes/límites/facturación.
- **Plataforma**: permisos granulares por operador (hoy el rol es OWNER/OPERATOR/SUPPORT sin matriz) y step-up MFA obligatorio en producción.
- **Remitente verificado por dominio** (SPF/DKIM de cada cliente) y límites de envío; hoy las credenciales SMTP/Resend ya son por tenant.
- **Migraciones programadas**: el historial y la ejecución manual ya existen; falta un cron (similar al de backups) y alertas cuando falla un cliente.
- **Retención/copia externa de backups**: hoy es local (`BACKUP_DIR`); falta subirlos a R2/S3 y retención diferenciada por cliente.
- **Dominios propios + SSL** y verificación de dominio.
- **Infra de tests e2e**: el problema de ESM (`@scure/base`) está resuelto y hay guard para no correrlos contra la BD de desarrollo; falta una BD/tenant dedicado de test (`*_test`) y sembrar sus datos.
- **Facturación/planes** y límites por cliente.
