# Plan de personalización del storefront multi-tenant

**Fecha:** 2026-10-24  
**Estado:** v1 implementada (Fases 0-2; Fase 3 parcial)  
**Objetivo:** que cada tenant pueda construir una identidad visual y una composición claramente distintas, sin forks de código ni lógica condicional por cliente.

---

## 1. Resumen ejecutivo

Hoy el demo de café se parece a NÖVA porque **no está usando otro template**: está usando el mismo `storefront` con otros colores, textos e imágenes. La personalización existente es una capa de ajustes sobre un único layout, no un sistema de composición.

La solución recomendada es un **storefront schema-driven** con tres capas:

1. **Design tokens** por tenant (color, tipografía, espaciado, radios, bordes, sombras, tratamiento de imagen).
2. **Secciones y bloques tipados** con variantes reales de layout (no solo toggles), reordenables por página.
3. **Presets de template** que siembran una composición; el tenant puede personalizarla dentro de un marco curado.

Todo se edita en un **builder visual** con borrador, preview, publicación y versiones. El renderer es el mismo para todos; la diferencia vive en los datos del tenant, no en el código.

El primer hito debe demostrar dos tiendas visiblemente distintas usando el mismo renderer: **Grano Editorial** (café) y **NÖVA Streetwear** (actual). Si no se logra eso, el resto del plan no resuelve el problema.

---

## 2. Diagnóstico actual

### Lo que existe

- `StoreConfig` con colores base, logo, hero, moneda y algunos flags.
- `storefrontConfig` JSON con:
  - `homeSections` (hero, collectionShowcase, categories, featuredProducts, promoBanner, countdown, newsletter, productSpotlight, identity).
  - copy y links de algunas secciones, fuentes, footer, productCard, badges, catalog, checkout, popups, SEO.
- `templateConfig` con:
  - `heroLayout` (`centered | split | minimal`).
  - `showMarquee`, `showIdentitySection`.
  - `productCardVariant` (`default | minimal`).
  - `headerVariant` (`default | centered | minimal`).
  - hero CTA/eyebrow, `productEyebrow`.
- Un único template implementado: `storefront`.
- La página de Plantillas del admin ofrece `minimal_editorial`, `streetwear_drop` y `brutalist_mono`, pero están **deshabilitados**.

### Por qué el café se parece a NÖVA

1. **Mismo esqueleto**: header, hero, grilla de productos, showcase, footer y página de producto son los mismos componentes y el mismo orden.
2. **Variantes cosméticas**: `heroLayout: split` solo cambia la alineación del texto; `headerVariant` cambia poco; `productCardVariant: minimal` deja la card sin imagen (por eso el demo usa `default`). No hay variantes reales de layout.
3. **Estilos hardcodeados**: hay ~126 referencias a `#fcf9f8`/`#0d0d0d` y ~54 referencias a la tipografía Bebas en componentes del storefront. Cambiar tokens desde el admin no llega a todos los componentes.
4. **Secciones rígidas**: las secciones existen, pero cada una tiene una sola estructura visual y copy/estilos fijos. No se puede cambiar una hero por una composición asimétrica, ni una grilla por un listado editorial.
5. **Un solo template real**: no hay presets que cambien la jerarquía, la densidad, los ratios de imagen, la navegación ni el footer.
6. **Editor limitado**: el admin expone un formulario de configuración, no una experiencia de composición con preview y publicación.

La diferencia actual es de **branding**, no de **diseño de tienda**. Para que un cliente se diferencie, hay que mover la variación a **tokens + bloques + presets**.

---

## 3. Principios rectores

1. **Variación en datos, no en código.** Nada de `if (tenant === 'demo')` ni templates forkeados.
2. **Flexibilidad curada.** Un catálogo de secciones/variantes bien diseñadas es más mantenible que un builder libre tipo Webflow.
3. **El layout importa más que el color.** Dos tiendas con la misma paleta deben poder verse distintas por composición, tipografía, densidad y tratamiento de imagen.
4. **Preview y publicación seguros.** El tenant edita un borrador; los visitantes solo ven una revisión publicada.
5. **Guardrails por defecto.** Contraste, fuentes permitidas, tamaños de imagen, cantidad de secciones/bloques y performance.
6. **Commerce fuera del tema.** Precios, stock, pagos y checkout no se configuran en el layout.
7. **Compatible con lo existente.** NÖVA y Grano deben seguir funcionando durante la migración.
8. **Server-first.** El storefront se renderiza en servidor; el cliente solo para interacciones. Las secciones no deben depender de un fetch cliente para existir.

