: # ADR-005: Modo de stock configurable mediante Strategy

## Estado
Aceptada

## Contexto
El negocio fabrica la mayoría de prendas bajo pedido (`MADE_TO_ORDER`), pero en ocasiones requiere controlar inventario real (`TRACKED`). El comportamiento debe cambiar sin redeploy.

## Decisión
- Almacenar `stockMode` en base de datos por variante (`ProductVariant.stockMode`).
- Usar una abstracción `StockPolicy` con dos implementaciones:
  - `MadeToOrderStockPolicy`: no-op en reserva, siempre disponible.
  - `TrackedStockPolicy`: valida, reserva, libera y confirma contra tabla `Inventory`.
- Un `StockPolicyResolver` decide qué política usar en runtime leyendo `stockMode`.

## Consecuencias

### Ventajas
- Cambio de comportamiento sin modificar código.
- Lógica de stock desacoplada de pagos y UI.
- Extensible a futuros modos de stock.

### Desventajas
- Mayor complejidad inicial que hardcodear "todo bajo pedido".
- Requiere mantener `Inventory` sincronizado.

## Alternativas consideradas
- Hardcodear todo como bajo pedido: descartado por no soportar control de inventario.
- Hardcodear todo como tracked: descartado porque no refleja el modelo de negocio.
