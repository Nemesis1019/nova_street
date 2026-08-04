# Spec: Tests de permisos en backend

## Objetivo
Verificar que los endpoints de admin no sean accesibles por clientes y viceversa.

## Alcance
- Usuario autenticado como CUSTOMER no puede acceder a endpoints de admin.
- Usuario no autenticado no puede acceder a endpoints protegidos.
- Admin puede acceder a endpoints de admin.

## Testing
- Archivo `test/permissions.e2e-spec.ts`.
- Probar al menos `/admin/users`, `/admin/orders`, `/admin/catalog/products`, `/admin/production`.
