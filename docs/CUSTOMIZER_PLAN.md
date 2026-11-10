# Personalizador de camisetas

## Estado inicial encontrado

El proyecto ya tenía un personalizador 2D funcional pero acotado:

- `DesignTemplate`: nombre, tipo de prenda, imagen base, `printAreas` JSON, precio base, colores/talles como strings.
- Editor web con **react-konva**: imagen base, texto, imagen subida, cliparts, arrastre y guardado.
- `CustomDesign` + `CustomDesignElement`: diseño por usuario, color, talle, elementos y preview.
- `CustomDesignsService.addToCart`: precio `basePrice + surcharge`.
- No existía CRUD de prendas en el admin. Las plantillas se creaban por seed.
- El recargo era fijo: `elementos × 2.500`; no había reglas por zona, color, talle, texto, setup ni cantidad.
- Las zonas de impresión existían en la data pero el editor no las usaba realmente; dibujaba un rectángulo fijo.
- Las imágenes de colores no tenían mockup ni ajuste de precio.

## Referentes y decisiones

Tomamos ideas de:

- **Zakeke**: 2D y 3D, múltiples zonas, pricing dinámico, archivos listos para producción y reglas de configuración.
- **Custy**: pricing por color, lado, carácter y área; setup por lado/color; descuentos por cantidad; archivos separados por zona.
- **Chamevo**: frente, espalda y mangas como zonas independientes; foco mobile-first; exportación por método de impresión.
- **PrintXpand**: rotación 3D, zoom, mapeo de zonas, personalización de nombre/número y vista por superficie.
- **Threekit / configurador UX**: priorizar las opciones más usadas, mantener el producto visible al menos la mitad de la pantalla, actualizar el precio en tiempo real y permitir zoom.
- **Print Press / Just On Site / Spreadshirt**: precio por prenda + ubicación/tamaño de impresión + tamaño especial + setup + tramos de cantidad. Los extras se cobran por pieza y las ubicaciones adicionales se suman.
- **TShirt3DKit**: referencia técnica de Three.js/GLTF con drag, resize, rotación, espejo y frente/espalda.

Referencias consultadas:

- Zakeke 3D T-shirt configurator: https://www.zakeke.com/blog/3d-configurator/tshirt/
- Custy: https://custyapp.com/
- Chamevo Apparel: https://chamevo.com/industries/apparel/
- PrintXpand 3D T-Shirt Configurator: https://www.printxpand.com/3d-tshirt-configurator/
- Threekit configurator UX: https://www.threekit.com/blog/7-tips-improving-customer-experience-product-configurator
- Print Press Co pricing: https://printpressco.com/products/custom-printed-t-shirt
- Just On Site print pricing: https://justonsite.com/print
- TShirt3DKit: https://github.com/JawaharCoder/TShirt3DKit

### Decisiones de producto

1. **Un plan activo por tenant** ya está resuelto en suscripciones; acá cada tenant tiene su propio catálogo de prendas.
2. La primera versión es **2D**, con zonas normalizadas y datos preparados para 3D.
3. El **precio se calcula en el servidor** al guardar y agregar al carrito; el editor muestra una estimación con la misma función compartida.
4. Los colores y talles tienen **ajuste de precio**.
5. Las zonas tienen **precio propio** y coordenadas 0–1 sobre la imagen base, para que funcionen con cualquier resolución y con futuros modelos 3D.
6. El admin edita prendas sin tocar código.
7. El `model3dUrl` queda almacenado desde ahora, pero el visor 3D se implementa en una fase posterior.

## Modelo implementado

### Prenda (`DesignTemplate`)

- nombre, tipo, descripción;
- imagen base y thumbnail;
- `model3dUrl` (GLB/GLTF, preparado para 3D);
- precio base;
- colores: nombre, hex, mockup opcional y ajuste de precio;
- talles: nombre y ajuste de precio;
- zonas: `key`, etiqueta, x/y/ancho/alto normalizados, precio, imagen propia, medidas máximas y permisos de texto/imagen/clipart;
- reglas de precio: por elemento, por carácter, setup, mínimo y tramos por cantidad;
- stock mode, lead time, activa y orden.

