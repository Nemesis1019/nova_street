# Propuesta — Personalizador 3D de prendas

> Fecha: 2026-11-03
> Estado: propuesta técnica y de producto. La fase 1 (editor 2D + admin + pricing) y un primer visor 3D de solo lectura ya están implementados.

## Implementación inicial (2026-11-03)

Ya existe un visor 3D de una remera sola usando un GLB base libre (CC BY 3.0), con rotación, zoom, color y preview de la zona frontal. El admin puede cambiar la URL o subir un GLB, ajustar la rotación Y del modelo y configurar las zonas. Los archivos PNG de impresión se generan y guardan por zona desde el editor.

El mapeo actual usa una superficie de preview separada de la malla. Para producción falta calibrar la textura sobre mallas/UVs por zona, agregar frente/espalda/mangas y generar archivos de impresión. El modelo base está en `apps/web/public/models/tee-base.glb`.

## Resumen ejecutivo

La recomendación es evolucionar el editor actual a un modelo **2D para precisión + 3D para visualización**, no reemplazar el 2D por un editor 3D libre.

- El diseño se sigue armando en 2D por zona.
- El 3D muestra el resultado sobre una prenda realista, con rotación, zoom y vistas front/espalda/mangas.
- El archivo de impresión se genera desde el canvas 2D de cada zona, no desde el render 3D.
- El modelo GLB tiene mallas/UVs preparadas por zona para que el 2D y el 3D compartan las mismas coordenadas normalizadas.
- La fase inicial usa **dos modelos**: remera y buzo; después se agregan oversize, manga larga y otros tipos.

Esto coincide con la forma en que Zakeke, PrintXpand, Chamevo y Konfiwear separan diseño, preview 3D y archivo de producción.

---

## Punto 1 — Qué modelos 3D usar

### Opciones

| Opción | Ventaja | Problema | Cuándo conviene |
|---|---|---|---|
| **A. Un modelo genérico de remera** | Bajo costo, rápido de integrar | No representa buzos, oversize ni cortes reales; poca confianza | Prototipo interno |
| **B. Familia de modelos por tipo/corte** | Representa el producto real; escala a catálogo | Requiere assets y calibración por modelo | **Recomendado** |
| **C. Modelos por color** | Máximo realismo | Duplica assets y mantenimiento; no escala | Catálogo muy premium |
| **D. Fotos 360 / video** | Sin WebGL | No permite cambiar color/diseño ni rotación libre real | Fallback o marketing |
| **E. Integrar Zakeke/Threekit** | Muy completo y rápido | Costo mensual, dependencia, menos control | Si se prioriza tiempo sobre control |

### Recomendación

Empezar con **dos o tres GLB**:

1. Remera unisex crew neck (ajuste estándar).
2. Remera oversized.
3. Buzo hoodie.

Primero dos: remera y hoodie. El admin ya tiene `model3dUrl`, así que el modelo se puede asociar por prenda.

### Especificación del GLB

- glTF 2.0 / GLB.
- Escala real en metros, centrado, mirando a `+Z`.
- Menos de **100k triángulos** para móvil; ideal 40–75k.
- Materiales PBR y texturas de 1K/2K.
- Sin luces, cámara ni sombras horneadas.
- Piezas separadas y nombradas:
  - `body`
  - `collar`
  - `sleeve_left`
  - `sleeve_right`
  - `print_front`
  - `print_back`
  - `print_sleeve_left`
  - `print_sleeve_right`
- Las mallas de impresión pueden ser superficies apenas offset sobre la prenda, con UVs cuadradas y sin solapamiento.
- UVs de impresión separadas del UV de tela.
- Licencia comercial documentada.

### De dónde salen

- Modelado a medida en Blender/CLO/Marvelous Designer con las medidas reales del taller.
- Compra de un modelo con licencia comercial y adaptación de UVs.
- No usar modelos de Sketchfab/CGTrader sin licencia explícita para reventa y modificación.

### Qué necesitamos definir

- Medidas reales de las prendas y tabla de talles.
- Fotos de frente/espalda y detalle de costuras.
- Si el modelo debe mostrar la prenda sola o sobre un maniquí.
- Presupuesto para modelado si no hay GLB propio.

---

## Punto 2 — Cómo mapear las zonas 2D al 3D

### Opciones

