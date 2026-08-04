# Spec: Optimización de imágenes

## Objetivo
Servir imágenes en tamaños/formatos más eficientes para reducir ancho de banda y tiempos de carga.

## Alcance
- Procesar imágenes subidas al backend con `sharp` para generar variantes:
  - `thumbnail` (ej. 300px de ancho).
  - `small` (ej. 600px).
  - `medium` (ej. 1200px).
- Guardar variantes como assets adicionales o en disco local/R2.
- Exponer en la respuesta de productos URLs para las variantes generadas.
- Usar formatos WebP/AVIF cuando sea posible.

## Fuera de alcance
- CDN externo (ya existe soporte para CDN_BASE_URL).
- Reprocesamiento masivo de imágenes históricas.

## API
- Respuestas de producto incluyen `thumbnailUrl`, `smallUrl`, `mediumUrl` además de `url`.

## Testing
- Test unitario/e2e de subida de imagen y verificación de variantes.
- Verificar que productos devuelven las URLs de variantes.
