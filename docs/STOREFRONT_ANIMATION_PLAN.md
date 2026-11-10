# Plan de personalización de animaciones del storefront

Fecha: 2026-10-24
Estado: Fase 4A, Fase 4B, A/B de movimiento y regresión visual implementados y verificados. El resto son extensiones de producto/seguridad.

## 1. Resumen ejecutivo

Sí conviene agregar animaciones, pero **no como un builder libre tipo Webflow**. Para que la personalización sea real, consistente y segura, el camino es el mismo que ya usamos para layout y tipografía:

- tokens de movimiento por tenant;
- **perfiles de animación curados**;
- overrides acotados por sección;
- preview con replay y reduced-motion;
- CSS + variables, sin runtime JS ni Framer Motion en la web.

La recomendación es implementar primero un paquete **“Fase 4A”**: reveals, hero choreography, hover de producto, marquee y accesibilidad. Dejar parallax/pinned stories y page transitions para una **Fase 4B** opcional.

## 2. Barrido del estado actual

### Lo que ya existe

- `product-card`: lift `-4px` y zoom de imagen `1.06` al hover, con transición de 220/420 ms.
- `add-to-cart-button`: feedback de color, `nova-pop` y `fly-to-cart` con Web Animations API.
- `mega-panel`: fade + slide de 180 ms al abrir el mega menú.
- `marquee` del bloque nuevo: animación lineal infinita de 24 s; el marquee legacy usa 20 s.
- Spinner circular del hero (`nova-spin-slow`, 18 s) con `prefers-reduced-motion`.
- Header sticky/no sticky según el documento.
- CSS custom por tenant disponible como escape hatch.

### Gaps

- No hay tokens de movimiento en `StorefrontDocument`.
- No hay controles de animación en `/design`.
- No hay reveal por sección ni stagger.
- No hay animación de entrada del hero ni zoom lento de imagen.
- No hay crossfade a segunda imagen en cards.
- La velocidad/dirección/pausa del marquee está hardcodeada.
- `prefers-reduced-motion` solo cubre el spinner: no cubre cards, marquee, mega menú ni feedback del carrito.
- El marquee infinito no tiene pausa: riesgo WCAG 2.2.2 (Pause, Stop, Hide).
- `will-change: transform` permanente en cards: puede consumir memoria innecesariamente.
- No hay tests de movimiento ni preview de “replay”.
- Framer Motion está en el admin, no en la web. Mantenerlo fuera de la web es una ventaja de performance.

### Archivos principales a tocar

- `packages/shared/src/storefront-document.ts`
- `apps/web/src/lib/storefront-theme.ts`
- `apps/web/src/components/storefront/theme-style.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/storefront/blocks.tsx`
- `apps/web/src/components/product-card.tsx`
- `apps/web/src/components/storefront/motion-runtime.tsx` (nuevo)
- `apps/admin/src/app/design/page.tsx`
- `apps/api/src/storefront/storefront-presets.ts`

No requiere migración de base de datos: el documento del storefront ya es JSON.

## 3. Qué hacen otros y qué conviene copiar

| Referente | Qué ofrece | Qué tomar | Qué evitar |
| --- | --- | --- | --- |
| **Squarespace 7.1** | Animaciones site-wide: None, Fade, Scale, Slide, Clip, Flex; velocidad Slow/Medium/Fast; overrides por bloque | El modelo “estilo global + velocidad + override”; presets acotados | “Flex” es muy amplio y depende de muchos detalles del tema |
| **Shopify Dawn / temas OS 2.0** | Un check “Reveal sections on scroll” apagado por defecto; algunos temas suman parallax | Empezar apagado/sutil y permitir opt-in; un solo switch claro | Animar todas las secciones por defecto; los glitches reportados en colecciones |
| **Shopify (parallax)** | Parallax como recurso puntual, con foco en mobile y peso de imágenes | Usarlo solo en hero/story y con presupuesto de performance | Parallax global o en varias capas |
| **Webflow Interactions** | Triggers de load/scroll/hover, timelines, sticky y scroll-linked | La idea de **triggers** y **stagger**; empaquetarla en presets | Builder libre de timelines para tenants |
| **Framer** | Scroll transforms, pinned sections y storytelling | Un perfil “editorial” con scroll narrativo en Fase 4B | Efectos 3D/WebGL y transiciones costosas como default |
| **W3C / web.dev** | `prefers-reduced-motion`; el parallax puede causar mareo/vestibular disorders | Reduced-motion obligatorio, parallax apagado si el usuario lo pidió | Tratar reduced-motion como “solo un detalle” |
| **Core Web Vitals** | Animar `transform`/`opacity` evita layout y CLS | Presupuesto de solo composición; nada de animar width/height/top/left | Animaciones que muevan layout o bloqueen INP |

