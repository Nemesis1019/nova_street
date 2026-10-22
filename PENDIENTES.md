# Mejoras pendientes — API y Web

> Lista de ajustes en `apps/api`, `apps/web` y `apps/admin`. Las tareas de alta y media prioridad ya están resueltas. Quedan items de pulido y mejoras futuras de administración.

---

## Resueltas

### Roles — Super Admin y protección de API keys (2026-10-12)

- ✅ **Rol `SUPER_ADMIN`** creado (48 permisos = todos) para control total del panel; el rol `ADMIN` quedó con todo **excepto** `providers:read/write`. Seed actualizado (`seed:roles`): CUSTOMER / ADMIN / SUPER_ADMIN.
- ✅ **`admin@tienda.com` asignado a SUPER_ADMIN**; `admin2@tienda.com` queda como ADMIN (útil para validar la restricción). 2FA ahora también es obligatorio para `SUPER_ADMIN` (`TWO_FACTOR_FORCED_ROLES=SUPER_ADMIN,ADMIN,STAFF`).
- ✅ **Permisos nuevos `providers:read` / `providers:write`** (categoría "Proveedores & Integraciones" en `/roles`) y **se eliminó el bypass de `role === 'ADMIN'`** del `RolesGuard`: ahora los permisos se evalúan siempre contra la lista efectiva (rol + overrides).
- ✅ **Solo Super Admin puede tocar**:
  - `PATCH /store-config` en los campos de proveedores/API keys: `paymentProvider`, `boldApiKey`, `boldSecretKey`, `boldSandbox`, `emailProvider`, `googleOAuthEnabled`, `googleClientId`, `appleOAuthEnabled`, `appleClientId` (bloquea solo si el valor **cambia**; guardar el resto de la config sigue funcionando para ADMIN).
  - `GET/PATCH /shipping-options/admin/credentials` (credenciales del carrier).
- ✅ **UI**: en `/store-config` los campos de proveedores quedan deshabilitados con aviso "Solo Super Admin puede gestionar proveedores y API keys"; en `/shipping-options` el botón de credenciales queda bloqueado. Hook `useCurrentPermissions()` reutilizable.
- ✅ **Endurecimiento extra**: los secretos (`boldSecretKey`, `shippingApiKey`) ya no quedan en claro en la auditoría (`[redacted]`).
- ℹ️ Para dar control total a otro usuario: asignarle el rol `SUPER_ADMIN` desde `/users` (o quitarle `providers:*` a un rol custom para restringirlo).

### Pagos — Integración Bold (2026-10-12)

- ✅ **Botón de pagos de Bold** en el storefront: checkout embebido con el script oficial (`checkout.bold.co/library/boldPaymentButton.js`), hash de integridad SHA256(`orderId + amount + currency + llave secreta`) generado **server-side** (`GET /payments/button-checkout/:orderId`), fallback a link de pago (`POST https://integrations.api.bold.co/online/link/v1`) y webhook firmado (`POST /payments/webhook/bold`).
- ✅ **Webhook**: verificación `x-bold-signature` = HMAC-SHA256(llave secreta, base64(body)) en hex; en sandbox la firma usa clave vacía; mapea `SALE_APPROVED → PAID` y `SALE_REJECTED → FAILED`; **idempotente** (webhooks duplicados responden 200 sin re-procesar).
- ✅ **Credenciales desde `/store-config`**: llave de identidad, llave secreta (write-only, nunca se devuelve) y switch de sandbox; `GET /store-config` público no expone la llave secreta (`boldSecretConfigured` informa si está configurada).
- ✅ **`GET /payments/active-provider`** para que el storefront elija botón embebido (Bold) o redirect (Stripe).
- ✅ **`PaymentProviderResolver`**: la pasarela se resuelve en cada operación leyendo `StoreConfig`, así activar Bold desde el admin **no requiere reiniciar la API** (el token `PAYMENT_PROVIDER` quedó como hook de override para tests e2e).
- ✅ Página `/checkout/confirmacion` con polling del estado (Bold puede demorar hasta 10 min en notificar) y botón de reintento de pago.
- ✅ Tests unitarios del provider (9): firma de integridad, verificación de webhook, mapeo de eventos, sandbox y config del botón.
- ⏳ **Para activar en producción**: pegar las llaves del comercio (Panel Bold → Integraciones), elegir "Bold" como pasarela activa en `/store-config` y registrar el webhook apuntando a `https://<api-host>/payments/webhook/bold`.
- ℹ️ **Reembolsos**: Bold no expone API de anulación/reembolso para botón de pagos; el flujo de reembolsos del admin los marcará como fallidos con el mensaje de gestionarlos desde el panel de Bold.

