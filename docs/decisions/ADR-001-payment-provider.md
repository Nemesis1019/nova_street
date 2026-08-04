# ADR-001: Proveedor de pagos

## Estado
Aceptada

## Contexto
El sistema necesita procesar pagos en línea. Aún no se decidió la pasarela definitiva para producción, pero se requiere una abstracción que permita cambiar de proveedor sin reescribir el dominio de checkout, órdenes ni reportes.

## Decisión
Usar una abstracción `PaymentProvider` con una implementación inicial basada en **Stripe**.

- `apps/api/src/payment/providers/payment-provider.interface.ts` define el contrato: `createCheckoutSession` y `handleWebhook`.
- `StripePaymentProvider` implementa la lógica específica de Stripe (Checkout Sessions, verificación de webhooks).
- `PaymentService` orquesta la creación de sesiones, registra el pago en base de datos y delega el webhook al proveedor activo.
- El proveedor activo se selecciona en runtime leyendo `StoreConfig.paymentProvider`. El fallback es `stripe`.
- Stripe se mantiene como única opción hasta que se evalúe y agregue otra pasarela (Wompi, PayU, Mercado Pago, etc.).

## Consecuencias

### Ventajas
- El dominio de pagos no está acoplado a Stripe.
- Cambiar de pasarela solo requiere una nueva implementación de `PaymentProvider` y actualizar `StoreConfig.paymentProvider`.
- Facilita tests y mocks del proveedor.

### Desventajas
- Agrega una capa de indirección que puede parecer innecesaria mientras solo existe Stripe.
- Cada proveedor nuevo debe adaptarse al contrato común, lo que puede limitar funcionalidades específicas.

## Alternativas consideradas
- Integrar Stripe directamente en `CheckoutService` y `PaymentService`: descartado porque acoplaría todo el checkout a un solo proveedor.
- Usar una librería universal de pagos: descartado por complejidad y falta de soporte local en esta etapa.
