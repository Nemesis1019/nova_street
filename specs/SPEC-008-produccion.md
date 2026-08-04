# Spec: Cola de producción

## Objetivo
Permitir al equipo de operaciones hacer seguimiento del avance de fabricación de cada ítem de pedido y notificar al cliente cuando cambie el estado de producción.

## Alcance
- Listado paginado de ítems en producción con filtros por estado y búsqueda por producto.
- Actualización del estado de producción de un `OrderItem` (`PENDING_PRODUCTION`, `IN_PRODUCTION`, `QUALITY_CHECK`, `READY_TO_SHIP`).
- Avance automático del estado de la orden a `IN_PRODUCTION` y `READY_TO_SHIP` según los ítems.
- Registro de auditoría y email de notificación al cliente.

## Apps afectadas
- `apps/api`: módulo `production`.
- `apps/admin`: página `/production`.

## Roles
- `ADMIN`: gestiona la cola de producción.

## Reglas de negocio
- Solo se pueden mover estados en el orden definido por el enum.
- Cuando todos los ítems de una orden están `READY_TO_SHIP`, la orden pasa a `READY_TO_SHIP`.
- Cuando al menos un ítem pasa a `IN_PRODUCTION`, la orden pasa a `IN_PRODUCTION` si estaba `PAID`.

## API
- `GET /admin/production`
- `GET /admin/production/items/:id`
- `PATCH /admin/production/items/:id/status`

## UI / UX
- Tabla con filtros de estado y búsqueda.
- Selector de estado por fila.

## Testing mínimo
- Tests e2e del backend para cambio de estado y avance de orden.