### Plataforma — Emails y auth

- ✅ Plantillas de email configurables desde el admin (`/email-templates`): modelo `EmailTemplate`, motor de variables `{{...}}`/`{{{...}}}`, 11 emails transaccionales migrados, vista previa con datos de ejemplo y restablecer a default (SPEC-046).
- ✅ Flujo completo de recuperación de contraseña: `POST /auth/forgot-password` / `POST /auth/reset-password`, tokens hasheado SHA-256 de un solo uso (60 min), revocación de sesiones al restablecer, páginas `/forgot-password` y `/reset-password` en el storefront.
- ✅ Selección de proveedor de email en caliente: `EmailProviderResolver` lee `StoreConfig.emailProvider` en cada envío (caché 60s) — ya no requiere reiniciar la API.
- ✅ Fix de assets huérfanos: `DELETE /admin/assets/:id` + rollback en el admin si falla la creación del producto o la asociación de imagen.
- ✅ Fix de generación de swagger en rutas con caracteres no ASCII (`src/common/swagger-path-shim.ts`, cargado al arrancar la API y en `generate:swagger`).
- ✅ `express` agregado como dependencia explícita de `apps/api` (los tests e2e lo requieren con el layout estricto de pnpm).

### Plataforma — Personalización avanzada desde admin (SPEC-047)

- ✅ Términos y condiciones versionados: `termsPageId`/`termsVersion` en `StoreConfig`, registro estampa la versión vigente, `POST /auth/accept-terms` y banner de re-aceptación en el storefront.
- ✅ Login social real: `POST /auth/google` (id_token) y `POST /auth/apple` (RS256 vs JWKS de Apple), vínculo por email, botones funcionales en `/login` y `/register`.
- ✅ Redirects configurables: modelo `StoreRedirect`, CRUD en `/redirects` del admin y middleware de Next con caché de 60s.
- ✅ Página 404 configurable (título/mensaje en `storefrontConfig.notFound`).
- ✅ Home: sección `countdown` (cuenta regresiva de drop) y `featuredProducts` con título, categoría y límite configurables.
- ✅ Anuncio superior con fechas de vigencia (`startsAt`/`endsAt`).
- ✅ Checkout: `minOrderAmount` validado en `POST /checkout/init`, aviso en carrito y estimaciones de producción/envío en carrito y producto.
- ✅ Remitente de email configurable desde `/store-config` (`emailSenderName`/`emailSenderAddress`, prioridad sobre env).

### API — Alta y media prioridad

- ✅ Tests e2e para `GET /admin/dashboard/trends`.
- ✅ Tests e2e para flujo de tracking (`PATCH /admin/orders/{id}/tracking` + cambio a `SHIPPED` con `shippedAt` y email).
- ✅ Aislamiento de tests e2e con `maxWorkers: 1`.
- ✅ Endpoint `GET /admin/users/{id}/orders` y consumo desde el admin.
- ✅ Normalización explícita de fechas con `@Transform` en DTOs de admin.

### Admin — Notificaciones y productividad

- ✅ Notificaciones en tiempo real vía SSE (`GET /admin/notifications/stream`) para compras, stock bajo y reseñas pendientes.
- ✅ Búsqueda global (`GET /admin/search?q=...`) con `CommandPalette` (`Ctrl+K`/`Cmd+K`).
- ✅ Acciones masivas en productos (activar/desactivar/eliminar) y órdenes (cambiar estado).
- ✅ Columnas personalizables en tablas de productos y órdenes.
- ✅ Filtros guardados en `/orders`.
- ✅ Vista previa del storefront desde el header del admin.
- ✅ Autosave/borradores en formularios de productos y páginas.
- ✅ Importador CSV de productos con plantilla descargable.

### API — Baja prioridad

- ✅ Rate limiting básico con `@nestjs/throttler`:
  - 30 req/min por IP para endpoints públicos.
  - Desactivado en `NODE_ENV=test`.
  - Omite rutas de pasarela de pagos (`/checkout`, `/webhooks`, `/payments`).

