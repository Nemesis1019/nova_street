: # ADR-006: Estructura del monorepo

## Estado
Aceptada

## Contexto
El proyecto requiere mantener tres aplicaciones (storefront, admin, API) y paquetes compartidos de forma organizada. Se evaluó si usar repos separados o un monorepo.

## Decisión
Usar un monorepo con **pnpm workspaces + Turborepo** con la siguiente estructura:

```txt
apps/
  web/
  admin/
  api/
packages/
  shared/
  api-client/
  ui/
  eslint-config/
  tsconfig/
```

Cada app tiene su propio `package.json`, build y deploy independiente, pero comparte paquetes del workspace.

## Consecuencias

### Ventajas
- Tipos y código compartidos sin publicar paquetes privados.
- Builds y deploys independientes por app.
- Facilita la coherencia entre storefront y admin.

### Desventajas
- Mayor tamaño del repositorio.
- Requiere entender el grafo de dependencias de Turborepo.

## Alternativas consideradas
- Repositorios separados: descartado por sincronización costosa de tipos y API client.
- Monorepo con Nx: descartado por simplicidad; Turborepo es suficiente para este tamaño.
