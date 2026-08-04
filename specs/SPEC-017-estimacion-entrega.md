# Spec: Estimación de fecha de entrega visible al cliente

## Objetivo
Mostrar al cliente una fecha estimada de entrega basada en el tiempo de producción de los ítems de su pedido.

## Alcance
- Calcular `estimatedDeliveryDate` a nivel de orden usando el máximo `productionLeadTimeDays` entre sus ítems.
- Si un ítem es estándar, usar `ProductVariant.productionLeadTimeDays`; si es personalizado, usar `StoreSettings.productionLeadTimeDaysDefault`.
- Incluir `estimatedDeliveryDate` en `OrderResponseDto`.
- Mostrar la fecha estimada en el detalle de orden del storefront.
- Mostrar `productionLeadTimeDays` en el detalle de producto (público).

## Fuera de alcance
- Fechas exactas de courier/envío (por ahora el lead time cubre producción).
- Edición de la fecha estimada manualmente.
- Notificaciones automáticas de retraso.

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles involucrados
- Cliente (lectura).

## Casos de uso
1. Cliente abre un pedido pagado y ve "Entrega estimada: 25 de julio de 2026".
2. Cliente ve en la ficha del producto el tiempo de producción estimado.
3. Si el pedido aún no está pagado, la estimación se calcula desde `createdAt` como referencia.

## Reglas de negocio
- La fecha se calcula sumando días al campo `paidAt` de la orden si existe; si no, a `createdAt`.
- Se usa el máximo `productionLeadTimeDays` entre los ítems del pedido.
- Ítems personalizados usan el valor por defecto de `StoreSettings`.
- La fecha se devuelve en formato ISO (`YYYY-MM-DD`).

## Modelo de datos
No se agregan columnas nuevas. Se reutilizan:
- `Order.paidAt` (si existe; de lo contrario `createdAt`).
- `OrderItem.productVariant.productionLeadTimeDays`.
- `StoreSettings.productionLeadTimeDaysDefault`.

## API
### `GET /orders/{id}`
Response ahora incluye:
```json
{
  "estimatedDeliveryDate": "2026-07-25"
}
```

### `GET /catalog/products/{slug}`
Response ahora incluye (por variante):
```json
{
  "productionLeadTimeDays": 7
}
```

## UI / UX
- Detalle de orden: mostrar "Entrega estimada" junto al estado.
- Detalle de producto: mostrar "Tiempo de producción: X días" en la ficha.

## Validaciones
- Backend: si no hay ítems con lead time, no devolver fecha (undefined).
- Frontend: renderizado condicional si no hay fecha.

## Permisos
- Público/owner de la orden.

## Estados de carga y error
- Sin cambios.

## Criterios de aceptación
- [ ] `estimatedDeliveryDate` se calcula correctamente desde el backend.
- [ ] El storefront muestra la fecha en detalle de orden.
- [ ] El storefront muestra el lead time en detalle de producto.
- [ ] `api-client` regenerado y compila.
- [ ] Tests verifican el cálculo para diferentes lead times.

## Testing mínimo
- Test unitario del helper de cálculo de fecha.
- E2E: orden con variante de 5 días devuelve fecha 5 días después del pago.

## Observaciones técnicas
- Se centraliza el cálculo en un helper puro para facilitar tests.
- No se persiste la fecha para evitar inconsistencias si cambia el lead time de la variante.
