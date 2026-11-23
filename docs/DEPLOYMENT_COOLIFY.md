# Despliegue de NÖVA en Hostinger VPS con Docker + Coolify

Guía para el primer despliegue de NÖVA en un VPS de Hostinger, usando Docker y Coolify.

> **Alcance de esta primera versión:** un solo tenant (`nova`) con NÖVA.
> La infraestructura queda preparada para más clientes, pero no abras el alta
> self-service ni los dominios propios hasta completar los puntos de "SaaS
> multi-cliente" del final.

La plataforma usa este esquema de dominios:

- Storefront de cada cliente: `<cliente>.nova.com`
- Admin fijo: `admin.nova.com`
- API fija: `api.nova.com`
- CDN de medios: `cdn.nova.com`

`<cliente>` debe ser exactamente el slug del tenant. El tenant actual tiene el slug `nova`, así que su storefront queda en:

```text
https://nova.nova.com
```

Los subdominios `admin`, `api`, `cdn` y `www` quedan reservados y no pueden usarse como slug de un cliente.

---

## 0. Antes de tocar el servidor

### 0.1 Cerrar una versión reproducible

El repositorio tiene cambios sin commit. No despliegues desde el working tree.

```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck lint test build
git status
git add .
git commit -m "chore: preparar primer despliegue a producción"
git tag -a v1.0.0-prod -m "Primer despliegue NÖVA"
git push origin main --tags
```

Idealmente el deploy de Coolify sale desde ese tag o desde un commit concreto, no desde cambios locales.

### 0.2 Verificar que no se cuelen datos de demo

En producción no ejecutes:

- `seed:demo`
- `seed:visual-demo`
- `seed:demo-cafe`

Si NÖVA ya tiene datos reales, la estrategia es restaurar un dump del tenant NÖVA. Si empiezas de cero, crea el catálogo y la configuración desde el admin, sin cargar el dataset visual de demo.

### 0.3 Artefactos incluidos

Este repositorio ya tiene:

- `deploy/Dockerfile.api`
- `deploy/Dockerfile.web`
- `deploy/Dockerfile.admin`
- `.dockerignore` en la raíz

Los tres Dockerfiles usan la raíz del monorepo como contexto de build. Ya se probaron localmente: API, web y admin construyen; web y admin arrancan y responden `200`.

No uses el `docker-compose.yml` de la raíz en producción: ese archivo es de desarrollo y expone PostgreSQL/Redis con credenciales locales. En producción, Coolify administra esos servicios.

---

## 1. Arquitectura recomendada

```text
Internet
   │
   ▼
Coolify / Traefik (HTTPS)
   ├── <cliente>.nova.com → contenedor web   :3000
   ├── admin.nova.com     → contenedor admin :3001
   └── api.nova.com       → contenedor API   :4000
                                      │
                    ┌─────────────────┼──────────────────┐
                    ▼                 ▼                  ▼
              PostgreSQL          Redis              Cloudflare R2
          nova_master + tenant_nova   caché/colas      imágenes/videos
```

La app web atiende **todos los subdominios de tenant** con un router wildcard de Traefik. Admin y API tienen routers exactos y prioritarios, por eso usan subdominios fijos.

Todo puede vivir en el mismo VPS al principio. Si el tráfico o los builds crecen, separa el build server y la base de datos.

### Servidor recomendado

Para un primer producción con tres apps, PostgreSQL, Redis y builds de Next.js en el mismo servidor:

- Hostinger **KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe) como mínimo; **KVM 4** (4 vCPU, 16 GB RAM) es la opción recomendada para builds.
- Ubuntu **24.04 LTS**, instalación limpia.
- Un dominio `nova.com` con DNS en Hostinger.
- Backups automáticos de Hostinger activados, si el plan lo permite; de lo contrario, snapshot manual antes de cada cambio grande.

Next.js y NestJS pueden consumir bastante memoria durante el build. Con 4 GB puede funcionar, pero es más probable que el build quede sin memoria. Si eliges un plan de 4 GB, agrega swap y no ejecutes los tres builds al mismo tiempo.

Al crear el VPS en Hostinger:

- Elige ubicación cercana a tus clientes.
- Usa una clave SSH, no contraseña.
- No elijas una plantilla que ya ocupe los puertos `80` y `443` (por ejemplo, otro panel).
- Si Hostinger ofrece la plantilla **Ubuntu 24.04 with Coolify**, puedes usarla y saltar la instalación, pero revisa que el panel quede en el puerto `3000` (template de Hostinger) en lugar de `8000` (instalador oficial). No ejecutes el instalador dos veces.

---

## 2. Preparar el VPS

Conéctate por SSH como root o como un usuario con sudo:

```bash
ssh root@IP_DEL_VPS
```

