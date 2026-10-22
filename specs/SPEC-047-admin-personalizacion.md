# Spec: Personalización avanzada desde el admin

## Objetivo
Ampliar las capacidades de personalización del storefront desde el admin: legal/versionado de términos, anuncios con vigencia, secciones del home (destacados por categoría y cuenta regresiva), página 404, redirects, configuración de checkout (mínimo de compra y estimaciones), remitente de emails y login social (Google/Apple).

## Alcance
- Campos nuevos en `StoreConfig`: `termsPageId`, `termsVersion`, `minOrderAmount`, `productionEstimateDays`, `deliveryEstimateDays`, `emailSenderName`, `emailSenderAddress`, `googleOAuthEnabled`, `googleClientId`, `appleOAuthEnabled`, `appleClientId`.
- Modelo `StoreRedirect` con CRUD admin y endpoint público para el middleware del storefront.
- Términos versionados: el registro estampa la versión vigente; endpoint `POST /auth/accept-terms`; banner de re-aceptación en el storefront.
- Login social: `POST /auth/google` (verificación de id_token con `google-auth-library`) y `POST /auth/apple` (verificación RS256 contra JWKS de Apple); usuarios `googleId`/`appleId` en `User`.
- Esquema `storefrontConfig` (compartido): fechas del announcement, sección `countdown`, config `featuredProducts` (título, categoría, límite) y `notFound`.
- UI admin: secciones nuevas en `/store-config` (Legal, Checkout, Emails, OAuth) + página `/redirects`.

## Fuera de alcance
- Gestión de dominios/robots.txt.
- OAuth de otros proveedores.
- Editor visual de la 404.

## Apps afectadas
- `apps/api`, `apps/web`, `apps/admin`, `packages/shared`.

## Reglas de negocio
- `forgot-password` no se ve afectado. El login social usa los mismos tokens y cookie refresh que el login normal.
- Si una cuenta OAuth coincide por email con una existente, se vincula (`googleId`/`appleId`) en lugar de duplicar.
- `minOrderAmount` se valida en `POST /checkout/init` (subtotal del carrito).
- Los redirects activos se aplican en el middleware de Next (caché 60s) respetando el `statusCode` configurado.
- El banner de términos aparece si `acceptedTermsVersion` del usuario es menor a `StoreConfig.termsVersion`.
- El remitente de email configurado en `StoreConfig` tiene prioridad sobre las env (`SMTP_FROM`/`RESEND_FROM`).

## API
- `POST /auth/accept-terms` (JWT) → actualiza aceptación con la versión vigente.
- `POST /auth/google` — body `{ idToken }`.
- `POST /auth/apple` — body `{ identityToken, email?, firstName?, lastName? }`.
- `GET /store-redirects` (público, solo activos).
- `GET|POST /admin/store-redirects`, `PATCH|DELETE /admin/store-redirects/:id` (permisos `redirects:read`/`redirects:write`).
- `PATCH /store-config` acepta los nuevos campos.

## UI / UX
- `/store-config`: secciones Legal (select de página + versión), Checkout, Emails, OAuth.
- `/redirects`: tabla CRUD con toggle de activo y status code.
- `/login` y `/register`: botones Google/Apple reales (se muestran solo si están habilitados y con clientId).
- Home: cuenta regresiva estilo NÖVA y destacados filtrables por categoría.
- Carrito: aviso de mínimo de compra y estimaciones de producción/envío.
- `not-found.tsx`: título y mensaje configurables.

## Validaciones
- `fromPath` debe empezar con `/`; `statusCode` ∈ {301, 302, 307, 308}.
- `termsVersion` ≥ 1; estimaciones entre 0 y 365 días.
- DTOs OAuth con campos requeridos validados.

## Estados de carga y error
- Admin: loaders y notificaciones en redirects y store-config.
- Web: OAuth muestra estado de carga por proveedor y loguea errores sin romper el flujo.