### Web — Alta y media prioridad

- ✅ Mejoras en `/orders/[id]`: loading, mensaje para no autenticado, link al carrier y manejo de error.
- ✅ Componentes compartidos `LoadingState`, `EmptyState` y `ErrorState`.
- ✅ Estados unificados en `/orders` y `account/addresses`.
- ✅ `error.tsx` en `/orders`, `/producto/[slug]` y `/personalizar/[templateId]`.
- ✅ Tests de frontend con Vitest + React Testing Library.

### Web — Baja prioridad

- ✅ Moneda por defecto centralizada en `DEFAULT_CURRENCY_CODE` de `@ecommerce/shared`.
- ✅ Metadatos dinámicos por producto en `/producto/[slug]`.
- ✅ Ampliación inicial de tests de frontend (9 tests en web, 6 en admin).

### Admin — Stock

- ✅ Agregar stock desde el panel admin (`POST /admin/variants/{id}/add-stock`).
- ✅ Reflejar disponibilidad de stock en el storefront (detalle de producto, catálogo y carrito).

### Admin — Control de storefront

- ✅ Modo mantenimiento configurable desde `/store-config` con mensaje personalizado.
- ✅ Feature flags desde admin:
  - `enableCustomDesigns` (oculta/muestra el personalizador).
  - `enableNewsletter` (oculta/muestra la suscripción en registro).
  - `enableCatalogFilters` (oculta/muestra filtros en catálogo).

### Admin — Gestión de órdenes

- ✅ Timeline de estados con `AuditLog` en detalle de orden.
- ✅ Asignar operador (`assignedTo`) y notas internas (`adminNotes`).
- ✅ Cancelaciones/reembolsos con motivo, liberación de stock reservado y auditoría.

### Admin — Auditoría

- ✅ Vista de `AuditLog` en `/audit-logs` filtrable por entidad, acción, ID y usuario.

### Admin — Usuarios y permisos

- ✅ Suspender/bloquear usuarios con motivo; revocación de sesiones activas.
- ✅ Login y refresh rechazan usuarios suspendidos.

### Admin — Cupones y promociones

- ✅ Reglas por categoría/producto (`appliesTo`).
- ✅ Monto mínimo de orden (`minOrderAmount`).
- ✅ Límite de usos por usuario (`maxUsesPerUser`).
- ✅ Cupones de primera compra (`isFirstPurchaseOnly`).

### Admin — Moderación de diseños personalizados

- ✅ Rechazo con motivo obligatorio.
- ✅ Guardado de `rejectionReason`, `reviewedById` y `reviewedAt`.
- ✅ Email al cliente cuando un diseño es aprobado o rechazado.
- ✅ Vista del motivo en la tabla del admin.

### Documentación

- ✅ Modelo entidad-relación: `docs/ER_MODEL.md`, `docs/er-diagram.puml`, `docs/er-diagram.png` y script de regeneración `docs/generate_er.py`.

### Sistema de plantillas del storefront

- ✅ Campos `template` y `templateConfig` en `StoreConfig`.
- ✅ Plantilla base `storefront` extraída del home actual.
- ✅ Selector y editor de configuración de plantilla en `/templates` del admin.
- ✅ `StoreHeader` y `ProductCard` reaccionan a opciones del template.
- ✅ Preview en vivo del storefront dentro de `/templates` vía iframe.

### Contenido y SEO

- ✅ Páginas estáticas editables (FAQ, términos, políticas) con CRUD en `/pages` del admin y ruta `/pagina/[slug]` en el storefront.
- ✅ SEO por producto/categoría: campos `metaTitle` y `metaDescription` editables desde el admin y usados en metadatos de `/producto/[slug]` y `/catalogo`.

---

## Pendientes de baja prioridad

### API

- **Manejo de warnings en dev**
  - Revisar logs de SMTP/Stripe no configurados para reducir ruido en desarrollo (sin afectar la pasarela de pagos).

### Web

- **Responsive y accesibilidad**
  - Revisar foco, contraste y experiencia mobile en formularios de cuenta y checkout.
- **Ampliar cobertura de tests de frontend**
  - Agregar tests para hooks y componentes más complejos del storefront.
