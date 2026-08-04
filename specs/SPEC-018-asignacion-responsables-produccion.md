# Spec: Asignar responsable a ítems de producción

## Objetivo
Permitir que el equipo de producción asigne un responsable a cada ítem de la cola de producción desde el panel admin.

## Alcance
- Agregar `assignedToId` en `OrderItem`.
- Endpoint `PATCH /admin/production/items/:id/assign` para asignar/desasignar responsable.
- Listado de producción incluye responsable asignado.
- Filtro por responsable en `/admin/production`.
- UI admin: select de responsables en la tabla de producción.

## Fuera de alcance
- Notificaciones automáticas al responsable asignado.
- Límite de ítems por responsable.
- Dashboard de carga de trabajo por responsable.

## Apps afectadas
- `apps/api`
- `apps/admin`

## Roles involucrados
- Admin (asigna responsables).

## Casos de uso
1. Admin abre `/production`.
2. Admin selecciona un usuario responsable en la fila de un ítem.
3. El ítem queda asignado y se puede filtrar por ese usuario.
4. Admin puede dejar el responsable vacío para desasignar.

## Reglas de negocio
- Solo usuarios con rol `ADMIN` pueden asignar.
- El responsable debe ser un usuario existente (cualquier rol).
- `assignedToId` es opcional; `null` desasigna.
- La asignación se audita.
- El listado puede filtrarse por `assignedToId`.

## Modelo de datos
`OrderItem` se extiende con:
- `assignedToId String? @db.Uuid`
- `assignedTo User? @relation("AssignedProductionItems", fields: [assignedToId], references: [id], onDelete: SetNull)`

## API
### `PATCH /admin/production/items/:id/assign`
Body:
```json
{
  "assignedToId": "uuid" | null
}
```

Response: `ProductionItemResponseDto` con `assignedTo`.

### `GET /admin/production`
Ahora acepta query param `assignedToId` para filtrar.

## UI / UX
- Tabla de producción: nueva columna "Responsable".
- Select por fila con lista de usuarios (obtenida de `/admin/users`).
- Filtro superior para ver ítems "Sin asignar" o de un responsable específico.

## Validaciones
- Backend: usuario asignado existe.
- Backend: ítem de producción existe.

## Permisos
- Solo `ADMIN`.

## Estados de carga y error
- Loading al guardar asignación.
- Error si el usuario no existe.

## Criterios de aceptación
- [ ] `assignedToId` agregado al modelo y migración creada.
- [ ] Endpoint de asignación funciona y audita.
- [ ] Listado filtra por responsable.
- [ ] UI admin permite asignar desde la tabla.
- [ ] `api-client` regenerado y compila.
- [ ] Tests e2e verifican asignación y filtro.

## Testing mínimo
- E2E: asignar responsable a un ítem.
- E2E: filtrar por responsable.
- E2E: desasignar responsable.

## Observaciones técnicas
- Se reutiliza `AuditService` para registrar cambios de asignación.
- El select de responsables consume `/admin/users` existente.