Actualiza el sistema:

```bash
apt update && apt upgrade -y
```

### 2.1 Firewall

En **Hostinger hPanel → VPS → Firewall**, permite:

- `22/tcp` para SSH, idealmente restringido a tu IP.
- `80/tcp` y `443/tcp` para el proxy y los certificados.
- El puerto del panel de Coolify solo durante la configuración:
  - `8000/tcp` si usas el instalador oficial.
  - `3000/tcp` si usas la plantilla de Hostinger con Coolify preinstalado.

Dentro del VPS, refuerza con `ufw`:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

El panel de Coolify no debe quedar abierto permanentemente. Restríngelo a tu IP o ciérralo y accede por túnel SSH:

```bash
# Instalador oficial
ssh -L 8000:localhost:8000 root@IP_DEL_VPS

# Plantilla de Hostinger, si el panel quedó en 3000
ssh -L 3000:localhost:3000 root@IP_DEL_VPS
```

### 2.2 Swap opcional

Si eliges un servidor de 4 GB:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

No reemplaza la memoria real, pero evita que un build de Next.js tumbe el servidor.

### 2.3 Instalar Coolify

Si elegiste Ubuntu limpio, usa el instalador oficial:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Si elegiste la plantilla **Ubuntu 24.04 with Coolify** de Hostinger, no ejecutes ese comando: la plataforma ya viene instalada. El panel suele abrir en `http://IP_DEL_VPS:3000`.

En cualquiera de los dos casos, abre el panel, crea la cuenta de administrador inmediatamente y guarda:

```text
/data/coolify/source/.env
```

Ese archivo contiene secretos de la instalación. Sin él, una restauración de Coolify puede ser imposible. Guárdalo en un gestor de contraseñas o en un almacenamiento seguro, nunca en el repositorio.

Recomendaciones:

- Activa 2FA en la cuenta de Coolify.
- Configura notificaciones de deploy/errores por email o Discord/Slack.
- Después de crear tu cuenta, restringe o cierra el puerto del panel (`8000` u `3000`).
- No uses la versión nightly para producción.
- En **Servers → tu servidor → General**, configura el **Wildcard Domain** como `https://nova.com`. No crea DNS por sí solo; es para que Coolify sugiera subdominios.

---

## 3. DNS en Hostinger

Entra a **hPanel → Dominios → nova.com → DNS / Nameservers** y crea:

| Tipo | Nombre | Valor | Uso |
|---|---|---|---|
| A | `@` | IP del VPS | Apex opcional |
| A | `*` | IP del VPS | Todos los `<cliente>.nova.com` |
| A | `nova` | IP del VPS | Tenant actual NÖVA |
| A | `admin` | IP del VPS | Admin fijo |
| A | `api` | IP del VPS | API fija |
| CNAME | `cdn` | Destino público de R2 | Imágenes y videos |

Notas:

- El registro wildcard `*` **no cubre el apex** `nova.com`; por eso existe el registro `@`.
- El wildcard DNS no crea una ruta para el apex. Si quieres que `nova.com` muestre una landing o redirija, crea una app/redirect o un router específico; no lo resuelve el wildcard de tenants.
- Los registros `admin`, `api` y `cdn` son explícitos y tienen prioridad sobre el wildcard. No los dejes solo al `*`.
- Reserva los slugs `admin`, `api`, `cdn`, `www`, `mail` y `ftp`. Si un cliente usa uno de esos slugs, su subdominio chocaría con un servicio fijo. El backend actual no bloquea esos slugs automáticamente; contrólalo desde el alta de clientes.
- Usa TTL bajo (300–600 s) mientras haces las pruebas iniciales.
- No actives un proxy delante de `api.nova.com` sin comprobar que los webhooks de Bold y el SSE del admin funcionan. Si usas Cloudflare, el SSL debe quedar en **Full (strict)**.
- El dominio público de R2 `cdn.nova.com` se configura en Cloudflare R2; Hostinger solo debe tener el CNAME correspondiente.

### 3.1 Certificado wildcard para `*.nova.com`

Un certificado normal de Let's Encrypt con validación HTTP no cubre `*.nova.com`. Para todos los subdominios de clientes necesitas un certificado wildcard con validación DNS-01.

Coolify usa Traefik. En **Servers → tu servidor → Proxy → Configuration**, edita la configuración del proxy:

1. Agrega el token de API de Hostinger:

```yaml
services:
  traefik:
    environment:
      - HOSTINGER_API_TOKEN=<token-de-hostinger>
```

2. Cambia el challenge HTTP por DNS-01:

```yaml
command:
  # Quita estas dos líneas:
  # - '--certificatesresolvers.letsencrypt.acme.httpchallenge=true'
  # - '--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=http'

  # Agrega estas:
  - '--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=hostinger'
  - '--certificatesresolvers.letsencrypt.acme.dnschallenge.delaybeforecheck=0'
  - '--certificatesresolvers.letsencrypt.acme.storage=/traefik/acme.json'
```

3. Guarda y reinicia el proxy.

Crea el token en Hostinger con permisos de DNS para `nova.com`. No uses un token de cuenta completa si puedes limitarlo.

El proveedor `hostinger` requiere una versión reciente de Traefik/Lego. Coolify actual usa Traefik v3.7; si el proxy no lo reconoce, actualiza Coolify/Traefik antes de continuar.

Después, en **Servers → tu servidor → Proxy → Dynamic Configurations**, crea `wildcard-nova-com.yaml`:

```yaml
http:
  routers:
    wildcard-nova-com:
      rule: 'HostRegexp(`[a-z0-9-]+\.nova\.com`)'
      entryPoints:
        - https
      priority: 1
      service: wildcard-placeholder
      tls:
        certResolver: letsencrypt
        domains:
          - main: nova.com
            sans:
              - '*.nova.com'

  services:
    wildcard-placeholder:
      loadBalancer:
        servers: []
```

Ese router de prioridad baja solo solicita el certificado. Los routers reales de las aplicaciones siguen atendiendo el tráfico.

Verifica el certificado:

```bash
echo | openssl s_client -connect api.nova.com:443 -servername api.nova.com 2>/dev/null \
  | openssl x509 -noout -issuer -ext subjectAltName
```

Debe mostrar un emisor de Let's Encrypt y un SAN con `DNS:*.nova.com` y `DNS:nova.com`.

Si el proveedor de DNS no es Hostinger, cambia el provider y las variables por las de tu proveedor. Traefik usa Lego para el challenge.

---

## 4. Crear la infraestructura en Coolify

Crea un proyecto llamado `nova` y un environment `production`.

### 4.1 PostgreSQL

1. En el proyecto, selecciona **New Resource → PostgreSQL**.
2. Elige PostgreSQL 16, que es la versión usada en desarrollo.
3. Nombre: `nova-postgres`.
4. Servidor/destino: el mismo VPS y la red interna de Coolify.
5. Base inicial: `nova_master`.
6. No actives acceso público al puerto `5432`.
7. Inicia la base y copia la **Postgres URL interna**.

Crea la base del tenant:

```bash
psql -U postgres -d postgres -c 'CREATE DATABASE "tenant_nova";'
```

Si el usuario generado no es `postgres`, usa el usuario que muestra Coolify. La API necesita un usuario con permiso de `CREATE DATABASE` para poder crear futuros tenants desde el panel de plataforma.

Tendrás dos URLs internas:

```text
postgresql://...@nova-postgres:5432/nova_master
postgresql://...@nova-postgres:5432/tenant_nova
```

No uses `localhost` ni el puerto público dentro de los contenedores. Usa el hostname interno que genera Coolify.

### 4.2 Redis

Crea **New Resource → Redis** en el mismo proyecto.

- No lo expongas públicamente.
- Copia la URL interna.
- Se usa para caché y para BullMQ.
- Si Redis no está disponible, la API puede arrancar, pero las colas y la caché no funcionarán correctamente.

### 4.3 Cloudflare R2

Crea dos buckets separados:

| Bucket | Uso | Público |
|---|---|---|
| `nova-media-prod` | Imágenes y videos | Sí, vía `cdn.nova.com` |
| `nova-db-backups` | Backups de PostgreSQL | No |

Crea un token de R2 con permisos de lectura/escritura solo sobre esos buckets.

Configura el dominio público del bucket de medios, por ejemplo:

```text
https://cdn.nova.com
```

Configura CORS en el bucket de medios para permitir subidas desde el admin:

```json
[
  {
    "AllowedOrigins": [
      "https://admin.nova.com",
      "https://*.nova.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Sin este CORS, las subidas directas desde el navegador pueden fallar aunque la API esté bien configurada.

---

## 5. Variables de entorno

En Coolify cada aplicación tiene su propia sección **Environment Variables**. Configura las variables según el alcance:

- **Build + Runtime** para las `NEXT_PUBLIC_*`.
- **Runtime only** para secretos de API, base de datos, JWT, R2, SMTP y Bold.
- Bloquea los secretos con **Lock** después de guardarlos.

### 5.1 API

Genera secretos fuertes:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

Configura:

```env
NODE_ENV=production
PORT=4000

APP_URL=https://api.nova.com
FRONTEND_URL=https://nova.nova.com
ADMIN_URL=https://admin.nova.com
STOREFRONT_URL=https://nova.nova.com
PLATFORM_BASE_DOMAINS=nova.com

