: # ADR-002: Almacenamiento de archivos con Cloudflare R2

## Estado
Aceptada

## Contexto
El sistema maneja imágenes de catálogo, assets de personalización y archivos de producción. Se requiere un storage escalable, compatible con S3 y sin costos de salida excesivos. En desarrollo local no siempre se dispone de credenciales de R2, por lo que se necesita un fallback simple.

## Decisión
Usar **Cloudflare R2** como storage de objetos principal, accedido mediante `@aws-sdk/client-s3`, con **fallback a disco local** en desarrollo.

- Los frontends suben archivos a endpoints del backend (`POST /admin/assets/upload`, `POST /assets/upload-custom`).
- El backend recibe el archivo vía Multer y delega en `R2StorageService`.
- `R2StorageService` detecta si faltan credenciales de R2; si es así, guarda el archivo en `apps/api/uploads/` y lo sirve estáticamente en `/uploads`.
- Los registros `Asset` en la base de datos guardan el bucket y objectKey; `buildAssetUrl` genera la URL pública correcta según el origen.
- Se usa un único bucket configurado por `R2_BUCKET`; el fallback local usa subcarpetas dentro de `uploads/`.

## Consecuencias

### Ventajas
- Compatible con S3, sin reescribir integración si se cambia de proveedor.
- Costos de salida bajos en R2.
- Desarrollo local funciona sin credenciales ni conexión a R2.
- Toda la lógica de subida/validación vive en el backend, más seguro y consistente.

### Desventajas
- El backend recibe y procesa el archivo, lo que aumenta ligeramente la carga de red y CPU frente a subidas directas al storage.
- En producción requiere credenciales y bucket configurados.

## Alternativas consideradas
- AWS S3: descartado por costos de salida.
- Subida directa desde frontend a R2 con signed URLs: descartada para simplificar validación, autorización y registro de assets en un único flujo backend.
- MinIO local para dev + R2 para prod: opción futura; por ahora el fallback a disco cubre el caso de desarrollo.
