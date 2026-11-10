# Plan de personalización administrable

Fecha: 2026-11-09
Alcance: storefront de NÖVA, tarjetas de producto, ficha de producto y builder visual.

## 1. Barrido del estado actual

### Lo que ya se configura desde el admin

- Identidad: nombre, descripción, logo, favicon, contacto y redes.
- Tema: modo claro/oscuro/sistema, colores de marca, superficies, bordes, estados y hero.
- Storefront Builder: secciones de home, orden, visibilidad, contenido, medios, header/footer, presets, tokens de diseño, CSS personalizado, sandbox de scripts y preview por dispositivo.
- Publicación: borrador, guardar, publicar, preview con token y presets reutilizables.
- Catálogo: filtros, orden inicial, cantidad por página y estrategia de relacionados.
- Tarjeta de producto: SKU, rating, badge de stock, favoritos, compra rápida, navegación del carrusel, swipe móvil y visibilidad de controles.
- Ficha de producto: galería izquierda/derecha, buy box sticky, reseñas y relacionados.
- Personalizador: prendas, colores, talles, zonas, precios, mockups, GLB, rotación, DPI, bleed y método de impresión.

### Brechas actuales

- La tarjeta ya permite elegir proporción y ajuste de imagen; falta efecto hover configurable.
- La ficha ya tiene galería con miniaturas y swipe; faltan zoom, lightbox, video y medios por variante.
- El builder no tiene undo/redo ni historial de versiones.
- No hay visibilidad por breakpoint (móvil/tablet/desktop) para secciones.
- No hay una configuración explícita de densidad de grilla, alineación de texto o posición de badges.
- Faltan controles de accesibilidad y performance como validaciones del builder.

## 2. Señales externas consultadas

- **W3C WAI, Carousel Pattern:** las flechas anterior/siguiente son controles recomendados; si hay autoplay debe poder pausarse y detenerse al enfocar. El swipe debe complementar los botones, no reemplazarlos.
- **Chrome for Developers, accessible carousels:** el contenido visible debe seguir siendo accesible; los controles deben ser botones nativos y tener foco visible.
- **Shopify Theme Settings:** los temas suelen exponer proporción de media, ajuste de imagen, efecto hover, quick buy, swatches, badges y alineación de la tarjeta. Es un buen benchmark de qué espera un comerciante.
- **NN/g, carousels:** menos de 5 imágenes por carrusel, evitar autoplay en mobile y mostrar claramente que hay más contenido.
- **Material Design 3, cards:** advierte que un carrusel interno puede competir con el swipe de la página; hay que limitar el gesto horizontal y preservar el scroll vertical.

Decisiones tomadas para esta iteración:

- Swipe horizontal de un paso, con umbral mínimo de 45 px.
- Solo se activa si el movimiento horizontal domina claramente al vertical.
- El gesto no navega al detalle; el click posterior al swipe se suprime durante 500 ms.
- El swipe no reemplaza flechas ni puntos.
- Los controles aparecen al hover, siempre en táctil y se pueden dejar siempre visibles desde el admin.

## 3. Oportunidades priorizadas

| Prioridad | Área | Mejora | Impacto | Esfuerzo |
|---|---|---|---|---|
| Hecho | Tarjeta | Proporción de imagen: actual, cuadrada, vertical u horizontal | Alto | Medio |
| Hecho | Tarjeta | Ajuste de imagen: cover o contain | Alto | Bajo |
| Hecho | Ficha | Galería con miniaturas, flechas y swipe | Alto | Medio |
| P1 | Ficha | Medios por variante de color | Alto | Medio |
| P2 | Tarjeta | Efecto hover: zoom, lift o ninguno | Medio | Bajo |
| P2 | Tarjeta | Alineación de texto, densidad y columnas | Medio | Bajo |
| P2 | Tarjeta | Posición y estilo de badges | Medio | Bajo |
| P2 | Ficha | Zoom, lightbox y video | Medio | Medio |
| P3 | Builder | Undo/redo e historial de versiones | Alto | Medio |
| P3 | Builder | Visibilidad por breakpoint | Alto | Medio |
| P3 | Builder | Reset por sección y copiar/pegar bloques | Medio | Bajo |
| P3 | Builder | Preview aislado por dispositivo con navegación real | Medio | Bajo |
| P4 | Operación | Validaciones de accesibilidad y performance antes de publicar | Alto | Medio |
| P4 | Operación | Flujo de aprobación y permisos por rol | Medio | Medio |
| P4 | Crecimiento | Experimentos A/B por sección, no solo por hero | Medio | Alto |

## 4. Roadmap propuesto

### Fase 0 — Completada

- Swipe móvil accesible y con supresión de click.
- Navegación configurable: flechas, puntos o ambos.
- Visibilidad de controles: hover o siempre.
- Configuración persistida en `storefrontConfig.productCard`.
- Proporción de imagen de tarjeta: actual, cuadrada, vertical u horizontal.
- Ajuste de imagen: recorte o completa.
- Galería de ficha con miniaturas, flechas, teclado y swipe móvil.
- Admin de la ficha: mostrar miniaturas y habilitar swipe.
- Tests manuales de swipe, bloqueo de swipe, controles, galería y proporción.

### Fase 1 — Tarjeta y galería (siguiente)

1. Efecto hover configurable: zoom, elevación o ninguno.
2. Alineación de texto, densidad y columnas.
3. Medios por variante.
4. Zoom, lightbox y video en la ficha.
5. Tests de regresión visual en desktop y mobile.

### Fase 2 — Builder

1. Undo/redo con historial local.
2. Visibilidad por breakpoint.
3. Reset de sección y duplicar sección.
4. Preview con navegación real y breakpoints.

### Fase 3 — Operación y crecimiento

1. Validaciones de contraste, foco, alt text y performance.
2. Aprobación de publicación.
3. Experimentos A/B por sección.
4. Programación de publicación.

## 5. Métricas para validar

- Porcentaje de tiendas que cambian al menos una opción de tarjeta.
- Interacciones con el carrusel por sesión.
- Uso de swipe vs flechas/puntos en mobile.
- Tasa de apertura de ficha desde tarjeta.
- Conversión de tarjeta a carrito.
- Tiempo de publicación y cantidad de previews por publicación.
- Core Web Vitals después de cambios de tema.

## 6. Recomendación

La siguiente iteración debería ser **efecto hover + medios por variante**, porque la tarjeta ya tiene proporción/ajuste y la ficha ya tiene galería; el siguiente salto de calidad es que la imagen cambie según el color y que el hover sea configurable.
