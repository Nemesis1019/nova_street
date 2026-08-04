# Spec: Jobs con BullMQ

## Objetivo
Introducir una infraestructura de colas para tareas en segundo plano.

## Alcance
- Configurar BullMQ con Redis (ya disponible en docker-compose).
- Módulo `QueuesModule` con inyección de `Queue`.
- Jobs de ejemplo:
  - `sendBulkEmail`: enviar emails masivos.
  - `generateDesignPreview`: generar preview de diseño personalizado.
  - `reconcilePayments`: reconciliar pagos pendientes.
- Endpoint admin para encolar jobs.
- Worker básico por job.

## Fuera de alcance
- Dashboard avanzado de colas (Bull Board se puede agregar luego).
- Retry policies complejas (se usa default).

## Apps afectadas
- `apps/api`

## Roles
- ADMIN (para encolar), sistema (workers).

## Dependencias
- Instalar `@nestjs/bullmq`, `bullmq`.
- Actualizar `docker-compose.yml` si Redis no está expuesto.

## API
### `POST /admin/queues/jobs`
Body: `{ type: 'sendBulkEmail' | 'generateDesignPreview' | 'reconcilePayments', payload: {...} }`.
Response: `{ jobId: '...' }`.

## Criterios de aceptación
- [ ] BullMQ conecta a Redis.
- [ ] Se puede encolar y procesar un job.
- [ ] Los jobs de ejemplo ejecutan su lógica.
- [ ] Tests verifican encolado (mock de Queue).

## Testing mínimo
- Unit test del servicio de queues con Queue mock.
- E2E: encolar job y verificar respuesta.
