# Suscripciones SaaS

Cobro recurrente de la plataforma a cada cliente (tenant), separado de los pagos
de ecommerce de cada tienda.

## Modelo

La suscripción vive en la **BD maestra**, no en la BD de cada tenant:

- `Tenant.subscriptionStatus`: `TRIAL | ACTIVE | PAST_DUE | CANCELED | SUSPENDED`.
- `Tenant.subscriptionPaidUntil`: fecha hasta la que está pago.
- `Tenant.subscriptionSuspendedAt`: fecha de suspensión manual (si existe).
- `Tenant.subscriptionPlanId`: plan vigente.
- `Tenant.subscriptionLastPaymentAt`, `subscriptionLastPaymentAmount` y
  `subscriptionLastPaymentCurrency`: último pago confirmado.
- `SubscriptionPlan`: catálogo de planes (slug, nombre, precio, moneda, período,
  features y orden). La migración inicial crea **Starter**, **Pro** y **Business**.
- `SubscriptionPayment`: intentos de pago (`PENDING | PAID | FAILED`), referencia
  única enviada a Bold, monto, moneda, período, plan snapshoteado, transacción y
  metadata.

Un tenant tiene **un plan activo a la vez**; puede cambiarlo cuando quiera. Cada
pago guarda el snapshot del plan para que un cambio posterior no altere el
historial.

El estado efectivo se calcula en lectura:

- `CANCELED` → cancelada.
- `SUSPENDED` manual → suspendida.
- `paidUntil > ahora` → `ACTIVE`.
- `TRIAL` sin fecha → `TRIAL`.
- vencido dentro de `SUBSCRIPTION_GRACE_DAYS` → `PAST_DUE`.
- vencido después de la gracia → `SUSPENDED` (automática).

`paid` sólo es `true` cuando el estado efectivo es `ACTIVE`. Un pago aprobado
extiende desde la fecha de vencimiento actual si todavía es futura, o desde
`ahora` si ya venció; nunca acorta el período ya pagado. Además, aplica el plan
snapshoteado en el pago y limpia la suspensión.

## Planes y credenciales

Los planes viven en la tabla maestra `subscription_plans`; no están hardcodeados
por cliente. La migración inicial siembra:

| Plan | Precio | Período |
|---|---:|---|
| Starter | 49.000 COP | 30 días |
| Pro | 99.000 COP | 30 días |
| Business | 199.000 COP | 30 días |

El admin de tienda puede elegir el plan que va a pagar. El superadmin puede
reasignar el plan desde el modal de suscripción de `/clients` (aplica al próximo
pago).

Configuración por entorno de la API:

```env
# Días de gracia antes de suspender el storefront.
SUBSCRIPTION_GRACE_DAYS=3

# Cuenta Bold de la PLATAFORMA, no la de cada tienda.
SUBSCRIPTION_BOLD_API_KEY=...
SUBSCRIPTION_BOLD_SECRET_KEY=...
SUBSCRIPTION_BOLD_SANDBOX=false

# URL pública del admin, para volver después del checkout.
ADMIN_URL=https://admin.nova.app
```

Si `SUBSCRIPTION_BOLD_*` falta, se usan `BOLD_*` como fallback. Se requieren API
key y secret (salvo sandbox) para mostrar el botón; si falta alguno, la UI avisa
que Bold no está configurado y no genera intentos de pago. En producción el
webhook se rechaza sin secret: de lo contrario cualquiera con una referencia
podría marcar una suscripción como pagada.

> No se usan las credenciales de Bold de `StoreConfig` de un tenant: esas
> pertenecen a la tienda, no a la plataforma.

## Flujo de pago

1. El admin de tienda entra a **Configuración → Suscripción**.
2. La API devuelve el plan actual, los planes disponibles, estado, vencimiento e
   historial.
3. El admin elige un plan; si no está pago, aparece el **botón de Bold** embebido
   para ese plan.
4. `POST /admin/subscription/checkout` con `{ planId }` crea (o reutiliza durante
   30 minutos) un `SubscriptionPayment` pendiente con el snapshot del plan y
   devuelve la config del botón con la firma SHA256 calculada en el servidor. El
   secreto nunca llega al navegador.
5. Bold procesa el pago y vuelve a `ADMIN_URL/subscription?subscription=return`.
6. Bold llama al webhook `POST /subscriptions/webhook/bold`.
7. El webhook valida la firma HMAC, busca la referencia, marca el intento como
   `PAID`, aplica el plan y activa/renueva la suscripción en la maestra.
8. La pantalla hace polling mientras se vuelve del checkout y muestra la fecha
   actualizada.

El redirect del navegador **no** activa la suscripción. Sólo el webhook firmado
lo hace.

### Configurar el webhook en Bold

URL:

```
https://<api-publica>/subscriptions/webhook/bold
```

No lleva `?tenant=`: la suscripción es de plataforma y no depende de la BD de un
cliente. El middleware de tenant excluye explícitamente esta ruta.