| Opción | Cómo funciona | Ventaja | Problema |
|---|---|---|---|
| **Decals proyectados** | Un `DecalGeometry` se proyecta sobre la malla | Rápido para logos chicos; no requiere UV de impresión | Se corta en curvas, no sirve para estampas grandes, muchos elementos = muchos decals |
| **Textura por zona** | El canvas 2D de cada zona se convierte en textura y se aplica a una malla/UV de impresión | Fiel al diseño; una sola textura por zona; ideal para DTG/DTF | Requiere malla y UVs preparadas y calibración |
| **Textura única de toda la prenda** | Todo el diseño va a un mapa UV general | Una textura | Muy difícil de editar, se deforma y no separa zonas |
| **Híbrido** | Textura para frente/espalda; decal para detalles chicos | Flexibilidad | Dos sistemas que mantener |

### Recomendación

**Textura por zona**, con decals solo como complemento futuro para piezas pequeñas.

Flujo:

1. El editor 2D mantiene un canvas por zona (`front`, `back`, `leftSleeve`, `rightSleeve`).
2. Al cambiar a 3D, cada canvas se exporta como PNG transparente de preview (1K/2K).
3. El visor aplica el PNG al material de la malla `print_front`, `print_back`, etc.
4. La malla de impresión está calibrada con un `uvRect` y un `cameraPreset`.
5. El color de la prenda se aplica a `body`/`collar`/mangas sin tocar la textura de impresión.
6. En la fase de producción, el mismo canvas se vuelve a exportar a 300 DPI.

### Contrato de configuración del modelo

Agregar al `DesignTemplate` un JSON `modelConfig`:

```json
{
  "version": 1,
  "scale": 1,
  "cameraPresets": {
    "front": { "position": [0, 1.2, 2.4], "target": [0, 1, 0] },
    "back": { "position": [0, 1.2, -2.4], "target": [0, 1, 0] },
    "leftSleeve": { "position": [-2.1, 1.3, 0], "target": [0, 1.1, 0] },
    "rightSleeve": { "position": [2.1, 1.3, 0], "target": [0, 1.1, 0] }
  },
  "zones": [
    {
      "key": "front",
      "mesh": "print_front",
      "uvRect": { "x": 0.18, "y": 0.18, "width": 0.64, "height": 0.64 },
      "camera": "front",
      "maxWidthCm": 30,
      "maxHeightCm": 40
    }
  ],
  "materials": {
    "body": "body",
    "collar": "collar",
    "sleeves": ["sleeve_left", "sleeve_right"]
  }
}
```

La zona 2D actual ya usa coordenadas normalizadas 0–1, así que el mismo rectángulo puede mapearse al canvas y a la textura del modelo.

### Validación

- Konfiwear exige zonas independientes y reglas por tipo de contenido.
- Simplio3D recomienda piezas separadas, nombres claros y UVs cuadradas para uploads/engraving.
- La comunidad de Three.js recomienda decals o un UV unwrap correcto; para estampas grandes, el UV de impresión es más predecible.
- Zakeke y PrintXpand muestran mapa de zona, rotación, zoom y vista por superficie.

---

## Punto 3 — ¿La vista 3D sirve también para generar el archivo de impresión?

### Opciones

| Opción | Archivo de impresión | Riesgo |
|---|---|---|
| **A. 3D solo preview; impresión desde 2D** | Se genera desde el canvas 2D por zona a 300 DPI | **Recomendado**: control y calidad predecibles |
| **B. Render 3D como archivo de impresión** | Se captura la textura/render del 3D | Depende de UVs, iluminación, resolución y deformación; no es fiable |
| **C. Ambos** | 3D para aprobar, 2D para imprimir | Más trabajo, pero buena validación visual |

### Recomendación

**A**: el 3D es una vista comercial; el archivo de producción sale del 2D.

Requisitos del archivo por zona:

- PNG transparente o PDF/SVG según método.
- 300 DPI.
- Tamaño real en cm de la zona.
- Sangrado/bleed de 2–3 mm y área segura.
- sRGB.
- Sin fondo, sin sombras ni mockup.
- Nombrado: `pedido_<id>_<zona>_<color>_<talle>.png`.
- Revisión de resolución mínima y zona.

Fase inicial:

