# SKILL.md — Desarrollo Spec Driven para E-commerce de Ropa con Personalización

## 1. Propósito

Este documento define la forma de trabajo, arquitectura, criterios de calidad y reglas de implementación para desarrollar una plataforma de e-commerce de ropa.

El objetivo es construir una plataforma escalable, mantenible y segura para:

- Catálogo de productos (ropa) con variantes (talla, color, tipo de prenda).
- Carrito de compras.
- Gestión de usuarios, direcciones y autenticación.
- Checkout y pasarela de pagos.
- Gestión de pedidos y producción (la mayoría de prendas se fabrican **bajo pedido**).
- Control de stock **opcional y configurable desde base de datos**, sin necesidad de redeploy (ver sección 11).
- Cupones y descuentos.
- Reseñas de producto.
- **Módulo de personalización**: el usuario sube una imagen y la ubica/ajusta sobre una camisa (u otra prenda) para crear un diseño propio, que luego puede agregar al carrito como un producto personalizado.
- **Panel administrativo como aplicación independiente dentro del mismo monorepo** (productos, pedidos, producción, configuración de stock, usuarios), que consume el mismo backend que la tienda pública y reutiliza paquetes compartidos del monorepo, pero se compila, versiona y despliega de forma independiente.
- Notificaciones (email, y más adelante push/SMS).
- Integración futura con múltiples pasarelas de pago y proveedores de envío.

Este proyecto debe desarrollarse siguiendo un enfoque **Spec Driven Development**, donde cada módulo se define primero en especificaciones claras antes de implementar código.

---

## 2. Stack oficial y organización del monorepo

El proyecto vive en **un único repositorio** (monorepo, pnpm workspaces) que contiene tres aplicaciones y los paquetes compartidos entre ellas:

```txt
ecommerce-platform/        (monorepo: pnpm workspaces + turborepo)
  apps/
    web/      <- tienda pública (storefront), Next.js
    api/      <- backend NestJS, fuente de verdad para web y admin
    admin/    <- panel administrativo, Next.js, app independiente dentro del monorepo
  packages/
    shared/         <- tipos, enums, constantes y schemas Zod compartidos entre apps
    api-client/      <- cliente HTTP tipado, generado desde el OpenAPI del backend
    ui/              <- (opcional) tokens/preset de Mantine compartidos si conviene
    eslint-config/
    tsconfig/
```

### Por qué el admin es una app independiente dentro del monorepo (y no en su propio repositorio)

- **Independiente, pero no aislado**: `apps/admin` tiene su propio `package.json`, su propio pipeline de build/deploy y su propio dominio (`admin.midominio.com`), pero vive en el mismo workspace que `web` y `api`. Esto permite reutilizar paquetes (`packages/shared`, `packages/api-client`, `packages/eslint-config`, `packages/tsconfig`) sin duplicar código ni publicarlos como paquetes npm privados.
- **Reutilización real sin acoplar deploys**: un cambio en `apps/admin` no obliga a desplegar `apps/web`, y viceversa. Cada app se construye y despliega por separado (ver "Deploy" más abajo), aunque comparten workspace.
- **Tipos siempre sincronizados**: al estar en el mismo monorepo, `apps/admin` puede importar directamente `packages/shared` (enums, DTOs base, schemas Zod) sin esperar a que se regenere nada. El cliente de API (`packages/api-client`) sigue generándose desde el contrato OpenAPI del backend, pero ahora es **un paquete del workspace**, no un artefacto que vive en otro repositorio.
- **Dependencias pesadas sin contaminar el storefront**: `apps/admin` puede usar librerías de tablas avanzadas, gráficos o reportes sin que esas dependencias entren al bundle de `apps/web`, porque cada app tiene su propio `package.json` y su propio build — el monorepo no implica un bundle compartido.
- **Stacks de UI pueden diferir si conviene**: aunque ambas apps usan Next.js + Mantine por consistencia, no hay obligación de que comparta configuración de UI con el storefront más allá de lo que se decida poner en `packages/ui`.
- **Refuerza la regla de "backend como fuente de verdad"**: tanto `web` como `admin` son clientes del mismo contrato de API expuesto por `apps/api`; ninguno accede a la base de datos directamente ni duplica lógica de negocio.

### Frontend — Storefront (`apps/web`)

```txt
Next.js
TypeScript
Mantine UI
React Hook Form
Zod
TanStack Query
Zustand (estado de carrito y editor de personalización)
Fabric.js o Konva (canvas del editor de personalización)
```

### Frontend — Admin (`apps/admin`)

```txt
Next.js
TypeScript
Mantine UI + Mantine DataTable
React Hook Form
Zod
TanStack Query
packages/api-client (workspace package, generado desde el OpenAPI/Swagger de apps/api)
packages/shared (enums, tipos de dominio y schemas reutilizados con apps/web)
```

Regla: ni `apps/web` ni `apps/admin` definen manualmente DTOs duplicados del backend. Los tipos de dominio comunes viven en `packages/shared`, y las llamadas HTTP tipadas se hacen a través de `packages/api-client`, generado (ej. con `openapi-typescript` u `orval`) a partir del Swagger expuesto por NestJS. El paquete se regenera dentro del mismo monorepo cada vez que el contrato cambia — ya no hay que sincronizar repos separados, solo correr el script de generación y que ambas apps consuman la nueva versión del workspace package.

### Backend (`apps/api`)

```txt
NestJS
TypeScript
Prisma
PostgreSQL
JWT Auth
CASL o sistema propio de permisos
Swagger / OpenAPI (contrato consumido por packages/api-client)
AWS SDK compatible con S3 para Cloudflare R2
```

### Storage

