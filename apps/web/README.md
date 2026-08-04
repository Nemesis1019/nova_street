# Storefront Web — Rediseño NÖVA

Este documento resume los cambios aplicados al storefront (`apps/web`) para alinear su identidad visual con el proyecto **Ecommerce / NÖVA** de Stitch, manteniendo toda la funcionalidad existente del backend.

---

## 1. Resumen

Se migró el storefront de un estilo genérico basado en Mantine a un **design system Minimalista-Brutalista** inspirado en NÖVA: alta tipografía condensada, esquinas afiladas, paleta de alto contraste y componentes con bordes estructurales.

Todas las pantallas funcionales existentes se conservan; lo que cambió fue su presentación visual y la adición de nuevas pantallas que faltaban en la plantilla original.

---

## 2. Design system aplicado

### Paleta de colores
| Token | Valor | Uso |
|-------|-------|-----|
| Surface / fondo | `#fcf9f8` | Fondo general, tarjetas, footer |
| Primario / texto | `#0d0d0d` | Textos principales, bordes, botones primarios |
| Acento / oliva | `#6f7a4e` | Marquees, estados de énfasis, hover |
| Neutro | `#282828` | Bloques secundarios, placeholder de imágenes |
| Surface container | `#f6f3f2` | Cajas de formularios, resúmenes de orden |
| Outline | `#747878` | Líneas divisorias sutiles |

### Tipografía
| Uso | Fuente | Carga |
|-----|--------|-------|
| Títulos / logo / nav | **Bebas Neue** | `next/font/google` → `bebasNeue.className` |
| Cuerpo | **Inter** | `next/font/google` → `inter.className` en `<body>` |
| Labels / precios / SKU | **JetBrains Mono** | `next/font/google` → `jetbrainsMono.className` |

### Formas y componentes
- **Radio 0px** en todos los elementos (botones, inputs, tarjetas, imágenes).
- **Bordes estructurales** de 1px/2px en `#0d0d0d` para definir jerarquía.
- **Sin sombras**; la profundidad se logra por contraste y bordes.
- **Inputs** con solo borde inferior.
- **Botones** en mayúsculas, tracking amplio, padding generoso.

---

## 3. Cambios por área

### 3.1 Layout global
- **`src/app/layout.tsx`**
  - Importa las fuentes de NÖVA.
  - Aplica `inter.className` al `<body>`.
  - Actualiza `defaultConfig` para que, si el backend no responde, los colores por defecto sean los de NÖVA.
  - Aplica variables CSS de Bebas Neue y JetBrains Mono al `<html>`.

- **`src/providers/theme-provider.tsx`**
  - Define colores, tipografía y estilos base de Mantine alineados con NÖVA.
  - `defaultRadius: 0`.
  - Sobreescribe estilos de `Button`, `Card`, `TextInput`, `PasswordInput`, `NumberInput`, `Select`, `Radio`, `Badge` y `Table`.

### 3.2 Navegación superior (`src/components/store-header.tsx`)
- Logo con tipografía Bebas Neue.
- Links de navegación: **Colecciones**, **Personalizar**, **Nosotros**.
- Selector de moneda estilo técnico: **COP / USD**.
- Carrito con ícono y badge.
- Usuario invitado: link **Ingresar**.
- Usuario autenticado: ícono de cuenta que lleva a `/account`.
- Menú mobile tipo drawer con tipografía grande y bordes afilados.
- **Colores hardcodeados a NÖVA** para evitar que la config antigua del backend los sobrescriba.

### 3.3 Footer (`src/components/store-footer.tsx`)
- Fondo `#fcf9f8` hardcodeado.
- Título de marca en Bebas Neue.
- Secciones: Navegación, Contacto, Newsletter.
- Métodos de pago y copyright.
- Input + botón de newsletter con bordes afilados.

### 3.4 Home (`src/app/page.tsx`)
- Hero fullscreen con imagen configurable y overlay oscuro.
- Título principal en Bebas Neue responsivo.
- Botones de acción: *Explorar Ahora* / *Personalizar*.
- **Marquee animado** con mensajes del drop.
- Sección de colección destacada.
- Grid de productos destacados.
- Bloque de identidad visual con fondo negro invertido.