DATABASE_URL=postgresql://...@nova-postgres:5432/tenant_nova
MASTER_DATABASE_URL=postgresql://...@nova-postgres:5432/nova_master
DEFAULT_TENANT_SLUG=nova
PLATFORM_SECRET=<resultado-de-openssl-rand>

JWT_SECRET=<otro-resultado-de-openssl-rand>
JWT_REFRESH_SECRET=<otro-resultado-de-openssl-rand>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

REDIS_URL=redis://...@nova-redis:6379

R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=nova-media-prod
R2_PUBLIC_URL=https://cdn.nova.com
PRESIGN_URL_EXPIRATION_SECONDS=300
PRESIGN_MAX_FILE_SIZE_BYTES=10485760
VIDEO_MAX_FILE_SIZE_BYTES=104857600

SUBSCRIPTION_GRACE_DAYS=3
SUBSCRIPTION_BOLD_API_KEY=...
SUBSCRIPTION_BOLD_SECRET_KEY=...
SUBSCRIPTION_BOLD_SANDBOX=false

ALLOW_LEGACY_PLATFORM_ADMIN=false
ALLOW_SINGLE_TENANT_FALLBACK=false
TENANT_PRISMA_MAX_CLIENTS=10

# Si usas los backups programados de Coolify, desactiva el scheduler local.
BACKUP_SCHEDULER_ENABLED=false
```

No pongas `DATABASE_URL`, `MASTER_DATABASE_URL`, `JWT_SECRET`, `PLATFORM_SECRET` ni credenciales de pago como variables de build. Deben existir solo en runtime.

`FRONTEND_URL` debe ser el dominio del tenant por defecto. Con el slug actual `nova`, es `https://nova.nova.com`. Los demás subdominios se permiten por CORS mediante `PLATFORM_BASE_DOMAINS=nova.com`. Si cambias el slug del tenant, actualiza también `DEFAULT_TENANT_SLUG`, `FRONTEND_URL`, `STOREFRONT_URL` y el dominio primario en la base maestra.

### 5.2 Web

```env
NEXT_PUBLIC_API_URL=https://api.nova.com
NEXT_PUBLIC_ADMIN_URL=https://admin.nova.com
NEXT_PUBLIC_DEFAULT_TENANT=nova
```

Estas variables se compilan dentro del bundle. Si cambias el dominio del API después del build, tienes que reconstruir y redesplegar web.

### 5.3 Admin

```env
NEXT_PUBLIC_API_URL=https://api.nova.com
NEXT_PUBLIC_WEB_URL=https://nova.nova.com
NEXT_PUBLIC_DEFAULT_TENANT=nova
```

---

## 6. Crear las tres aplicaciones

En el mismo proyecto de Coolify crea tres aplicaciones desde el repositorio Git. Para las tres:

- **Build Pack:** Dockerfile.
- **Base Directory:** `/` (raíz del monorepo).
- **Branch:** `main` o el tag de producción.
- **Auto deploy:** activado si quieres deploy al hacer push.

| App | Dockerfile Location | Puerto interno | Dominio |
|---|---|---:|---|
| API | `deploy/Dockerfile.api` | `4000` | `https://api.nova.com` |
| Web | `deploy/Dockerfile.web` | `3000` | `<cliente>.nova.com` con labels wildcard |
| Admin | `deploy/Dockerfile.admin` | `3001` | `https://admin.nova.com` |

### 6.1 API

Configura:

- **Domains:** `https://api.nova.com`.
- **Ports Exposes:** `4000`.
- **Healthcheck path:** `/health`.
- **Label management:** automático.
- **Persistent Storage:** monta `/app/apps/api/uploads` si quieres conservar el fallback local de archivos. Con R2 configurado no debería ser necesario, pero evita perder archivos si una subida cae al almacenamiento local.
- **Persistent Storage opcional:** `/app/apps/api/backups` solo si vas a usar el scheduler interno. Si usas backups de Coolify, no lo montes.
- **Watch paths:** `apps/api/**`, `packages/**`, `deploy/Dockerfile.api`, `.dockerignore`.
- No configures migraciones automáticas todavía. El primer deploy y las migraciones se hacen manualmente, en orden.

### 6.2 Web: wildcard para `<cliente>.nova.com`

La app web atiende todos los subdominios de clientes. No la configures con un dominio fijo ni escribas `https://*.nova.com` directamente en el campo **Domains** de Coolify: según la versión de Coolify, eso puede generar un `Host()` literal con asterisco y romper la ruta.

Configura:

- **Domains:** vacío.
- **Ports Exposes:** `3000`.
- **Healthcheck path:** `/`.
- **Watch paths:** `apps/web/**`, `packages/**`, `deploy/Dockerfile.web`, `.dockerignore`.

