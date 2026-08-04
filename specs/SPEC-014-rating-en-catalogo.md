# Spec: Mostrar rating promedio en catálogo

## Objetivo
Dar visibilidad inmediata a la valoración de los productos en el listado de catálogo, mejorando la confianza del comprador y reduciendo fricción antes de entrar a la ficha.

## Alcance
- Incluir `averageRating` y `reviewCount` en los DTOs de lista y detalle de producto (`ProductListItemDto`, `ProductDetailDto`).
- Calcular ambos valores a partir de reseñas aprobadas (`Review.isApproved = true`).
- Mostrar rating promedio (estrellas + cantidad de reseñas) en la tarjeta de producto del storefront.
- Mostrar rating en el detalle de producto junto al título.

## Fuera de alcance
- Filtros u ordenamiento por rating.
- Widget de estrellas interactivo.
- Reseñas con fotos adjuntas.

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles involucrados
- Cliente (lectura en storefront).
- Admin (las reseñas se aprueban en admin; solo las aprobadas cuentan).

## Casos de uso
1. Cliente navega el catálogo y ve la valoración promedio en cada tarjeta.
2. Cliente entra a un producto y ve el mismo rating junto con el listado de reseñas.
3. Si un producto no tiene reseñas aprobadas, no se muestra bloque de estrellas.

## Reglas de negocio
- Solo cuentan reseñas con `isApproved = true`.
- `averageRating` es el promedio aritmético de `rating`; se devuelve con 1 decimal.
- `reviewCount` es la cantidad total de reseñas aprobadas del producto.
- En listados se calcula de forma eficiente sin caer en N+1 (aggregate `groupBy`).

## Modelo de datos
Se reutiliza el modelo `Review` existente. No se agregan columnas a `Product`.

## API
- `GET /catalog/products` y `GET /catalog/products/{slug}` ahora incluyen:
  - `averageRating: number`
  - `reviewCount: number`

## UI / UX
- `ProductCard`: debajo del precio, mostrar estrellas (1 decimal) y cantidad de reseñas.
- Detalle de producto: junto al título, mostrar estrellas y cantidad.

## Validaciones
- Backend: ninguna validación de entrada adicional.
- Frontend: renderizado condicional si `reviewCount === 0`.

## Permisos
- Público; no requiere autenticación.

## Estados de carga y error
- Sin cambios en estados de carga/error existentes.

## Criterios de aceptación
- [x] `averageRating` y `reviewCount` están presentes en listado y detalle.
- [x] Solo reseñas aprobadas afectan el cálculo.
- [x] La tarjeta de catálogo muestra el rating cuando tiene reseñas.
- [x] `api-client` se regenera y compila sin errores.
- [x] `pnpm turbo run lint typecheck test build` pasa.

## Testing mínimo
- Test unitario en `CatalogService` verificando agregación de ratings.
- Test de render de `ProductCard` con y sin rating.

## Observaciones técnicas
- Se usa `prisma.review.groupBy` con `_avg.rating` y `_count._all` para evitar N+1.
- El rating se muestra como texto simple (estrellas unicode) para no agregar dependencias; en el futuro puede reemplazarse por un componente visual.
