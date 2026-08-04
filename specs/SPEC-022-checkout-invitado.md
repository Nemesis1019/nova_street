# Spec: Checkout como invitado (guest)

## Objetivo
Permitir finalizar una compra sin necesidad de crear una cuenta.

## Alcance
- Endpoint `POST /checkout/guest` que recibe email, items, dirección y datos de envío.
- Crear un usuario marcado como invitado (`isGuest=true`).
- Generar orden de pago con el mismo flujo de Stripe.
- Enviar confirmación por email con enlace al pedido (acceso temporal por token o email).

## Fuera de alcance
- Conversión de cuenta invitada a cuenta real (se puede agregar luego).
- Recuperación de historial de compras de invitados.

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles
- Público.

## Modelo de datos
`User` se extiende con:
- `isGuest Boolean @default(false)`
- `guestToken String? @unique` (para acceso temporal al pedido)

## API
### `POST /checkout/guest`
Body: `email`, `items`, `shippingAddress`, `billingAddress`, `couponCode?`.
Response igual al checkout normal: `{ orderId, paymentUrl }`.

### `GET /orders/guest/:token`
Devuelve la orden asociada al `guestToken` sin requerir JWT.

## Reglas de negocio
- El email es obligatorio y se valida formato.
- Si el email ya existe como usuario no invitado, se pide login.
- Se crea dirección vinculada al usuario invitado.
- El flujo de pago usa el mismo `CheckoutService`.

## UI / UX
- En el carrito, opción "Comprar como invitado".
- Formulario de email y dirección.
- Pantalla de confirmación post-pago con resumen.

## Criterios de aceptación
- [ ] Orden de invitado creada correctamente.
- [ ] Pago redirige a Stripe.
- [ ] Confirmación por email enviada.
- [ ] Acceso temporal al pedido funciona.
- [ ] Tests e2e cubren flujo completo.

## Testing mínimo
- E2E: checkout guest, pago simulado, acceso con token.
