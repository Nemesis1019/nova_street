# Spec: CDN para assets e imágenes

## Objetivo
Servir assets e imágenes a través de una URL de CDN cuando esté configurada.

## Alcance
- Variable de entorno `CDN_BASE_URL` opcional.
- En `StorageService`, si existe `CDN_BASE_URL`, construir URLs públicas usando esa base en lugar del endpoint del backend.
- Afecta a imágenes de producto, categoría y assets en general.

## Fuera de alcance
- Subida directa a CDN (se mantiene upload vía backend).
- Invalidación de caché de CDN.

## Apps afectadas
- `apps/api`
- `apps/web` (consumo de URLs ya tipado).

## Roles
- Público.

## Reglas de negocio
- Si `CDN_BASE_URL` no está seteada, se usa la URL actual del storage (R2/local).
- Las URLs deben ser absolutas.

## Criterios de aceptación
- [ ] URLs de assets usan CDN cuando está configurado.
- [ ] Sin CDN, comportamiento actual no cambia.
- [ ] Tests verifican generación de URL.

## Testing mínimo
- Unit test de `StorageService` con y sin CDN_BASE_URL.
