# Spec: Analytics y reportes

## Objetivo
Proveer al equipo de administración métricas de ventas, productos más vendidos y conversión.

## Alcance
- Endpoint de ventas agrupadas por día.
- Endpoint de productos más vendidos por ingresos y cantidad.
- Endpoint de tasa de conversión carrito→orden.
- Datos filtrables por rango de fechas.

## Fuera de alcance
- Reportes exportables (cubierto por SPEC-021).
- Integración con herramientas externas (Google Analytics, etc.).
- Dashboard visual (cubierto por SPEC-020).

## Apps afectadas
- `apps/api`
- `apps/admin`

## Roles
- ADMIN.

## API
### `GET /admin/analytics/sales`
Query: `from` (ISO date), `to` (ISO date), `groupBy=day|week|month`.
Response:
```json
{
  "totalRevenue": 1500000,
  "totalOrders": 12,
  "averageOrderValue": 125000,
  "data": [
    { "label": "2026-07-20", "revenue": 500000, "orders": 4 }
  ]
}
```

### `GET /admin/analytics/top-products`
Query: `limit` (default 10), `from`, `to`.
Response:
```json
{
  "data": [
    { "productId": "...", "name": "Remera", "quantity": 5, "revenue": 500000 }
  ]
}
```

### `GET /admin/analytics/conversion`
Response:
```json
{ "cartToOrderRate": 0.25 }
```

## Reglas de negocio
- Solo órdenes con `paymentStatus=PAID` cuentan para ventas/ingresos.
- Productos personalizados se agrupan por `productVariant.product.name`.
- Rango de fechas por `Order.paidAt`.
- Conversión = órdenes pagadas / carritos creados en el mismo rango (fallback últimos 30 días).

## Modelo de datos
Sin cambios. Usa `Order`, `OrderItem`, `Cart`.

## UI / UX
- Admin consume endpoints y muestra KPIs y tablas.

## Criterios de aceptación
- [ ] Endpoints devuelven datos correctos.
- [ ] Filtros de fecha funcionan.
- [ ] Tests e2e verifican métricas con datos conocidos.

## Testing mínimo
- E2E: crear órdenes pagadas y verificar sales/top-products/conversion.