```txt
Cloudflare R2 desde desarrollo y producción
Signed URLs
Buckets separados para dev/prod
Bucket o prefijo separado para imágenes subidas por usuarios (personalización)
```

### Pagos

```txt
Pasarela pendiente de decisión (Stripe / Wompi / PayU / Mercado Pago)
Abstracción propia de pagos (ver sección 13)
```

### Jobs

```txt
BullMQ + Redis más adelante
```

Usar jobs cuando existan tareas pesadas o diferidas como:

- Generación de previews/mockups de productos personalizados.
- Envío de emails transaccionales.
- Actualización de estados de producción.
- Reportes administrativos.
- Reconciliación de pagos con el proveedor.
- Moderación automática de imágenes subidas por usuarios.

### Deploy

```txt
Docker Compose
Coolify
Oracle VPS para desarrollo/staging
VPS propio para producción
```

Aunque `web`, `api` y `admin` viven en el mismo repositorio, cada una se construye y despliega como **aplicación independiente** en Coolify:

- Cada app tiene su propio `Dockerfile` (o build target) que solo instala lo necesario para esa app, usando `pnpm --filter <app> ...` para instalar dependencias y construir sin arrastrar el resto del monorepo.
- Cada app tiene su propio pipeline de CI/CD; un cambio que solo toca `apps/admin` no debe disparar (ni bloquear) el deploy de `apps/web`. Usar detección de cambios por path (ej. con Turborepo `--filter` o `paths` en CI) para evitar builds/deploys innecesarios.
- Cada app apunta a su propio dominio: `tienda.midominio.com` (web), `admin.midominio.com` (admin), ambas consumiendo la misma API (`api.midominio.com`).
- Un cambio en `packages/shared` o `packages/api-client` puede requerir rebuild de ambas apps frontend; esto se maneja con el grafo de dependencias de Turborepo, no manualmente.

---

## 3. Principios de desarrollo

Todo código debe priorizar:

- Clean Code.
- DRY.
- SOLID.
- KISS.
- YAGNI.
- Separation of Concerns.
- Explicit is better than implicit.
- Tipado estricto.
- Validaciones centralizadas.
- Bajo acoplamiento.
- Alta cohesión.
- Código fácil de probar.
- Código fácil de eliminar o reemplazar.

### Reglas generales

- No duplicar lógica de negocio entre frontend(s) y backend (especialmente cálculo de precios, stock/producción y permisos).
- No duplicar DTOs o tipos manualmente entre `apps/web` y `apps/admin`; usar `packages/shared` para tipos de dominio y `packages/api-client` para llamadas HTTP tipadas.
- No mezclar lógica de presentación con lógica de dominio.
- No crear abstracciones prematuras.
- No crear helpers genéricos sin al menos dos usos reales.
- No guardar valores mágicos directamente en el código (precios, comisiones, límites de archivos).
- No depender de implementaciones concretas cuando haya incertidumbre de proveedor (pagos, email, envíos) o cuando una regla de negocio pueda cambiar desde configuración (modo de stock, ver sección 11).
- No exponer secretos en ningún frontend (claves de pasarela, claves de R2).
- No usar `any` salvo justificación explícita.
- No ignorar errores silenciosamente, especialmente en pagos, stock y producción.
- No implementar funcionalidades sin spec.
- No implementar funcionalidades administrativas dentro de `apps/web`; toda funcionalidad de administración vive en `apps/admin`.
- No acoplar el build o el deploy de `apps/admin` con el de `apps/web` solo porque comparten repositorio; cada app se construye, versiona y despliega de forma independiente usando filtros del workspace.
- El precio final y la disponibilidad (stock o cupo de producción) **siempre** se validan en backend antes de confirmar un pedido, nunca se confía en lo que envía ningún frontend.

---

## 4. Flujo Spec Driven Development

Antes de implementar cualquier módulo, crear o actualizar su especificación.

Cada feature debe tener una spec con esta estructura:

```md
# Spec: Nombre de la feature

## Objetivo
Qué problema resuelve.

## Alcance
Qué incluye esta versión.

## Fuera de alcance
Qué no se implementará todavía.

## Apps afectadas
api / web (storefront) / admin — cuáles se modifican.

## Roles involucrados
Qué roles pueden usar esta funcionalidad.

## Casos de uso
Lista de escenarios principales.

## Reglas de negocio
Reglas obligatorias del dominio.

## Modelo de datos
Entidades, campos y relaciones.

## API
Endpoints, request, response y errores.

## UI / UX
Pantallas, estados, formularios y tablas.

## Validaciones
Validaciones de frontend y backend.

## Permisos
Acciones permitidas por rol.

## Estados de carga y error
Loading, empty, error, success.

## Criterios de aceptación
Condiciones verificables para considerar terminada la feature.

## Testing mínimo
Pruebas unitarias, integración o e2e necesarias.

## Observaciones técnicas
Decisiones o riesgos relevantes.
```

### Proceso obligatorio por feature

```txt
1. Crear spec (indicando qué apps afecta: web / api / admin).
2. Revisar reglas de negocio.
3. Definir modelo de datos.
4. Definir DTOs, validaciones y actualizar el contrato OpenAPI.
5. Definir permisos.
6. Implementar backend (apps/api).
7. Si cambió el contrato de API, regenerar packages/api-client (workspace package).
8. Implementar frontend(s) correspondiente(s) (apps/web y/o apps/admin), consumiendo packages/shared y packages/api-client actualizados.
9. Agregar tests mínimos.
10. Revisar errores, estados vacíos y seguridad.
11. Actualizar documentación.
```

---

## 5. Convenciones de dominio

### Nombres del dominio

Usar nombres consistentes:

```txt
User
Role
Permission
Address
Product
ProductVariant
Category
ProductImage
Inventory
StoreSettings
Cart
CartItem
Order
OrderItem
Payment
Shipment
Coupon
Review
CustomDesign
CustomDesignElement
DesignTemplate (prendas base disponibles para personalizar)
AuditLog
```

Estos nombres, junto con sus enums y tipos base, deben vivir en `packages/shared` para ser reutilizados tal cual entre `apps/web`, `apps/admin` y, donde aplique, `apps/api`.

### Estados sugeridos de pedido

```ts
export enum OrderStatus {
  PendingPayment = 'PENDING_PAYMENT',
  Paid = 'PAID',
  InProduction = 'IN_PRODUCTION',
  ReadyToShip = 'READY_TO_SHIP',
  Shipped = 'SHIPPED',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
  Refunded = 'REFUNDED',
}
```

### Estados de pago

```ts
export enum PaymentStatus {
  Pending = 'PENDING',
  Authorized = 'AUTHORIZED',
  Paid = 'PAID',
  Failed = 'FAILED',
  Refunded = 'REFUNDED',
}
```

### Modo de disponibilidad por variante (clave para el negocio "bajo pedido")

```ts
export enum StockMode {
  MadeToOrder = 'MADE_TO_ORDER', // no controla stock, se fabrica al recibir el pedido
  Tracked = 'TRACKED',           // controla stock/inventario real
}
```

Este valor vive en base de datos por variante (`ProductVariant.stockMode`) y es editable desde el panel admin **sin requerir despliegue de código**. Ver detalle completo en la sección 11.

### Estado de producción por item de pedido

```ts
export enum OrderItemProductionStatus {
  PendingProduction = 'PENDING_PRODUCTION',
  InProduction = 'IN_PRODUCTION',
  QualityCheck = 'QUALITY_CHECK',
  ReadyToShip = 'READY_TO_SHIP',
}
```

### Tipo de item de carrito/pedido

```ts
export enum CartItemType {
  Standard = 'STANDARD',
  Custom = 'CUSTOM',
}
```

### Estado de diseño personalizado

```ts
export enum CustomDesignStatus {
  Draft = 'DRAFT',
  PendingReview = 'PENDING_REVIEW',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
}
```

### Tipos de elemento en el editor

```ts
export enum CustomDesignElementType {
  UploadedImage = 'UPLOADED_IMAGE',
  Text = 'TEXT',
  Clipart = 'CLIPART',
}
```

---

## 6. Arquitectura frontend — Storefront (`apps/web`)

### Organización recomendada

```txt
apps/web/src/
  app/
  components/
  features/
    auth/
    catalog/
    cart/
    checkout/
    orders/        <- vista de "mis pedidos" del cliente, no administración
    customizer/
    reviews/
    account/
  shared/
    api/
    components/
    config/
    constants/
    hooks/
    types/
    utils/
```

Nota: no existe carpeta `dashboard` ni `users` administrativos en esta app — esa funcionalidad vive completa en `apps/admin`. Los tipos de dominio comunes (enums, DTOs base) se importan desde `packages/shared` en lugar de redefinirse localmente.

### Regla de features

Cada módulo funcional debe vivir dentro de `features`.

Ejemplo:

```txt
features/customizer/
  api/
  components/
  hooks/
  pages/
  schemas/
  types/
  utils/
  editor/        <- lógica específica del canvas (Fabric/Konva)
```

### Mantine UI

Usar Mantine como sistema principal de componentes.

Componentes recomendados:

```txt
Button
TextInput
NumberInput
Select
MultiSelect
Textarea
Modal
Drawer
Card
Grid
Tabs
Badge
Menu
Group
Stack
FileInput
Dropzone
Notification
Stepper (checkout)
Slider (color/escala en editor)
ColorPicker
```

---

## 7. Formularios frontend

Usar:

```txt
React Hook Form + Zod
```

Aplica tanto a `apps/web` como a `apps/admin`.

Reglas:

- Todo formulario debe tener schema.
- Los schemas Zod que representen entidades de dominio compartidas (ej. dirección de envío, filtros de catálogo reutilizados en reportes admin) deben vivir en `packages/shared` y reutilizarse, no duplicarse entre apps.
- Toda validación crítica también debe existir en backend (precios, disponibilidad, cupones, datos de pago).
- Los mensajes de error deben ser claros.
- No duplicar schemas innecesariamente.
- Usar valores por defecto explícitos.
- Separar componentes de campos cuando se repitan (ej. dirección de envío reutilizada en checkout y perfil).
- Evitar formularios enormes en un solo archivo (checkout se divide en steps).

Estructura sugerida (storefront):

```txt
apps/web/src/features/checkout/schemas/checkout.schema.ts
apps/web/src/features/checkout/components/ShippingStep.tsx
apps/web/src/features/checkout/components/PaymentStep.tsx
apps/web/src/features/checkout/hooks/useCheckout.ts
```

---

## 8. Estado remoto y de cliente (frontend)

### TanStack Query

Usar para todo estado remoto (catálogo, pedidos, usuario, cupones), en `apps/web` y `apps/admin`.

Reglas:

- No usar `useEffect` para fetches normales.
- Centralizar query keys; si una entidad se consulta desde ambas apps (ej. `orders`), definir la estructura de la query key una sola vez en `packages/shared` para mantener convención, aunque cada app instancie su propio `QueryClient`.
- Separar queries y mutations.
- Invalidar queries después de mutations exitosas.
- Manejar loading, error, success y empty states.
- No duplicar transformación de datos en varios componentes.

Ejemplo:

```ts
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
}
```

### Zustand (solo storefront)

Usar para estado local de UI que no es del servidor:

```txt
carrito (mientras no se persiste vía API en cada cambio, o como caché optimista)
estado del editor de personalización (elementos, posición, zoom, historial undo/redo)
```

