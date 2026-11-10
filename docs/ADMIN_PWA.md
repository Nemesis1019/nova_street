# Admin PWA

El panel de administración es instalable como PWA en desktop y mobile.

## Implementación

- `apps/admin/src/app/manifest.ts`: manifest (nombre, start_url `/dashboard`, scope `/`, display standalone, iconos 192/512/maskable y shortcuts a Dashboard, Órdenes, Diseño y Suscripción).
- `apps/admin/public/sw.js`: service worker.
- `apps/admin/public/offline.html`: fallback offline autocontenido.
- `apps/admin/src/components/pwa-register.tsx`: registra `/sw.js` y activa updates.
- `apps/admin/src/components/pwa-install-button.tsx`: botón de instalación cuando el navegador emite `beforeinstallprompt`.
- `apps/admin/src/app/layout.tsx`: manifest, theme color, Apple web app e iconos.
- `apps/admin/next.config.ts`: headers de service worker, manifest e iconos.

## Política de caché

La PWA **no cachea HTML del admin, respuestas RSC ni API**. Sólo cachea:

- `offline.html` y iconos (precache);
- assets estáticos públicos (`/_next/static`, CSS, JS, fuentes e imágenes) en producción;
- en desarrollo hace network-first para evitar chunks viejos.

Las rutas de navegación usan network-first y caen al offline page si no hay red. Los datos sensibles del admin se consultan siempre online.

## Probar

1. Levantar admin en `http://localhost:3001`.
2. Abrir con Chrome (no incógnito).
3. Instalar desde el icono de instalación del navegador o el botón **Instalar app** del header.
4. Para probar offline: DevTools → Application → Service Workers → Offline, o desconectar la red y navegar dentro de la app.

En producción la PWA requiere HTTPS (localhost está exceptuado). El service worker tiene una versión (`VERSION`); al cambiar su lógica se debe incrementar para invalidar caches.

## Verificación

- `GET /manifest.webmanifest` → 200 `application/manifest+json`.
- `GET /sw.js` → 200 con `Service-Worker-Allowed: /` y sin cache.
- Iconos y `offline.html` → 200.
- Registro real del SW: 1 registration activa, scope `/`.
- Navegación offline: responde **200** con la página “Sin conexión”.
- Chrome DevTools `Page.getAppManifest`: sin errores de manifest.
- `Page.getInstallabilityErrors` sólo reporta `in-incognito` en la prueba headless (esperado).
