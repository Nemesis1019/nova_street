# Spec: Theming y Configuración Transversal del Storefront

## Objetivo
Permitir que el mismo core de e-commerce se reutilice para diferentes negocios solo cambiando la apariencia y configuración del storefront, sin modificar código de negocio. La configuración es editable desde el panel administrativo.

## Alcance
- Configuración de marca: nombre, descripción, logo URL, favicon URL.
- Configuración de colores: primary, secondary, background, text.
- Configuración de layout: header style, footer text, hero image, hero title, hero subtitle.
- Configuración de contacto: email, teléfono, redes sociales.
- Configuración de moneda y formato de precios.
- Endpoint público para obtener configuración activa.
- Endpoint admin para actualizar configuración.
- Aplicación de configuración en `apps/web` vía tema dinámico de Mantine.

## Fuera de alcance
- Editor visual WYSIWYG de temas.
- Múltiples temas activos simultáneamente (A/B testing).
- Configuración por dominio (multi-tenant).

## Apps afectadas
- `apps/api`
- `apps/admin`
- `apps/web`

## Roles involucrados
- `Customer`: ve el storefront con el tema aplicado.
- `Admin`: edita la configuración del storefront.

## Casos de uso
1. Admin actualiza nombre y colores del storefront.
2. Admin sube logo y hero image (vía R2).
3. Customer ve el storefront reflejando la nueva configuración.
4. Otro negocio reutiliza el core cambiando solo la configuración y estilos.

## Reglas de negocio
- Solo existe una configuración activa por storefront.
- Los cambios de configuración se aplican inmediatamente (sin redeploy).
- El frontend debe tolerar configuración parcial o ausente usando valores por defecto.
- Colores deben ser valores CSS válidos (hex, rgb, hsl).
- URLs de logo/hero deben apuntar a assets públicos o signed URLs.

## Modelo de datos

```txt
StoreConfig
  id: UUID
  name: String
  description: String?
  logoUrl: String?
  faviconUrl: String?
  primaryColor: String
  secondaryColor: String
  backgroundColor: String
  textColor: String
  heroImageUrl: String?
  heroTitle: String?
  heroSubtitle: String?
  contactEmail: String?
  contactPhone: String?
  socialLinks: Json?
  currencyCode: String @default("PYG")
  isActive: Boolean @default(true)
  updatedById: UUID?
  createdAt: DateTime
  updatedAt: DateTime
```

## API

### Público

**GET /store-config**
Response 200: configuración activa.

### Admin

**PATCH /admin/store-config**
Body: campos a actualizar.
Response 200: configuración actualizada.

## UI / UX

### `apps/admin`
- Formulario de configuración general (nombre, descripción, contacto).
- Selector de colores con preview.
- Upload de logo y hero image.
- Vista previa del storefront.

### `apps/web`
- Layout raíz que carga configuración y aplica tema de Mantine.
- Header con logo y nombre.
- Hero section con imagen/título configurables.
- Footer con contacto y redes.

## Validaciones

### Backend
- Colores válidos (regex básica de hex/rgb/hsl).
- `currencyCode` en formato ISO 4217.
- Solo una configuración activa.

### Frontend
- Preview inmediata de cambios en admin.
- Fallback a defaults si la config no carga.

## Criterios de aceptación
- [ ] Admin puede editar nombre, colores, logo, hero y contacto.
- [ ] Storefront refleja cambios sin redeploy.
- [ ] Configuración parcial no rompe el frontend.
- [ ] Tests de integración para GET/PATCH de configuración.

## Testing mínimo
- Tests de servicio de configuración.
- Tests e2e: admin actualiza config y storefront la refleja.

## Observaciones técnicas
- Se usará `@mantine/core` con `MantineProvider` y theme override dinámico.
- Las imágenes se almacenarán en R2 (`ADR-002`).
- El API client debe exponer los tipos de `StoreConfig`.
