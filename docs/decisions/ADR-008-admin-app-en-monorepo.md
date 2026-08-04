: # ADR-008: Panel administrativo como app independiente dentro del monorepo

## Estado
Aceptada

## Contexto
El panel administrativo podría vivir en el mismo repo que la tienda o en un repo separado. Se requiere independencia de deploy pero compartir tipos y lógica.

## Decisión
Crear `apps/admin` como aplicación Next.js independiente dentro del mismo monorepo.

- Tiene su propio `package.json`, pipeline de build y dominio (`admin.midominio.com`).
- Consume `@ecommerce/shared` y `@ecommerce/api-client` como paquetes del workspace.
- No accede a base de datos; usa la misma API que `apps/web`.

## Consecuencias

### Ventajas
- Deploy independiente de la tienda.
- Reutilización de tipos y cliente API sin sincronización manual.
- Dependencias pesadas del admin no contaminan el bundle de la tienda.

### Desventajas
- Requiere configurar CORS explícito para el origen del admin.
- Cambios en paquetes compartidos pueden requerir rebuild de ambas apps.

## Alternativas consideradas
- Repo separado para admin: descartado por duplicación de tipos y costo de sincronización.
- Admin dentro de `apps/web`: descartado porque viola la regla de no mezclar funcionalidad administrativa en el storefront.