---

## 4. Arquitectura objetivo

```
┌──────────────────────────────┐
│ Admin / Builder              │
│  · Theme studio              │
│  · Page outline + canvas     │
│  · Inspector de bloque       │
│  · Draft / preview / publish │
└──────────────┬───────────────┘
               │ API admin (tenant)
               ▼
┌──────────────────────────────┐
│ Storefront schema + validate │
│  · Design tokens             │
│  · Pages → sections → blocks │
│  · Revisions                 │
└──────────────┬───────────────┘
               │ published snapshot
               ▼
┌──────────────────────────────┐
│ Storefront renderer          │
│  · Tenant + tokens → CSS vars│
│  · Block registry            │
│  · Server components         │
│  · Media + dynamic sources   │
└──────────────────────────────┘
```

### 4.1 Capas de personalización

| Nivel | Qué controla | Quién lo edita |
|---|---|---|
| 1. Marca | logo, favicon, colores, tipografías, radios, sombras, densidad | Admin del tenant |
| 2. Contenido | textos, imágenes, links, CTAs, navegación, footer | Admin del tenant |
| 3. Layout | secciones, orden, variantes, bloques internos, visibilidad | Admin del tenant |
| 4. Páginas | home, catálogo, producto, páginas estáticas, 404 | Admin del tenant |
| 5. Avanzado | CSS acotado, scripts aprobados, overrides por página, A/B tests | Plataforma / superadmin |

### 4.2 Design tokens

Un contrato de tokens semánticos, no valores sueltos:

```json
{
  "color": {
    "canvas": "#FCF9F8",
    "surface": "#FFFFFF",
    "surfaceMuted": "#F4EFE7",
    "text": "#1F1B16",
    "textMuted": "#6B6258",
    "brand": "#1F1B16",
    "accent": "#6F7A4E",
    "border": "#DCD2C4",
    "inverse": "#FCF9F8"
  },
  "font": {
    "display": "Fraunces",
    "heading": "Fraunces",
    "body": "Inter",
    "mono": "JetBrains Mono"
  },
  "type": {
    "displaySize": "clamp(3rem, 8vw, 7rem)",
    "headingWeight": 500,
    "bodySize": "16px",
    "letterSpacing": "0"
  },
  "space": {
    "section": "96px",
    "block": "32px",
    "container": "1400px",
    "gridGap": "24px"
  },
  "shape": {
    "radius": "0px",
    "borderWidth": "1px",
    "shadow": "none"
  },
  "image": {
    "productRatio": "4/5",
    "heroOverlay": 0.35,
    "heroFocus": "center"
  },
  "motion": {
    "marquee": false,
    "reveal": "fade"
  }
}
```

- Los componentes usan **tokens semánticos** (`--color-canvas`, `--font-display`, `--space-section`).
- El render inyecta las variables en el `<head>` antes del primer paint; no hay flash de tema.
- Validación de contraste y valores permitidos antes de publicar.
- Los tokens se guardan por tenant; presets y defaults viven en código.

### 4.3 Secciones y bloques

Cada sección es un módulo registrado con:

- `type`: `hero`, `productGrid`, `categoryGrid`, `story`, `promo`, `testimonials`, `faq`, `newsletter`, `footer`, etc.
- `variants`: por ejemplo `hero: fullBleed | split | asymmetric | minimal | video`.
- `settingsSchema`: campos tipados, validaciones, defaults y textos de ayuda.
- `blocks`: sub-bloques permitidos (ej. slides, features, links).
- `allowedPages`: home, product, collection, page.
- `max`: límites de seguridad.

Ejemplo conceptual:

```json
{
  "id": "hero-home",
  "type": "hero",
  "variant": "asymmetric",
  "settings": {
    "eyebrow": "Café de especialidad",
    "title": "Café de origen",
    "subtitle": "Tostado en pequeños lotes.",
    "image": { "assetId": "...", "focalPoint": "center" },
    "overlay": 0.45,
    "align": "left",
    "ctas": [
      { "label": "Comprar café", "href": "/catalogo", "style": "solid" },
      { "label": "Nuestra historia", "href": "/pagina/nuestra-historia", "style": "outline" }
    ]
  }
}
```

Reglas:

- IDs estables: reordenar no cambia el ID.
- Settings tipados; nada de HTML libre en secciones normales.
- Dynamic sources: producto, colección, categoría, página, asset; el admin usa pickers, no IDs a mano.
- Una sección que no existe o no valida **falla el publish**, no se renderiza a medias.
- Límites: ~25 secciones por página y ~50 bloques por sección (modelo probado por Shopify OS 2.0).

### 4.4 Presets

Un preset es una **composición inicial + tokens + contenido de ejemplo**; no un fork.

Presets iniciales propuestos:

1. **Coffee Editorial** — Grano: header centrado, hero asimétrico, fotografía grande, serif, mucho aire, cards editoriales, historia con imagen, footer con horarios.
2. **Streetwear Drop** — NÖVA: hero full-bleed oscuro, condensed, marquee, drops, countdown, cards oversized, lookbook.
3. **Minimal Boutique** — marca blanca, tipografía sans, grilla limpia, mucho blanco, foco en producto.
4. **Market Catalog** — muchas categorías, densidad media, filtros visibles, cards compactas.
5. **Beauty / Studio** (fase 3) — editorial suave, texturas, storytelling.

Cada preset define:

- tokens por defecto,
- páginas y secciones iniciales,
- variantes de header/footer/product card,
- navegación y footer,
- assets de ejemplo (reemplazables).

El tenant puede **duplicar y editar** el preset; la plataforma puede publicar nuevos presets y upgrades.

### 4.5 Modelo de datos propuesto

En la BD de cada tenant (sin `tenantId`, porque ya es DB por cliente):

```prisma
model StorefrontTheme {
  id          String   @id @default(uuid()) @db.Uuid
  presetKey   String
  tokens      Json
  status      ThemeStatus @default(DRAFT)
  version     Int      @default(1)
  updatedById String?  @db.Uuid
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("storefront_themes")
}

model StorefrontPage {
  id               String   @id @default(uuid()) @db.Uuid
  pageType         StorefrontPageType
  slug             String?
  draft            Json
  published        Json?
  publishedVersion Int?
  updatedById      String?  @db.Uuid
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@unique([pageType, slug])
  @@map("storefront_pages")
}

model StorefrontRevision {
  id          String   @id @default(uuid()) @db.Uuid
  pageId      String?  @db.Uuid
  themeId     String?  @db.Uuid
  snapshot    Json
  createdById String?  @db.Uuid
  createdAt   DateTime @default(now())
  @@map("storefront_revisions")
}
```

- `draft` es mutable; `published` es la revisión que ve el público.
- `publish` valida, copia draft → published y crea una revisión.
- `rollback` restaura una revisión como nuevo draft/publicado.
- El `StoreConfig` sigue existiendo para datos comerciales/base (nombre, moneda, contacto, envío, etc.).
- La maestra no necesita guardar el tema; vive en la BD del tenant. El renderer recibe el tenant resuelto.

**Alternativa MVP (más rápida):** guardar `storefrontThemeDraft`, `storefrontThemePublished`, `storefrontHomeDraft`, `storefrontHomePublished` en `StoreConfig`. Se puede empezar así y normalizar cuando el builder esté estable. El plan recomienda normalizar desde el inicio si se quiere historial y rollback serios.

### 4.6 API

Público:

- `GET /storefront` → config pública + theme publicado + página publicada.
- `GET /storefront/pages/:type/:slug?` → página publicada.
- `GET /storefront/preview?token=...` → borrador con token firmado, `noindex`, sin cache público.

Admin (tenant):

