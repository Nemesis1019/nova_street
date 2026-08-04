# Spec: Catálogo de Productos

## Objetivo
Permitir a los clientes explorar productos de ropa con variantes (talla, color, tipo de prenda) y a los administradores gestionar el catálogo.

## Alcance
- Categorías jerárquicas de productos.
- Productos con nombre, descripción, slug, precio base y estado activo/inactivo.
- Variantes de producto (`ProductVariant`) con SKU, talla, color, tipo de prenda, modo de stock y tiempo de producción.
- Imágenes de producto asociadas a producto/variante.
- Listado público de productos con paginación, filtros y ordenamiento.
- Detalle de producto.
- Panel administrativo CRUD de productos, variantes y categorías.

## Fuera de alcance
- Búsqueda full-text avanzada.
- Filtros por rango de precio dinámico (solo filtro por categoría, talla, color).
- Gestión de inventario real (pertenece a spec de Stock).
- Reviews de producto.
- Importación masiva.

## Apps afectadas
- `apps/api`
- `apps/web`
- `apps/admin`

## Roles involucrados
- `Customer`: consulta catálogo.
- `Admin`: gestiona catálogo.

## Casos de uso
1. Cliente ve listado de productos activos.
2. Cliente filtra productos por categoría, talla o color.
3. Cliente ordena productos por precio o nombre.
4. Cliente ve detalle de un producto con sus variantes.
5. Admin crea/edita/elimina categorías.
6. Admin crea/edita/activa/desactiva productos.
7. Admin crea/edita/elimina variantes de un producto.
8. Admin sube imágenes de producto a R2.

## Reglas de negocio
- El slug de producto debe ser único.
- El SKU de variante debe ser único.
- Un producto debe tener al menos una variante para estar disponible.
- Solo productos `isActive = true` se muestran en el storefront.
- El precio mostrado en el storefront proviene de `ProductVariant` si existe precio específico, o de `Product.basePrice`.
- Las variantes nuevas usan `stockMode = MADE_TO_ORDER` por defecto (tomado de `StoreSettings.defaultStockMode`).
- Las imágenes se almacenan en R2; solo la URL pública o signed URL se guarda en base de datos.

## Modelo de datos

```txt
Category
  id: UUID
  name: String
  slug: String @unique
  description: String?
  parentId: UUID?
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime

Product
  id: UUID
  name: String
  slug: String @unique
  description: String?
  categoryId: UUID?
  basePrice: Int (centavos)
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime

ProductVariant
  id: UUID
  productId: UUID
  sku: String @unique
  size: String?
  color: String?
  garmentType: String?
  stockMode: StockMode
  productionLeadTimeDays: Int
  priceAdjustment: Int? (centavos, opcional)
  isActive: Boolean
  createdAt: DateTime
  updatedAt: DateTime

ProductImage
  id: UUID
  productId: UUID?
  productVariantId: UUID?
  assetId: UUID
  sortOrder: Int
  createdAt: DateTime
  updatedAt: DateTime
```

## API

### Público (storefront)

**GET /catalog/categories**
Response 200: lista de categorías activas.

**GET /catalog/products**
Query params:
- `page`, `limit`
- `categorySlug`
- `size`
- `color`
- `sort` (price_asc, price_desc, name_asc, newest)

Response 200:
```json
{
  "data": [
    {
      "id": "...",
      "name": "...",
      "slug": "...",
      "basePrice": 45000,
      "category": { ... },
      "variants": [ { "id": "...", "size": "M", "color": "Negro", "stockMode": "MADE_TO_ORDER" } ],
      "images": [ { "url": "...", "alt": "..." } ]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

**GET /catalog/products/:slug**
Response 200: detalle completo del producto.

### Admin

**POST /admin/categories**
**PATCH /admin/categories/:id**
**DELETE /admin/categories/:id**

**POST /admin/products**
**PATCH /admin/products/:id**
**PATCH /admin/products/:id/toggle-active**
**DELETE /admin/products/:id**

**POST /admin/products/:id/variants**
**PATCH /admin/products/:id/variants/:variantId**
**DELETE /admin/products/:id/variants/:variantId**

## UI / UX

### `apps/web`
- Página `/catalogo` con grid de productos, filtros laterales/superiores y paginación.
- Página `/producto/[slug]` con galería de imágenes, selector de variante, precio y botón "Agregar al carrito".

### `apps/admin`
- Tabla de categorías con acciones CRUD.
- Tabla de productos con filtros, paginación y acciones.
- Formulario de producto con sección de variantes.
- Tabla de variantes por producto.
- Upload de imágenes con preview.

## Validaciones

### Backend
- Slug único, formato slug válido.
- SKU único.
- Precios enteros positivos (centavos).
- `stockMode` válido según enum `StockMode`.
- `productionLeadTimeDays` >= 0.

### Frontend
- Mismas validaciones con Zod.
- SKU autogenerado sugerido si está vacío.

## Permisos
- Endpoints públicos de catálogo: abiertos.
- Endpoints `/admin/**`: requiere rol `Admin`.

## Estados de carga y error
- Loading skeleton en grid y detalle.
- Empty state si no hay productos.
- Error 404 si el slug no existe.
- Error de validación en formularios admin.

## Criterios de aceptación
- [x] Cliente puede listar y filtrar productos activos.
- [x] Cliente puede ver detalle de producto con variantes.
- [x] Admin puede CRUD de categorías, productos y variantes.
- [x] Slug y SKU únicos validados en backend.
- [x] Productos inactivos no aparecen en storefront.
- [x] Tests de integración para CRUD de productos.

## Testing mínimo
- Tests de servicio de catálogo (crear, listar, filtrar).
- Tests de integración para endpoints públicos y admin.
- Tests de repositorio de productos.
- Tests e2e: visitar catálogo y detalle de producto.

## Observaciones técnicas
- El listado debe evitar N+1 usando Prisma `include` apropiado.
- Las imágenes usarán el módulo de storage/R2 (spec separada).
- El precio final de una variante se calculará como `basePrice + priceAdjustment` si aplica.
