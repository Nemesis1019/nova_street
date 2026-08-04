# Pendientes del proyecto

Lista de funcionalidades y mejoras planificadas, priorizadas por valor para el negocio y estabilidad del sistema.

## Alta prioridad

### Pagos
- [x] Registrar `docs/decisions/ADR-001-payment-provider.md` con la decisión de Stripe como pasarela por defecto y la estrategia para agregar futuras pasarelas.
- [x] Flujo de reembolsos desde el panel admin.
- [x] Flujo de reintentos de pago sin duplicar órdenes.

### Producción
- [x] Asignar responsable a ítems de producción (`OrderItem.assignedToId`, endpoint `/admin/production/items/:id/assign`, filtro en UI admin).
- [x] Estimación de entrega visible al cliente según `productionLeadTimeDays` (máximo entre ítems, incluido en `OrderResponseDto` y detalle de orden).

### Envíos
- [x] Cálculo de costo de envío según políticas configurables (tarifa plana, envío gratis, descuentos).
- [x] URL de rastreo de courier asociada al pedido y a cada envío (panel admin + storefront + email).
- [x] Generación automática de URL de rastreo a partir de transportista + número de seguimiento.
- Integración con APIs de couriers para cálculo de costo por dirección/peso.
- Múltiples opciones de envío elegibles por el cliente.

### Reviews de producto
- [x] Mostrar promedio de rating en listado de catálogo.
- [x] Permitir reseñas con fotos adjuntas (`ReviewAsset`, subida de fotos, miniaturas en listado y moderación).

## Personalización del storefront desde el admin

### Tema y branding
- [x] **Paleta de colores completa + modo oscuro/claro** configurable desde `store-config`.
- [ ] Tipografías y fuentes del storefront seleccionables desde el admin.
- [x] Logo configurable vía URL de imagen.
- [x] CSS personalizado inyectable desde el admin.

### Layout y contenido
- [x] Constructor de home: reordenar/ocultar secciones (hero, categorías, productos, banners, newsletter).
- [x] Banners promocionales y barra de anuncios configurables.
- [x] Menú de navegación configurable.
- [x] Footer configurable y páginas de políticas editables.

### Productos y catálogo
- [x] Tarjeta de producto configurable (mostrar/ocultar SKU, rating, stock, favoritos, vista rápida).
- [x] Badges de producto automáticos configurables (`Nuevo`, `Oferta`, `Agotado`, etc.).
- [x] Filtros y ordenamiento por defecto del catálogo.
- [x] Productos relacionados/recomendados configurables.

### Carrito y checkout
- [x] Badges de confianza en carrito/checkout.
- [x] Barra de progreso de envío gratis.
- [x] Campos del checkout configurables (teléfono, empresa, notas).
- [x] Cross-sell/upsell en producto y carrito.
- [x] Mensaje de agradecimiento personalizado post-compra.

### Marketing y SEO
- [ ] SEO por defecto (templates de meta título, descripción e imagen OG).
- [ ] Popups configurables (newsletter, descuento primer compra, avisos legales).
- [ ] Scripts externos en `<head>` / `<body>` (Analytics, Pixel, chat).
- [ ] Botón flotante de WhatsApp configurable.
- [ ] Notificaciones sociales (ultimas compras, stock bajo, etc.).

### Feature flags
- [x] Activar/desactivar wishlist, comparador, reseñas, personalizador, guest checkout, vista rápida.

## Media prioridad

### Testing
- [x] Tests e2e de flujos críticos (registro, compra, checkout, cupón, personalización).
- [x] Tests de permisos en backend.
- [x] Tests de `StockPolicyResolver` para ambos modos de stock.
- [x] Cobertura mínima objetivo en frontends.

### Notificaciones
- Notificaciones push (opcional).
- Notificaciones SMS para estados de pedido (opcional).
- Mejorar templates de email transaccional.

### Performance
- [x] Cache de catálogo con Redis.
- [x] Optimización de imágenes (formatos WebP/AVIF, thumbnails).
- [x] Lazy loading del editor de personalización.
- [x] Paginación y ordenamiento avanzados en catálogo.

### Multi-moneda / multi-idioma
- [x] Soporte de múltiples monedas (modelo `Currency`, conversiones en storefront/admin, selector de moneda).
- [x] Internacionalización (i18n) básica de storefront y admin (es/en/pt, selector de idioma, diccionarios TS).

## Baja prioridad

### Analytics y reportes
- [x] Reportes de ventas, productos más vendidos y conversión.
- [x] Dashboard con gráficos en `apps/admin`.
- [x] Exportación de pedidos y productos a CSV/Excel.

### Experiencia de usuario
- [x] Checkout como invitado (guest).
- [x] Wishlist / lista de deseos.
- [x] Búsqueda predictiva en catálogo.
- [x] Comparador de productos.

### Infraestructura
- [x] Jobs con BullMQ (generación de previews, envío de emails masivos, reconciliación de pagos).
- [x] CDN para assets e imágenes.
- [x] Monitoreo y alertas (errores, pagos fallidos).
- [x] Backups automatizados de base de datos.

## Reglas de trabajo

- Antes de implementar un pendiente, crear o actualizar su spec siguiendo `skills.md`.
- Si el cambio afecta el contrato de API, regenerar `packages/api-client`.
- Mantener actualizados `PROGRESO.md` y `PENDIENTES.md` al cerrar cada feature.
