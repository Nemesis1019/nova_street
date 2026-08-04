# Spec: Envíos

## Objetivo
Registrar los envíos de cada orden y permitir al cliente ver el seguimiento desde su cuenta.

## Alcance
- Modelo `Shipment` vinculado a `Order`.
- CRUD de envíos desde el detalle de orden en admin.
- Actualización de estados de envío (`PENDING`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`).
- Sincronización del estado de la orden (`SHIPPED`, `DELIVERED`).
- Visualización de envíos en el detalle de orden del storefront.

## Apps afectadas
- `apps/api`: módulo `shipments`, inclusión de shipments en `OrdersService`.
- `apps/admin`: sección de envíos en `/orders/[id]`.
- `apps/web`: detalle de orden `/orders/[id]`.

## Roles
- `ADMIN`: crea y actualiza envíos.
- `CUSTOMER`: visualiza envíos de sus órdenes.

## Reglas de negocio
- Solo se puede crear un envío si la orden está `READY_TO_SHIP` o `SHIPPED`.
- Al crear un envío, la orden pasa a `SHIPPED`.
- Al marcar un envío como `DELIVERED`, la orden pasa a `DELIVERED`.

## API
- `GET /admin/orders/:orderId/shipments`
- `POST /admin/orders/:orderId/shipments`
- `PATCH /admin/shipments/:id/status`

## UI / UX
- Formulario de registro de envío en detalle de orden admin.
- Tabla de envíos con selector de estado.
- En storefront, listado de envíos con link de seguimiento externo.

## Testing mínimo
- Tests e2e del backend para creación y transiciones de envíos.