### 3.5 Catálogo (`src/app/catalogo/page.tsx`)
- Header de página con título grande "COPA MUNDO".
- Sidebar con filtros visuales:
  - Tallas: S, M, L, XL.
  - Rangos de precio.
  - Filtros activos con opción de limpiar.
- Grid de productos.
- Sección inferior de lookbook con CTA.

### 3.6 Detalle de producto (`src/app/producto/[slug]/page.tsx`)
- Imagen principal con borde afilado.
- Nombre del producto en Bebas Neue grande.
- Precio en JetBrains Mono.
- Caja de acción con selector de variante, cantidad y botón *Añadir al Carrito*.
- Mantiene la funcionalidad de carrito anónimo y autenticado.

### 3.7 Carrito (`src/app/cart/page.tsx`)
- Layout de dos columnas: items a la izquierda, resumen a la derecha.
- Cada item en una fila con borde, cantidad y eliminar.
- Resumen con subtotal, envío y total.
- Botón de checkout.
- Soporta carrito local (invitado) y carrito del servidor (autenticado).

### 3.8 Checkout (`src/app/checkout/page.tsx`)
- Header "Secure Checkout".
- Formulario de dirección de envío con direcciones guardadas.
- Selector de método de pago: Tarjeta, PSE, Mercado Pago.
- Resumen de orden.
- Flujo de creación de orden, aplicación de cupón y confirmación de pago.

### 3.9 Autenticación
- **Login (`src/app/login/page.tsx`)**: layout split con título grande, formulario, login social y footer.
- **Register (`src/app/register/page.tsx`)**: layout split con título, formulario, checkboxes de términos/newsletter, login social y footer.

### 3.10 Cuenta de usuario
- **`src/components/account-layout.tsx`**: layout con sidebar (Perfil, Direcciones, Pedidos, Seguridad).
- **`src/app/account/page.tsx`**: perfil del usuario y cerrar sesión.
- **`src/app/account/addresses/page.tsx`**: pantalla de direcciones (generada).
- **`src/app/account/security/page.tsx`**: cambio de contraseña (generada).
- **`src/app/orders/page.tsx`**: listado de pedidos con tabla estilo NÖVA.
- **`src/app/orders/[id]/page.tsx`**: detalle de pedido con stepper de seguimiento y resumen.

---

## 4. Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/lib/fonts.ts` | Configuración de `next/font/google` para Bebas Neue, Inter y JetBrains Mono. |
| `src/components/marquee.tsx` | Componente cliente de marquee animado para la home. |
| `src/components/ui/button.tsx` | Botones cliente con soporte de íconos, evitando problemas de Server Components. |
| `src/components/account-layout.tsx` | Layout con sidebar para las vistas de cuenta. |
| `src/app/catalogo/catalog-filters.tsx` | Filtros visuales de talla y precio. |
| `src/app/account/addresses/page.tsx` | Pantalla de direcciones. |
| `src/app/account/security/page.tsx` | Pantalla de seguridad / contraseña. |

---

## 5. Funcionalidad preservada

- Carrito anónimo con `zustand` + `persist`.
- Sincronización del carrito al iniciar sesión.
- Checkout con direcciones, cupones y confirmación de pago.
- Autenticación (login/register) con manejo de errores y notificaciones.
- Listado y detalle de pedidos.
- Configuración de tienda desde el backend (nombre, descripción, logo, moneda, hero).

---

## 6. Cómo ejecutar

```bash
# Desde la raíz del monorepo
pnpm install

# Ejecutar el storefront en desarrollo
pnpm --filter @ecommerce/web dev

# O desde apps/web
pnpm dev
```

### Verificación de calidad
```bash
# Lint
pnpm lint

# Type check
pnpm typecheck

# Build de producción
pnpm build
```

---

## 7. Notas técnicas

- Los colores del header y footer se hardcodearon a NÖVA porque la configuración antigua del backend podía sobrescribirlos.
- Se usó `next/font/google` con `className` directo para asegurar que las fuentes se carguen correctamente sin depender solo de variables CSS.
- Los componentes con íconos que se renderizan desde Server Components se encapsularon en componentes cliente (`UiButton`) para evitar errores de serialización de React en Next.js 16.