- **CORS del bucket R2 (Cloudflare)**
  - La política CORS del bucket solo permite `http://localhost:3000` y `http://localhost:3001`. Si el storefront se abre desde otro origen (`127.0.0.1:3000`, URL reenviada, etc.), la imagen base del personalizador carga sin CORS (se muestra igual, pero sin vista previa exportable).
  - Para recuperar la vista previa: agregar el origen en Cloudflare → R2 → bucket → Settings → CORS Policy (el token S3 actual no tiene permisos a nivel bucket para gestionarlo por API).

---

## Mejoras futuras de administración (no prioritarias)

1. **Usuarios y permisos**
   - ✅ Roles granulares: se pueden crear roles y editar su matriz de permisos desde `/roles`.
   - Pendiente: "invitar admins" (flujo de invitación por email; hoy se crean desde `/users`).

2. **Seguridad**
   - ✅ 2FA para admins (TOTP + dispositivo confiable + códigos de recuperación).
   - ✅ Sesiones: logout revoca el refresh token; refresh en cookie httpOnly con rotación y `__Host-` en producción.
   - Pendiente: pantalla de gestión de 2FA en Seguridad (desactivar / regenerar códigos de recuperación).
   - Pendiente: login con Google en el admin (el backend lo soporta; botón deshabilitado).
   - Rate limiting: `/admin` está exento a propósito (ráfagas legítimas del panel); auth con límite estricto.

---

## Auditoría admin (2026-10-12) — funcionalidades de los mockups pendientes

> Revisión de las 25 pantallas de Stitch vs el código: **cobertura completa de rutas**. Los siguientes puntos son funcionalidades que el mockup muestra pero que hoy no están soportadas (requieren backend nuevo).

1. **Reembolsos (`/refunds`)** — ✅ **Resuelto (2026-10-12)**: `POST /admin/refunds` (solicitud manual), `PATCH /admin/refunds/:id/approve|reject|retry`, `GET /admin/refunds/:id` (comprobante); UI con acciones por estado, modales de confirmación/comprobante/solicitud y feedback según resultado. Al completarse el total reembolsado la orden pasa a `REFUNDED` y libera reservas de stock.
2. **Órdenes — "Crear Orden Manual"** — ✅ **Resuelto (2026-10-12)**: `POST /admin/orders/manual` (cliente por id/email, items por variante, dirección guardada/nueva/default, envío, estado de pago, notas); modal en `/orders`. No reserva stock (carga administrativa).
3. **Envíos — zonas de cobertura y credenciales de API** — ✅ **Resuelto (2026-10-12)**: `ShippingOption.coverageZones` (migración `shipping_zones_and_credentials`), modal "Zonas de cobertura" y modal "Gestionar credenciales API" (`GET/PATCH /shipping-options/admin/credentials`, API key enmascarada y nunca expuesta en el `GET /store-config` público).
4. **Monedas — sincronización de tasas de cambio** — ✅ **Resuelto (2026-10-12)**: `POST /admin/currencies/sync` (open.er-api.com, base = moneda default) + botón "Sincronizar tasas" con detalle de cambios.
5. **Exportaciones — módulos Clientes y Logs** — ✅ **Resuelto (2026-10-12)**: `GET /admin/export/users` (filtros search/role/status) y `GET /admin/export/audit-logs` (filtros action/entity/from/to) + tarjetas en `/export`.
6. **Plantillas de email — "Crear Plantilla"** — ✅ **Resuelto (2026-10-12)**: `POST /admin/email-templates` (plantillas custom, claves reservadas bloqueadas) + `POST /admin/email-templates/:key/test` (envío de prueba con datos de ejemplo, errores del proveedor como 502 claro) + modal de creación y sandbox de envío habilitado.
7. **2FA — gestión desde Seguridad** — ✅ **Resuelto (2026-10-12)**: pantalla `/security` (estado, activar con QR, desactivar, regenerar códigos, dispositivos confiables con revocación) + endpoints autenticados `POST /auth/2fa/setup/current`, `POST /auth/2fa/setup/confirm/current`, `GET/DELETE /auth/2fa/devices`. Fix de seguridad: `sanitizeUser` ya no expone `twoFactorSecret`.
8. **Login admin con Google** — backend listo (`POST /auth/google`), botón deshabilitado por falta de Google Identity en el admin.
9. **Backups y Colas** — los endpoints existen (`/admin/backups/trigger`, `/admin/queues/jobs`) pero no tienen UI (baja prioridad, tampoco están en los mockups).