En **General → Container labels**, cambia **Label management** a **Managed manually (edit labels yourself)** y agrega estas labels de Traefik v3:

```ini
traefik.enable=true
traefik.docker.network=coolify

traefik.http.middlewares.nova-web-redirect.redirectscheme.scheme=https

traefik.http.routers.nova-web-http.rule=HostRegexp(`^[a-z0-9-]+\.nova\.com$`) && !Host(`admin.nova.com`) && !Host(`api.nova.com`) && !Host(`cdn.nova.com`) && !Host(`www.nova.com`)
traefik.http.routers.nova-web-http.entryPoints=http
traefik.http.routers.nova-web-http.middlewares=nova-web-redirect
traefik.http.routers.nova-web-http.service=nova-web

traefik.http.routers.nova-web-https.rule=HostRegexp(`^[a-z0-9-]+\.nova\.com$`) && !Host(`admin.nova.com`) && !Host(`api.nova.com`) && !Host(`cdn.nova.com`) && !Host(`www.nova.com`)
traefik.http.routers.nova-web-https.entryPoints=https
traefik.http.routers.nova-web-https.tls=true
traefik.http.routers.nova-web-https.tls.certresolver=letsencrypt
traefik.http.routers.nova-web-https.service=nova-web

traefik.http.services.nova-web.loadbalancer.server.port=3000
```

La regla hace tres cosas:

- Acepta cualquier subdominio de un nivel: `cliente1.nova.com`, `cliente2.nova.com`.
- Excluye `admin.nova.com`, `api.nova.com` y `cdn.nova.com`.
- Deja que el frontend resuelva el tenant por el hostname y envíe `X-Tenant` al API.

Redeploy de la app web y prueba:

```bash
curl -I https://nova.nova.com
curl -I https://admin.nova.com
curl -I https://api.nova.com
```

`nova.nova.com` debe cargar el storefront de NÖVA. `admin` y `api` deben seguir respondiendo desde sus apps, no desde la web.

> **Importante:** con labels manuales, Coolify deja de regenerar la ruta. Si cambias el puerto o el nombre del servicio, actualiza `traefik.http.services.nova-web...` y el puerto del router. Si quieres volver atrás, usa **Reset to defaults**.

### 6.3 Admin

- **Domains:** `https://admin.nova.com`.
- **Ports Exposes:** `3001`.
- **Healthcheck path:** `/`.
- **Watch paths:** `apps/admin/**`, `packages/**`, `deploy/Dockerfile.admin`, `.dockerignore`.
- Verifica que `NEXT_PUBLIC_*` esté disponible en build.
- Deja **Label management** en automático: Coolify genera el router exacto de `admin.nova.com`.

### 6.4 Build args en Coolify

Los Dockerfiles declaran:

- Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_DEFAULT_TENANT`.
- Admin: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_DEFAULT_TENANT`.

En Coolify, deja esos valores con **Build time: Available during build** y **Runtime: Available**. Si los cambias, haz un nuevo deploy, no solo un restart.

---

## 7. Primer deploy de la API y migraciones

### 7.1 Desplegar la API

Haz el primer deploy de la API y revisa los logs. Debe quedar escuchando en `0.0.0.0:4000`.

Verifica desde el VPS o desde tu máquina:

```bash
curl -I https://api.nova.com/health
curl -I https://api.nova.com/health/platform
```

Si `/health/platform` falla, revisa `MASTER_DATABASE_URL`.

### 7.2 Aplicar migraciones maestras

En Coolify abre **Terminal** de la API y aplica solo las migraciones de la base maestra:

```bash
cd /app/apps/api
./node_modules/.bin/prisma migrate deploy --schema prisma/master/schema.prisma
```

No apliques todavía las migraciones del tenant si vas a restaurar un dump completo: el dump ya incluye el esquema y la tabla `_prisma_migrations`, y hacerlo antes puede generar conflictos.

Si empiezas de cero, el CLI de `create-tenant` de la opción B se encarga de migrar el tenant.

Usa los binarios directos, no `pnpm`, porque el contenedor corre como usuario `node` y no tiene permisos de escritura sobre la raíz de la app.

### 7.3 Importar los datos de NÖVA

Elige una de estas dos rutas:

#### Opción A: NÖVA ya tiene datos reales

1. Exporta la base local completa:

```bash
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL_LOCAL" > tenant_nova.dump
```

2. Con la base `tenant_nova` vacía, importa el dump. Puedes usar el importador de PostgreSQL de Coolify o `pg_restore` desde la terminal de la API. No apliques antes las migraciones del tenant.

3. Ejecuta las migraciones del tenant para confirmar que el dump quedó actualizado:

