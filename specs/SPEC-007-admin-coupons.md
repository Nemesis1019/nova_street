# Spec: Administración de Cupones y Descuentos

## Objetivo
Permitir a los administradores crear, editar, activar/desactivar y eliminar cupones de descuento que los clientes puedan aplicar durante el checkout.

## Alcance
- CRUD de cupones en `apps/admin`.
- Endpoints admin para gestión de cupones.
- Validaciones de vigencia, límite de usos y estado activo.
- Integración con checkout existente (`SPEC-004`).

## Fuera de alcance
- Descuentos automáticos por categoría/producto.
- Códigos de descuento de uso único generados masivamente.
- Programas de fidelidad o puntos.

## Apps afectadas
- `apps/api`
- `apps/admin`

## Roles involucrados
- `Admin`: gestiona cupones.
- `Customer`: aplica cupones en checkout (ya cubierto en `SPEC-004`).

## Casos de uso
1. Admin crea cupón de porcentaje.
2. Admin crea cupón de monto fijo.
3. Admin desactiva un cupón.
4. Admin edita límite de usos o vigencia.
5. Admin lista cupones con filtros.

## Reglas de negocio
- Código único (case-insensitive).
- `discountType`: `PERCENTAGE` o `FIXED`.
- `discountValue` >= 0.
- `validFrom` <= `validUntil` (si aplica).
- `maxUses` opcional; `usedCount` incrementa al aplicarse en una orden pagada.
- Cupón inactivo no puede aplicarse.

## API

### Admin

**POST /admin/coupons**
Body: `{ code, discountType, discountValue, validFrom, validUntil, maxUses, isActive }`
Response 201: cupón creado.

**GET /admin/coupons**
Query: `page`, `limit`, `isActive`.
Response 200: lista de cupones.

**GET /admin/coupons/:id**
Response 200: cupón.

**PATCH /admin/coupons/:id**
Body: campos actualizables.
Response 200: cupón actualizado.

**PATCH /admin/coupons/:id/toggle-active**
Response 200: cupón con estado invertido.

**DELETE /admin/coupons/:id**
Response 204.

## UI / UX

### `apps/admin`
- Tabla de cupones con código, tipo, valor, vigencia, usos, estado.
- Formulario de creación/edición.
- Acción rápida para activar/desactivar.

## Validaciones

### Backend
- Código único.
- Valores positivos.
- Fechas coherentes.

### Frontend
- Mismas validaciones con Zod.
- Feedback visual de cupón duplicado.

## Criterios de aceptación
- [ ] Admin puede CRUD de cupones.
- [ ] Cupón se valida correctamente en checkout.
- [ ] Estado activo/inactivo funciona.
- [ ] Tests de integración para CRUD de cupones.

## Testing mínimo
- Tests e2e: admin crea cupón y customer lo aplica en checkout.

## Observaciones técnicas
- Reutilizar modelo `Coupon` existente.
- No modificar la lógica de aplicación de cupones en checkout.
