# SPEC-007 — Módulo de personalización de camisetas (Customizer)

## Objetivo
Permitir a un usuario autenticado crear un diseño propio sobre una prenda base (camiseta, hoodie, etc.), guardarlo como `CustomDesign` y agregarlo al carrito como ítem de tipo `CUSTOM`.

## Alcance del MVP
1. Listar plantillas (`DesignTemplate`) disponibles en el storefront.
2. Crear un `CustomDesign` en estado `DRAFT` vinculado a una plantilla.
3. Editor visual básico:
   - Mostrar imagen base de la prenda.
   - Permitir subir una imagen (PNG/JPG) y posicionarla/escalarla dentro del área de impresión.
   - Guardar el estado del diseño en `CustomDesignElement`.
4. Calcular precio final = `designTemplate.basePrice + customDesign.surcharge`.
5. Agregar el diseño al carrito (`/cart/items` con `type: CUSTOM` y `customDesignId`).
6. Panel admin básico para listar diseños y cambiar estado (`APPROVED` / `REJECTED`).

## Fuera de alcance (futuro)
- Texto/clipart en el editor.
- Generación automática de mockup/preview.
- Moderación manual con notas de rechazo.
- Subida a R2; en el MVP se usará almacenamiento local (`/uploads`) para assets de personalización.

## API

### Público
- `GET /design-templates` — lista plantillas activas.
- `GET /design-templates/:id` — detalle de plantilla.

### Autenticado
- `POST /custom-designs` — crear diseño `{ designTemplateId, color?, size? }`.
- `GET /custom-designs/:id` — obtener diseño con elementos.
- `PATCH /custom-designs/:id` — guardar estado `{ previewImageUrl?, surcharge?, elements? }`.
- `POST /custom-designs/:id/submit` — enviar a revisión/aprobación.
- `POST /custom-designs/:id/add-to-cart` — agregar al carrito con cantidad.
- `POST /assets/upload-custom` — subir imagen para personalización (propósito `CUSTOM_DESIGN_ASSET`).

### Admin
- `GET /admin/custom-designs` — listar diseños con filtros por estado.
- `PATCH /admin/custom-designs/:id/status` — cambiar estado.

## Modelo de datos
Utiliza los modelos existentes `DesignTemplate`, `CustomDesign` y `CustomDesignElement`. No se requieren cambios de schema en el MVP.

## Reglas de negocio
- Un diseño en `DRAFT` solo puede ser editado por su dueño.
- Solo diseños `APPROVED` o `DRAFT` (según política) pueden agregarse al carrito. En el MVP se permite agregar en `DRAFT` para simplificar.
- El backend calcula el `surcharge`; el frontend solo envía elementos y opcionalmente una propuesta.

## Frontend
- `/personalizar` — grid de plantillas.
- `/personalizar/[templateId]` — editor con canvas (Konva) y panel lateral.
- Botón "Agregar al carrito" guarda el diseño y lo añade.

## Criterios de aceptación
- Un usuario puede elegir una plantilla, subir una imagen, moverla/escalarla, guardar y agregar al carrito.
- El carrito muestra el ítem personalizado con su precio final.
- Los tests e2e cubren la creación y adición al carrito de un diseño personalizado.