### Diseño (`CustomDesign`)

- guarda color, talle, preview y **pricingBreakdown** autoritativo.
- Cada elemento guarda `printAreaKey`, tipografía, tamaño, color, posición, escala, rotación, orden, dimensiones y asset.

## Migración

`apps/api/prisma/migrations/20261030120000_customizer_v2/migration.sql`
(por tenant; ya aplicada en NÖVA y demo).

## Precio

La función compartida `calculateCustomizerPrice` calcula:

```
base
+ ajuste de color
+ ajuste de talle
+ zonas usadas
+ elementos × precio por elemento
+ caracteres × precio por carácter
+ setup
→ aplica descuento por cantidad
→ respeta precio mínimo
```

El servidor recalcula al guardar y al agregar al carrito. El cliente no puede imponer el precio.

Los archivos PNG de impresión se generan por zona al guardar el diseño y se guardan en `CustomDesign.printFiles` con DPI, dimensiones, método y flag de espejado DTF.

## UX del editor 2D

- selector de color con precio;
- talle con precio;
- pestañas de zonas de impresión (frente/espalda/mangas) cuando hay más de una;
- overlay punteado de la zona activa;
- texto, imagen y cliparts asignados a la zona activa;
- drag & drop, escala, rotación, capas y eliminación;
- cantidad;
- desglose de precio en tiempo real;
- guardar diseño y agregar al carrito.

## Fase 3D

Primer visor 3D de solo lectura implementado con Three.js: remera sola, rotación, zoom, color y preview de frente. El GLB base es reemplazable desde el admin. La propuesta detallada de modelos, mapeo de zonas, preview vs. archivo de impresión y UX 3D está en [`CUSTOMIZER_3D_PROPOSAL.md`](./CUSTOMIZER_3D_PROPOSAL.md).

La propuesta detallada de modelos, mapeo de zonas, preview vs. archivo de impresión y UX 3D está en [`CUSTOMIZER_3D_PROPOSAL.md`](./CUSTOMIZER_3D_PROPOSAL.md).

1. **Modelo GLB por prenda** con UVs y mallas separadas por zona.
2. **Three.js + React Three Fiber + Drei**:
   - `OrbitControls` con rotación limitada;
   - textura de color sobre la malla;
   - decals/texturas por zona;
   - cámara a zona activa al cambiar frente/espalda/manga;
   - zoom y vista responsive.
3. **Sincronización 2D ↔ 3D**:
   - mismas coordenadas normalizadas por zona;
   - el editor 2D sigue siendo la superficie de precisión;
   - la vista 3D es preview y no reemplaza la exportación de impresión.
4. **Rendimiento**:
   - modelos < 100k triángulos para móvil;
   - texturas comprimidas;
   - lazy load del visor 3D;
   - fallback a 2D si WebGL no está disponible.
5. **Producción**:
   - exportar PNG 300 DPI por zona;
   - guardar el archivo final por zona y método de impresión;
   - no prometer producción desde el preview 3D sin un archivo de impresión validado.

## Fases

- **Fase 1 (actual)**: catálogo admin, 2D por zonas, colores/talles con precio, pricing server-side, cantidad y desglose.
- **Fase 2**: pulido del editor 2D, validación de límites por zona, fuentes, cliparts administrables y archivos de impresión por zona.
- **Fase 3**: visor 3D GLB, rotación, color en malla y preview por zona.
- **Fase 4**: producción/exportación automática, aprobación y analítica de configuraciones.

## Pendientes técnicos

- Validar en el servidor que los elementos estén dentro de la zona y no superen medidas.
- Generar el archivo de impresión por zona (no solo el preview general).
- Añadir biblioteca de fuentes/cliparts administrable.
- 3D y compresión de assets.
- Tests e2e del flujo completo de compra personalizada.
