# Spec: Checkout

## Objetivo
Permitir a los usuarios convertir su carrito en una orden, seleccionar dirección de envío, aplicar cupones y procesar el pago a través de una pasarela abstracta.

## Alcance
- Iniciar checkout desde el carrito.
- Seleccionar/crear dirección de envío.
- Calcular totales: subtotal, envío, descuentos por cupón, total final.
- Aplicar cupón de descuento (porcentaje o monto fijo).
- Crear orden en estado `PENDING_PAYMENT`.
- Crear intento de pago a través de proveedor abstracto (`PaymentProvider`).
- Confirmar pago y actualizar orden a `PAID`.
- Webhook de confirmación de pago.

## Fuera de alcance
- Cálculo real de costos de envío (se usa valor fijo configurable).
- Pasarela de pago concreta (se define proveedor en ADR; se implementa abstracción).
- Checkout como invitado (spec separada).
- Reembolsos parciales/integrales.
- Facturación electrónica.

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles involucrados
- `Customer` autenticado.

## Casos de uso
1. Usuario inicia checkout desde el carrito.
2. Usuario selecciona dirección de envío.
3. Usuario aplica cupón válido.
4. Sistema calcula totales y crea orden pendiente.
5. Sistema crea intento de pago.
6. Usuario completa pago en pasarela.
7. Pasarela confirma pago vía webhook.
8. Sistema actualiza orden a `PAID` y reserva/confirma stock según corresponda.

## Reglas de negocio
- El precio final se recalcula en backend; no se confía en totales enviados por frontend.
- Cupones tienen fecha de vigencia, límite de usos y solo se aplican una vez por orden.
- Descuento por porcentaje no puede superar el 100% del subtotal.
- Envío tiene un costo fijo configurable (`StoreSettings.shippingCostDefault`).
- Si el pago falla, la orden permanece en `PENDING_PAYMENT` y se libera stock reservado (si aplica `TRACKED`).
- Al confirmar pago:
  - Si variante es `TRACKED`: se confirma descuento de inventario.
  - Si variante es `MADE_TO_ORDER`: ítems pasan a `PENDING_PRODUCTION`.

## Modelo de datos

```txt
Order
  id: UUID
  userId: UUID
  status: OrderStatus
  subtotal: Int
  shippingCost: Int
  discountAmount: Int
  couponId: UUID?
  totalAmount: Int
  shippingAddressId: UUID
  billingAddressId: UUID
  paymentStatus: PaymentStatus
  createdAt: DateTime
  updatedAt: DateTime

OrderItem
  id: UUID
  orderId: UUID
  type: CartItemType
  productVariantId: UUID?
  customDesignId: UUID?
  quantity: Int
  unitPrice: Int
  productionStatus: OrderItemProductionStatus
  createdAt: DateTime
  updatedAt: DateTime

Payment
  id: UUID
  orderId: UUID
  provider: String
  providerTransactionId: String?
  amount: Int
  status: PaymentStatus
  payload: JSON?
  createdAt: DateTime
  updatedAt: DateTime

Coupon
  id: UUID
  code: String @unique
  discountType: PERCENTAGE | FIXED
  discountValue: Int
  validFrom: DateTime
  validUntil: DateTime?
  maxUses: Int?
  usedCount: Int
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime
```

## API

**POST /checkout/init**
Body:
```json
{
  "shippingAddressId": "...",
  "billingAddressId": "...",
  "couponCode": "DESC10"
}
```
Response 201:
```json
{
  "orderId": "...",
  "subtotal": 90000,
  "shippingCost": 10000,
  "discountAmount": 9000,
  "totalAmount": 91000,
  "paymentIntent": { "provider": "placeholder", "clientSecret": "..." }
}
```

**POST /checkout/:orderId/apply-coupon**
Body: `{ "couponCode": "DESC10" }`
Response 200: orden actualizada.

**POST /checkout/:orderId/confirm-payment**
Body: `{ "providerPayload": { ... } }`
Response 200: orden con estado actualizado.

**POST /webhooks/payments/:provider**
Body: payload del proveedor.
Response 200/204.

## UI / UX

### `apps/web`
- Página `/checkout` con stepper:
  1. Dirección de envío.
  2. Método de envío (valor fijo por ahora).
  3. Cupón (opcional).
  4. Resumen y pago.
- Página `/checkout/success` y `/checkout/failure`.

## Validaciones

### Backend
- Carrito no vacío.
- Direcciones pertenecen al usuario.
- Cupón válido, activo, no expirado, dentro de límite de usos.
- Stock disponible para variantes `TRACKED` (reserva temporal).
- Proveedor de pago configurado.

### Frontend
- Validación de campos requeridos.
- Feedback de cupón inválido/expirado.

## Permisos
- Todo checkout: autenticado.
- Webhooks: firma validada por proveedor.

## Estados de carga y error
- Loading al iniciar checkout.
- Error si carrito vacío.
- Error si cupón inválido.
- Error si stock insuficiente.
- Error si pago fallido.

## Criterios de aceptación
- [x] Usuario puede iniciar checkout desde carrito.
- [x] Totales recalculados en backend.
- [x] Cupón válido aplica descuento correctamente.
- [x] Orden creada en `PENDING_PAYMENT`.
- [x] Pago confirmado actualiza orden a `PAID`.
- [ ] Stock reservado/liberado según resultado del pago (pendiente: `StockPolicy`).
- [x] Tests de integración para checkout completo.

## Testing mínimo
- Tests de cálculo de totales con y sin cupón.
- Tests de reserva/liberación de stock.
- Tests de webhook de pago.
- Tests e2e: checkout completo con producto `MADE_TO_ORDER` y `TRACKED`.

## Observaciones técnicas
- Se implementará `PaymentProvider` como interfaz; la primera implementación será un `PlaceholderProvider` hasta elegir pasarela real.
- La reserva de stock usará `StockPolicy` (spec de Stock).
- El webhook debe validar firma antes de procesar.
