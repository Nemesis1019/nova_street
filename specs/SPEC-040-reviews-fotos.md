# Spec: Fotos en reseñas de producto

## Objetivo
Permitir adjuntar imágenes a una reseña de producto, mostrarlas en el detalle público y permitir su moderación desde admin.

## Alcance
- Modelo `ReviewAsset` que une `Review` con `Asset` manteniendo orden.
- Subida previa de fotos como `REVIEW_IMAGE` por clientes autenticados.
- `POST /products/:productId/reviews` acepta `assetIds` opcionales.
- Respuestas de reseñas incluyen las imágenes aprobadas con URL y variantes.
- UI de storefront para subir, previsualizar y ver fotos de reseñas.
- UI de admin para ver miniaturas de fotos en el listado de reseñas.

## Apps afectadas
- `apps/api`: módulos `reviews`, `assets` y migración Prisma.
- `apps/web`: componente `ProductReviews` en `/producto/[slug]`.
- `apps/admin`: página `/reviews`.

## Roles
- `CUSTOMER`: subir fotos y adjuntarlas a su reseña.
- `ADMIN`: ver y moderar reseñas con fotos.

## Reglas de negocio
- Máximo 4 fotos por reseña.
- Solo se publican fotos de reseñas aprobadas.
- El `asset` debe existir, pertenecer al usuario que escribe la reseña y tener `purpose = REVIEW_IMAGE`.
- Al eliminar una reseña se desvinculan (no se borran físicamente) sus fotos.

## API
- `POST /assets/upload-custom` (existente) usado para subir fotos de reseña.
- `POST /products/:productId/reviews` ahora acepta `assetIds?: string[]`.
- `GET /products/:productId/reviews` incluye `assets: { id, url, thumbnailUrl, sortOrder }[]`.
- `GET /admin/reviews` incluye `assets`.

## UI / UX
- Formulario de reseña con botón de subir imágenes y previsualización en miniatura.
- Grid de imágenes en cada reseña aprobada del producto.
- Admin: miniatura de la primera foto en la tabla; detalle/expandir al hacer clic.

## Testing mínimo
- Tests e2e de creación de reseña con foto, aprobación y publicación.
- Validación de que un asset ajeno o de otro propósito es rechazado.
