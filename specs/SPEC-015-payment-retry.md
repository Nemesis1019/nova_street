# Spec: Reintentos de pago sin duplicar órdenes

## Objetivo
Permitir que un cliente reintente el pago de una orden existente cuando el intento anterior falló, sin crear una nueva orden ni duplicar reservas de stock.

## Alcance
- Endpoint autenticado `POST /orders/:orderId/retry-payment`.
- Validación de propiedad de la orden y estado `PENDING_PAYMENT`.
- Creación de una nueva sesión de pago (Stripe Checkout) para la misma orden.
- Registro de un nuevo `Payment` en estado `PENDING` vinculado a la orden original.
- Manejo de webhook `payment_intent.payment_failed` para marcar el pago como `FAILED`.
- Prevención de doble pago: si el webhook de éxito llega cuando la orden ya está `PAID`, se ignora.

## Fuera de alcance
- Reembolsos automáticos por pagos duplicados (se asume que el webhook de éxito ignora órdenes ya pagadas).
- Cancelación automática de órdenes expiradas.
- Reintentos automáticos por el backend (sin intervención del usuario).

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles involucrados
- Cliente autenticado (reintenta su propia orden).

## Casos de uso
1. Cliente crea una orden pero cierra la ventana de pago o la tarjeta es rechazada.
2. Cliente va a "Mis pedidos", abre la orden y presiona "Reintentar pago".
3. Backend crea una nueva sesión de pago y redirige al cliente.
4. Si el pago se completa, la orden pasa a `PAID` y se mantiene el mismo `orderId`.
5. Si el pago falla, el cliente puede volver a intentarlo.

## Reglas de negocio
- Solo se puede reintentar pagos de órdenes en estado `PENDING_PAYMENT`.
- La orden debe pertenecer al usuario autenticado.
- No se debe crear una nueva orden, solo un nuevo `Payment`.
- No se debe reservar/liberar stock adicional; la reserva original se mantiene.
- El monto a pagar es el `totalAmount` actual de la orden (incluye cupón y envío).
- Se debe poder reintentar múltiples veces.

## Modelo de datos
Se reutilizan los modelos `Order` y `Payment` existentes.

Nuevo campo opcional en `Payment` (si no existe):
- `failureMessage?: string` — motivo de fallo devuelto por el proveedor.

## API
### `POST /orders/:orderId/retry-payment`
**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "orderId": "uuid",
  "paymentUrl": "https://checkout.stripe.com/..."
}
```

**Errores:**
- `404` — Orden no encontrada.
- `403` — La orden no pertenece al usuario.
- `400` — La orden no está pendiente de pago.
- `409` — Proveedor de pagos deshabilitado.

### Webhook
- Stripe envía `payment_intent.payment_failed` -> se actualiza el último `Payment` a `FAILED`.
- Stripe envía `checkout.session.completed` -> si la orden está `PENDING_PAYMENT`, se marca como `PAID`; si ya está `PAID`, se ignora.

## UI / UX
- En `/orders/[id]` del storefront, mostrar botón "Reintentar pago" cuando `status === 'PENDING_PAYMENT'`.
- Mostrar mensaje claro si el pago falló.
- Redirigir a la URL del proveedor al hacer clic.

## Validaciones
- Backend: usuario es dueño de la orden y estado es `PENDING_PAYMENT`.
- Backend: el proveedor de pagos está configurado y habilitado.
- Frontend: botón visible solo para órdenes pendientes de pago.

## Permisos
- Solo el dueño de la orden puede reintentar.

## Estados de carga y error
- Loading al crear la sesión.
- Error si el proveedor está deshabilitado o la orden no admite reintento.

## Criterios de aceptación
- [ ] Endpoint de reintento crea sesión sin duplicar la orden.
- [ ] Webhook de fallo marca el pago como `FAILED` sin cambiar el estado de la orden.
- [ ] Webhook de éxito en orden ya pagada no produce efectos secundarios.
- [ ] Botón de reintento visible en detalle de orden pendiente.
- [ ] `api-client` regenerado y compila.
- [ ] Tests e2e verifican reintento exitoso y reintento sobre orden pagada.

## Testing mínimo
- E2E: reintentar pago de orden pendiente y simular éxito vía webhook.
- E2E: intentar reintentar una orden pagada devuelve error.
- E2E: webhook de fallo actualiza el último pago a `FAILED`.

## Observaciones técnicas
- Se reutiliza `PaymentService.createCheckoutSession` para generar la sesión de pago.
- Se agrega manejo del evento `payment_intent.payment_failed` en `StripePaymentProvider.handleWebhook`.