Reglas:

- El carrito debe sincronizarse con backend en checkout, no solo vivir en cliente.
- El estado del editor no debe mezclarse con estado de catálogo (TanStack Query).
- Evitar guardar objetos no serializables (instancias de canvas) directamente en el store; guardar solo los datos del diseño (JSON), la instancia del canvas vive en un ref.

---

## 9. Arquitectura frontend — Admin (`apps/admin`)

### Organización recomendada

```txt
apps/admin/src/
  app/
  features/
    products/
    variants-and-stock-mode/
    orders/
    production/
    coupons/
    customdesigns-moderation/
    users/
    settings/        <- StoreSettings (configuración global, ver sección 11)
    reports/
  shared/
    components/
    config/
    hooks/
    types/            <- solo tipos específicos de UI del admin; los de dominio vienen de packages/shared
```

### Reglas específicas de `apps/admin`

- `apps/admin` nunca accede a la base de datos directamente; toda operación pasa por la API del backend en `apps/api`, igual que `apps/web`.
- `apps/admin` consume `packages/api-client` (generado desde el contrato OpenAPI/Swagger del backend) y `packages/shared` (tipos y enums de dominio); no se escriben llamadas `fetch` sueltas ni DTOs manuales que dupliquen el backend o lo ya definido en esos paquetes.
- `apps/admin` puede tener dependencias propias en su `package.json` (tablas avanzadas, gráficos, librerías de reportes) sin que eso afecte el bundle de `apps/web`; estar en el mismo monorepo no implica un build ni un bundle compartido entre apps.
- `apps/admin` se autentica contra el mismo backend (mismos endpoints de auth), pero todas las rutas administrativas exigen verificación de permisos en backend (`AdminGuard` o equivalente); la UI puede ocultar acciones no permitidas, pero eso es solo una mejora de UX, no la fuente de seguridad.
- El backend debe configurar CORS explícito permitiendo el origen del storefront y el origen del admin por separado (no usar wildcard `*`), incluso aunque ambas apps vivan en el mismo repositorio: en runtime siguen siendo dos orígenes distintos.
- Cambios en el contrato de la API (nuevos endpoints, DTOs modificados) deben reflejarse regenerando `packages/api-client` como parte del proceso de la feature (ver sección 4); al ser un workspace package, ambas apps frontend reciben la actualización en el siguiente install/build sin pasos manuales de sincronización entre repos.
- El pipeline de CI/CD de `apps/admin` debe poder ejecutarse de forma aislada (build, test, deploy) usando filtros de Turborepo/pnpm (`--filter admin...`), sin necesitar que `apps/web` compile o pase sus tests.

### Mantine DataTable

Usar `mantine-datatable` para todas las tablas administrativas (productos, pedidos, producción, cupones, usuarios).

Cada tabla debe tener:

- Estado de carga.
- Estado vacío.
- Estado de error.
- Paginación.
- Ordenamiento cuando aplique.
- Filtros cuando aplique.
- Acciones por fila.
- Confirmación para acciones destructivas.
- Columnas tipadas.
- Formato consistente de fechas, estados y precios.

### Reglas para tablas

- No llamar APIs directamente desde el componente de tabla.
- No mezclar filtros, paginación y renderizado en un solo componente gigante.
- Extraer columnas complejas a funciones o componentes pequeños.
- Mantener acciones destructivas detrás de confirmación.
- Usar badges para estados (pedido, pago, producción, modo de stock).
- Usar menú de acciones cuando haya más de dos acciones por fila.
- Mantener filtros sincronizados con query params cuando sea útil.

---

## 10. Arquitectura backend (`apps/api`)

### Organización NestJS

```txt
apps/api/src/
  modules/
    auth/
    users/
    roles/
    permissions/
    catalog/
    stock/              <- abstracción de modo de stock (ver sección 11)
    settings/           <- StoreSettings
    cart/
    checkout/
    orders/
    production/
    payments/
    shipments/
    coupons/
    reviews/
    customizer/
    notifications/
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
    utils/
  config/
  database/
```

### Regla de módulos

Cada módulo debe separar:

```txt
controller
service
repository
dto
entities/types
policy/permissions
```

Ejemplo:

```txt
modules/payments/
  payments.controller.ts
  payments.service.ts
  payments.repository.ts
  providers/
    payment-provider.interface.ts
    stripe.provider.ts (o el que se elija)
  dto/
  policies/
  payments.module.ts
```

### Reglas backend

- Los controllers no deben contener lógica de negocio.
- Los services contienen casos de uso.
- Los repositories encapsulan acceso a datos.
- Prisma no debe filtrarse a ningún frontend.
- Los DTOs deben validar entrada; los tipos exportables hacia los frontends se reflejan en `packages/shared` o se infieren vía `packages/api-client`.
- Los errores deben ser explícitos.
- Toda operación sensible debe validar permisos, sin importar si la llamada viene de `apps/web` o `apps/admin`.
- Toda creación/modificación importante debe registrar auditoría (pedidos, pagos, producción, stock/configuración, roles).
- No devolver campos sensibles (passwords, tokens de pasarela, datos completos de tarjeta).
- El precio y la disponibilidad se recalculan siempre en backend al momento de checkout, ignorando lo enviado por el cliente salvo como referencia.
- El backend mantiene el contrato OpenAPI actualizado; es la única fuente para regenerar `packages/api-client`.

---

## 11. Modo de stock configurable (bajo pedido por defecto)

El negocio fabrica la mayoría de prendas **bajo pedido**, por lo que no siempre es necesario controlar stock. Sin embargo, el sistema debe permitir activar control real de inventario para casos puntuales (por ejemplo, prendas ya fabricadas en bodega), **sin tocar código ni desplegar**, simplemente cambiando una configuración guardada en base de datos.

