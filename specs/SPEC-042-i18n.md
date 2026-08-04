# Spec: Internacionalización (i18n)

## Objetivo
Permitir cambiar el idioma del storefront y del panel de administración entre español, inglés y portugués, con un sistema de diccionarios extensible.

## Alcance
- Diccionarios JSON por idioma (`es`, `en`, `pt`) en cada frontend.
- `I18nProvider` + hook `useTranslation` para acceder a traducciones.
- Selector de idioma en el header del storefront y en el admin shell.
- Idioma por defecto `es`; persistencia en `localStorage`.
- Traducciones de textos principales de UI, navegación, catálogo, carrito y checkout.

## Apps afectadas
- `apps/web`: todos los componentes principales que muestren texto al usuario.
- `apps/admin`: shell, navegación y páginas principales.

## Reglas de negocio
- El idioma es opcional y no afecta datos ni API.
- Las fechas y monedas se formatean con el locale correspondiente.
- Si una clave no existe en el idioma seleccionado, se usa `es` como fallback.

## Estructura de diccionarios
```
public/locales/es/common.json
public/locales/en/common.json
public/locales/pt/common.json
```

Categorías: `common`, `product`, `cart`, `checkout`, `auth`, `navigation`, `admin`.

## UI / UX
- Selector compacto en header (`ES / EN / PT`).
- Cambio de idioma inmediato sin recargar.

## Testing mínimo
- Test unitario del hook `useTranslation` y fallback.
- Verificar que el selector de idioma renderiza y cambia el texto.
