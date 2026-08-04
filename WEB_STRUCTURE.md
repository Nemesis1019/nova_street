# Estructura y funcionamiento del storefront (`apps/web`)

Este documento describe cómo está armada la aplicación frontend, cómo funcionan las rutas, la autenticación, el estado global, el theming y cómo agregar nuevas pantallas.

---

## 1. Stack y tecnologías

- **Framework:** [Next.js 16](https://nextjs.org/) con App Router
- **UI:** [Mantine v7](https://mantine.dev/) + Tabler Icons
- **Tipado del API:** `@ecommerce/api-client` generado desde OpenAPI
- **Estado global:** [Zustand](https://github.com/pmndrs/zustand) con persistencia en localStorage
- **Queries:** [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Fuentes:** Google Fonts vía `next/font` (Bebas Neue, Inter, JetBrains Mono)
- **Monorepo:** pnpm workspace + Turborepo

---

## 2. Estructura de carpetas

```
apps/web/
├── src/
│   ├── app/                          # App Router de Next.js
│   │   ├── page.tsx                  # Home
│   │   ├── layout.tsx                # Layout raíz + providers
│   │   ├── catalogo/page.tsx         # Catálogo con filtros
│   │   ├── producto/[slug]/page.tsx  # Detalle de producto
│   │   ├── cart/page.tsx             # Carrito
│   │   ├── checkout/page.tsx         # Checkout
│   │   ├── login/page.tsx            # Login
│   │   ├── register/page.tsx         # Registro
│   │   ├── verify-email/page.tsx     # Verificación de email
│   │   ├── account/page.tsx          # Perfil
│   │   ├── account/addresses/page.tsx
│   │   ├── account/security/page.tsx
│   │   ├── orders/page.tsx           # Historial de pedidos
│   │   ├── orders/[id]/page.tsx      # Detalle de pedido
│   │   ├── personalizar/page.tsx     # Listado de plantillas
│   │   └── personalizar/[templateId]/page.tsx  # Editor
│   │
│   ├── components/
│   │   ├── store-header.tsx          # Header global
│   │   ├── store-footer.tsx          # Footer global
│   │   ├── account-layout.tsx        # Layout de cuenta
│   │   ├── marquee.tsx               # Animación de home
│   │   ├── ui/button.tsx             # Botón cliente
│   │   ├── add-to-cart-button.tsx
│   │   └── customizer/
│   │       └── customizer-editor.tsx # Editor Konva
│   │
│   ├── providers/
│   │   ├── config-provider.tsx       # StoreConfig del backend
│   │   ├── query-provider.tsx        # TanStack Query
│   │   └── theme-provider.tsx        # Tema NÖVA de Mantine
│   │
│   ├── store/
│   │   ├── auth-store.ts             # Auth + persistencia condicional
│   │   └── cart-store.ts             # Carrito anónimo
│   │
│   ├── lib/
│   │   ├── api.ts                    # apiClient tipado
│   │   ├── fonts.ts                  # Configuración de fuentes
│   │   ├── customizer-types.ts       # Tipos locales del editor
│   │   └── notifications.ts          # Notificaciones Mantine
│   │
│   └── hooks/
│       └── use-client-pagination.ts  # Paginación client-side
│
├── public/                           # Assets estáticos
├── .env.example
├── next.config.js
└── package.json
```

---

## 3. Cómo funcionan las rutas

Next.js App Router usa la carpeta `src/app/`. Cada carpeta con un `page.tsx` es una ruta. Los segmentos dinámicos usan corchetes:

- `src/app/producto/[slug]/page.tsx` → `/producto/:slug`
- `src/app/personalizar/[templateId]/page.tsx` → `/personalizar/:templateId`
- `src/app/orders/[id]/page.tsx` → `/orders/:id`

### Layout raíz (`src/app/layout.tsx`)

- Carga `StoreConfig` desde el backend (`/store-config`) de forma asíncrona.
- Envuelve la app con `ConfigProvider`, `QueryProvider` y `ThemeProvider`.
- Aplica fuentes y variables CSS.
- No incluye header/footer; esos se agregan en cada página.

### Server Components vs Client Components

- **Server Components:** páginas como `producto/[slug]`, `catalogo`, `personalizar` hacen fetch inicial directo al API.
- **Client Components:** cualquier interacción (formularios, carrito, editor) lleva `'use client'` al tope. Estos usan `useQuery`, `useMutation` y Zustand.

---

## 4. Conexión con el backend

### `src/lib/api.ts`

```ts
import { createApiClient } from '@ecommerce/api-client';

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
});
```

Todas las llamadas están tipadas. Ejemplo:

```ts
const { data } = await apiClient.GET('/catalog/products/{slug}', {
  params: { path: { slug } },
});
```

### Regenerar tipos

Cuando cambia la API:

```bash
pnpm --filter @ecommerce/api generate:swagger
pnpm --filter @ecommerce/api-client generate
pnpm --filter @ecommerce/api-client build
```

---

## 5. Autenticación en el frontend

### `auth-store.ts`

- Guarda `accessToken`, `refreshToken`, `email`, `emailVerified`, `isAuthenticated`.
- **Persistencia condicional:** si el usuario tilda "Recordarme", se guarda en `localStorage`; si no, solo queda en memoria.
- Métodos: `login`, `logout`, `setEmailVerified`, `hydrate`.

### Flujo

1. Login/Register devuelven tokens.
2. El store los guarda y marca `isAuthenticated = true`.
3. `apiClient` añade el `accessToken` en el header `Authorization`.
4. Si el backend responde `401`, el cliente intenta refresh automáticamente con el refresh token.
5. Si el refresh falla, limpia tokens y redirige a `/login`.

### Verificación de email

- Después del registro, el usuario va a `/verify-email?email=...`.
- Ingresa el código OTP de 6 dígitos.
- Al verificar, `setEmailVerified(true)` y redirige al catálogo.
- El checkout bloquea si `emailVerified === false`.

---

## 6. Carrito

### Usuario autenticado

- El carrito vive en el backend (`/cart`).
- `src/app/cart/page.tsx` usa `useQuery({ queryKey: ['cart'] })` para obtener items.
- `CartItemRow` permite cambiar cantidad y eliminar items.

### Usuario anónimo

- `cart-store.ts` guarda items en `localStorage`.
- Al iniciar sesión, el frontend puede sincronizar el carrito local con el servidor (flujo preparado, merge en `/cart/merge`).

---

## 7. Theming (NÖVA)

### Fuentes (`src/lib/fonts.ts`)

- `bebasNeue`: títulos, logo, botones.
- `inter`: cuerpo de texto.
- `jetbrainsMono`: precios, SKU, labels técnicos.

### `theme-provider.tsx`

- Define `defaultRadius: 0`.
- Paleta NÖVA hardcodeada: `#fcf9f8` fondo, `#0d0d0d` primario, `#6f7a4e` oliva.
- Override de componentes Mantine: `Button`, `Card`, `TextInput`, `PasswordInput`, `NumberInput`, `Select`, `Radio`, `Badge`, `Table`, `Slider`, `Switch`, `Checkbox`, `Modal`, `Drawer`, `Stepper`, `Pagination`, `FileInput`, `ColorSwatch`, `Anchor`.

### `config-provider.tsx`

- Obtiene `StoreConfig` del backend (nombre, colores, logo, moneda, hero, etc.).
- Si el backend no responde, usa valores por defecto de NÖVA.

---

## 8. Páginas principales

### Home (`src/app/page.tsx`)

- Hero fullscreen con imagen configurable desde `StoreConfig`.
- Marquee animado, colección destacada, productos destacados, bloque de identidad.

### Catálogo (`src/app/catalogo/page.tsx`)

- Filtros y ordenamiento sincronizados en URL (`category`, `sizes`, `colors`, `minPrice`, `maxPrice`, `inStock`, `search`, `sort`).
- Grid de productos.

### Detalle de producto (`src/app/producto/[slug]/page.tsx`)

- Server Component que fetchea producto y config.
- Muestra imagen, nombre, precio, descripción y `AddToCartButton`.

### Checkout (`src/app/checkout/page.tsx`)

- Requiere autenticación y email verificado.
- Selección/creación de dirección.
- Selector de método de pago (genérico mientras Bold está pausado).
- Crea orden con `POST /checkout/init`.
- Aplica cupón y finaliza pago (actualmente apunta a Stripe, pendiente de migrar a Bold).

### Cuenta de usuario (`src/app/account/*`)

- `page.tsx`: perfil y logout.
- `addresses/page.tsx`: lista, crea y elimina direcciones.
- `security/page.tsx`: cambio de contraseña.

### Órdenes (`src/app/orders/*`)

- `page.tsx`: tabla de historial.
- `[id]/page.tsx`: detalle con stepper de estado y resumen.

### Personalizar (`src/app/personalizar/*`)

- `page.tsx`: lista de plantillas `DesignTemplate`.
- `[templateId]/page.tsx`: envuelve `CustomizerEditor`.
- `customizer-editor.tsx`: editor con `react-konva` para imágenes, texto y cliparts. Genera preview y lo guarda.

---

## 9. Editor de personalización

- Carga dinámica de `react-konva` para evitar problemas de SSR.
- Elementos: `UPLOADED_IMAGE`, `TEXT`, `CLIPART` (⭐ / ❤️).
- Cada elemento tiene `positionX/Y`, `scale`, `rotation`, `zIndex`.
- Al guardar se genera `previewImageUrl` con `stage.toDataURL()` y se sube a `/assets/upload-custom`.
- El `surcharge` se calcula como `cantidad de elementos × 2.500`.

---

## 10. Cómo agregar una nueva página

1. Crear la carpeta bajo `src/app/` con `page.tsx`.
2. Si necesita datos del backend y no requiere interacción, hacerla Server Component y fetchear con `apiClient.GET`.
3. Si tiene formularios/eventos, agregar `'use client'` y usar `useQuery` / `useMutation`.
4. Agregar el link en `store-header.tsx` o en el layout correspondiente.
5. Regenerar tipos si se agregaron endpoints nuevos.

---

## 11. Variables de entorno

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
```

Ver `apps/web/.env.example`.

---

## 12. Comandos útiles

```bash
# Desarrollo
pnpm --filter @ecommerce/web dev

# Build
pnpm --filter @ecommerce/web build

# Type check / lint
pnpm --filter @ecommerce/web typecheck
pnpm --filter @ecommerce/web lint
```
