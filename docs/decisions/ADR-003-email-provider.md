# ADR-003: Proveedor de envío de emails

## Estado
Aceptada

## Contexto
La plataforma envía emails transaccionales (bienvenida, verificación, órdenes, producción, envíos). Se quiere que el proveedor de email sea configurable sin cambiar código, empezando con SMTP genérico y con la intención de migrar a Resend en producción.

## Decisión
Usar una abstracción `EmailProvider` con dos implementaciones iniciales:

1. **`SmtpEmailProvider`**: usa Nodemailer y soporta cualquier servidor SMTP (Mailgun, Gmail, etc.).
2. **`ResendEmailProvider`**: usa la API HTTP de Resend (`https://api.resend.com/emails`).

- `apps/api/src/email/providers/email-provider.interface.ts` define el contrato `send(message)`.
- `EmailService` construye los mensajes con branding de la tienda y delega el envío al proveedor activo.
- El proveedor activo se selecciona leyendo `StoreConfig.emailProvider`. El fallback es `smtp`.
- Si faltan credenciales, ambos proveedores loguean el mensaje en lugar de enviarlo, evitando errores en desarrollo.

## Consecuencias

### Ventajas
- Cambiar de proveedor de email es una configuración en el admin, sin deploy.
- Fácil agregar nuevos proveedores (SendGrid, AWS SES, etc.) implementando la interfaz.
- El servicio de email permanece agnóstico al transporte.

### Desventajas
- Las credenciales siguen en variables de entorno; `StoreConfig` solo guarda la selección, no los secretos.
- Resend requiere `RESEND_API_KEY` y un `RESEND_FROM` verificado.

## Alternativas consideradas
- Usar solo SMTP con credenciales de Resend (Resend soporta SMTP): descartado porque la API HTTP de Resend ofrece mejor trazabilidad y manejo de errores.
- Guardar credenciales en base de datos: descartado por seguridad.
