# Spec: Plantillas de email configurables + recuperación de contraseña

## Objetivo
Permitir que los emails transaccionales (registro, verificación, recuperación de contraseña, confirmación de compra, etc.) sean editables desde el admin, sin tocar código, manteniendo los proveedores de email intercambiables. Además, implementar el flujo completo de recuperación de contraseña.

## Alcance
- Modelo `EmailTemplate` en Prisma (override por `key` sobre defaults en código).
- Motor de plantillas con variables `{{variable}}` (escapadas) y `{{{variable}}}` (HTML crudo).
- Migración de los 11 emails transaccionales existentes al sistema de plantillas.
- Flujo completo de recuperación de contraseña: `POST /auth/forgot-password` + `POST /auth/reset-password` + modelo `PasswordResetToken` + páginas `/forgot-password` y `/reset-password` en el storefront.
- CRUD admin de plantillas en `/admin/email-templates` + UI en `/email-templates` del admin con edición de asunto/HTML, lista de variables, vista previa con datos de ejemplo y restablecer a default.
- Selección de proveedor de email en caliente: `EmailProviderResolver` lee `StoreConfig.emailProvider` en cada envío (caché 60s), sin reiniciar la API.
- Seed `seed:email-templates` que crea las plantillas por defecto sin sobrescribir personalizaciones.

## Fuera de alcance
- Editor visual/WYSIWYG de plantillas (se edita HTML crudo).
- Plantillas con claves nuevas arbitrarias (las claves están fijadas por los procesos del sistema).
- Layout/encabezado/pie editable (el `wrapLayout` con branding queda en código).
- Versionado/historial de cambios de plantillas.

## Apps afectadas
- `apps/api`: modelos, motor de plantillas, endpoints auth y admin.
- `apps/admin`: página `/email-templates`.
- `apps/web`: páginas `/forgot-password` y `/reset-password`, link en `/login`.

## Roles involucrados
- Público: forgot/reset password.
- ADMIN: gestión de plantillas (permisos `email_templates:read` / `email_templates:write`).

## Reglas de negocio
- Si una plantilla no tiene override en DB, o está deshabilitada, se usa el default en código.
- `forgot-password` siempre responde 200 (no revela si el email existe) e ignora usuarios invitados.
- El token de reset es aleatorio (64 hex), se persiste hasheado (SHA-256), expira en 60 minutos, es de un solo uso, y al usarse revoca todos los refresh tokens del usuario.
- Solicitar un nuevo token invalida los anteriores sin usar.
- El cambio de proveedor de email desde `/store-config` toma efecto en máximo 60 segundos, sin reinicio.

## Modelo de datos
```prisma
model EmailTemplate {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique
  name        String
  description String?
  subject     String
  html        String
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PasswordResetToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

## API
- `POST /auth/forgot-password` — body `{ email }` → 200 `{ message }` (siempre).
- `POST /auth/reset-password` — body `{ token, password }` → 204; 401 si el token es inválido/expirado.
- `GET /admin/email-templates` — lista con estado, `isCustomized` y variables disponibles.
- `GET /admin/email-templates/:key` — detalle con html efectivo y defaults.
- `PUT /admin/email-templates/:key` — upsert `{ name?, subject, html, enabled? }`.
- `POST /admin/email-templates/:key/reset` — elimina el override (vuelve al default).
- `POST /admin/email-templates/:key/preview` — body `{ subject?, html? }` → renderiza con datos de ejemplo.

## Claves de plantilla
`welcome`, `email-verification`, `password-reset`, `newsletter-confirmation`, `order-created`, `order-status-update`, `payment-confirmed`, `custom-design-approved`, `custom-design-rejected`, `production-status-update`, `shipment-update`.

## Validaciones
- `reset-password`: password mínimo 8 caracteres, al menos una letra y un número (igual que registro).
- `upsert`: `subject` (máx 300) y `html` requeridos; la `key` debe existir en el catálogo de defaults.
- Los valores de variables se escapan en HTML salvo bloques crudos (`{{{...}}}`) generados por el servidor.

## Estados de carga y error
- Admin: loaders en tabla y modal, notificaciones de éxito/error, preview en modal con iframe.
- Web: forgot-password muestra estado "enviado" genérico; reset-password valida token presente en query y confirma contraseñas iguales.