```bash
cd /app/apps/api
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/prisma migrate status
```

4. Migra los medios según dónde estén guardados. Primero consulta:

```sql
SELECT bucket, COUNT(*)
FROM assets
GROUP BY bucket;
```

- Si `bucket = 'r2'`: copia el prefijo `t/nova/` del bucket de desarrollo al bucket de producción. Las claves de `Asset.objectKey` no cambian.
- Si `bucket = 'local'`: copia los archivos de `apps/api/uploads` al volumen persistente `/app/apps/api/uploads` del contenedor. Las URLs actuales son `https://api.nova.com/uploads/<archivo>` y seguirán funcionando con `APP_URL` configurado.
- Si `bucket = 'external'`: no hay archivos que mover; solo verifica que las URLs externas sigan disponibles.

No hagas `rclone` de archivos locales a R2 sin actualizar también `Asset.bucket` y `Asset.objectKey`: la base seguiría apuntando a `/uploads/...`. Migrar local a R2 se puede hacer después con un script específico.

#### Opción B: empiezas de cero

Con la base `tenant_nova` vacía, usa el CLI de provisioning sobre esa misma base:

```bash
cd /app/apps/api

./node_modules/.bin/ts-node src/database/scripts/create-tenant.ts \
  --slug=nova \
  --name="NÖVA" \
  --domain=nova.nova.com \
  --database-url="$DATABASE_URL" \
  --admin-email=admin@nova.com \
  --admin-password='UNA_CONTRASEÑA_MUY_FUERTE'
```

Ese comando aplica las migraciones, crea los roles, la configuración inicial y el admin de la tienda, y registra el tenant en la base maestra. No usa datos de demo.

Después asegura que NÖVA sea el tenant por defecto:

```sql
UPDATE tenants
SET "isDefault" = true
WHERE slug = 'nova';
```

### 7.4 Registrar el dominio del tenant

La regla es estricta: **el subdominio debe ser igual al slug del tenant**.

- Slug `nova` → `nova.nova.com`
- Slug `tienda-rosa` → `tienda-rosa.nova.com`
- Nunca uses `admin`, `api`, `cdn` ni `www` como slug.

Si elegiste la opción A, ejecuta el registro del tenant actual:

```bash
cd /app/apps/api
./node_modules/.bin/ts-node src/database/scripts/register-default-tenant.ts
```

Ese script registra los dominios locales `localhost` y `nova.localhost`. Reemplaza el dominio desde la terminal de PostgreSQL de Coolify:

```sql
UPDATE tenant_domains
SET host = 'nova.nova.com', "isPrimary" = true
WHERE host = 'localhost';

DELETE FROM tenant_domains
WHERE host = 'nova.localhost';
```

Si elegiste la opción B, `create-tenant` ya registró `nova.nova.com`; solo verifica.

Verifica en la base maestra:

```sql
SELECT t.slug, t."isDefault", d.host, d."isPrimary"
FROM tenants t
JOIN tenant_domains d ON d."tenantId" = t.id
WHERE t.slug = 'nova';
```

Para un cliente nuevo, el alta debe usar:

```bash
./node_modules/.bin/ts-node src/database/scripts/create-tenant.ts \
  --slug=<cliente> \
  --name="<Nombre>" \
  --domain=<cliente>.nova.com \
  --admin-email=admin@<cliente>.nova.com \
  --admin-password='...'
```

El slug del tenant y el subdominio tienen que coincidir porque el storefront deriva el tenant del primer label del host y lo envía como `X-Tenant` al API.

### 7.5 Crear el operador de plataforma

```bash
cd /app/apps/api
./node_modules/.bin/ts-node src/database/scripts/seed-platform-owner.ts \
  --email=owner@nova.com \
  --password='UNA_CONTRASEÑA_MUY_FUERTE' \
  --name='Owner NÖVA'
```

Entra por:

```text
https://admin.nova.com/platform-login
```

Activa 2FA y no dejes la contraseña en el historial del servidor. Usa un gestor de contraseñas.

### 7.6 Desplegar web y admin

Después de que la API esté sana y migrada:

1. Despliega web.
2. Despliega admin.
3. Abre `https://nova.nova.com` y `https://admin.nova.com`.
4. Revisa que el storefront cargue el catálogo de NÖVA y no el tenant de demo.

---

## 8. Webhooks y correo

### Bold de la tienda

En el panel de Bold configura:

```text
https://api.nova.com/payments/webhook/bold?tenant=nova
```

Carga las llaves de la tienda en **Admin → Configuración de la tienda**, no en el `.env` de la API.

### Bold de suscripciones SaaS

```text
https://api.nova.com/subscriptions/webhook/bold
```

