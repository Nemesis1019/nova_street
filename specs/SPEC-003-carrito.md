# Spec: Carrito de Compras

## Objetivo
Permitir a los usuarios agregar productos estándar o personalizados a un carrito, ajustar cantidades y preparar el carrito para el checkout.

## Alcance
- Carrito anónimo (persistido en localStorage/Zustand) y carrito autenticado (persistido en backend).
- Agregar ítems estándar (`STANDARD`) seleccionando variante y cantidad.
- Agregar ítems personalizados (`CUSTOM`) desde el módulo de personalización.
- Actualizar cantidad de ítems.
- Eliminar ítems.
- Calcular totales (subtotal) en backend.
- Sincronizar carrito anónimo al iniciar sesión.

## Fuera de alcance
- Proceso de pago (pertenece a Checkout).
- Aplicación de cupones (se evalúa en checkout).
- Persistencia del estado del editor de personalización.
- Carrito compartido entre dispositivos para usuarios anónimos.

## Apps afectadas
- `apps/api`
- `apps/web`

## Roles involucrados
- `Customer` (autenticado o anónimo).

## Casos de uso
1. Usuario anónimo agrega producto al carrito.
2. Usuario autenticado agrega producto al carrito.
3. Usuario actualiza cantidad de un ítem.
4. Usuario elimina un ítem.
5. Usuario inicia sesión y su carrito anónimo se fusiona con el del backend.
6. Usuario ve el resumen de totales del carrito.

## Reglas de negocio
- Un ítem estándar requiere `productVariantId` y `quantity` >= 1.
- Un ítem personalizado requiere `customDesignId` y `quantity` >= 1.
- No se permiten cantidades mayores a un límite configurable (default 10) para variantes `TRACKED` sin stock suficiente.
- El precio unitario se toma del backend; el frontend solo lo envía como referencia.
- Al fusionar carritos, si el mismo ítem existe, se suman cantidades respetando límites de stock.
- El carrito anónimo vive en `localStorage` y se sincroniza al loguearse.

## Modelo de datos

```txt
Cart
  id: UUID
  userId: UUID? (null para carritos anónimos no persistidos en backend)
  items: CartItem[]
  createdAt: DateTime
  updatedAt: DateTime

CartItem
  id: UUID
  cartId: UUID
  type: CartItemType (STANDARD | CUSTOM)
  productVariantId: UUID?
  customDesignId: UUID?
  quantity: Int
  unitPrice: Int (centavos, snapshot al momento de agregar)
  createdAt: DateTime
  updatedAt: DateTime
```

## API

**GET /cart**
Headers: `Authorization: Bearer <accessToken>` (opcional; si no hay token, el backend responde con estructura vacía y el frontend usa localStorage).
Response 200:
```json
{
  "id": "...",
  "items": [
    { "id": "...", "type": "STANDARD", "productVariantId": "...", "quantity": 2, "unitPrice": 45000, "subtotal": 90000 }
  ],
  "total": 90000
}
```

**POST /cart/items**
Body:
```json
{
  "type": "STANDARD",
  "productVariantId": "...",
  "quantity": 2
}
```
Response 201: carrito actualizado.

**PATCH /cart/items/:itemId**
Body: `{ "quantity": 3 }`
Response 200: carrito actualizado.

**DELETE /cart/items/:itemId**
Response 200: carrito actualizado.

**POST /cart/merge**
Body: `{ "anonymousItems": [{ "type": "STANDARD", "productVariantId": "...", "quantity": 1 }] }`
Response 200: carrito fusionado.

## UI / UX

### `apps/web`
- Indicador de cantidad en el ícono de carrito (header).
- Drawer/página `/cart` con lista de ítems, cantidades, totales y botón "Continuar compra".
- Mensaje de error si cantidad excede stock disponible (solo `TRACKED`).

## Validaciones

### Backend
- `productVariantId` existe y está activa.
- `quantity` >= 1.
- Para variantes `TRACKED`: validar disponibilidad vía `StockPolicy`.
- Para ítems `CUSTOM`: validar que `CustomDesign` exista y esté aprobado.

### Frontend
- Selector de cantidad con límite.
- Mensajes claros de stock insuficiente.

## Permisos
- GET/POST/PATCH/DELETE propio carrito: autenticado.
- Carrito anónimo: gestión local en frontend.

## Estados de carga y error
- Loading al cargar carrito.
- Empty state si no hay ítems.
- Error si variante no existe o está inactiva.
- Error si cantidad excede stock.

## Criterios de aceptación
- [x] Usuario puede agregar ítems estándar y personalizados al carrito.
- [x] Usuario puede actualizar cantidades y eliminar ítems.
- [x] Totales calculados correctamente desde backend.
- [x] Carrito anónimo se sincroniza al iniciar sesión.
- [ ] Stock validado para variantes `TRACKED` (pendiente: `StockPolicyResolver`).
- [x] Tests de integración para agregar, actualizar y fusionar carrito.

## Testing mínimo
- Tests de servicio de carrito.
- Tests de integración de endpoints.
- Tests de lógica de merge de carritos.
- Tests e2e: agregar producto al carrito.

## Observaciones técnicas
- Se usará Zustand para el estado del carrito anónimo en `apps/web`.
- El cálculo de disponibilidad delegará a `StockPolicyResolver` (spec de Stock).
- El precio unitario se guarda como snapshot en `CartItem` para evitar cambios si el producto cambia de precio.