- `GET /admin/storefront/theme`
- `PATCH /admin/storefront/theme`
- `GET /admin/storefront/pages`
- `GET /admin/storefront/pages/:id`
- `PATCH /admin/storefront/pages/:id`
- `POST /admin/storefront/pages/:id/publish`
- `POST /admin/storefront/pages/:id/rollback`
- `GET /admin/storefront/presets`
- `POST /admin/storefront/presets/:key/apply`
- `POST /admin/storefront/preview-token`

Reglas:

- Validación Zod compartida entre admin, API y renderer.
- Publish atómico y auditado.
- Invalidación de cache por tenant al publicar.
- Preview firmado y con TTL; el iframe no indexa ni comparte cookies públicas.
- Permisos: `THEME_READ/WRITE/PUBLISH`; el superadmin mantiene el control de scripts/avanzado.

### 4.7 Renderer

- `apps/web/src/components/storefront/blocks/` con un registry `type → componente`.
- Tokens inyectados en `<head>` como CSS variables.
- Server components para contenido; islas cliente para carrito, wishlist, etc.
- Todas las secciones deben poder renderizar en SSR (hoy el showcase depende de un fetch cliente; hay que corregirlo).
- Media: `<picture>`/`next/image`, ratios, focal point, lazy loading, alt obligatorio.
- Datos dinámicos resueltos en el servidor (producto, categoría, colección) con cache por tenant.
- Fallbacks seguros por bloque; errores aislados por sección.
- A11y: contraste, foco, navegación por teclado, tamaños táctiles.
- SEO: metadata por página, sitemap, canonical, datos estructurados.

---

## 5. Editor visual del admin

### Layout

- **Izquierda:** páginas (Home, Catálogo, Producto, Header/Footer, Páginas), outline de secciones y botón “Agregar sección”.
- **Centro:** canvas con preview real en desktop/tablet/mobile.
- **Derecha:** inspector del bloque seleccionado, campos tipados y ayuda contextual.
- **Arriba:** selector de preset, estado draft/published, preview, publicar, versiones, undo/redo.

### Funciones clave

- Drag & drop de secciones y bloques.
- Duplicar, ocultar, eliminar, mover.
- Editar copy, imágenes, CTAs, colores por sección cuando el schema lo permita.
- Pickers de producto/categoría/página/asset.
- Biblioteca de medios con focal point y crops.
- Presets y “reset a preset” con confirmación.
- Autosave de draft y preview con recarga.
- Historial de versiones con diff y rollback.
- Validación antes de publicar: contraste, imágenes faltantes, links, cantidad de secciones, performance estimada.
- Onboarding: elegir rubro/preset → cargar logo/colores/fuentes → revisar home → publicar.

### Permisos

- **Tenant admin:** tokens permitidos, contenido, layout, publish.
- **Platform superadmin:** presets globales, CSS/JS avanzado, locks, auditoría, rollback, límites por plan.
- El superadmin sigue siendo el único que toca proveedores/API keys (ya implementado).

---

## 6. Catálogo inicial de secciones y variantes

| Sección | Variantes mínimas |
|---|---|
| Header | clásico, centrado, split, minimal, mega menú, sticky compacto |
| Hero | full-bleed, split imagen/texto, asimétrico, minimal, video/fondo |
| Productos | grid, editorial, lista, carrusel, lookbook, “shop the look” |
| Categorías | tiles, cards con imagen, lista, mosaico |
| Historia | imagen + texto, full-bleed, quote, timeline |
| Promo | banner, caja, split, suscripción |
| Social proof | testimonios, logos, reseñas |
| Newsletter | inline, bloque, footer |
| FAQ | acordeón, dos columnas |
| Footer | minimal, columnas, newsletter + contacto/horarios |
| Ficha de producto | galería izquierda/centro, buy box sticky, tabs, relacionados |
| Catálogo | filtros sidebar/drawer, grilla editorial/compacta |

Con 10-12 secciones y 3-4 variantes cada una ya se obtienen combinaciones muy distintas sin un builder infinito.

---

## 7. Roadmap por fases

### Fase 0 — Fundaciones y prueba de diferenciación (1-2 semanas)

