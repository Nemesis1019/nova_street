# Specs del proyecto

Este directorio contiene las especificaciones de cada feature siguiendo el enfoque **Spec Driven Development** definido en `skills.md`.

## Estructura de una spec

Ver `TEMPLATE.md`.

## Specs actuales

| ID | Nombre | Apps afectadas | Estado |
|---|---|---|---|
| SPEC-001 | Autenticación y Usuarios | api, web, admin | Implementada |
| SPEC-002 | Catálogo de Productos | api, web, admin | Implementada |
| SPEC-003 | Carrito de Compras | api, web | Implementada |
| SPEC-004 | Checkout | api, web | Implementada |
| SPEC-005 | Modo de Stock Configurable | api, admin | Implementada |
| SPEC-006 | Theming y Configuración Transversal | api, web, admin | Propuesta |
| SPEC-007 | Administración de Cupones | api, admin | Propuesta |

## Proceso

1. Crear o actualizar la spec antes de escribir código de negocio.
2. Revisar reglas de negocio, modelo de datos, API y permisos.
3. Implementar backend (`apps/api`).
4. Si cambia el contrato de API, regenerar `@ecommerce/api-client`.
5. Implementar frontend(s) correspondiente(s).
6. Agregar tests mínimos.
7. Actualizar documentación y ADRs si aplica.
