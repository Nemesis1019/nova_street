# Spec: Tests de StockPolicyResolver

## Objetivo
Validar que `StockPolicyResolver` devuelva la política correcta según el `stockMode` de la variante.

## Alcance
- Test unitario: variante `TRACKED` devuelve `TrackedStockPolicy`.
- Test unitario: variante `MADE_TO_ORDER` devuelve `MadeToOrderStockPolicy`.
- Test unitario: variante inexistente lanza `BadRequestException`.
- Test unitario/e2e de comportamiento de reserva/liberación/commit para ambos modos.

## Testing
- Archivo `src/stock/stock-policy.resolver.spec.ts`.
- Archivo opcional `src/stock/tracked.policy.spec.ts`.