- Auditar y tokenizar los componentes del storefront; eliminar colores/fuentes hardcodeadas.
- Definir `StorefrontTokens`, `SectionSchema`, `PageSchema` y versionado en `packages/shared`.
- Crear un prototipo de dos presets: **Grano Editorial** y **NÖVA Streetwear**.
- Corregir SSR de secciones que hoy dependen del cliente.
- Definir el editor (wireframe) y el modelo de datos.
- **Aceptación:** las dos tiendas se ven claramente distintas en header, hero, composición, tipografía, cards y footer; NÖVA y Grano siguen funcionando.

### Fase 1 — MVP del builder de Home (3-4 semanas)

- Theme studio (tokens + presets).
- Builder de Home con hero, productos, categorías, historia, promo, newsletter y footer.
- Draft/preview/publish/rollback para Home y tema.
- Migración automática del `storefrontConfig` actual a un documento nuevo.
- Primeros 3 presets: Coffee Editorial, Streetwear Drop, Minimal Boutique.
- **Aceptación:** un tenant puede publicar un home distinto sin tocar código; preview móvil/desktop; versiones.

### Fase 2 — Páginas y navegación (3-4 semanas)

- Header/footer/nav configurables con variantes.
- Catálogo y ficha de producto configurables.
- Páginas estáticas con bloques.
- Media library con focal point; pickers dinámicos.
- Historial de versiones completo, permisos y auditoría.
- **Aceptación:** la mayor parte de la identidad de una tienda se edita desde el admin; no quedan colores hardcodeados en el storefront.

### Fase 3 — Avanzado (3-4 semanas)

- CSS acotado y scripts aprobados (solo plataforma).
- Overrides por página, A/B testing, banners programados.
- Preset marketplace / clonar tema entre clientes.
- Onboarding guiado y health checks de tema.
- **Aceptación:** onboarding de un cliente nuevo con tema propio en menos de un día.

**Equipo estimado:** 2 frontend, 1 backend, 1 diseño/producto, QA parcial.  
**MVP Home:** ~6 semanas. **V1 robusta:** ~12-14 semanas.

---

## 8. Compatibilidad y migración

- Mantener `storefront` actual como **legacy adapter** durante la transición.
- Script de migración: `storefrontConfig` + `templateConfig` → `StorefrontTheme` + `StorefrontPage` (Home/Catálogo/Producto/Header/Footer).
- Feature flag `storefrontBuilder` por tenant.
- Publicar primero en demo; NÖVA después; rollback disponible.
- No romper URLs, SEO, emails ni checkout.
- Versionar el schema (`schemaVersion`) y migrar documentos viejos al leer.
- Tests de snapshot del render legacy vs nuevo.

---

## 9. Testing, calidad y operación

- **Unit:** validación de tokens/bloques, sanitización, migraciones.
- **API:** draft/publish/rollback, permisos, aislamiento por tenant, cache.
- **Renderer:** snapshot por preset y por sección; visual regression con Playwright/Storybook.
- **E2E:** editar → preview → publicar → ver cambios → rollback.
- **A11y:** axe + contraste automático; teclado.
- **Performance:** LCP/CLS/INP budgets; imágenes optimizadas; CSS variables (sin builds por tenant).
- **Observabilidad:** errores de render por bloque, publishes fallidos, tiempos de preview, uso de presets.
- **Seguridad:** tokens/CSS sanitizados, scripts en allowlist, preview firmado, CSP, no secretos en el tema.
- **Multi-tenant:** cache y preview aislados; tests de fuga entre tenants.

---

## 10. Métricas de éxito

- ≥ 80% de los cambios de tema hechos sin intervención de desarrollo.
- ≥ 4 presets con diferencias reales de layout.
- Nuevo tenant con identidad propia en < 1 día.
- 100% de las páginas core (home, catálogo, producto) editables.
- 0 colores/fuentes de marca hardcodeados en componentes del storefront.
- Contraste AA y performance dentro de budget.
- Publicaciones con rollback en un clic.
- Cero fugas de datos/config entre tenants.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Builder demasiado libre → caos visual | Catálogo curado + presets + validaciones |
| Explosión de variantes y tests | Registry central, contratos de schema, visual regression |
| Deuda por estilos hardcodeados | Fase 0 de tokenización obligatoria |
| Romper NÖVA/Grano | Feature flag, migración, snapshots, rollback |
| Performance | CSS vars, SSR, imágenes optimizadas, límites de bloques |
| Seguridad por HTML/CSS/JS | Settings tipados; CSS sanitizado; JS solo plataforma |
| Conflictos de edición | Autosave + versiones + bloqueo optimista |
| Fonts con licencia | Catálogo de fuentes permitidas/self-hosted |
| Cache multi-tenant | Invalidación por tenant + tests de aislamiento |

