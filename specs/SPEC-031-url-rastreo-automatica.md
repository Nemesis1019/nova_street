# Spec: Generación automática de URLs de rastreo

## Objetivo
Cuando se registra o actualiza un envío, si no se proporciona una URL de rastreo manual, el backend debe generar automáticamente el link a la página de seguimiento del courier a partir del nombre del transportista y el número de seguimiento.

## Alcance
- Crear/utilizar una utilidad en backend que mapee transportistas conocidos a sus URLs de rastreo.
- Generar URL automáticamente al crear un envío si no se envía `trackingUrl`.
- Generar/actualizar URL automáticamente al editar el tracking de una orden si cambian `carrier` o `trackingNumber` y no hay `trackingUrl` manual.
- Mantener la posibilidad de sobrescribir la URL manualmente.
- Incluir test unitario/e2e de la generación.

## Fuera de alcance
- Integración con APIs privadas de couriers.
- Normalización avanzada de nombres de courier (se hará básica: minúsculas, sin espacios ni caracteres especiales).

## Apps afectadas
- `apps/api`
- `apps/web` (puede simplificar fallback porque ahora el backend provee URL)

## Reglas de negocio
- Si `trackingUrl` viene en el DTO y no está vacío, se respeta.
- Si no viene `trackingUrl`, pero hay `carrier` + `trackingNumber`, se genera usando el mapa de URLs.
- Si el transportista no es reconocido, se genera una búsqueda de Google con `carrier + trackingNumber` como fallback.
- Al crear un envío, la URL generada se propaga también al pedido (`Order.trackingUrl`).

## API
No cambian los contratos; solo cambia el valor por defecto de `trackingUrl`.

## Testing mínimo
- Unitario: `buildCarrierTrackingUrl` para transportistas conocidos y desconocidos.
- E2E: crear envío sin `trackingUrl` y verificar que la orden devuelve una URL generada.

## Observaciones técnicas
- Se reutilizará la misma lógica que ya existe en `apps/web/src/lib/tracking.ts`, moviéndola o duplicándola al backend.
