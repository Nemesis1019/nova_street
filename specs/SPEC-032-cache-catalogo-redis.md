# Spec: Cache de catálogo con Redis

## Objetivo
Reducir carga en PostgreSQL y mejorar tiempos de respuesta cacheando endpoints de catálogo público en Redis.

## Alcance
- Configurar `CacheModule` global de NestJS con Redis (ioredis).
- Cachear respuestas de:
  - `GET /catalog/categories`
  - `GET /catalog/categories/:slug`
  - `GET /catalog/products`
  - `GET /catalog/products/:slug`
  - `GET /catalog/search-suggestions`
- Invalidar caché cuando el admin muta productos, categorías o assets relevantes.
- TTL por defecto: 5 minutos para listados y detalles; 1 minuto para suggestions.

## Fuera de alcance
- Cache de endpoints autenticados (cuenta, órdenes, admin).
- Caché distribuida de sesiones.

## API
Sin cambios de contrato; solo mejora de performance.

## Testing
- Verificar que segundas llamadas devuelven respuesta sin consultar Prisma (mock/spy opcional).
- Verificar invalidación al actualizar un producto desde admin.