---

## 12. Decisiones que necesitamos tomar

1. **Libertad:** ¿builder curado (recomendado) o composición libre tipo Webflow?
2. **Alcance inicial:** ¿Home + Header/Footer o también Producto/Catálogo desde el MVP?
3. **Permisos:** ¿el admin del tenant publica directo o requiere aprobación de plataforma?
4. **Custom code:** ¿permitimos CSS/JS por tenant? Recomendación: CSS acotado y JS solo plataforma, con allowlist.
5. **Presets de lanzamiento:** Coffee, Streetwear, Minimal Boutique y Market.
6. **Historial:** versiones completas desde el inicio (más trabajo) o después del MVP.
7. **Idiomas:** ¿los textos del tema se traducen por locale desde el inicio?

---

## 13. Implementación v1 (2026-10-24)

Ya está implementado y publicado:

- **Schema compartido** `StorefrontDocument` con tokens, header/footer, páginas y 8 tipos de sección con variantes (`packages/shared/src/storefront-document.ts`).
- **Persistencia por tenant**: `storefrontDraft`, `storefrontPublished`, `storefrontVersion` y `storefrontPresets` en `StoreConfig` + tablas `storefront_revisions` y `storefront_experiment_events`. Migraciones aplicadas a `ecommerce` (nova) y `tenant_demo`.
- **API**:
  - `/admin/storefront` (estado + presets)
  - `PUT /admin/storefront/draft`
  - `POST /admin/storefront/publish`
  - `POST /admin/storefront/presets` / `DELETE /admin/storefront/presets/:id` (presets propios)
  - `POST /admin/storefront/presets/:key/apply`
  - `GET /admin/storefront/versions`
  - `POST /admin/storefront/versions/:id/restore`
  - `GET /admin/storefront/experiments/:id/results`
  - `PATCH /admin/storefront/approval` (solo plataforma: activar/desactivar workflow)
  - `POST /admin/storefront/approval/submit`
  - `POST /admin/storefront/approval/approve` (solo plataforma)
  - `POST /admin/storefront/approval/reject` (solo plataforma)
  - `POST /admin/storefront/preview-token`
  - `GET /storefront/preview?token=...` (público, firmado por tenant)
  - `POST /storefront/experiment-event` (público, anónimo, solo experimentos publicados)
  - `GET /admin/assets` (biblioteca de medios del tenant)
  - `/store-config` expone solo `storefrontDoc` publicado; nunca el draft.
- **Builder admin** en `/design` y en el menú **Diseño de tienda**:
  - presets, tema (colores/fuentes/tipografía/forma/espaciado/CSS), header/footer, home por secciones, catálogo y ficha de producto;
  - páginas estáticas por slug con los mismos bloques del home;
  - agregar/reordenar/ocultar/eliminar secciones;
  - subir imágenes a R2 desde los campos de imagen (además de pegar URLs);
  - **biblioteca de medios** del tenant con búsqueda visual, selección y subida;
  - **encuadre de imagen** en hero/story con focal point y zoom (100–200%);
  - **crop persistente por asset** con foco X/Y y zoom, aplicado a imágenes de producto;
  - **marketplace remoto de temas** con preview de los temas publicados de otros clientes (superadmin);
  - **marketplace público** en `/temas` con la identidad, paleta, tipografías y acceso al panel;
  - **sandbox de scripts** aislado en `/design` para probar HTML/JS sin persistir ni tocar producción;
  - **programación de anuncios y promos** con desde/hasta;
  - **presets propios** por tenant (guardar borrador, aplicar, eliminar) e importación del tema de otro cliente para superadmins;
  - **experimentos A/B del título del hero** con asignación estable por visitante, variantes A/B, tráfico y medición de impresiones/clics;
  - preview desktop/tablet/mobile con token temporal, incluyendo la página estática que se está editando;
  - guardar borrador, publicar, versiones y restore.
