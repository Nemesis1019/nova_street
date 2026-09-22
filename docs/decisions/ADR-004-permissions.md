# ADR-004: Permisos granulares y audit trail en el admin

## Estado
Aceptada

## Contexto
El panel administrativo maneja datos sensibles: productos, órdenes, clientes, cupones, configuración de la tienda, envíos y más. Inicialmente solo existían dos roles (`ADMIN` y `CUSTOMER`), donde cualquier usuario `ADMIN` tenía acceso total. Esto no escala cuando el equipo de operaciones crece y se necesita que distintas personas puedan realizar tareas específicas sin exponer todo el sistema.

También es necesario rastrear quién realiza cambios importantes y poder auditarlos, especialmente en productos, categorías, configuración de tienda, opciones de envío y permisos de usuarios.

## Decisión
Implementar un sistema de permisos granular basado en acciones, complementado por un audit trail con valores `before`/`after`.

### Permisos
- Cada acción administrativa expone un permiso del enum `Permission` (por ejemplo `products:read`, `orders:write`, `store_config:write`).
- Los permisos se asignan a dos niveles:
  1. **Rol**: el modelo `Role` tiene un array `permissions`. El seed asigna todos los permisos al rol `ADMIN`.
  2. **Usuario**: el modelo `User` también tiene un array `permissions` que se combina con los de su rol.
- `RolesGuard` verifica `@RequirePermission(...)` y sigue respetando `@Roles('ADMIN')`. El rol `ADMIN` tiene acceso implícito a todo.
- `JwtStrategy` lee el rol y los permisos directos del usuario en cada request, por lo que los cambios se aplican inmediatamente sin requerir nuevo login.

### Audit trail
- `AuditService.log` guarda `userId`, `action`, `entity`, `entityId`, `before` y `after`.
- Se loguean cambios relevantes en:
  - Productos, categorías, variantes e imágenes.
  - Opciones de envío.
  - Configuración de la tienda.
  - Roles y permisos.
  - Suspensiones, cambios de rol y permisos directos de usuarios.
- El endpoint `GET /admin/audit-logs` permite filtrar por entidad, acción, usuario y rango de fechas.

## Consecuencias

### Ventajas
- Se puede crear personal de operaciones con acceso mínimo necesario (principio de menor privilegio).
- Un usuario puede recibir permisos específicos sin necesidad de crear un rol nuevo.
- El historial de cambios facilita la depuración, cumplimiento y responsabilidad.
- La combinación rol + permisos directos permite modelar tanto roles genéricos como excepciones puntuales.

### Desventajas
- Mayor complejidad en la gestión de acceso y en la UI de administración.
- Los permisos deben mantenerse alineados cada vez que se agrega un nuevo endpoint admin.
- El audit trail puede crecer rápido; eventualmente será necesario rotar o archivar logs antiguos.

## Alternativas consideradas
- Roles fijos ampliados (`EDITOR`, `SUPPORT`, `FINANCE`): descartado porque no cubría todas las combinaciones de acceso que el negocio podría necesitar.
- Permisos solo a nivel de rol: descartado porque no permitía dar un permiso puntual a un usuario sin afectar a todo su rol.
- Audit trail solo con `action` y `entityId`: descartado porque no permitía reconstruir qué cambió exactamente.