Usa las credenciales `SUBSCRIPTION_BOLD_*` de la plataforma. No mezcles estas llaves con las de la tienda.

### Email

Configura SMTP o Resend y verifica:

- SPF, DKIM y DMARC.
- Email de verificación.
- Recuperación de contraseña.
- Confirmación de pedido.
- Enlaces con `https://nova.nova.com`.

---

## 9. Backups

### Base de datos

Configura el backup programado de PostgreSQL en Coolify:

- Todos los databases (`nova_master`, `tenant_nova` y los tenants futuros).
- Frecuencia diaria.
- Retención de 14 a 30 días.
- Destino: bucket `nova-db-backups` de R2, separado de los medios.
- Prueba una restauración completa en un entorno de staging.

Si usas los backups de Coolify, mantén `BACKUP_SCHEDULER_ENABLED=false` en la API. El scheduler interno guarda en disco local y no es un backup offsite.

### Configuración de Coolify

Guarda una copia de:

```text
/data/coolify/source/.env
```

Sin `APP_KEY`, los secretos cifrados de Coolify no se pueden recuperar.

### Medios

Activa una política de retención/versionado en R2 si está disponible. Como mínimo, programa una copia periódica del prefijo `t/nova/` a otro bucket o cuenta.

### VPS

Activa los backups automáticos de Hostinger si el plan lo permite; suelen tener costo adicional. Como alternativa, programa snapshots manuales antes de cada cambio grande. No los uses como único backup de la base: la consistencia de PostgreSQL es mejor con `pg_dump`/backup administrado.

---

## 10. Actualizaciones y rollback

Flujo recomendado para cada versión:

1. Commit y tag en Git.
2. Backup de la base de datos.
3. Deploy de API.
4. Aplicar migraciones nuevas.
5. Deploy de web y admin.
6. Smoke test.
7. Si algo falla, volver al tag anterior en Coolify.

Las migraciones de Prisma no siempre tienen rollback automático. Si una migración cambia datos de forma destructiva, la vuelta atrás requiere restaurar el backup.

No ejecutes migraciones desde varias réplicas de la API al mismo tiempo. Al principio usa una sola réplica.

---

## 11. Smoke test mínimo

Marca cada punto:

- [ ] `https://api.nova.com/health` responde `200`.
- [ ] `https://api.nova.com/health/platform` responde `200`.
- [ ] `https://nova.nova.com` muestra NÖVA.
- [ ] `admin.nova.com` y `api.nova.com` no son capturados por el router wildcard de web.
- [ ] El certificado de `nova.nova.com` incluye `*.nova.com`.
- [ ] Un segundo tenant de prueba responde en `https://<slug>.nova.com`.
- [ ] `/catalogo` muestra productos y filtros.
- [ ] `/producto/<slug>` muestra galería, variantes y precios.
- [ ] Registro y login de cliente.
- [ ] Refresh de sesión funcionando.
- [ ] Carrito con usuario invitado y autenticado.
- [ ] Checkout de prueba.
- [ ] Pago Bold en sandbox y webhook recibido.
- [ ] Pedido visible en admin.
- [ ] Email de pedido recibido.
- [ ] Subida de imagen y video desde el admin.
- [ ] Guardar y publicar una versión del storefront.
- [ ] Login en `admin.nova.com`.
- [ ] Login de plataforma y creación de un tenant de prueba.
- [ ] Backup y restauración probados.
- [ ] No quedan usuarios demo ni contraseñas por defecto.

---

## 12. Seguridad mínima

- Firewall: solo `22`, `80` y `443`; el panel de Coolify (`8000` o `3000`) restringido o cerrado.
- PostgreSQL y Redis sin puerto público; solo red interna de Coolify.
- SSH con clave, sin login por contraseña.
- 2FA en la cuenta de Coolify y en el `PlatformUser`.
- Variables sensibles bloqueadas en Coolify y nunca en variables de build.
- `ALLOW_LEGACY_PLATFORM_ADMIN=false`.
- Sin usuarios demo, contraseñas por defecto ni seeds de demo.
- Slugs reservados: `admin`, `api`, `cdn`, `www`, `mail`, `ftp`.
- El token `HOSTINGER_API_TOKEN` del proxy solo debe tener permisos DNS sobre `nova.com`.
- El endpoint `/api/docs` de Swagger queda público. Si no lo necesitas en producción, protégelo en el proxy o deshabilítalo.
- No compartas `PLATFORM_SECRET`: si cambia, las URLs de las bases de datos de los tenants se vuelven ilegibles.
- Revisa periódicamente imágenes, logs y espacio en disco de Docker.

## 13. Problemas comunes

### La web o el admin apuntan a `localhost:4000`

Se compiló sin `NEXT_PUBLIC_API_URL`. Revisa que la variable esté disponible en build y vuelve a desplegar.

