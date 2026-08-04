# Spec: Reseñas de producto

## Objetivo
Permitir a los clientes calificar y comentar productos comprados, y al admin moderar las reseñas antes de que sean públicas.

## Alcance
- Modelo `Review` vinculado a `Product`, `User` y opcionalmente `Order`.
- Publicación de reseñas desde el detalle de producto (solo usuarios autenticados).
- Validación opcional de compra verificada mediante `orderId`.
- Listado público de reseñas aprobadas con promedio de rating.
- Panel de moderación en admin con aprobar/rechazar/eliminar.

## Apps afectadas
- `apps/api`: módulo `reviews`.
- `apps/web`: componente `ProductReviews` en `/producto/[slug]`.
- `apps/admin`: página `/reviews`.

## Roles
- `CUSTOMER`: crear reseñas.
- `ADMIN`: moderar y eliminar reseñas.

## Reglas de negocio
- Una reseña queda en estado `isApproved = false` hasta aprobación.
- Un usuario no puede reseñar dos veces el mismo producto dentro de la misma orden.
- Si se indica `orderId`, la orden debe pertenecer al usuario, estar pagada y contener el producto.

## API
- `GET /products/:productId/reviews`
- `POST /products/:productId/reviews`
- `GET /admin/reviews`
- `PATCH /admin/reviews/:id/approve`
- `PATCH /admin/reviews/:id/reject`
- `DELETE /admin/reviews/:id`

## UI / UX
- Promedio de estrellas y listado de reseñas en producto.
- Formulario de reseña con rating y comentario.
- Tabla de moderación con filtros por estado y búsqueda.

## Testing mínimo
- Tests e2e del backend para creación, validación de orden y aprobación.