- El cliente exporta el canvas 2D por zona en alta resolución al guardar el diseño.
- Se sube como asset y se guarda la URL por zona.
- El servidor valida dimensiones/DPI y guarda el archivo final.
- Si el render del cliente falla, se puede reintentar; no se agrega al carrito sin preview/archivo mínimo.

Fase posterior:

- Render server-side desde los elementos JSON con `sharp`/SVG para no depender de la GPU del cliente.
- Firma/hash del archivo y aprobación del admin antes de producción.

### Lo que no conviene

- Vender una captura de pantalla del visor 3D como archivo de impresión.
- Aplicar la textura de preview de 1024 px a producción.
- Perder la separación por zona en un único PNG.

---

## Punto 4 — Cómo mostrar frente, espalda y mangas

### Opciones

| Opción | UX | Costo |
|---|---|---|
| **A. 3D orbit + tabs de zona + presets de cámara** | El usuario rota libremente y al elegir una zona la cámara se mueve y resalta la superficie | **Recomendado** |
| **B. Varias imágenes/modelos por vista** | Simple, pero no es un 3D real continuo | Bajo |
| **C. Solo editor 2D** | Más preciso, menos inmersivo | Ya implementado |
| **D. 3D editable (arrastrar sobre la malla)** | Muy potente, pero complejo | Alto |

### Recomendación

**A**, con 3D de solo lectura en la primera iteración.

#### Layout

Desktop:

- 55–65% del espacio para el visor 3D.
- Panel derecho con color, talle, zonas, precio y CTA.
- Toggle **Editar 2D | Ver 3D**.
- Tabs: **Frente · Espalda · Manga izq. · Manga der.**
- Botones: rotar, zoom, reset, auto-rotación.

Mobile:

- Visor 3D arriba, ocupando buena parte de la pantalla.
- Controles en bottom sheet/carousel.
- Gestos: arrastrar para rotar, pinchar para zoom, tabs para cambiar de zona.
- Fallback a 2D si no hay WebGL.

#### Comportamiento

- Auto-rotación lenta en reposo; se detiene al interactuar.
- Zoom con límites para no perder la prenda.
- Al elegir una zona, animar cámara al preset correspondiente.
- Resaltar la zona activa con un contorno suave o un pequeño halo.
- Cambiar color actualiza el material PBR sin recargar el modelo.
- Cambiar texto/imagen actualiza la textura de la zona con debounce para no re-renderizar en cada tecla.
- Mostrar el precio siempre visible, aunque el usuario esté rotando.

#### Fase posterior

- Click en una zona del modelo para pasar al editor 2D de esa zona.
- Arrastrar un elemento en 3D y proyectarlo al canvas 2D (raycast a UV).
- Vista AR (opcional).
- Comparación de talle/calce.

---

## Diferencias por método de impresión

| Método | Archivo de producción | Qué cambia en el configurador |
|---|---|---|
| DTG | PNG 300 DPI por zona, sRGB, fondo transparente | Preview igual; el blanco bajo se resuelve en impresión. Precio por zona/tamaño. |
| DTF | PNG 300 DPI espejado + capa blanca | Cambia la preparación del archivo; el preview no se muestra espejado. Bueno para telas oscuras. |
| Screen | PDF/SVG vectorial, separación por color y traps | El preview es aproximado. El precio depende de cantidad, colores y setup. |
| Bordado | DST/PES digitizado, hilos y puntadas | No se exporta PNG. Cambian límites de zona, colores de hilo y costo por puntadas. |
| Sublimación | PNG/PDF con perfil de color | Generalmente all-over, poliéster y otra preparación de color. |

El admin ya guarda `printMethod`, `printDpi` y `bleedMm` por zona. El preview 2D/3D se comparte; la exportación y validación de producción se implementan por método.

## Arquitectura recomendada

```text
Editor 2D (Konva)
  ├── canvas por zona
  ├── elementos normalizados
  └── pricing / preview
            │
            ├── textura PNG por zona (preview 1K/2K)
            │
            ▼
Visor 3D (React Three Fiber)
  ├── GLB cargado lazy
  ├── malla de impresión por zona
  ├── material de prenda + textura de zona
  ├── OrbitControls + presets de cámara
  └── fallback 2D
            │
            ▼
Producción (fase posterior)
  ├── PNG 300 DPI por zona
  ├── verificación de medidas/bleed
  └── archivo final por orden
```