### Regla principal

No hardcodear "todo es bajo pedido" ni "todo controla stock". El comportamiento se decide en tiempo de ejecución según un campo en base de datos, y se implementa con una abstracción tipo strategy, igual que se hace con pagos o proveedores externos.

### Modelo de datos

```txt
StoreSettings (configuración global, fila única o por tienda)
  id
  defaultStockMode (StockMode) -- valor usado al crear nuevas variantes
  productionLeadTimeDaysDefault
  updatedById
  updatedAt

ProductVariant
  ...
  stockMode (StockMode)        -- MADE_TO_ORDER | TRACKED, editable desde el admin
  productionLeadTimeDays        -- estimado de fabricación, usado si es MADE_TO_ORDER

Inventory  -- solo aplica y se consulta cuando stockMode = TRACKED
  id
  productVariantId
  quantity
  reservedQuantity
  updatedAt
```

### Abstracción backend

```ts
export interface StockPolicy {
  isAvailable(variantId: string, quantity: number): Promise<boolean>
  reserve(variantId: string, quantity: number, context: ReservationContext): Promise<void>
  release(variantId: string, quantity: number, context: ReservationContext): Promise<void>
  commit(variantId: string, quantity: number, context: ReservationContext): Promise<void>
}
```

Implementaciones:

```txt
MadeToOrderStockPolicy
  - isAvailable: siempre true (salvo que el producto esté desactivado/discontinuado)
  - reserve/release: no-op, no hay nada que reservar
  - commit: registra el item para entrar a cola de producción (OrderItemProductionStatus = PENDING_PRODUCTION)

TrackedStockPolicy
  - isAvailable: valida quantity - reservedQuantity contra Inventory
  - reserve: incrementa reservedQuantity al iniciar checkout, con expiración
  - release: libera reservedQuantity si el pago falla o expira
  - commit: descuenta quantity definitivamente al confirmarse el pago
```

Un `StockPolicyResolver` (factory) decide qué implementación usar leyendo `ProductVariant.stockMode` en cada operación de carrito/checkout. Cambiar el modo de una variante desde el admin (UPDATE en base de datos) cambia el comportamiento inmediatamente, sin redeploy.

### Reglas de negocio

- Por defecto, las variantes nuevas se crean con `stockMode = MADE_TO_ORDER` (tomado de `StoreSettings.defaultStockMode`), reflejando que el negocio fabrica bajo pedido.
- Si `stockMode = TRACKED`, aplican las reglas clásicas de inventario:
  - No debe permitirse vender stock negativo.
  - El stock se reserva al iniciar checkout y se libera si el pago falla o expira.
  - El descuento definitivo ocurre solo cuando el pago se confirma.
- Si `stockMode = MADE_TO_ORDER`, no se valida ni descuenta inventario; al confirmarse el pago, el `OrderItem` pasa directamente a `PENDING_PRODUCTION` y se gestiona por el módulo de producción (sección 12).
- Cambiar el `stockMode` de una variante con pedidos en curso no debe afectar retroactivamente pedidos ya creados.
- Todo cambio de `stockMode` o de `StoreSettings` debe auditarse (quién, cuándo, valor anterior/nuevo).
- El módulo `stock` no debe conocer detalles de pagos, checkout ni UI; solo expone la interfaz `StockPolicy` y su resolución.

---

## 12. Producción

Para items con `stockMode = MADE_TO_ORDER` (la mayoría), el flujo después del pago confirmado es:

```txt
1. OrderItem.productionStatus = PENDING_PRODUCTION
2. Equipo de producción (vía panel admin) marca IN_PRODUCTION
3. Control de calidad: QUALITY_CHECK
4. READY_TO_SHIP -> se genera el envío (Shipment)
```

Reglas:

- El tiempo estimado de entrega mostrado al cliente se basa en `ProductVariant.productionLeadTimeDays` (o en `StoreSettings.productionLeadTimeDaysDefault` si no está definido a nivel de variante).
- Los cambios de `productionStatus` deben auditarse y, si aplica, notificar al cliente por email.
- `apps/admin` es responsable de la gestión de la cola de producción (filtrar por estado, asignar responsable, marcar avance); `apps/web` solo expone el estado actual al cliente en "mis pedidos", de forma de solo lectura.

---

## 13. Pagos

Todavía no se conoce con certeza:

- Qué pasarela(s) se usarán finalmente (Stripe, Wompi, PayU, Mercado Pago, etc.).
- Si se necesitará soporte multi-moneda.
- Si se requerirán pagos recurrentes o solo pagos únicos.
- Métodos locales específicos requeridos (PSE, efectivo en puntos, etc., según mercado).

Por lo tanto, el sistema debe diseñarse con abstracción de proveedor de pago, igual que con el modo de stock.

### Regla principal

No acoplar el dominio de pagos a un proveedor concreto en los módulos de checkout, orders o reportes (en ninguna app).

### Abstracción backend

```ts
export interface PaymentProvider {
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntentResult>
  confirmPayment(params: ConfirmPaymentParams): Promise<PaymentConfirmationResult>
  refund(params: RefundParams): Promise<RefundResult>
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEventResult>
}
```

Implementaciones futuras:

```txt
StripeProvider
WompiProvider
PayUProvider
MercadoPagoProvider
```

### Reglas de pagos

- El backend es la única fuente de verdad sobre el estado de un pago.
- Los webhooks del proveedor deben validarse (firma) antes de procesarse.
- Un pedido nunca cambia a `PAID` solo porque un frontend lo indique; debe confirmarse vía webhook o verificación server-to-server.
- Reintentos de pago no deben duplicar pedidos ni comprometer stock/producción dos veces.
- Reembolsos deben quedar auditados y vinculados al pedido y pago original.