## Endpoints

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| `GET` | `/admin/subscription` | Admin con `store_config:read` | Estado, planes, vencimiento e historial |
| `POST` | `/admin/subscription/checkout` | Admin con `store_config:write` | Config efímera del botón Bold (`{ planId }`) |
| `POST` | `/subscriptions/webhook/bold` | Público, firma Bold | Confirmar pago |
| `GET` | `/platform/tenants` | Plataforma | Incluye el resumen `subscription` de cada cliente |
| `GET` | `/platform/tenants/:id/subscription` | Plataforma | Detalle e historial de pagos |
| `PATCH` | `/platform/tenants/:id/subscription` | Plataforma | Asignar plan (`{ planId }`) |
| `POST` | `/platform/tenants/:id/subscription/suspend` | Plataforma | Suspensión manual |
| `POST` | `/platform/tenants/:id/subscription/reactivate` | Plataforma | Reactivar suspensión manual |

## Panel de plataforma

`/clients` muestra, por cada cliente:

- plan vigente;
- estado de suscripción (`Al día`, `Prueba`, `Vencida`, `Cancelada`, `Suspendida`);
- si está pago;
- fecha de vencimiento (`Pagado hasta`);
- último pago (fecha y monto).

El botón de suscripción abre un modal con el historial completo, selector de plan
y acciones de suspensión/reactivación. El superadmin no necesita impersonar al
cliente para ver esta información.

## Panel del cliente

La página `/subscription` está disponible en el sidebar para todos los admins de
tienda y muestra:

- selector entre planes disponibles;
- estado y fecha de vencimiento;
- monto y período del plan seleccionado;
- botón de pago Bold;
- botón de renovación anticipada cuando ya está al día;
- historial de intentos, con el plan de cada pago;
- aviso de confirmación al volver de Bold.

El dashboard muestra un banner con acceso directo cuando la suscripción está
pendiente, vencida o suspendida.

## Suspensión y reactivación

- **Automática**: al vencer `subscriptionPaidUntil`, hay `SUBSCRIPTION_GRACE_DAYS`
  de gracia (`PAST_DUE`). Después de la gracia, el estado efectivo pasa a
  `SUSPENDED` y el storefront responde `503`.
- **Manual**: el superadmin puede suspender una suscripción desde el modal. Se
  guarda `subscriptionSuspendedAt`.
- **Storefront**: se bloquean las peticiones `X-Client: store`; el admin conserva
  acceso (`X-Client: admin`) para entrar a `/subscription` y pagar.
- **Reactivación**: pagar con Bold reactiva automáticamente y limpia la
  suspensión. La reactivación manual sólo limpia una suspensión manual; una
  suspensión por impago requiere pago.
- El bloqueo comercial no cambia `Tenant.status`; la suspensión operativa manual
  de la plataforma sigue siendo independiente.

## Pagos pendientes y fallidos

- El botón reutiliza un intento `PENDING` de los últimos 30 minutos con el mismo
  monto y moneda para evitar duplicados por refresh.
- `SALE_REJECTED` marca el intento como `FAILED`; no modifica el vencimiento ni
  el último pago exitoso.
- Los webhooks son idempotentes: un `SALE_APPROVED` repetido no extiende dos
  veces el período.
- Las referencias desconocidas se registran en el log y responden `200` para que
  Bold no reintente indefinidamente.

## Verificación

```bash
pnpm --filter @ecommerce/api test
pnpm --filter @ecommerce/api typecheck
pnpm --filter @ecommerce/admin typecheck
```

Tests unitarios cubren:

- cálculo de estado efectivo, gracia y suspensión automática;
- extensión de fechas;
- hash de integridad del botón;
- firma HMAC del webhook;
- checkout con plan y firma;
- pago aprobado, rechazado, idempotencia y firma inválida.

También se verificó manualmente contra la BD maestra: catálogo de planes, cambio
de plan, suspensión manual, bloqueo del storefront, acceso del admin, suspensión
automática por vencimiento y reactivación.

## Migración

- `20261024230000_subscription_billing`: tabla de pagos y estado inicial.
- `20261025120000_subscription_plans`: enum `SUSPENDED`, catálogo de planes,
  plan por tenant y snapshot del plan en pagos.

Aplicar:

```bash
cd apps/api
doppler run -- pnpm exec prisma migrate deploy --schema prisma/master/schema.prisma
doppler run -- pnpm exec prisma generate --schema prisma/master/schema.prisma
```

## Alcance actual

Incluye catálogo de múltiples planes, un plan activo por tenant, cambio de plan,
pago manual/renovación con Bold, historial para cliente y superadmin, suspensión
automática por impago con gracia y reactivación al pagar. No incluye todavía:
facturas/PDF, prorrateo, cobro automático con tarjeta guardada, recordatorios por
email ni múltiples suscripciones concurrentes por tenant.
