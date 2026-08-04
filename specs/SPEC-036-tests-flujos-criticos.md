# Spec: Tests e2e de flujos críticos

## Objetivo
Tener tests end-to-end que recorran los flujos más importantes del negocio.

## Alcance
- Flujo de registro + verificación de email + login.
- Flujo de compra: agregar al carrito, checkout, pago (mock de Stripe), confirmar orden.
- Flujo de cupón: aplicar cupón en checkout y verificar descuento.
- Flujo de personalización: crear diseño personalizado, agregar al carrito.

## Fuera de alcance
- Tests de UI frontend (se usan tests backend e2e con supertest).
- Tests de pasarelas de pago reales.

## Testing
- Archivo `test/critical-flows.e2e-spec.ts`.
- Cada flujo debe ser independiente y limpiar datos de prueba.
