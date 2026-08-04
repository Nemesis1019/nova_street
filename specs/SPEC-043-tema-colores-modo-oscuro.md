# SPEC-043: Personalización de tema y modo oscuro desde el admin

## Objetivo
Permitir que desde el panel de administración se configure la paleta de colores completa y el modo de apariencia (claro/oscuro/sistema) del storefront, y que estos cambios se apliquen en caliente sin necesidad de deploy.

## Alcance
- Backend: extender `StoreConfig` con tokens de tema y `appearanceMode`.
- Admin: agregar controles de color y selector de modo oscuro en `/store-config`.
- Storefront: leer la configuración y aplicar CSS variables + `MantineProvider` color scheme.
- Migración de Prisma para los nuevos campos.
- Regenerar `api-client` y actualizar tipos.

## Modelo de datos

### Campos nuevos en `StoreConfig`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `appearanceMode` | enum `LIGHT` \| `DARK` \| `SYSTEM` | `LIGHT` | Modo de apariencia del storefront |
| `surfaceColor` | String | `#ffffff` | Superficie de tarjetas/paneles |
| `surfaceMutedColor` | String | `#f6f3f2` | Fondo de secciones secundarias |
| `borderColor` | String | `#0d0d0d` | Color de bordes |
| `errorColor` | String | `#e03131` | Errores / estado negativo |
| `successColor` | String | `#2f9e44` | Éxito / estado positivo |
| `warningColor` | String | `#f76707` | Advertencias |
| `darkBackgroundColor` | String | `#0d0d0d` | Fondo en modo oscuro |
| `darkTextColor` | String | `#f5f5f5` | Texto en modo oscuro |

Los campos existentes `primaryColor`, `secondaryColor`, `backgroundColor` y `textColor` se mantienen.

## API

### `GET /store-config`
Devuelve todos los campos del tema en `StoreConfigResponseDto`.

### `PATCH /store-config`
Acepta los nuevos campos opcionales en `UpdateStoreConfigDto`:
- `appearanceMode`
- `surfaceColor`, `surfaceMutedColor`, `borderColor`
- `errorColor`, `successColor`, `warningColor`
- `darkBackgroundColor`, `darkTextColor`

Validaciones: colores hex/RGB/HSL; `appearanceMode` debe ser `LIGHT`, `DARK` o `SYSTEM`.

## Frontend

### Admin
- Sección "Tema" en `/store-config` con:
  - `ColorInput` para cada token de color.
  - `Select` para `appearanceMode`.
  - Preview en vivo del color primario/secundario.

### Storefront
- `theme-provider.tsx` expone CSS variables en el root según el modo:
  - `--color-primary`
  - `--color-secondary`
  - `--color-background`
  - `--color-text`
  - `--color-surface`
  - `--color-surface-muted`
  - `--color-border`
  - `--color-error`
  - `--color-success`
  - `--color-warning`
- `MantineProvider` recibe `colorScheme` derivado de `appearanceMode` (resolviendo `SYSTEM` al preferido del navegador).
- `data-mantine-color-scheme` y `data-theme` se aplican en el documento para que estilos personalizados respondan al modo.

## Tests
- Tests e2e de `store-config` actualizados para enviar y leer los nuevos campos.
- Tests unitarios del provider para verificar que `SYSTEM` se resuelve a `light`/`dark` según `matchMedia`.

## Pendientes futuros
- Refactorizar componentes individuales para usar las CSS variables en lugar de colores hardcodeados.
- Modo oscuro para emails transaccionales (solo el HTML del admin si aplica).
