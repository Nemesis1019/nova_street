# Spec: Modo de Stock Configurable

## Objetivo
Soportar dos modos de disponibilidad por variante (`MADE_TO_ORDER` y `TRACKED`) de forma configurable en base de datos, usando una abstracción de política de stock sin redeploy.

## Alcance
- Campo `stockMode` en `ProductVariant` y `StoreSettings.defaultStockMode`.
- Abstracción `StockPolicy` con implementaciones `MadeToOrderStockPolicy` y `TrackedStockPolicy`.
- Reserva, liberación y confirmación de stock para variantes `TRACKED`.
- No-op para variantes `MADE_TO_ORDER`.
- Endpoint admin para cambiar `stockMode` de una variante.
- Endpoint admin para ajustar inventario manualmente.
- Auditoría de cambios de stock y configuración.

## Fuera de alcance
- Alertas automáticas de stock bajo.
- Sincronización con sistemas externos de inventario.
- Historial completo de movimientos de inventario (solo ajustes manuales y cambios de modo).

## Apps afectadas
- `apps/api`
- `apps/admin`

## Roles involucrados
- `Customer`: afectado indirectamente (disponibilidad).
- `Admin`: configura modo de stock e inventario.

## Casos de uso
1. Admin crea una variante; por defecto es `MADE_TO_ORDER`.
2. Admin cambia una variante a `TRACKED`.
3. Admin ajusta cantidad disponible de inventario.
4. Cliente agrega al carrito producto `TRACKED`; sistema valida disponibilidad.
5. Cliente inicia checkout; sistema reserva stock.
6. Pago falla; sistema libera stock reservado.
7. Pago confirma; sistema descuenta stock definitivamente.

## Reglas de negocio
- `StoreSettings.defaultStockMode` determina el valor por defecto al crear variantes.
- `MADE_TO_ORDER`: siempre disponible salvo que el producto esté inactivo.
- `TRACKED`: disponibilidad = `quantity - reservedQuantity`.
- No se permite stock negativo.
- Reserva expira después de un tiempo configurable (default 30 minutos) si no se confirma pago.
- Cambiar `stockMode` no afecta pedidos en curso.
- Todo cambio de `stockMode` o ajuste de inventario se audita.

## Modelo de datos

```txt
StoreSettings
  id: UUID
  defaultStockMode: StockMode
  productionLeadTimeDaysDefault: Int
  shippingCostDefault: Int
  updatedById: UUID?
  updatedAt: DateTime

ProductVariant
  ...
  stockMode: StockMode
  productionLeadTimeDays: Int
  ...

Inventory
  id: UUID
  productVariantId: UUID @unique
  quantity: Int
  reservedQuantity: Int
  updatedAt: DateTime

StockReservation
  id: UUID
  productVariantId: UUID
  cartId: UUID?
  orderId: UUID?
  quantity: Int
  expiresAt: DateTime
  status: ACTIVE | RELEASED | COMMITTED
  createdAt: DateTime
  updatedAt: DateTime
```

## API

### Admin

**PATCH /admin/variants/:id/stock-mode**
Body: `{ "stockMode": "TRACKED" }`
Response 200: variante actualizada.

**PATCH /admin/variants/:id/inventory**
Body: `{ "quantity": 100 }`
Response 200: inventario actualizado.

**GET /admin/inventory**
Query: `page`, `limit`, `stockMode`
Response 200: lista de variantes con inventario.

### Interno (usado por otros módulos)

`StockPolicyResolver.resolve(variantId): StockPolicy`

`StockPolicy`:
- `isAvailable(variantId, quantity): Promise<boolean>`
- `reserve(variantId, quantity, context): Promise<void>`
- `release(variantId, quantity, context): Promise<void>`
- `commit(variantId, quantity, context): Promise<void>`

## UI / UX

### `apps/admin`
- Tabla de variantes con badge de `stockMode`.
- Formulario para cambiar `stockMode` con confirmación.
- Formulario para ajustar `quantity` de inventario.
- Vista de auditoría de cambios de stock.

## Validaciones

### Backend
- `stockMode` válido.
- `quantity` >= 0 para inventario.
- No liberar más stock del reservado.
- No confirmar más stock del reservado.

### Frontend
- Confirmación para cambios destructivos de modo.
- Validación numérica para cantidades.

## Permisos
- `stock.read`: ver configuración.
- `stock.configure`: cambiar modo y ajustar inventario.

## Estados de carga y error
- Loading al guardar cambios.
- Error si se intenta vender stock `TRACKED` sin disponibilidad.
- Éxito al cambiar modo o ajustar inventario.

## Criterios de aceptación
- [x] Variantes nuevas usan `defaultStockMode` de `StoreSettings`.
- [x] `MadeToOrderStockPolicy` siempre permite agregar al carrito.
- [x] `TrackedStockPolicy` valida y reserva/confirma inventario (liberación pendiente de job/expiración).
- [x] Cambio de `stockMode` auditado.
- [x] Pedidos en curso no se ven afectados por cambios de modo.
- [x] Tests de integración para ambas políticas.

## Testing mínimo
- Tests unitarios de `MadeToOrderStockPolicy` y `TrackedStockPolicy`.
- Tests de `StockPolicyResolver`.
- Tests de integración con carrito y checkout para ambos modos.
- Tests e2e: admin cambia modo de stock y verifica efecto en storefront.

## Observaciones técnicas
- El módulo `stock` no debe depender de pagos ni UI; solo expone la interfaz `StockPolicy`.
- Se recomienda un job periódico (BullMQ más adelante) para liberar reservas expiradas.
- La auditoría usará la tabla `AuditLog`.
