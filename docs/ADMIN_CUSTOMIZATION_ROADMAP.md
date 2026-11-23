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
- Tarjeta de producto: SKU, rating, badge de stock, favoritos, compra rápida, navegación del carrusel, swipe móvil, visibilidad de controles, proporción/ajuste de imagen y efecto hover.
- Ficha de producto: galería izquierda/derecha, miniaturas, swipe, medios por variante, buy box sticky, reseñas y relacionados.
- Personalizador: prendas, colores, talles, zonas, precios, mockups, GLB, rotación, DPI, bleed y método de impresión.

### Brechas actuales

- La ficha ya permite medios por variante, zoom, lightbox y video externo; faltan biblioteca de video, múltiples videos y medios por tamaño.
- La tarjeta ya permite proporción, ajuste, hover, swatches, alineación, densidad, badges y espaciado de grilla.
- El builder ya tiene undo/redo y comparación de versiones; falta un diff visual más rico.
- No hay visibilidad por breakpoint (móvil/tablet/desktop) para secciones.
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
| Hecho | Ficha | Medios por variante, con asignación desde el admin | Alto | Medio |
| Hecho | Tarjeta | Efecto hover: heredar, zoom, elevación, ambos o ninguno | Medio | Bajo |
| Hecho | Tarjeta | Alineación de texto y densidad interna | Medio | Bajo |
| Hecho | Tarjeta | Swatches de color con color HEX por variante | Alto | Medio |
| Hecho | Tarjeta | Composición de grilla y posición/estilo de badges | Medio | Bajo |
| Hecho | Ficha | Zoom y lightbox de la galería | Medio | Medio |
| Hecho | Ficha | Swatches de color directos | Alto | Medio |
| Hecho | UI | Notificaciones y tooltips con estilo de marca configurable | Medio | Bajo |
| Hecho | UI | Configuraciones de notificaciones guardadas + preview | Medio | Medio |
| Hecho | Ficha | Video externo (YouTube/Vimeo/MP4) en la galería | Medio | Medio |
| Hecho | Ficha | Múltiples videos, subida propia, videos por variante y swatches de talle | Medio | Medio |
| Hecho | Tarjeta | Swatches de talle y resumen visual de diff | Medio | Medio |
| Hecho | Builder | Comparación de imágenes lado a lado en versiones | Medio | Bajo |
| Hecho | UI | Biblioteca de videos filtrable y miniaturas en diff | Medio | Medio |
| Hecho | UI | Biblioteca de medios unificada (imágenes + videos) | Medio | Medio |
| Hecho | Builder | Undo/redo e historial local de cambios | Alto | Medio |
| Hecho | Builder | Comparación de versiones contra el borrador | Alto | Medio |
| P3 | Builder | Visibilidad por breakpoint | Alto | Medio |
| P3 | Builder | Reset por sección y copiar/pegar bloques | Medio | Bajo |
| P3 | Builder | Preview aislado por dispositivo con navegación real | Medio | Bajo |
| P4 | Operación | Validaciones de accesibilidad y performance antes de publicar | Alto | Medio |
| P4 | Operación | Flujo de aprobación y permisos por rol | Medio | Medio |
| P4 | Crecimiento | Experimentos A/B por sección, no solo por hero | Medio | Alto |

## 4. Roadmap propuesto

### Fase 0 — Completada

- Video externo en la ficha con miniatura y reproductor.
- Múltiples videos por producto y swatches de talle.
- Comparación de versiones contra el borrador actual.
- Swipe móvil accesible y con supresión de click.
- Navegación configurable: flechas, puntos o ambos.
- Visibilidad de controles: hover o siempre.
- Configuración persistida en `storefrontConfig.productCard`.
- Proporción de imagen de tarjeta: actual, cuadrada, vertical u horizontal.
- Ajuste de imagen: recorte o completa.
- Efecto hover por tarjeta con herencia del perfil de movimiento.
- Galería de ficha con miniaturas, flechas, teclado y swipe móvil.
- Medios por variante: asignación desde el admin y filtrado según la variante elegida.
- Admin de la ficha: mostrar miniaturas y habilitar swipe.
- Tests manuales de swipe, bloqueo de swipe, controles, galería, proporción y variantes.

### Fase 1 — Tarjeta y galería (siguiente)

1. Medios por variante con video en tarjetas.
2. Comparación visual de imágenes lado a lado.
3. Tests de regresión visual en desktop y mobile.
4. Biblioteca de medios para imágenes y videos en una sola grilla.

### Fase 2 — Builder

1. Diff visual más rico del historial de versiones.
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

La siguiente iteración debería ser **biblioteca de medios filtrable + variantes de tamaño en tarjetas + diff visual más rico**, porque la ficha ya cubre múltiples videos, videos por variante, subida propia, imagen, color, swatches de talle y zoom, y el builder ya tiene undo/redo y comparación de versiones.
