# Estructura y funcionamiento del backend (`apps/api`)

Este documento describe cómo está armada la API, cómo se organizan las rutas, la autenticación, los módulos principales y cómo agregar nuevas funcionalidades.

---

## 1. Stack y tecnologías

- **Framework:** [NestJS](https://nestjs.com/) (Node.js / TypeScript)
- **ORM:** [Prisma](https://www.prisma.io/) con PostgreSQL
- **Auth:** JWT (access + refresh tokens) con Passport
- **Documentación:** Swagger generado automáticamente (`apps/api/swagger.json`)
- **Tests:** Jest con Supertest (e2e)
- **Email:** Nodemailer (templates HTML en `src/email/templates`)
- **Monorepo:** pnpm workspace + Turborepo

---

## 2. Estructura de carpetas

```
apps/api/
├── src/
│   ├── main.ts                     # Bootstrap de NestJS
│   ├── app.module.ts               # Módulo raíz con todos los imports
│   ├── app.controller.ts           # Health check
│   ├── app.service.ts
│   │
│   ├── prisma/                     # PrismaService global
│   ├── database/seeds/             # Seeds de roles, catálogo y demo
│   ├── scripts/                    # generate-swagger.js
│   │
│   ├── auth/                       # Registro, login, refresh, verificación de email
│   ├── users/                      # Sanitización y búsqueda de usuarios
│   ├── addresses/                  # CRUD de direcciones del usuario
│   │
│   ├── catalog/                    # Catálogo público (productos, categorías)
│   ├── admin-catalog/              # Admin de productos, categorías, stock, imágenes
│   ├── admin-coupons/              # Admin de cupones
│   │
│   ├── cart/                       # Carrito del usuario autenticado
│   ├── checkout/                   # Inicialización de órdenes + cupones
│   ├── orders/                     # Historial y detalle de órdenes
│   ├── payment/                    # Stripe Checkout + webhook (pausado)
│   │
│   ├── custom-designs/             # Diseños personalizados de camisetas
│   ├── design-templates/           # Plantillas disponibles para personalizar
│   ├── assets/                     # Subida de imágenes (admin y clientes)
│   │
│   ├── stock/                      # Políticas de stock (TRACKED / MADE_TO_ORDER)
│   ├── store-config/               # Configuración pública de la tienda
│   ├── email/                      # Envío de emails transaccionales
│   └── newsletter/                 # Suscripción a newsletter
│
├── prisma/
│   ├── schema.prisma               # Modelos de datos
│   └── migrations/                 # Migraciones versionadas
│
├── test/                           # Tests e2e
│   ├── utils/test-auth.ts          # Helpers para crear usuarios de test
│   └── *.e2e-spec.ts
│
├── .env.example
├── jest.config.js                  # maxWorkers: 2 por estabilidad
└── package.json
```

---

## 3. Cómo se registran rutas

Cada módulo exporta uno o más **controllers** con el decorador `@Controller('ruta-base')`. NestJS combina los métodos HTTP (`@Get`, `@Post`, `@Patch`, `@Delete`) con ese prefijo.

Ejemplo real (`src/admin-catalog/admin-product.controller.ts`):

```ts
@Controller('admin/products')
export class AdminProductController {
  @Get()
  findAll() { ... }

  @Get(':id')
  findOne(@Param('id') id: string) { ... }

  @Post(':id/images')
  addImage(@Param('id') id: string, @Body() dto: AddProductImageDto) { ... }
}
```

Esto genera:
- `GET    /admin/products`
- `GET    /admin/products/:id`
- `POST   /admin/products/:id/images`

Los controllers se importan en su módulo (`*.module.ts`) y el módulo se importa en `app.module.ts`.

### Rutas públicas vs protegidas

- **Públicas:** no llevan `@UseGuards(JwtAuthGuard)` (ej. catálogo, store-config, registro/login).
- **Protegidas:** usan `@UseGuards(JwtAuthGuard)` y opcionalmente `@UseGuards(RolesGuard)` + `@Roles('ADMIN')` para endpoints de admin.
- **Verificación de email:** algunas rutas críticas (checkout) usan `VerifiedEmailGuard` para exigir `emailVerified === true`.

---

## 4. Autenticación y autorización

### Flujo de tokens

1. **Registro (`POST /auth/register`)**: crea usuario, hashea password con argon2, genera par access/refresh token.
2. **Login (`POST /auth/login`)**: valida credenciales y devuelve access + refresh token.
3. **Refresh (`POST /auth/refresh`)**: recibe un refresh token válido y devuelve un nuevo par de tokens.
4. **Logout (`POST /auth/logout`)**: revoca el refresh token enviado.
5. **Verificación de email (`POST /auth/verify-email` y `POST /auth/resend-verification`)**: envía un código OTP de 6 dígitos.
6. **Cambio de contraseña (`PATCH /auth/change-password`)**: verifica password actual, actualiza hash y revoca todos los refresh tokens.

### Guards

- `JwtAuthGuard`: extrae el token Bearer y adjunta `req.user = { userId, email, role }`.
- `RolesGuard`: lee `@Roles('ADMIN')` y compara con `req.user.role`.
- `VerifiedEmailGuard`: rechaza si el usuario no verificó su email.

### Hash de passwords

`argon2.hash(password)` con parámetros reducidos solo en `NODE_ENV=test` para evitar OOM en tests paralelos.

---

## 5. Módulos principales

### Auth (`src/auth`)
- `auth.controller.ts`: endpoints de autenticación.
- `auth.service.ts`: lógica de tokens, verificación y passwords.
- `dto/`: objetos de entrada validados con `class-validator`.
- `guards/`: JWT, roles y email verificado.

### Catalog (`src/catalog`)
- Público.
- `GET /catalog/products` (con filtros y paginación).
- `GET /catalog/products/:slug` detalle.
- `GET /catalog/categories`.

### Admin Catalog (`src/admin-catalog`)
- CRUD de productos, categorías, variantes, stock e imágenes.
- Rutas bajo `/admin/*`, protegidas por `ADMIN`.
- `admin-product.service.ts` contiene la lógica de negocio.

### Cart (`src/cart`)
- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE /cart/items/:id`, `POST /cart/merge`.
- Soporta items `STANDARD` y `CUSTOM`.
- Valida stock mediante `StockPolicyResolver`.

### Checkout (`src/checkout`)
- `POST /checkout/init`: crea una orden a partir del carrito.
- `POST /checkout/:orderId/apply-coupon`: aplica un cupón.
- `POST /checkout/:orderId/confirm-payment`: marca la orden como pagada.

### Orders (`src/orders`)
- `GET /orders` historial.
- `GET /orders/:id` detalle.
- Los items incluyen el nombre del producto o plantilla personalizada.

### Custom Designs (`src/custom-designs`)
- CRUD de diseños personalizados.
- `POST /custom-designs/:id/submit` → pasa a `PENDING_REVIEW`.
- `POST /custom-designs/:id/add-to-cart`.
- Endpoints admin `/custom-designs/admin/all` y `/custom-designs/admin/:id/status`.

### Assets (`src/assets`)
- `POST /admin/assets/upload` para admin.
- `POST /assets/upload-custom` para clientes (diseños personalizados).
- Guarda archivos en `uploads/` local; en producción debería apuntar a R2/S3.

---

## 6. Base de datos y Prisma

- El schema está en `prisma/schema.prisma`.
- `PrismaService` se exporta como módulo global.
- Comandos útiles:
  ```bash
  pnpm --filter @ecommerce/api prisma migrate dev
  pnpm --filter @ecommerce/api seed:demo
  ```

### Modelos clave

- `User`, `Role`, `RefreshToken`, `EmailVerificationCode`
- `Product`, `ProductVariant`, `ProductImage`, `Category`
- `Cart`, `CartItem`
- `Order`, `OrderItem`
- `CustomDesign`, `CustomDesignElement`, `DesignTemplate`
- `Coupon`, `Address`, `StoreConfig`, `StoreSettings`

---

## 7. Generación de tipos para el frontend

La API expone Swagger en `apps/api/swagger.json`. El paquete `packages/api-client` lo convierte en tipos TypeScript:

```bash
# 1. Generar swagger.json
pnpm --filter @ecommerce/api generate:swagger

# 2. Generar tipos TypeScript
pnpm --filter @ecommerce/api-client generate

# 3. Compilar la librería
pnpm --filter @ecommerce/api-client build
```

El frontend (`apps/web` y `apps/admin`) importa `@ecommerce/api-client` y usa `apiClient.GET/POST/PATCH/DELETE` totalmente tipados.

---

## 8. Cómo agregar una nueva funcionalidad en la API

1. **Modelo:** si necesitás una nueva tabla, agregala en `prisma/schema.prisma` y corré una migración.
2. **DTOs:** creá los archivos de entrada en `src/<modulo>/dto/` usando `class-validator`.
3. **Service:** implementá la lógica en `src/<modulo>/<modulo>.service.ts`.
4. **Controller:** exponé los endpoints en `src/<modulo>/<modulo>.controller.ts`.
5. **Module:** registrá controller + service en `src/<modulo>/<modulo>.module.ts`.
6. **AppModule:** importá el nuevo módulo en `src/app.module.ts`.
7. **Swagger y tipos:** corrés `generate:swagger`, `generate` y `build` del api-client.
8. **Tests:** agregá un archivo `test/<modulo>.e2e-spec.ts` si corresponde.

---

## 9. Variables de entorno importantes

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://...

JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

Ver `apps/api/.env.example` para la lista completa.

---

## 10. Comandos útiles

```bash
# Desarrollo
pnpm --filter @ecommerce/api dev

# Build
pnpm --filter @ecommerce/api build

# Tests
pnpm --filter @ecommerce/api test

# Lint / typecheck
pnpm --filter @ecommerce/api lint
pnpm --filter @ecommerce/api typecheck

# Seed demo
pnpm --filter @ecommerce/api seed:demo
```
