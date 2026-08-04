# Spec: Comparador de productos

## Objetivo
Permitir a los usuarios comparar varios productos lado a lado.

## Alcance
- UI para seleccionar hasta 4 productos y comparar.
- Tabla comparativa con: imagen, nombre, precio, rating, variantes (tallas/colores), descripción.
- Persistencia temporal en `localStorage`.

## Fuera de alcance
- Comparación de atributos personalizados dinámicos.
- Compartir comparación por URL.

## Apps afectadas
- `apps/web`

## Roles
- Público.

## UI / UX
- Botón "Comparar" en tarjetas de producto.
- Barra flotante con productos seleccionados.
- Página `/comparar` con tabla responsive.
- Botón para quitar productos del comparador.

## Dependencias
- Usa `GET /catalog/products/{slug}` para cargar detalles.

## Criterios de aceptación
- [ ] Selección y eliminación funcionan.
- [ ] Persistencia en `localStorage`.
- [ ] Página de comparación renderiza tabla.
- [ ] Tests unitarios del estado del comparador.

## Testing mínimo
- Unit test del hook/componente de comparador.
