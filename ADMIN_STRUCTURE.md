# Estructura y funcionamiento del panel de administración (`apps/admin`)

Este documento describe cómo está armado el panel de admin, cómo funcionan las rutas, la autenticación, el refresco automático de tokens, el estado global y cómo agregar nuevas pantallas.

---

## 1. Stack y tecnologías

- **Framework:** [Next.js 16](https://nextjs.org/) con App Router
- **UI:** [Mantine v7](https://mantine.dev/) + `@tabler/icons-react`
- **Tablas:** `mantine-datatable`
- **Tipado del API:** `@ecommerce/api-client` generado desde OpenAPI
- **Queries y estado server:** [TanStack Query](https://tanstack.com/query/latest)
- **Monorepo:** pnpm workspace + Turborepo

---

## 2. Estructura de carpetas

```
apps/admin/
├── src/
│   ├── app/                          # App Router de Next.js
│   │   ├── page.tsx                  # Dashboard / login
│   │   ├── layout.tsx                # Layout raíz + providers
│   │   ├── products/page.tsx         # Listado de productos
│   │   ├── products/[id]/page.tsx    # Edición de producto
│   │   ├── categories/page.tsx       # Categorías
│   │   ├── inventory/page.tsx        # Stock e inventario
│   │   ├── coupons/page.tsx          # Cupones
│   │   ├── custom-designs/page.tsx   # Moderación de diseños
│   │   └── store-config/page.tsx     # Configuración de la tienda
│   │
│   ├── components/
│   │   ├── admin-shell.tsx           # Shell con navbar y header
│   │   ├── login-form.tsx            # Formulario de login admin
│   │   └── ...
│   │
│   ├── providers/
│   │   ├── config-provider.tsx       # StoreConfig del backend
│   │   ├── query-provider.tsx        # TanStack Query
│   │   └── theme-provider.tsx        # Tema Mantine base
│   │
│   ├── lib/
│   │   ├── api.ts                    # apiClient con refresh automático
│   │   ├── auth.ts                   # Helpers de tokens en localStorage
│   │   ├── assets.ts                 # Subida de imágenes al backend
│   │   └── notifications.ts          # Notificaciones Mantine
│   │
│   └── hooks/
│       └── use-client-pagination.ts  # Paginación client-side
│
├── .env.example
├── next.config.js
└── package.json
```

---

## 3. Cómo funcionan las rutas

Igual que en `apps/web`, Next.js App Router usa la carpeta `src/app/`:

- `src/app/products/page.tsx` → `/products`
- `src/app/products/[id]/page.tsx` → `/products/:id`
- `src/app/custom-designs/page.tsx` → `/custom-designs`

Todas las rutas protegidas se renderizan dentro de `<AdminShell>`, que muestra el menú lateral. La autenticación se chequea en cada página leyendo el access token de `localStorage`.

---

## 4. Autenticación y refresh token automático

### Tokens en `localStorage`

- `admin_access_token`
- `admin_refresh_token`

La separación permite que el panel sobreviva a recargas de página y recupere sesión automáticamente.

### `src/lib/auth.ts`

Helpers puros para leer/escribir tokens:

```ts
getAccessToken()
getRefreshToken()
setTokens(accessToken, refreshToken)
clearTokens()
logout() // limpia y redirige a "/"
```

### `src/lib/api.ts`

`apiClient` se crea con `createApiClient` del paquete `@ecommerce/api-client`, configurado con:

- `baseUrl`: URL del backend (`NEXT_PUBLIC_API_URL`).
- `getRefreshToken`: lee `admin_refresh_token` de `localStorage`.
- `onTokenRefreshed`: guarda los nuevos tokens y actualiza el token en memoria.
- `onRefreshFailed`: limpia tokens y redirige a `/`.

Además se registra un middleware propio que inyecta el access token actual en cada request:

```ts
const authMiddleware = {
  onRequest({ request }) {
    if (authToken) {
      request.headers.set('Authorization', `Bearer ${authToken}`);
    }
    return request;
  },
};
```

### Flujo de refresco

1. El frontend hace una petición con el access token.
2. Si el backend responde `401`, el middleware interno del api-client llama a `POST /auth/refresh` con el refresh token.
3. Si el refresh funciona, reintenta la petición original con el nuevo access token.
4. Si el refresh falla, se dispara `onRefreshFailed` y se redirige al login.

---

## 5. Conexión con el backend

### `src/lib/api.ts`

```ts
export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  getRefreshToken,
  onTokenRefreshed,
  onRefreshFailed,
});
```

Todas las llamadas están tipadas. Ejemplo desde `products/page.tsx`:

```ts
const { data: productsResponse } = useQuery({
  queryKey: ['admin-products', page, search],
  queryFn: async () => {
    const { data } = await apiClient.GET('/admin/products', {
      params: { query: { page: String(page), limit: String(limit), search } },
    });
    return data;
  },
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

## 6. Layout y navegación

### `src/components/admin-shell.tsx`

- `AppShell` de Mantine con header fijo y navbar lateral.
- Items de navegación:
  - Productos
  - Categorías
  - Stock
  - Cupones
  - Diseños
  - Configuración
- Botón "Salir" que llama a `logout()` de `src/lib/auth.ts`.
- Marca el ítem activo comparando `pathname`.

### Dashboard (`src/app/page.tsx`)

- Si no hay access token, renderiza `<LoginForm />`.
- Si hay token, muestra tarjetas de acceso rápido a cada sección.

---

## 7. Páginas principales

### Productos (`/products`)

- Tabla con paginación y búsqueda **server-side** (`page`, `limit`, `search`).
- Botón para crear producto.
- Cada fila tiene link a edición.

### Edición de producto (`/products/[id]`)

- Formulario de datos básicos.
- CRUD de variantes.
- Gestión de imágenes:
  - Subir nueva imagen.
  - Reordenar con flechas ↑ ↓.
  - Eliminar imagen.

### Categorías (`/categories`)

- Listado y formulario para crear/editar categorías.

### Stock (`/inventory`)

- Tabla de variantes con modo de stock (`MADE_TO_ORDER` / `TRACKED`).
- Edición de cantidad de inventario.

### Cupones (`/coupons`)

- Tabla de cupones.
- Modal para crear/editar cupones.
- Toggle de activo/inactivo.

### Diseños personalizados (`/custom-designs`)

- Moderación de diseños creados desde el storefront.
- Filtro por estado: `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`.
- Preview de imagen.
- Acciones: aprobar / rechazar.

### Configuración (`/store-config`)

- Formulario para editar nombre, colores, logo, hero, contacto, moneda, etc.

---

## 8. Subida de archivos

### `src/lib/assets.ts`

Helper para subir imágenes al endpoint de admin:

```ts
export async function uploadAsset(file: File): Promise<{ id: string; url: string }>
```

Usa `FormData` y llama a `POST /admin/assets/upload`. Después se usa el `assetId` para asociar la imagen a un producto.

---

## 9. Theming

El panel usa un tema básico de Mantine (`theme-provider.tsx`) sin el estilo NÖVA del storefront. Esto mantiene el admin funcional y limpio, priorizando la usabilidad sobre la identidad visual de marca.

Los colores se pueden cambiar desde `/store-config` en el backend, pero el admin no los consume directamente (salvo el nombre de la tienda en el header).

---

## 10. Cómo agregar una nueva pantalla de admin

1. Crear la carpeta bajo `src/app/` con `page.tsx`.
2. Agregar `'use client'` si usa formularios, tablas o mutaciones.
3. Envolver el contenido en `<AdminShell>`.
4. Usar `useQuery` para leer datos y `useMutation` para modificarlos.
5. Agregar el item de menú en `src/components/admin-shell.tsx`.
6. Agregar una card de acceso rápido en `src/app/page.tsx`.
7. Si se agregaron endpoints nuevos, regenerar `api-types`.

---

## 11. Variables de entorno

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Ver `apps/admin/.env.example`.

---

## 12. Comandos útiles

```bash
# Desarrollo
pnpm --filter @ecommerce/admin dev

# Build
pnpm --filter @ecommerce/admin build

# Type check / lint
pnpm --filter @ecommerce/admin typecheck
pnpm --filter @ecommerce/admin lint
```
