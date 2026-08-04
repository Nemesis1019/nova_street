# Mejoras pendientes — API y Web

> Lista de ajustes en `apps/api` y `apps/web`. Las tareas de alta y media prioridad ya están resueltas. Quedan items de pulido y mejoras futuras de administración.

---

## Resueltas

### API — Alta y media prioridad

- ✅ Tests e2e para `GET /admin/dashboard/trends`.
- ✅ Tests e2e para flujo de tracking (`PATCH /admin/orders/{id}/tracking` + cambio a `SHIPPED` con `shippedAt` y email).
- ✅ Aislamiento de tests e2e con `maxWorkers: 1`.
- ✅ Endpoint `GET /admin/users/{id}/orders` y consumo desde el admin.
- ✅ Normalización explícita de fechas con `@Transform` en DTOs de admin.

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

---

## Mejoras futuras de administración (no prioritarias)

1. **Usuarios y permisos**
   - Roles granulares (`CATALOG_MANAGER`, `ORDER_MANAGER`, etc.).
   - Invitar admins.

6. **Seguridad**
   - 2FA para admins.
   - Sesiones activas y revocación de tokens.
   - Rate limiting más estricto en `/admin`.

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
