# Spec: Cobertura mínima en frontends

## Objetivo
Aumentar la confianza en los componentes de storefront y admin con tests unitarios.

## Alcance
- Tests de `ProductCard` (renderiza nombre, precio, imagen, link).
- Tests de `CatalogFilters` (aplica filtros, limpia filtros, cambia orden).
- Tests de `SearchAutocomplete` (muestra sugerencias, navega al seleccionar).
- Tests de `AnalyticsSection` (renderiza métricas y gráfico).

## Fuera de alcance
- Cobertura del 100%.
- Tests e2e de frontend.

## Testing
- Vitest + React Testing Library.
- Mockear `apiClient` y `useRouter`.