### Transversales detectados

- **Estados de error en queries** — ✅ **Resuelto (2026-10-12)**: componente compartido `QueryError` + `if (error) throw error` en las queries principales y rama de error con reintento en 21 pantallas.
- **Cobertura de tests del admin**: 15 tests (componentes base + auth + OTP). Falta cobertura de páginas y flujos (listados, mutaciones, 2FA).
- **Accesibilidad/responsive del admin**: sin auditoría formal (foco, contraste, navegación por teclado en tablas).

---

## Admin (`apps/admin`) — Estado actual

- Sin tareas pendientes de alta/media prioridad; las dos mejoras solicitadas están resueltas y verificadas.

---

## Guía: cómo crear o modificar una plantilla del storefront

### Conceptos

- `StoreConfig.template`: string que identifica la plantilla activa (ej. `storefront`).
- `StoreConfig.templateConfig`: objeto JSON libre con opciones propias de la plantilla activa. El backend lo recibe como `string` JSON y lo devuelve como objeto.
- El punto de entrada es `apps/web/src/app/page.tsx`, que switchea por `config.template` y renderiza el componente correspondiente.

### Pasos para modificar la plantilla existente (`storefront`)

1. Edita `apps/web/src/components/templates/storefront-home.tsx`.
2. Si necesitas una nueva opción configurable, agrégala al tipo `TemplateConfig` en `apps/web/src/providers/config-provider.tsx`.
3. Usa `config.templateConfig?.<nuevaOpcion>` dentro del componente para cambiar comportamiento o estilos.
4. Para que el admin pueda editarla, agrega el control en `apps/admin/src/app/templates/page.tsx` y envíala dentro del objeto `JSON.stringify(...)` al guardar.
5. Regenera `@ecommerce/api-client` solo si cambia la API (nuevo campo en `StoreConfig`); si solo es UI/frontend, no es necesario.
6. Verifica con `pnpm --filter web lint typecheck build` y `pnpm --filter admin lint typecheck build`.

### Pasos para crear una plantilla nueva (ej. `mi-plantilla`)

1. Backend:
   - No hace falta migrar; `template` es un string libre.
   - Si la nueva plantilla requiere datos nuevos en `templateConfig`, solo actualiza los DTOs de `StoreConfig` si quieres documentarlos en Swagger; de lo contrario, el JSON libre ya lo soporta.

2. Frontend web:
   - Crea `apps/web/src/components/templates/mi-plantilla-home.tsx`.
   - Exporta un componente que reciba `{ config, products }` (ver `storefront-home.tsx`).
   - Si usas variantes de header/tarjeta, extiende `TemplateConfig` con las opciones necesarias.
   - En `apps/web/src/app/page.tsx`:
     ```tsx
     import { MiPlantillaHome } from '../components/templates/mi-plantilla-home';
     // ...
     switch (template as TemplateName) {
       case 'mi-plantilla':
         return <MiPlantillaHome config={activeConfig} products={products} />;
       default:
         return <StorefrontHome config={activeConfig} products={products} />;
     }
     ```
   - Actualiza `TemplateName` en `apps/web/src/providers/config-provider.tsx`:
     ```ts
     export type TemplateName = 'storefront' | 'mi-plantilla';
     ```

3. Frontend admin:
   - En `apps/admin/src/app/templates/page.tsx`, agrega la nueva plantilla a `AVAILABLE_TEMPLATES`.
   - Agrega los controles de configuración específicos que necesite la nueva plantilla.

4. Verificación:
   - `pnpm --filter web lint typecheck build test`
   - `pnpm --filter admin lint typecheck build test`
   - `pnpm --filter api lint typecheck build test`
   - Si tocaste DTOs del backend, regenera `swagger.json` y `@ecommerce/api-client`.

### Convenciones

- Usa componentes reutilizables (`StoreHeader`, `StoreFooter`, `ProductCard`, `Marquee`, etc.) siempre que sea posible.
- Mantén la lógica de negocio (fetch de productos, config, checkout) fuera del componente de plantilla; este solo debe recibir props y renderizar.
- Documenta las opciones de `templateConfig` en esta guía para que otros desarrolladores sepan qué se puede configurar.
