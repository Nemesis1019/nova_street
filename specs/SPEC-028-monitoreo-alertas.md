# Spec: Monitoreo y alertas

## Objetivo
Tener visibilidad básica del estado de salud del sistema y registrar errores críticos.

## Alcance
- Endpoint `/health` que verifica conectividad con base de datos.
- Endpoint `/health/db` detallado.
- Filtro de excepciones global que loguea errores no manejados (con posibilidad de enviar alertas).
- Métricas básicas: uptime, timestamp.

## Fuera de alcance
- Integración con servicios externos (Sentry, PagerDuty).
- Dashboard de monitoreo en tiempo real.

## Apps afectadas
- `apps/api`

## Roles
- Público/ADMIN para health checks.

## API
### `GET /health`
Response: `{ status: 'ok', uptime: 123, timestamp: '...' }`.

### `GET /health/db`
Response: `{ status: 'ok', db: 'connected' }` o `503` si falla.

## Criterios de aceptación
- [ ] Endpoints de salud implementados.
- [ ] Health check de DB funciona.
- [ ] Logs de errores no manejados.
- [ ] Tests verifican health ok y health degradado.

## Testing mínimo
- E2E: `/health` y `/health/db` responden 200.