- **Página estática publicada de ejemplo**: `/pagina/nuestra-historia` del demo ya usa el builder (story + newsletter).
- **Renderer web**:
  - home por bloques: hero, producto, categorías, historia, promo, newsletter, marquee, FAQ;
  - tokens CSS inyectados antes del paint;
  - header/footer tokenizados, variantes de header y footer minimal;
  - product card **editorial**;
  - catálogo por variante/columnas/filtros/orden;
  - ficha de producto con galería izquierda/derecha, sticky buy box, reviews y relacionados configurables;
  - preview de borrador.
- **Presets publicados**:
  - demo: `coffee-editorial` (Grano)
  - nova: `streetwear-drop` (NÖVA)
  - disponibles además `minimal-boutique` y `market-catalog`.

### Experimentos A/B

- El documento publica `experiments[]` con dos alcances:
  - **título del hero**: variantes A/B son textos;
  - **perfil de movimiento**: variantes A/B son `none`, `quiet`, `editorial` o `kinetic` aplicados al home.
- El middleware de la web emite una cookie first-party `nova_visitor` (HttpOnly, 1 año) y un header interno; la asignación es determinística por `visitorId + experimentId` y porcentaje de tráfico.
- La variante se aplica server-side antes del paint; no hay flash de contenido.
- En motion, el perfil se aplica a las secciones, hero, cards y marquee del home; parallax, page transition y header se preservan.
- `POST /storefront/experiment-event` registra impresiones y clics anónimos solo si el experimento está publicado y vigente; no recibe identificadores personales.
- El builder muestra impresiones, clics y CTR por variante; los resultados se consultan con `GET /admin/storefront/experiments/:id/results`.
- En preview no se asignan variantes ni se registran eventos.

### Crop persistente por asset

- `Asset` agrega `focalPointX`, `focalPointY` y `cropZoom` (default 50/50/1).
- API `PATCH /admin/assets/:id/crop`; la biblioteca de medios permite ajustar foco X/Y y zoom con preview.
- Las imágenes de producto reciben `focalPointX/Y` y `cropZoom` en el catálogo y los aplican con `object-position` + `scale` dentro de un contenedor con overflow oculto.
- El crop por uso de hero/story sigue siendo independiente (focal point + zoom 100–200%).
- Migración `20261024220000_asset_crop` aplicada a ambos tenants.
- Probado con asset real: crop 20/80 zoom 1.2 en `vasos-de-vidrio`; API, catálogo y HTML del producto reflejaron el cambio; asset restaurado a 50/50/1.

### Aprobación de publicación

- Workflow **opt-in** por tenant; por defecto se mantiene publish directo.
- Plataforma puede activar `requireStorefrontApproval`; el estado vive en `StoreConfig` (`approvalStatus`, draft hash, requested/reviewed).
- Admin del tenant: guarda, envía a revisión y publica solo cuando está `APPROVED`.
- Plataforma: revisa, aprueba o rechaza con nota; `canApprove` se deriva del token de plataforma.
- Cualquier guardado/restore/cambio de preset invalida la aprobación; el publish valida además el hash del borrador.
- Si el borrador cambió después de la aprobación, publicar falla y pide un nuevo envío.
- Migración `20261024200000_storefront_approval` aplicada a ambos tenants.
- UI: botón **Aprobación**, badge de estado, modal de revisión y nota; el toggle de requisito solo aparece para plataforma.
- Probado E2E con token tenant y token plataforma: publish bloqueado, submit, approve, publish, invalidación por edición y reset a modo directo.

### Movimiento (Fases 4A + 4B)

