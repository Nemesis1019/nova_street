# Spec: Búsqueda predictiva en catálogo

## Objetivo
Ofrecer sugerencias de productos mientras el usuario escribe en el buscador.

## Alcance
- Endpoint `GET /catalog/search-suggestions?q=...&limit=5`.
- Búsqueda por nombre, slug y descripción del producto (insensible a mayúsculas).
- Devolver id, name, slug, price, imageUrl.
- Componente de autocomplete en el header del storefront.

## Fuera de alcance
- Búsqueda full-text avanzada con ranking.
- Sugerencias de categorías (se puede extender después).

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles
- Público.

## API
### `GET /catalog/search-suggestions`
Query: `q`, `limit` (max 10).
Response:
```json
{
  "data": [
    { "id": "...", "name": "Remera", "slug": "remera", "price": 100000, "imageUrl": "..." }
  ]
}
```

## Reglas de negocio
- Solo productos activos con al menos una variante activa.
- Mínimo 2 caracteres para buscar.
- Límite máximo 10 sugerencias.

## UI / UX
- Input en header con dropdown de sugerencias.
- Debounce de 300ms.
- Navegar a producto al hacer click.

## Criterios de aceptación
- [ ] Endpoint responde en <200ms para catálogos pequeños.
- [ ] UI de autocomplete funcional.
- [ ] Tests e2e verifican sugerencias.

## Testing mínimo
- E2E: buscar texto parcial y verificar resultados.
