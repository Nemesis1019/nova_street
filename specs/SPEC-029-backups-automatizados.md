# Spec: Backups automatizados de base de datos

## Objetivo
Automatizar respaldos periódicos de PostgreSQL.

## Alcance
- Script `apps/api/src/scripts/backup-database.ts` que ejecuta `pg_dump` y guarda el archivo comprimido.
- Job recurrente de BullMQ (ver SPEC-026) que corre el backup diariamente.
- Configuración por variables de entorno: `BACKUP_DIR`, `DATABASE_URL`, `BACKUP_RETENTION_DAYS`.
- Limpieza de backups antiguos según retención.

## Fuera de alcance
- Subida de backups a S3/R2 (se puede agregar después).
- Restauración automatizada.

## Apps afectadas
- `apps/api`

## Roles
- Sistema (job programado).

## Dependencias
- `pg_dump` disponible en el entorno.
- Módulo de BullMQ configurado.

## Criterios de aceptación
- [ ] Script genera archivo `.sql.gz`.
- [ ] Job programado encola backup.
- [ ] Limpieza de backups antiguos funciona.
- [ ] Tests verifican el script con base de datos mock (opcional).

## Testing mínimo
- Unit test del servicio de backup con `pg_dump` mockeado.