### Decisión pendiente

Crear documento:

```txt
docs/decisions/ADR-001-payment-provider.md
```

Debe comparar:

- Costos y comisiones.
- Métodos de pago soportados localmente.
- Facilidad de integración con NestJS.
- Soporte de webhooks confiables.
- Soporte de reembolsos parciales.
- Cumplimiento normativo (PCI, datos personales).
- Experiencia de checkout en móvil.

---

## 14. Módulo de personalización (Customizer)

Este es el módulo diferenciador del proyecto: el usuario sube una imagen y la posiciona sobre una plantilla de prenda (camisa, etc.) para crear un diseño propio. Vive en `apps/web`; su moderación (aprobar/rechazar diseños) se gestiona desde `apps/admin`.

### Flujo general

```txt
1. Usuario elige una plantilla de prenda (DesignTemplate): tipo, color, talla disponible.
2. Usuario sube una imagen desde el editor (Dropzone).
3. Frontend solicita signed URL al backend (igual que en sección 15).
4. Frontend sube la imagen directamente a R2.
5. Frontend confirma la subida; backend guarda metadata y la asocia a un CustomDesign en estado DRAFT.
6. Usuario ajusta posición, escala, rotación y opcionalmente agrega texto/clipart sobre el canvas (Fabric.js/Konva).
7. El estado del diseño (posiciones, capas, transformaciones) se guarda como JSON en CustomDesignElement, además se genera una imagen de preview (mockup).
8. Usuario confirma el diseño -> se agrega como CartItem de tipo CUSTOM con su finalPrice calculado en backend.
9. (Opcional según política del negocio) El diseño pasa a PENDING_REVIEW para moderación desde apps/admin antes de producción.
10. Al aprobarse, queda en estado APPROVED, entra a la cola de producción descrita en la sección 12 (normalmente con stockMode = MADE_TO_ORDER, ya que es un producto único).
```

### Modelo recomendado

```txt
DesignTemplate
  id
  name
  garmentType (camisa, hoodie, etc.)
  baseImageUrl (mockup base / silueta de la prenda)
  printAreas (zonas permitidas para imprimir: coordenadas, tamaño máximo)
  basePrice
  availableColors
  availableSizes
  stockMode (StockMode)        -- normalmente MADE_TO_ORDER
  productionLeadTimeDays

CustomDesign
  id
  userId
  designTemplateId
  status
  previewImageUrl
  finalPrintFileUrl (archivo de alta resolución para producción)
  surcharge
  createdAt

CustomDesignElement
  id
  customDesignId
  type (UPLOADED_IMAGE, TEXT, CLIPART)
  assetUrl (si es imagen)
  textContent (si es texto)
  positionX
  positionY
  scale
  rotation
  zIndex
```

### Reglas de negocio del editor

- El editor debe limitar el movimiento de los elementos a las `printAreas` definidas por la plantilla; no permitir posicionar fuera de la zona imprimible.
- Definir un tamaño máximo de archivo y resolución mínima recomendada para evitar diseños pixelados en producción; advertir al usuario si la imagen subida es de baja resolución.
- Validar tipo de archivo permitido (jpg, png, svg si aplica) y tamaño máximo antes de generar la signed URL.
- El backend, no el frontend, calcula el `surcharge` final.
- Guardar siempre el estado "editable" (JSON de elementos) además del preview, para reproducir el diseño en producción con la calidad original.
- Las imágenes subidas deben pasar por una validación básica (tamaño, formato, posible moderación) antes de quedar disponibles para producción; `apps/admin` es donde se realiza la moderación manual si el negocio la requiere.
- Un `CustomDesign` en estado `DRAFT` no debe afectar disponibilidad ni producción; eso ocurre solo cuando se confirma el pedido.

### Frontend del editor (`apps/web`)

```txt
features/customizer/editor/
  CanvasEditor.tsx
  LayerPanel.tsx
  UploadPanel.tsx
  TextPanel.tsx
  Toolbar.tsx
  hooks/useDesignState.ts
  hooks/useCanvasExport.ts
  utils/printAreaBounds.ts
```

- `useDesignState` mantiene la representación serializable del diseño (no instancias de canvas).
- `useCanvasExport` genera el preview a partir del canvas.
- El componente de canvas debe estar aislado del resto de la UI de negocio.

---

## 15. Cloudflare R2

### Reglas

- R2 se usa desde desarrollo y producción.
- Ningún frontend (`apps/web` ni `apps/admin`) debe conocer secretos de R2.
- El backend genera signed URLs.
- El frontend correspondiente sube directamente a R2 con signed URL.
- El backend guarda metadata del archivo.
- Validar tipo, tamaño y propósito del archivo antes de generar URL (producto vs. imagen de usuario para personalización son contextos distintos con reglas distintas).
- Usar buckets o prefijos separados para: imágenes de catálogo, imágenes subidas por usuarios (personalización), y archivos de producción (alta resolución).

### Flujo de subida

```txt
1. Frontend solicita signed URL indicando el propósito (catálogo / personalización).
2. Backend valida usuario, permiso, tipo de archivo, tamaño y propósito.
3. Backend genera signed URL.
4. Frontend sube archivo a R2.
5. Frontend confirma subida al backend.
6. Backend guarda metadata.
```

### Metadata mínima

```txt
id
ownerId (userId o adminId)
purpose (CATALOG_IMAGE, CUSTOM_DESIGN_ASSET, PRINT_FILE)
relatedId (productId o customDesignId)
bucket
objectKey
mimeType
size
uploadedById
createdAt
```

---

## 16. Autenticación y autorización

### Auth

Usar JWT con:

```txt
access token
refresh token
```

