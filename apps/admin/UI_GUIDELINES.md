# Reglas de UI — Admin NÖVA

> Aplica a **todo** `apps/admin`. Objetivo: un panel **minimalista, silencioso y consistente** con el design system **"NÖVA Backoffice Architecture"**.
> Referencias obligatorias: `docs/stitch/admin-dashboard/DESIGN.md` (tokens) y las pantallas en `docs/stitch/admin-dashboard/html/` (mapa ruta ↔ pantalla en `docs/stitch/admin-dashboard/INDEX.md`).

---

## Regla 0 — La fuente de verdad es el diseño de Stitch

Antes de crear o tocar una pantalla, compararla con su HTML de referencia en `docs/stitch/admin-dashboard/html/`. Si hay conflicto entre una idea propia y el diseño, **gana el diseño**. Los mockups son estáticos; la lógica funcional vive en `apps/admin`.

## Regla 1 — Nada de estilos nativos del navegador

- El preflight de Tailwind está **desactivado** (convive con Mantine) y `globals.css` resetea `button` (sin borde/fondo/padding nativos).
- **Todo control interactivo debe verse por clases explícitas**: componentes de `src/components/ui/` (`Button`, `Input`, `Checkbox`, `Switch`, `AppModal`, `Pagination`, `StatusPill`…) o utilidades Tailwind.
- Nunca dejar un elemento confiando en el estilo por defecto del navegador. Si se agrega un control nuevo, darle clases siempre.

## Regla 2 — Iconos

- Solo **Material Symbols** vía `<Icon name="..." />`. Nunca SVGs sueltos, emojis ni iconos de otra librería.
- Tamaños: 13–16px (chips/inline), 18–20px (botones/tablas), 22px (acciones táctiles).
- Color en reposo `text-on-surface-variant`; hover `hover:text-on-surface` (o `hover:text-error` solo si es destructivo).
- `filled` únicamente para estados semánticos. **Jamás** iconos dentro de cajas/bordes decorativos.
- Acciones de solo icono = botón **ghost**: sin borde ni fondo, hover sutil `hover:bg-surface-container-low`, y siempre `aria-label`.

## Regla 3 — Superficies y color

- Solo tokens del theme (`surface-*`, `on-surface*`, `outline*`, `primary`, `error`, `secondary-*`…). Acentos semánticos permitidos: emerald/amber/rose/sky en fondos wash suaves con foreground nítido.
- Bordes **hairline**: `border-outline-variant/30` o `/40`. Radios: `rounded-lg` (8px) en controles, `rounded-xl` (12px) en tarjetas/modales, `rounded-full` en pills.
- Sombras suaves permitidas: `shadow-sm`, `shadow-card`, `shadow-pop`, `shadow-modal`.
- **Prohibidos**: gradientes, sombras fuertes/difusas, glassmorphism y colores saturados fuera de la paleta.

## Regla 4 — Tipografía y datos

- Overlines de sección y encabezados de tabla: `font-label-uppercase text-label-uppercase`.
- Montos, cantidades, códigos y celdas numéricas: `font-numeric-tabular`.
- No inventar tamaños, pesos ni tracking fuera de la escala (`headline-*`, `body-*`, `label-*`).

## Regla 5 — Espaciado y densidad

- Múltiplos de 4/8: `gap-2/3/4`, `p-3/4/6`, `px-4 py-2`.
- Tablas: filas de 48–56px, divisores de 1px (`border-outline-variant/30`), hover de fila `hover:bg-surface-container-low`.
- Pills de estado: fondo wash + punto sólido de 6px + label.

## Regla 6 — Componentes existentes primero

- Antes de crear un componente, revisar `src/components/ui/`. Modales → `AppModal`; botones → `Button` (`primary` / `secondary` / `ghost` / `danger`).
- Las variantes nuevas se agregan a los componentes base, no se parchean dentro de las páginas.
- **Acciones contextuales = ancladas al trigger** (Popover/dropdown), nunca modal centrado. Ej.: la búsqueda global abre su panel directamente bajo la barra de búsqueda.

## Regla 7 — Accesibilidad mínima

- `aria-label` en botones de solo icono; `role`/`aria-checked` en controles custom; conservar el foco visible nativo; contraste AA.

## Regla 8 — i18n: solo textos quemados

- Todo texto visible **hardcodeado** debe pasar por `useTranslation()` (`src/providers/i18n-provider.tsx`) y vivir en `src/lib/i18n-dictionaries.ts` (`es` / `en` / `pt`, siempre con las mismas claves — el tipo `Dictionary` sale del diccionario ES).
- **NO** traducir datos que vienen por parametrización (API o store-config): nombres, emails, slugs, categorías, monedas, montos, fechas y similares se muestran tal cual.
- Estructura de claves: `header.*`, `nav.*`, `sidebar.*` (shell); `pages.<pantalla>.*` (pantallas); `common.*` (compartidos). Textos con variables: guardar el patrón con `{{variable}}` y reemplazar en el componente.

## Regla 9 — Movimiento (framer-motion)

- Usar los primitives de `src/components/ui/motion.tsx` (`fadeInUp`, `staggerContainer`, `tableRowsContainer`, `popIn`, `AnimatedNumber`, `Reveal`, `MotionProvider`) y `SegmentedTabs`; no definir variantes sueltas por componente.
- Duraciones **150–250ms** (números 600ms), ease-out sobrio (`MOTION_EASE`), desplazamientos ≤8px; springs solo para indicadores/reorder (`LAYOUT_SPRING` / `DRAWER_SPRING`), sin rebotes llamativos.
- `MotionConfig reducedMotion="user"` (en `AdminFrame`) respeta `prefers-reduced-motion`.
- Uniformidad por tipo de elemento:
  - Tabs/filtros segmentados → `SegmentedTabs` (indicador deslizante con `layoutId` único).
  - KPIs numéricos o de moneda → `AnimatedNumber` con el formateador de la página.
  - Tablas de listado → `motion.tbody` + `tableRowsContainer` y filas `motion.tr` + `fadeInUp`.
  - Pantallas largas → `Reveal` por sección (una sola vez).
  - Reorders visibles (árbol de categorías, galería de producto) → `motion.div layout` + `LAYOUT_SPRING`.
  - Modales → transición pop; botones → `whileTap`.
- No agregar animaciones fuera de este catálogo sin justificarlo.

---

## Checklist antes de dar una UI por terminada

- [ ] ¿Coincide con la pantalla de Stitch correspondiente (`INDEX.md`)?
- [ ] ¿Todos los botones/controles tienen clases explícitas (sin chrome nativo)?
- [ ] ¿Iconos Material Symbols con tamaño/color correctos y sin cajas decorativas?
- [ ] ¿Solo tokens de color del theme (sin hex sueltos ni colores fuera de paleta)?
- [ ] ¿Números con `font-numeric-tabular` y labels con `font-label-uppercase`?
- [ ] ¿`pnpm --filter @ecommerce/admin lint typecheck build` pasa?

---

## Notas técnicas

- `apps/admin/tailwind.config.ts` porta los tokens 1:1 desde Stitch; `globals.css` incluye Material Symbols y los resets mínimos.
- Los botones ghost del `Button` y los botones de icono no llevan borde por diseño; si alguno aparece "encajonado", es señal de que el reset global no se está aplicando o de que se usó un elemento sin clases.
