# Regresión visual del storefront

Matriz de capturas públicas para detectar regresiones de layout entre tenants/presets.

## Requisitos

- API en `http://localhost:4000`.
- Web en `http://localhost:3000`.
- Chrome instalado (Playwright usa `channel: 'chrome'`, no descarga navegadores).
- Resolución de `demo.localhost` hacia localhost.

## Comandos

```bash
# comparar contra las baselines
pnpm test:visual

# regenerar baselines después de un cambio visual intencional
pnpm test:visual:update
```

## Cobertura

- demo home desktop/mobile
- demo página estática
- demo ficha de producto
- demo catálogo
- nova home desktop/mobile
- nova ficha de producto
- nova catálogo

Las capturas se toman con `reducedMotion: 'reduce'` para que reveal, parallax, zoom, marquee y page transition no generen diferencias. Se ocultan cookie consent, popups y el overlay de desarrollo.

## Baselines

Las imágenes viven en `tests/visual/storefront.visual.spec.ts-snapshots/` y están atadas a Windows/Chrome. Si se corre en otro sistema, usar `--update-snapshots` en un entorno controlado y revisar el diff antes de commitear.