Reglas:

- Passwords hasheados con Argon2 o bcrypt.
- Refresh tokens almacenados de forma segura.
- Logout debe invalidar refresh token.
- No devolver password hash.
- Rate limit en login y en endpoints de checkout/pago, en ambas apps frontend.
- Soporte de checkout como invitado (guest) debe definirse explícitamente en spec antes de implementarse.
- `apps/admin` se autentica contra el mismo backend; el origen del admin debe estar explícitamente permitido en CORS, separado del origen de `apps/web`, aunque ambos vivan en el mismo repositorio.

### Permisos

Preferir estructura flexible:

```txt
roles
permissions
role_permissions
user_roles
```

Permisos sugeridos:

```txt
products.read
products.create
products.update
products.delete

stock.read
stock.configure        -- cambiar stockMode, ajustar inventory si aplica

orders.read
orders.update
orders.cancel
orders.refund

production.read
production.update

coupons.read
coupons.create
coupons.update
coupons.delete

customdesigns.read
customdesigns.moderate

users.read
users.update
users.delete

settings.manage         -- StoreSettings
```

### Regla

Nunca confiar solo en la UI (de ninguna app). Todo permiso debe validarse en backend.

---

## 17. Auditoría

Agregar auditoría desde etapas tempranas.

Tabla sugerida:

```txt
AuditLog
  id
  userId
  action
  entity
  entityId
  before
  after
  createdAt
```

Auditar:

- Cambios de `stockMode` por variante y cambios en `StoreSettings`.
- Cambios de inventario (cuando aplique `stockMode = TRACKED`).
- Creación/edición/eliminación de productos y variantes.
- Cambios de estado de pedido, pago y producción.
- Reembolsos.
- Cambios de roles y permisos.
- Aprobación/rechazo de diseños personalizados.
- Eliminación de imágenes o assets.
- Aplicación y edición de cupones.

---

## 18. Testing mínimo

### Backend

Priorizar tests en:

- Cálculo de precio final (productos estándar y personalizados).
- `StockPolicyResolver`: que seleccione correctamente `MadeToOrderStockPolicy` o `TrackedStockPolicy` según `stockMode`, y que el cambio de modo no rompa pedidos en curso.
- Flujo completo de checkout (carrito -> orden -> pago -> confirmación), para ambos modos de stock.
- Webhooks de pago (firmas válidas e inválidas).
- Permisos.
- Servicios de signed URLs.
- Repositories críticos (orders, stock, payments).

### Frontend

Priorizar tests en:

- Formularios críticos (checkout, dirección, pago) — `apps/web`.
- Lógica del editor de personalización (límites de printArea, serialización del estado del diseño) — `apps/web`.
- Transformación de filtros de catálogo — `apps/web`.
- Render de tablas con estados vacíos — `apps/admin`.
- Hooks de queries/mutations cuando tengan lógica — ambas apps.
- Guards de rutas — ambas apps.
- Schemas y utilidades exportadas desde `packages/shared` (tests a nivel de paquete, no duplicados por app).

### E2E

Agregar e2e para flujos principales:

```txt
Usuario se registra e inicia sesión
Usuario agrega producto MADE_TO_ORDER al carrito y completa compra
Usuario agrega producto TRACKED al carrito (con y sin stock disponible)
Usuario crea un diseño personalizado, lo agrega al carrito y completa compra
Usuario aplica un cupón válido e inválido
Admin cambia el stockMode de una variante y verifica el efecto en el storefront
Admin avanza un pedido por los estados de producción
Admin modera un diseño personalizado
```

---

## 19. Manejo de errores

### Backend

Usar errores explícitos:

```txt
NotFoundException
BadRequestException
ForbiddenException
ConflictException
UnauthorizedException
PaymentFailedException (custom)
InsufficientStockException (custom, solo aplica si stockMode = TRACKED)
```

No devolver errores internos crudos. No exponer detalles de la pasarela de pago en mensajes al usuario final.

### Frontend (ambas apps)

Cada pantalla debe manejar:

```txt
loading
empty
error
success
unauthorized
forbidden
stock-insuficiente (solo relevante para variantes TRACKED)
pago-fallido (checkout)
```

---

## 20. Performance y escalabilidad

### Desde el inicio

- Paginación server-side en catálogo y pedidos.
- Filtros y búsqueda server-side en catálogo.
- Ordenamiento server-side.
- Índices en base de datos (SKU, slug, email, estado de pedido, estado de producción).
- Lazy loading de módulos pesados (editor de personalización en `apps/web`; tablas/reportes en `apps/admin`).
- Optimización de imágenes de catálogo.
- Signed URLs para archivos.
- Evitar cargar imágenes de alta resolución en listados/tablas.
- Evitar queries N+1 (especialmente en listados de pedidos con items y pagos).
- Usar el cache de build de Turborepo para no reconstruir apps que no cambiaron entre commits.

### Más adelante

- Redis (cache de catálogo, sesiones de carrito).
- Jobs (BullMQ) para generación de previews, emails y avance de producción.
- Cache selectivo de catálogo.
- CDN para archivos e imágenes.
- Separar base de datos en VPS dedicado.
- Monitoreo y alertas (errores de pago, fallas en producción).

---

## 21. Seguridad

Reglas obligatorias:

- Validar todos los inputs en backend.
- Autorización en backend, sin importar el origen (`apps/web` o `apps/admin`).
- No exponer secretos (claves de pasarela, claves de R2) en ningún frontend.
- Usar HTTPS.
- CORS explícito permitiendo únicamente los orígenes de `apps/web` y `apps/admin` (nunca wildcard), incluso compartiendo repositorio.
- Rate limiting en endpoints sensibles (login, checkout, creación de pagos).
- Sanitizar datos que se rendericen en HTML/PDF/emails.
- Limitar tamaño y tipos de archivos subidos.
- Validar y, si aplica, moderar contenido de imágenes subidas por usuarios antes de producción.
- Logs sin datos sensibles (no loguear números de tarjeta, tokens completos, contraseñas).
- Backups automáticos de PostgreSQL.
- No almacenar datos sensibles de tarjeta; delegar siempre a la pasarela.
- Variables de entorno y secretos por app (`apps/web/.env`, `apps/admin/.env`, `apps/api/.env`); nunca un único `.env` raíz compartido con secretos de las tres apps mezclados.

---

## 22. Definition of Done

Una feature se considera terminada cuando:

- Tiene spec actualizada (indicando qué apps afecta).
- Tiene modelo de datos definido.
- Tiene DTOs y validaciones.
- Tiene permisos definidos.
- Tiene backend implementado (`apps/api`).
- Tiene frontend(s) implementado(s) (`apps/web` y/o `apps/admin`, según corresponda).
- Si afectó el contrato de API, `packages/api-client` fue regenerado.
- Tiene estados loading/empty/error/success.
- Tiene manejo de errores.
- Tiene tests mínimos.
- Tiene auditoría si modifica información crítica (stock/config, pagos, pedidos, producción, roles).
- Tiene documentación actualizada.
- No rompe lint, typecheck ni build en ninguna de las apps afectadas.
- Puede desplegarse en Coolify de forma independiente por app, sin forzar el deploy de las demás.

---

## 23. Checklist antes de crear código

Antes de implementar, responder:

```txt
¿Existe spec?
¿Está claro el alcance?
¿Está claro qué queda fuera?
¿Qué app(s) se ven afectadas (api / web / admin)?
¿Está definido el modelo de datos?
¿Están definidos los permisos?
¿Hay validaciones de frontend y backend?
¿Hay estados de error y vacío?
¿Hay impacto en auditoría?
¿Hay impacto en precio, stockMode o producción?
¿Hay impacto en pagos?
¿Hay impacto en el módulo de personalización?
¿Hay impacto en R2/storage?
¿Este cambio requiere regenerar packages/api-client?
¿Este cambio requiere modificar packages/shared, y si es así, qué otras apps se ven afectadas por ese cambio?
```

Si alguna respuesta es incierta, documentar la decisión antes de implementar.

---

## 24. ADR — Architecture Decision Records

Cada decisión importante debe registrarse en:

```txt
docs/decisions/
```

Formato:

```md
# ADR-000: Título

## Estado
Propuesta | Aceptada | Rechazada | Reemplazada

## Contexto
Qué problema se está resolviendo.

## Decisión
Qué se decidió.

## Consecuencias
Ventajas, desventajas y riesgos.

## Alternativas consideradas
Opciones evaluadas.
```

ADRs iniciales sugeridos:

```txt
ADR-001-payment-provider.md
ADR-002-storage-cloudflare-r2.md
ADR-003-auth-and-permissions.md
ADR-004-customizer-canvas-library.md
ADR-005-stock-mode-strategy.md
ADR-006-monorepo-structure.md
ADR-007-guest-checkout.md
ADR-008-admin-app-en-monorepo.md       (por qué admin vive en apps/admin y no en un repo separado)
ADR-009-api-client-generation-strategy.md
ADR-010-shared-packages-boundaries.md  (qué va en packages/shared vs qué se mantiene local a cada app)
```

---

## 25. Instrucciones para asistentes de IA durante el desarrollo

Cuando se pida implementar una feature:

1. Primero revisar o proponer la spec, indicando qué app(s) afecta (web / api / admin).
2. No generar código sin entender reglas de negocio (especialmente precio, stockMode/producción y pagos).
3. Priorizar cambios pequeños y mantenibles.
4. Explicar decisiones técnicas relevantes.
5. Evitar sobreingeniería.
6. Mantener consistencia con el stack oficial de cada app.
7. No introducir librerías nuevas sin justificar.
8. No acoplar el dominio de pagos a un proveedor concreto.
9. No acoplar el control de disponibilidad a un único modo; usar siempre `StockPolicy` y el campo `stockMode` en base de datos.
10. No acoplar el editor de personalización a una librería de canvas específica en las pantallas de negocio.
11. Usar Mantine UI y Mantine DataTable para componentes administrativos (`apps/admin`).
12. Usar R2 para archivos, diferenciando propósito (catálogo vs. personalización vs. producción).
13. Mantener backend como fuente de verdad para precio, stock/producción y estado de pago.
14. No implementar pantallas ni lógica administrativa dentro de `apps/web`.
15. Si se modifica el contrato de la API, regenerar `packages/api-client` y verificar que `apps/web` y `apps/admin` sigan compilando contra la nueva versión.
16. Validar permisos siempre en backend.
17. Mantener código tipado y limpio.
18. Antes de duplicar un tipo, enum o schema entre `apps/web` y `apps/admin`, evaluar si debe moverse a `packages/shared`.
19. No asumir que estar en el mismo monorepo permite saltarse el build o deploy independiente de cada app; respetar los filtros de Turborepo/pnpm al construir y desplegar.
20. Actualizar documentación cuando cambie una decisión.

---

## 26. Prioridad del proyecto

La prioridad técnica es construir una base robusta y mantenible, no solo avanzar rápido.

Orden de prioridad:

```txt
1. Correctitud funcional (especialmente precio, stockMode/producción y pagos).
2. Seguridad.
3. Mantenibilidad.
4. Escalabilidad.
5. Simplicidad.
6. Experiencia de usuario.
7. Velocidad de desarrollo.
```

La velocidad importa, pero no debe comprometer la calidad estructural del sistema.