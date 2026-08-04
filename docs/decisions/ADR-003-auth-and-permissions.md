: # ADR-003: Autenticación y autorización

## Estado
Aceptada

## Contexto
Se requiere autenticar clientes y administradores, mantener sesiones seguras y controlar el acceso a funciones administrativas.

## Decisión
- Autenticación con **JWT**:
  - Access token de corta duración (15 min).
  - Refresh token de larga duración (7 días), almacenado hasheado en base de datos para revocación.
- Passwords hasheados con **Argon2**.
- Autorización basada en roles iniciales: `Customer` y `Admin`.
- En el futuro se evaluará CASL o sistema granular de permisos.

## Consecuencias

### Ventajas
- Stateless en access token, escalable horizontalmente.
- Refresh tokens revocables en logout.
- Argon2 es seguro contra ataques de fuerza bruta.

### Desventajas
- Requiere manejo de rotación de tokens en frontend.
- Roles simples pueden no ser suficientes para permisos finos en el futuro.

## Alternativas consideradas
- Sesiones en Redis: descartado inicialmente por simplicidad, pero se puede migrar más adelante.
- OAuth propio: no aplica; se considerará OAuth social en el futuro.