### El admin queda en 401 o no refresca la sesión

Revisa:

- Que `FRONTEND_URL` y `ADMIN_URL` sean exactamente los dominios HTTPS.
- Que storefront, admin y API compartan el mismo dominio registrable.
- Que el navegador esté enviando las cookies a `api.nova.com`.

### La API devuelve 503 "Plataforma temporalmente no disponible"

Puede ser:

- `MASTER_DATABASE_URL` mal configurada.
- Migraciones maestras sin aplicar.
- `PLATFORM_SECRET` distinto al usado para cifrar las URLs de los tenants.

### La API devuelve 404 "Tienda no encontrada"

Revisa `DEFAULT_TENANT_SLUG`, la tabla `tenants` y la tabla `tenant_domains`. Si cambiaste el dominio, actualiza el registro primario.

Recuerda que el subdominio debe coincidir con el slug. Si el tenant es `nova`, la URL es `nova.nova.com`; `tienda.nova.com` no resuelve el tenant `nova` sin cambiar el slug o el dominio de forma consistente.

### `admin.nova.com` o `api.nova.com` abren el storefront

El router wildcard de web está capturando los dominios fijos. Revisa las labels manuales de la app web:

- Deben excluir `admin.nova.com`, `api.nova.com` y `cdn.nova.com`.
- El router de admin y API debe ser automático y exacto.
- Si Coolify generó una ruta wildcard en **Domains**, quítala.

### El certificado no cubre un subdominio

- El certificado wildcard cubre solo un nivel: `cliente.nova.com` sí; `app.cliente.nova.com` no.
- El apex `nova.com` necesita estar en los SAN del certificado.
- Revisa que el challenge DNS-01 esté usando `HOSTINGER_API_TOKEN` y que el proxy haya reiniciado.
- En **Proxy → Logs**, busca errores de ACME o de propagación DNS.

### Una ruta wildcard no responde

- Verifica que el DNS `*` apunte al VPS.
- Verifica que las labels manuales estén en la app web y que el contenedor esté en la red `coolify`.
- Prueba `curl -H 'Host: prueba.nova.com' http://IP_DEL_VPS` para separar DNS del routing.
- Si cambiaste las labels, haz un redeploy completo, no solo un restart.

### El build de Next falla con Google Fonts

El build descarga las fuentes de Google. Verifica la salida a internet del servidor de build. Si el problema es recurrente, autoaloja las fuentes en `apps/web` y `apps/admin`.

### El build queda sin memoria

- Usa un VPS de 8 GB.
- Agrega swap.
- Construye una app a la vez.
- Más adelante, usa un build server separado o construye en GitHub Actions y publica en un registry.

### Las imágenes dan 404

- Revisa `R2_PUBLIC_URL`.
- Verifica que los objetos existan con la misma clave en el bucket de producción.
- Revisa CORS y el dominio público del bucket.

### `pnpm` falla dentro del contenedor

El contenedor corre como `node` y `pnpm` intenta verificar/instalar dependencias. Usa los binarios directos:

```bash
./node_modules/.bin/prisma ...
./node_modules/.bin/ts-node ...
```

---

## 14. SaaS multi-cliente: antes de abrirlo a terceros

Para el primer deploy de NÖVA no necesitas resolver esto. Antes de vender SaaS abierto, completa:

1. **Dominios propios:** el formato `<cliente>.nova.com` ya está cubierto por el wildcard, pero un dominio como `mitienda.com` sigue sin resolverse correctamente: el storefront deriva el slug del host y no consulta la base maestra para dominios personalizados.
2. **Provisioning en runtime:** la creación de clientes ejecuta `ts-node` y `npx prisma`. Si el contenedor de producción no incluye dependencias de desarrollo o el usuario no puede escribir, el alta falla.
3. **Slugs reservados:** falta que el backend rechace `admin`, `api`, `cdn`, `www`, `mail` y `ftp` al crear un tenant. Por ahora se controla en el panel manualmente.
4. **Alta automática de subdominios:** el wildcard DNS/TLS ya atiende el tráfico; falta que el alta de clientes cree automáticamente `<slug>.nova.com` y su registro primario.
5. **Backups offsite:** no uses el scheduler local como única estrategia.
6. **Límites de conexiones:** ajusta `TENANT_PRISMA_MAX_CLIENTS` y el pool de PostgreSQL según la cantidad de clientes.
7. **Pruebas de aislamiento:** caché, colas, SSE, storage y webhooks por tenant.

Mientras tanto, NÖVA queda en `nova.nova.com` y los clientes nuevos se crean manualmente con `--domain=<slug>.nova.com`. Los dominios propios quedan para una fase posterior.
