: # ADR-009: Generación del cliente API desde OpenAPI

## Estado
Aceptada

## Contexto
Ambas apps frontend necesitan consumir la API de forma tipada. Se busca evitar duplicar DTOs manualmente.

## Decisión
- El backend (`apps/api`) expone contrato OpenAPI/Swagger automáticamente.
- `@ecommerce/api-client` se genera a partir de ese contrato usando `openapi-typescript`.
- El paquete es un workspace package, no un artefacto externo.
- Cada vez que cambia el contrato se regenera el cliente y ambas apps frontend lo consumen.

## Consecuencias

### Ventajas
- Tipos siempre sincronizados con el backend.
- No hay duplicación de DTOs.
- Fácil de integrar en CI.

### Desventajas
- Requiere correr/generar el backend para obtener el contrato.
- Cambios en el contrato pueden romper builds de frontend hasta regenerar.

## Alternativas consideradas
- Escribir cliente manualmente: descartado por riesgo de desincronización.
- Usar tRPC: descartado porque skills.md especifica REST/OpenAPI.
