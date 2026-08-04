# Spec: Exportación CSV/Excel

## Objetivo
Permitir exportar pedidos y productos en formato CSV desde el panel admin.

## Alcance
- `GET /admin/orders/export?format=csv&from=&to=`.
- `GET /admin/products/export?format=csv`.
- Formato CSV con codificación UTF-8 y BOM para Excel.
- Excel queda como mejora futura; esta spec cubre CSV.

## Fuera de alcance
- Generación asíncrona de archivos grandes (por ahora síncrona con límite).
- Envío por email del archivo.

## Apps afectadas
- `apps/api`
- `apps/admin`

## Roles
- ADMIN.

## API
### `GET /admin/orders/export?format=csv`
Headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="orders-YYYY-MM-DD.csv"`.
Columnas: id, createdAt, status, paymentStatus, subtotal, shippingCost, discountAmount, totalAmount, customerEmail, itemCount.

### `GET /admin/products/export?format=csv`
Columnas: id, name, slug, basePrice, category, isActive, stockMode, variantCount.

## Reglas de negocio
- Máximo 10.000 registros por exportación.
- Pedidos exportados ordenados por `createdAt` descendente.
- Fechas en ISO.

## Dependencias
- Instalar `csv-stringify` o generar manualmente.

## Criterios de aceptación
- [ ] Endpoint devuelve CSV válido.
- [ ] UI admin descarga archivo al hacer click.
- [ ] Tests verifican contenido del CSV.

## Testing mínimo
- E2E: exportar pedidos y verificar columnas.