### Dependencias propuestas

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `gltfjsx` (solo herramienta de desarrollo para tipar el modelo)
- Compresión Draco/Meshopt para GLB.

El visor debe cargarse con `dynamic(..., { ssr: false })` y un fallback estático.

---

## Cambios de datos necesarios

### DesignTemplate

- `model3dUrl`: ya implementado.
- `modelConfig` JSON: mapeo de mallas, UVs, cámaras y materiales.
- Opcional: `model3dScale`, `model3dVersion`.

### Zonas

Agregar a cada zona:

- `meshName`
- `uvRect`
- `cameraPreset`
- `printDpi`
- `bleedMm`
- `printMethod` (`DTG`, `DTF`, `SCREEN`, `EMBROIDERY`)
- `maxWidthCm`, `maxHeightCm` (ya existen)

### Diseño

Agregar `zoneAssets` o una tabla `CustomDesignZone`:

- `zoneKey`
- `previewUrl`
- `printFileUrl`
- `widthCm`
- `heightCm`
- `dpi`
- `status`

Para la primera iteración se puede guardar en JSON. A mediano plazo conviene una tabla.

---

## Fases y esfuerzo estimado

| Fase | Alcance | Esfuerzo |
|---|---|---|
| **0. Assets** | Definir medidas, conseguir/modelar 2 GLB, UVs y licencias | 1–2 semanas de modelado externo o compra/adaptación |
| **1. Visor base** | Cargar GLB, orbit, zoom, color, cámara presets, fallback | 2–3 días |
| **2. Texturas por zona** | Canvas 2D → textura, mallas de impresión, tabs, calibrar | 3–5 días |
| **3. Mobile y pulido** | Responsive, gestos, loading, performance | 2–3 días |
| **4. Producción** | Archivos 300 DPI por zona, validaciones y orden | 3–5 días |
| **5. Iteración** | Edición en 3D, AR, más prendas | variable |

El cuello de botella no es el visor: son **los modelos GLB bien preparados y la calibración de zonas**.

---

## Decisiones que necesitamos cerrar

1. ¿Arrancamos con **remera + hoodie** o solo remera?
2. ¿Los modelos los aporta el cliente, los compramos con licencia o los modelamos?
3. ¿La primera versión 3D es **solo lectura** o el usuario debe arrastrar sobre el modelo?
4. ¿Qué método de impresión usará el taller: DTG, DTF, screen, bordado?
5. ¿El admin va a subir y calibrar GLB o lo hacemos desde desarrollo?
6. ¿La prenda 3D se muestra sola o sobre un maniquí?

## Recomendación para empezar a iterar

1. Conseguir **un GLB de remera** con mallas separadas y UVs de impresión.
2. Implementar visor 3D de solo lectura con rotación/zoom y color.
3. Mapear `front` y `back` con texturas de preview.
4. Validar visualmente con el equipo y recién después agregar mangas y hoodie.
5. Generar el primer archivo de impresión 300 DPI desde el canvas 2D.

## Referencias

- Zakeke 3D T-shirt configurator: https://www.zakeke.com/blog/3d-configurator/tshirt/
- Zakeke pricing/features: https://www.zakeke.com/features/
- PrintXpand 3D T-Shirt Configurator: https://www.printxpand.com/3d-tshirt-configurator/
- Chamevo Apparel: https://chamevo.com/industries/apparel/
- Konfiwear Web-to-Print: https://konfiwear.com/solutions/web-to-print
- Konfiwear 3D Clothing Configurator: https://konfiwear.com/solutions/3d-clothing-configurator
- Custy: https://custyapp.com/
- Threekit Apparel Configurator: https://www.threekit.com/blog/3d-configurator-for-custom-apparel
- Simplio3D model preparation: https://www.simplio3d.com/blog/preparing-3d-models-for-simplio3d
- Staggs 3D model requirements: https://staggs.app/docs/3d-model-requirements-staggs-product-configurator/
- Three.js decals example: https://threejs.org/examples/webgl_decals.html
- Three.js forum: UV mapping vs decals: https://discourse.threejs.org/t/3d-shirt-configurator-issues-dynamic-change-in-3d-model-as-changes-in-2d-template/70131
- TShirt3DKit: https://github.com/JawaharCoder/TShirt3DKit
