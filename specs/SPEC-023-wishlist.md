# Spec: Wishlist / lista de deseos

## Objetivo
Permitir a usuarios autenticados guardar productos para verlos después.

## Alcance
- Modelo `WishlistItem` con `userId` y `productVariantId`.
- Endpoints: `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/:variantId`.
- UI: ícono de corazón en tarjetas de producto y en detalle.
- Página `/wishlist` en storefront.

## Fuera de alcance
- Wishlist para invitados (requeriría persistencia local o sesión).
- Notificaciones de disponibilidad.

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles
- CUSTOMER autenticado.

## Modelo de datos
```prisma
model WishlistItem {
  id               String          @id @default(uuid()) @db.Uuid
  userId           String          @db.Uuid
  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  productVariantId String          @db.Uuid
  productVariant   ProductVariant  @relation(fields: [productVariantId], references: [id], onDelete: Cascade)
  createdAt        DateTime        @default(now())
  @@unique([userId, productVariantId])
  @@map("wishlist_items")
}
```

## API
### `GET /wishlist`
Response: lista de variantes con producto.

### `POST /wishlist`
Body: `{ productVariantId }`.

### `DELETE /wishlist/:variantId`

## UI / UX
- Corazón toggle en `ProductCard` y `ProductPage`.
- Página simple con grid de productos guardados.
- Feedback visual al agregar/eliminar.

## Criterios de aceptación
- [ ] Modelo y migración creados.
- [ ] Endpoints funcionan.
- [ ] UI toggle y página implementadas.
- [ ] Tests e2e verifican agregar/quitar/listar.

## Testing mínimo
- E2E: agregar a wishlist, listar, eliminar.
