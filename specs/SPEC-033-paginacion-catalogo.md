# Spec: Paginación en catálogo

## Objetivo
Permitir navegar por múltiples páginas de resultados en el catálogo del storefront.

## Alcance
- Mostrar controles de paginación en `/catalogo` cuando haya más productos que el límite actual.
- Conservar filtros y ordenamiento al cambiar de página.
- Soporte para selector de cantidad por página (12, 24, 48).

## API
El backend ya soporta `page` y `limit`; no requiere cambios.

## UI / UX
- Botones "Anterior" / "Siguiente" y números de página.
- Selector "Mostrar X por página".
- Estado deshabilitado en bordes.

## Testing
- E2E o test de componente: cambiar de página conserva query params.