- `StorefrontDocument.motion` + `motion` por sección, con perfiles `none`, `quiet`, `editorial` y `kinetic`.
- Reveals por sección con CSS scroll-driven, fallback estático y sin runtime JS.
- Entrada escalonada del hero y zoom lento de hero/story.
- Hover de producto (lift, zoom o crossfade a segunda imagen) y micro-interacciones de CTA.
- Marquee con velocidad/dirección, pausa visible y pausa en hover/focus.
- Parallax opt-in (`subtle`/`strong`) en hero/story; media sticky en story; header compacto al scrollear; transición de página opcional solo en navegación cliente.
- `prefers-reduced-motion` aplicado a todo el movimiento decorativo, incluido parallax y page transition; preview del builder con simulación de movimiento reducido.
- Builder: pestaña **Movimiento**, override por sección y control de header.
- Publicado: demo `editorial` v4, nova `kinetic` v4. Sin migración de DB.
- Ver `docs/STOREFRONT_ANIMATION_PLAN.md`.

### Scroll pinned

- Nueva sección `scrollStory` con media sticky y pasos narrativos.
- El renderer usa `position: sticky` + reveals por paso, sin JS; el parallax/zoom existentes se reutilizan.
- Builder: campos de imagen, encuadre, zoom, colores, CTA y editor de hasta 6 pasos.
- `prefers-reduced-motion` desactiva los reveals; la estructura pinned se mantiene.
- Probado en preview con un documento temporal: `sf-scroll-story`, sticky, pasos y reveal presentes; borrador restaurado.

### Marketplace público y scripts

- `/temas` público con las cuatro identidades, paleta, tipografías, descripción, imagen de referencia y CTA al panel.
- Visual regression incluye `marketplace-temas-desktop`.
- `/design` → **Scripts sandbox**: editor HTML/JS con iframe `sandbox="allow-scripts"`, sin persistencia ni acceso al admin. Los scripts de producción siguen fuera de alcance por seguridad.

### Restauración de la home de NÖVA (2026-10-24)

Se comparó la home anterior (`homeSections` legacy) con el documento nuevo y se reincorporaron al schema/builder:

- **Hero badge giratorio** (showBadge, badgeText, badgeCenter).
- **Showcase bento** con 3 productos y story editorial.
- **Countdown** del próximo drop.
- **Product spotlight** con producto, precio y CTA.
- Copy anterior de promo (“DROP 01 — URBAN AUTONOMY”) y newsletter (“Suscríbete a NÖVA”).
- Orden restaurado: hero → showcase → productos → promo → countdown → newsletter → spotlight, manteniendo el marquee nuevo y el motion/parallax.
- Se quitó la story full-bleed que había reemplazado al showcase legacy.
- Los nuevos tipos (`showcase`, `countdown`, `productSpotlight`) están disponibles en el builder para cualquier tenant.
- NÖVA quedó publicada como **v4**; baseline visual `nova-home` actualizada.

### Pendientes de fase 3

Ya implementados en esta iteración: biblioteca de medios con picker, focal point y zoom de encuadre por uso; crop persistente por asset; banners programados; presets propios; marketplace remoto y público de temas; sandbox de scripts aislado; A/B testing de título y de movimiento; matriz de regresión visual con Playwright y workflow de aprobación de publicación.

**i18n del builder completada (2026-10-25)**: `/design` ahora traduce labels, mensajes, placeholders, estados, opciones de variantes/motion, descripciones de presets y modales en es/en/pt. Usa `useDesignT` con el texto español como fallback seguro; el contenido editable del cliente y los defaults de las secciones se mantienen como contenido, no como copy de interfaz.

Quedan fuera de esta v1 las funciones del builder que dependen de un editor libre (timeline de animaciones, bloques arbitrarios y scripts de producción), por decisión de producto y seguridad.

---

## Referencias y patrones

- Shopify Theme Architecture / Online Store 2.0: JSON templates, sections, blocks, presets y theme editor.
- Design tokens por tenant para componentes compartidos: tokens semánticos + CSS variables + feature flags.
- Shoppex Visual Themes: `ThemeDocument` con páginas/bloques tipados, draft, preview, publish, revisiones y conflictos.
- Contentools (Puck CMS para commercetools): page builder, media library, draft/published, version history, theme manager y renderer multi-tenant.
- Referencias de diseño: Blue Bottle, Onyx Coffee Lab, La Cabra, Tim Wendelboe para el enfoque editorial de café; NÖVA como referencia del modo streetwear.
