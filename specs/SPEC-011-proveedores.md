# Spec: Proveedores configurables de email y pagos

## Objetivo
Hacer que el proveedor de email y la pasarela de pagos sean seleccionables desde el admin sin recompilar el backend, preparando el terreno para migrar a Resend en producción y agregar más pasarelas en el futuro.

## Alcance
- Campos `emailProvider` y `paymentProvider` en `StoreConfig`.
- Carpeta `apps/api/src/email/providers/` con interfaz `EmailProvider` e implementaciones SMTP y Resend.
- Carpeta `apps/api/src/payment/providers/` con interfaz `PaymentProvider` e implementación Stripe.
- Selección del proveedor activo en runtime leyendo `StoreConfig`.
- UI en `/store-config` del admin para elegir proveedores.

## Apps afectadas
- `apps/api`: `email`, `payment`, `store-config`.
- `apps/admin`: página `/store-config`.
- `apps/web`: afectado indirectamente porque el checkout usa el proveedor activo.

## Roles
- `ADMIN`: configura proveedores.

## Reglas de negocio
- Las credenciales de los proveedores permanecen en variables de entorno; `StoreConfig` solo guarda la selección.
- El fallback se lee de `EMAIL_PROVIDER` / `PAYMENT_PROVIDER` si no hay `StoreConfig` activo.
- Si faltan credenciales, el proveedor loguea el mensaje/intento en lugar de fallar.

## API
- `GET /store-config` incluye `emailProvider` y `paymentProvider`.
- `PATCH /store-config` permite actualizarlos.

## UI / UX
- Selects de proveedor en la página de configuración de la tienda.

## Testing mínimo
- Verificar que el backend inyecta el proveedor correcto según `StoreConfig`.