Referencias:

- [Squarespace — Site-wide animations](https://support.squarespace.com/hc/en-us/articles/360040839591-Site-wide-animations)
- [Shopify — Parallax scrolling](https://www.shopify.com/blog/parallax-scrolling)
- [Webflow — Reveal elements on scroll](https://university.webflow.com/videos/reveal-elements-on-scroll)
- [Framer — Scroll animations](https://www.framer.com/academy/lessons/scroll-animations)
- [web.dev — prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion)
- [W3C — Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html)
- [web.dev — CSS for Web Vitals](https://web.dev/articles/css-web-vitals)
- [Scroll-driven animations (soporte 2026)](https://scroll-driven-animations.style/)

## 4. Catálogo de animaciones candidatas

Escala: impacto en diferenciación / costo de implementación / riesgo de performance o accesibilidad.

| Animación | Dónde | Impacto | Costo | Riesgo | Recomendación |
| --- | --- | --- | --- | --- | --- |
| Reveal por sección: fade, rise, clip, scale | Home y páginas estáticas | Alto | Bajo | Bajo | **Fase 4A** |
| Stagger de hero: eyebrow, título, subtítulo, CTAs | Hero | Alto | Bajo/medio | Bajo | **Fase 4A** |
| Zoom lento de imagen de hero/story | Hero, story | Alto | Bajo | Bajo con reduced-motion | **Fase 4A** |
| Hover de card: lift + zoom + crossfade a segunda imagen | Grilla/catálogo | Alto | Medio | Medio en touch/CLS | **Fase 4A** |
| Micro-interacciones de CTAs: flecha o elevación | Global | Medio | Bajo | Bajo | **Fase 4A** |
| Marquee configurable: velocidad, dirección, pausa | Marquee | Alto en streetwear | Bajo | Medio (WCAG 2.2.2) | **Fase 4A** |
| Header que se oculta/aligera al scrollear | Header | Medio | Medio | Bajo/medio | Fase 4B |
| Parallax sutil de imágenes | Hero/story | Medio/alto | Medio | Alto (vestibular) | Fase 4B, opt-in |
| Sticky story / secuencia scroll-driven | Story/home editorial | Alto | Alto | Alto | Fase 4B premium |
| Page transitions (View Transitions) | Global | Bajo/medio | Medio | Medio (sensación de lentitud) | No en MVP |
| Cursor magnético, tilt 3D, WebGL | Hero/cards | Bajo/medio | Alto | Alto | No |
| Typewriter/contadores | Promo/story | Bajo | Bajo | Bajo | No: envejecen rápido |
| Video autoplay en hero | Hero | Medio | Alto | Alto (LCP/datos) | No salvo video corto, mudo y con control |

## 5. Paquete recomendado

### Fase 4A — Núcleo curado (recomendado)

1. **Motion tokens + perfiles**
   - Perfiles: `none`, `quiet`, `editorial`, `kinetic`.
   - Velocidad global: `slow`, `normal`, `fast`.
   - Distancia de reveal y stagger.

2. **Reveals por sección**
   - Estilo global + override por sección: `inherit`, `none`, `fade`, `rise`, `clip`, `scale`.
   - Delay corto/medio y stagger.
   - El hero no espera scroll: entra al cargar.

3. **Hero choreography**
   - Secuencia eyebrow → título → subtítulo → CTAs.
   - Zoom lento opcional de la imagen.
   - Respetar `prefers-reduced-motion` (sin zoom ni desplazamiento).

4. **Hover de producto**
   - `none`, `lift`, `zoom`, `swap` (segunda imagen con crossfade).
   - Mantener relación de aspecto y evitar CLS.
   - En touch, el quick-add sigue visible; no depender de hover.

5. **Marquee**
   - Velocidad, dirección y pausa al hover/focus.
   - Botón visible de pausa/play para cumplir WCAG 2.2.2.
   - Apagado automático con reduced-motion.

6. **Builder**
   - Inspector **Movimiento** en Tema.
   - Override **Animación** en cada sección.
   - Replay del preview y toggle “simular reduced-motion”.
   - Aviso de impacto/performance.

7. **Presets**
   - `coffee-editorial` → editorial.
   - `streetwear-drop` → kinetic.
   - `minimal-boutique` → quiet.
   - `market-catalog` → none/functional.

### Fase 4B — Avanzado (implementado)

- Parallax opt-in `subtle`/`strong`, solo hero/story, con CSS scroll-driven y fallback estático.
- Media sticky en story para storytelling editorial.
- Header compacto al scrollear (opt-in; no ocultamos el header para preservar foco/teclado).
- Transición de página opcional, solo opacidad y solo en navegación cliente.
- A/B de movimiento: perfiles `none`/`quiet`/`editorial`/`kinetic` sobre el home, con la asignación y analítica existentes.
- CSS custom de movimiento documentado como avanzado, sin JS.

### No hacer por ahora

- Builder libre de keyframes/timelines.
- JavaScript arbitrario por tenant.
- WebGL/3D, cursor magnético, tilt.
- Autoplay con sonido o video pesado.
- Animar layout (`width`, `height`, `top`, `left`).

## 6. Arquitectura propuesta

### 6.1 Schema

Agregar al documento:

```ts
motion: {
  preset: 'none' | 'quiet' | 'editorial' | 'kinetic',
  speed: 'slow' | 'normal' | 'fast',
  reveal: 'none' | 'fade' | 'rise' | 'clip' | 'scale',
  stagger: number,          // 0–160 ms
  hover: 'none' | 'lift' | 'zoom' | 'swap',
  heroMedia: 'none' | 'zoom' | 'parallax',
  marquee: 'paused' | 'normal' | 'fast' | 'reverse',
}
```

Y por sección:

```ts
motion: {
  reveal: 'inherit' | 'none' | 'fade' | 'rise' | 'clip' | 'scale',
  delay: 'none' | 'short' | 'medium',
  hover: 'inherit' | 'none' | 'lift' | 'zoom' | 'swap',
}
```

Todo con defaults y compatible con documentos existentes. No hay migración SQL.

### 6.2 CSS

`storefrontThemeVars` emite variables:

```css
--sf-motion-duration: 520ms;
--sf-motion-ease: cubic-bezier(0.22, 1, 0.36, 1);
--sf-motion-distance: 18px;
--sf-motion-stagger: 80ms;
--sf-hover-lift: -4px;
--sf-hover-zoom: 1.04;
--sf-marquee-duration: 28s;
--sf-marquee-direction: normal;
```

Los bloques server-side solo agregan `data-sf-reveal="rise"` y `style={{ '--sf-reveal-delay': ... }}`. No se convierten en client components.

### 6.3 Ejecución en el navegador

La implementación final usa **CSS scroll-driven animations**, sin runtime de JS y sin Framer Motion en la web:

- Los wrappers server-side llevan `data-sf-reveal` y `data-sf-delay`.
- `@supports (animation-timeline: view())` activa el reveal con `animation-range: entry ...`.
- Navegadores sin soporte muestran el contenido estático: el fallback es visible, nunca se oculta.
- El hero usa una animación de carga + stagger por `nth-child`.
- `prefers-reduced-motion` desactiva reveals, hero, zoom, marquee y transiciones decorativas.
- El preview del builder puede simular reduced-motion con `?motion=reduce` y la clase `.sf-reduce-motion`.

Esto evita un cliente extra, funciona sin JS y reduce el riesgo de contenido oculto por fallos de hidratación.

Para parallax (Fase 4B), el mismo mecanismo queda disponible:

### 6.4 Builder

- **Tema → Movimiento**: perfil, velocidad, reveal global, hover, marquee.
- **Sección → Animación**: override, delay, hover.
- **Preview**: botón “Repetir animación”, toggle reduced-motion, aviso de que el preview no equivale a performance real.
- **Presets**: cada preset trae un perfil asignado; al aplicar un preset se puede mantener el motion actual o adoptar el del preset.

### 6.5 Accesibilidad y performance

Reglas no negociables:

- `prefers-reduced-motion: reduce` desactiva entrada, parallax, zoom y marquee; los reveals pasan a opacidad instantánea.
- El marquee tiene pausa/play visible y se pausa en hover/focus.
- Nada de contenido esencial solo visible por animación.
- Animar solo `transform` y `opacity`; reservar dimensiones para evitar CLS.
- `will-change` solo mientras corre la animación, no permanente.
- Sin autoplay de video con sonido.
- El hero no se oculta si falla JS.
- Medir LCP/INP/CLS antes/después; el movimiento no debe agregar peso de JS significativo.
- En touch, ningún control depende de hover.
- El CSS custom existente no se toca; el JS custom sigue fuera de alcance.

## 7. Perfiles por preset

| Preset | Perfil | Reveal | Hero | Hover | Marquee |
| --- | --- | --- | --- | --- | --- |
| Coffee Editorial | editorial | rise/fade, stagger 80 | zoom lento | zoom suave | lento |
| Streetwear Drop | kinetic | clip/slide, stagger 50 | scale + entrada marcada | lift + swap | rápido |
| Minimal Boutique | quiet | fade, stagger 0 | none | lift mínimo | pausado |
| Market Catalog | none | none o fade muy corto | none | lift funcional | desactivado |

La idea es que el perfil sea parte de la identidad del preset, no una decisión separada que el cliente tenga que reconstruir.

## 8. Riesgos y decisiones

- **Sobreanimación:** el error más común es animar cada sección y cada card. Los presets deben limitar la cantidad y priorizar hero + una o dos secciones.
- **Parallax:** no incluirlo en Fase 4A. Es el efecto con más probabilidad de mareo, jank en mobile y problemas de performance.
- **Hover en mobile:** el hover no existe; el quick-add y la información clave deben estar siempre disponibles.
- **Marquee:** no es solo estética; si dura más de 5 s necesita mecanismo de pausa (WCAG 2.2.2).
- **Custom code:** ya existe CSS custom. No abrir JS arbitrario; si se necesita un píxel o integración, va por el sistema de scripts de plataforma, no por el builder de animaciones.
- **Medición:** conviene A/B testear “motion editorial vs. none” en hero, no docenas de efectos a la vez.

## 9. Estimación de complejidad

- Fase 4A: **S/M**. Schema + tokens + CSS scroll-driven + builder + presets + tests.
- Fase 4B (parallax/sticky/header): **M/L**, con QA visual y de performance aparte.
- No hay migración de DB.
- No se agrega Framer Motion a la web.

## 10. Próximo paso

Fase 4A, 4B, A/B de movimiento y regresión visual están implementadas. Queda como evolución opcional:

1. Pinned/scroll sequence más complejo, si un tenant editorial lo justifica.
2. Editor de crops por asset y marketplace público de presets.
3. Workflow de aprobación de publicación e i18n completa del builder.

Recomendación: no abrir más libertad de movimiento hasta tener un presupuesto de performance por tenant y revisar las baselines visuales en CI.

## 11. Implementación Fase 4A (2026-10-24)

### Schema y perfiles

- `StorefrontDocument.motion` con `preset`, `speed`, `reveal`, `stagger`, `hover`, `imageMotion`, `marquee` y `cta`.
- `StorefrontSectionSchema.motion` por sección: `reveal`, `delay` y `hover` con herencia.
- Perfiles compartidos: `none`, `quiet`, `editorial`, `kinetic`.
- Sin migración de base de datos: todo vive en el JSON del storefront.
- Presets:
  - `coffee-editorial` → editorial.
  - `streetwear-drop` → kinetic.
  - `minimal-boutique` → quiet.
  - `market-catalog` → none.

### Renderer

- Reveals por sección con CSS scroll-driven y `@supports`; sin JS y con fallback estático.
- Hero con entrada escalonada y zoom lento de imagen (hero/story, full-bleed, split y minimal).
- Product cards con lift, zoom y crossfade a segunda imagen; fallback de zoom si el producto tiene una sola imagen.
- CTAs con flecha o elevación.
- Marquee con velocidad, dirección y pausa; control visible de play/pausa y pausa en hover/focus.
- `prefers-reduced-motion` cubre reveals, hero, imágenes, marquee, cards, CTA, mega menú, spinner y feedback del carrito.
- Preview del builder: repetir animación + simulación de movimiento reducido (`?motion=reduce`).

### Builder

- Nueva pestaña **Movimiento** con perfil, velocidad, reveal, stagger, hover, imagen, marquee y CTA.
- Override de animación por sección.
- Avisos de accesibilidad y preview.

### Publicación

- Demo (Grano): perfil editorial, v4.
- Növa: perfil kinetic, v2.
- Los documentos anteriores sin `motion` siguen funcionando: el schema aplica defaults compatibles.

### Verificación

- Chrome 155 / headless: `CSS.supports('animation-timeline: view()') = true`.
- El reveal de una sección fuera de viewport arranca con `clip-path: inset(0px 100% 0px 0px)` y termina en `inset(0px)` al scrollear.
- Hero: `animation-name: sf-hero-in`; imagen: `sf-image-zoom`.
- Marquee kinetic: 18 s, control de pausa funcional (`aria-pressed` y `animation-play-state: paused`).
- Product card sin segunda imagen: fallback `scale(1.045)` al hover.
- Reduced-motion: reveals/hero/imagen/marquee sin animación, control oculto; contenido visible.
- API 39 tests, web 55 tests, admin 15 tests; typecheck y lint ✓.

## 12. Implementación Fase 4B (2026-10-24)

### Parallax

- Global `motion.parallax`: `none`, `subtle` o `strong`.
- Override por sección `motion.parallax`: `inherit`, `none`, `subtle` o `strong`.
- Solo se aplica a hero/story; el resto de secciones lo ignora.
- Hero usa `animation-timeline: scroll(root block)`; story usa `animation-timeline: view()`.
- La imagen se agranda con `scale` y se mueve con la propiedad independiente `translate`; el zoom existente queda en una capa interna para no pisar transforms.
- `prefers-reduced-motion: reduce` deja animación `none`, `translate: none` y `scale: 1`.

### Story sticky

- `section.motion.stickyMedia` (opt-in, solo story no full-bleed).
- La columna de imagen usa `position: sticky` con `top: 96px`; funciona cuando el texto es más alto que la imagen.
- Se controla desde el inspector de la sección.

### Header compacto

- `header.shrinkOnScroll` (default `false`).
- Reduce padding vertical después de 48 px de scroll, con transición corta.
- En `prefers-reduced-motion: reduce` no se compacta y no hay transición.
- Se descartó ocultar el header: evita problemas de foco/teclado.

### Transición de página

- `motion.pageTransition` (default `false`).
- Wrapper cliente `PageTransition` con solo opacidad y 300 ms.
- Solo anima en navegación cliente; la carga inicial no se oculta para no afectar LCP.
- Se desactiva con reduced-motion.

### Builder

- **Movimiento**: parallax por defecto y toggle de transición de página.
- **Sección**: parallax override y “Media sticky” para story.
- **Header**: “Compactar header al scrollear”.

### Activación actual

- Demo/Grano: `editorial`, parallax subtle, page transition activa, header compacto, story con media sticky (v4).
- Nova/NÖVA: `kinetic`, parallax subtle, header compacto, sin page transition (v4).

### Verificación

- Chrome 155: `scroll(root)` y `view()` soportados.
- Hero: `animation-name: sf-parallax`, `animation-timeline: scroll(root)`, `translate` de -2.5% a +2.16% al scrollear.
- Story: `sf-parallax` con `view()`, celda con `position: sticky`.
- Header: padding 16 → 8 px después de 48 px de scroll.
- Page transition: clase `sf-page-transition` y `animation-name: sf-page-in` en navegación cliente; ausente en carga inicial.
- Reduced-motion: parallax sin animación, `translate: none`, `scale: 1`; transición de página `none`.
- API 39 tests, web 55 tests, admin 15 tests; typecheck y lint ✓.

## 13. A/B de movimiento (2026-10-24)

- `StorefrontExperiment.target` acepta `heroTitle` o `motion`.
- En `motion`, `variantA`/`variantB` guardan claves de perfil; el runtime aplica al home:
  - perfil;
  - reveal, stagger, hover, imageMotion, marquee y CTA;
  - conserva `parallax` y `pageTransition` del documento.
- La asignación es la misma cookie first-party y el mismo hash que el A/B de título.
- Los eventos de impresión/CTA y el panel de resultados no cambian.
- Builder:
  - selector “Qué se testea”;
  - títulos A/B o perfiles A/B;
  - resultados comparativos por variante.
- Compatibilidad: experimentos viejos sin `target` se interpretan como `heroTitle`.
- Sin migración de DB.

### Verificación

- Experimento temporal en demo con `quiet` vs `kinetic`: las dos variantes se renderizaron desde el servidor con reveals y perfiles distintos; luego se restauró el tema publicado desde el snapshot previo y se limpiaron las versiones/eventos de prueba.
- Test unitario de asignación y aplicación de perfil de motion, incluyendo preservación de parallax y page transition.

## 14. Regresión visual (2026-10-24)

- Playwright con `channel: 'chrome'` (sin descargar navegadores).
- Config en `playwright.config.ts`; spec en `tests/visual/storefront.visual.spec.ts`.
- Cobertura:
  - demo home desktop/mobile;
  - demo historia;
  - demo producto;
  - demo catálogo;
  - nova home desktop/mobile;
  - nova producto;
  - nova catálogo.
- 9 capturas, 9 tests ejecutados por corrida; los casos del proyecto opuesto se skipean.
- `reducedMotion: 'reduce'` para que reveal, parallax, zoom, marquee y page transition no introduzcan ruido.
- Se ocultan cookie consent, popups y overlay de desarrollo; se esperan fuentes e imágenes.
- Comandos:
  - `pnpm test:visual`;
  - `pnpm test:visual:update`.
- Baselines en `tests/visual/storefront.visual.spec.ts-snapshots/` (Windows/Chrome).
- Verificación: 9 passed en la corrida final; 3.7 MB de baselines.
