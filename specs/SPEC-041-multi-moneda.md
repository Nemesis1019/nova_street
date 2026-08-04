# Spec: Soporte multi-moneda

## Objetivo
Permitir mostrar precios y totales en diferentes monedas, manteniendo los precios base en una moneda única (PYG) y usando tasas de cambio configurables.

## Alcance
- Modelo `Currency` con código, nombre, símbolo, tasa de cambio respecto a la moneda base y estado activo.
- Moneda por defecto configurada en `StoreConfig.currencyCode`.
- API pública `GET /currencies` que devuelve monedas activas.
- Admin: gestión de monedas y tasas de cambio.
- Storefront: selector de moneda y formato de precios convertidos.

## Apps afectadas
- `apps/api`: módulos `store-config` / nuevo `currencies` y migración Prisma.
- `apps/web`: `CurrencyProvider`, `formatPrice`, selector en `StoreHeader`, reemplazo de formatos manuales.
- `apps/admin`: gestión de monedas en `/store-config` o página `/currencies`.

## Reglas de negocio
- El backend almacena y opera siempre en la moneda base (PYG).
- El cambio de moneda es puramente de presentación: `amount * exchangeRate`.
- Formato de precio incluye símbolo de la moneda y separadores de miles/locales.
- La moneda seleccionada persiste en `localStorage`.

## API
- `GET /currencies` — listado público de monedas activas.
- `GET /admin/currencies` — listado completo (admin).
- `POST /admin/currencies` — crear moneda.
- `PATCH /admin/currencies/:code` — actualizar tasa/símbolo/estado.
- `DELETE /admin/currencies/:code` — eliminar moneda.

## UI / UX
- Selector de moneda en header del storefront.
- Precios convertidos en catálogo, detalle, carrito, checkout, órdenes y personalizador.
- Admin: tabla con moneda, tasa, símbolo y acciones.

## Testing mínimo
- Tests unitarios del helper de conversión y formato.
- Tests e2e básicos de listado de monedas y cambio de moneda en producto.
