# Spec: URL de rastreo de couriers

## Objetivo
Permitir asociar una URL de rastreo externa a cada envío de un pedido, de modo que desde el panel de administración (y opcionalmente el storefront) se pueda abrir directamente la página del proveedor de courier para rastrear el paquete.

## Alcance
- Agregar `trackingUrl` opcional al modelo `Shipment`.
- Permitir ingresar/editar la URL al crear un envío desde `/admin/orders/[id]`.
- Mostrar la URL como link en la tabla de envíos del pedido.
- Exponer `trackingUrl` en la respuesta de órdenes para que el storefront pueda mostrarla.
- Incluir la URL en el email de actualización de envío.

## Fuera de alcance
- Integraciones automáticas con APIs de couriers.
- Generación automática de URL a partir de `carrier` + `trackingNumber`.
- Múltiples monedas o tarifas de envío.

## Apps afectadas
- `apps/api`
- `apps/admin`
- `apps/web`

## Roles involucrados
- Admin: crea/envía envíos y agrega la URL de rastreo.
- Cliente: ve el link de rastreo en el detalle de su orden.

## Casos de uso
1. Admin abre el detalle de una orden en `/admin/orders/[id]`.
2. Admin crea un envío indicando transportista, número de rastreo y la URL pública del courier.
3. Admin guarda el envío.
4. Desde la tabla de envíos, admin hace clic en el link y abre la página del courier.
5. El cliente recibe el email con la URL y también la ve en `/orders/[id]`.

## Reglas de negocio
- `trackingUrl` es opcional.
- Si se proporciona, debe ser una URL válida (`https://...`).
- Se guarda por envío, no por pedido.
- La respuesta pública de orden incluirá la `trackingUrl` del envío principal (primero creado) para facilitar la UI.

## Modelo de datos
`Shipment` se extiende con:
- `trackingUrl String?`

## API
### `POST /admin/orders/{orderId}/shipments`
Body:
```json
{
  "carrier": "string",
  "trackingNumber": "string",
  "trackingUrl": "https://courier.example.com/track?123",
  "notes": "string"
}
```

### `GET /admin/orders/{orderId}/shipments`
Cada envío ahora incluye `trackingUrl`.

### `GET /orders/{id}` y `GET /admin/orders/{id}`
La orden incluirá `trackingUrl` del envío principal y el array `shipments` con `trackingUrl`.

## UI / UX
- Formulario de nuevo envío en admin: campo "URL de rastreo" opcional.
- Tabla de envíos: columna con link externo (`Anchor`) si existe `trackingUrl`.
- Email de envío: incluir link si existe.
- Storefront detalle de orden: botón/link "Rastrear envío" si hay `trackingUrl`.

## Validaciones
- Backend: si `trackingUrl` no es vacío, debe ser una URL válida.
- Frontend: mostrar campo opcional; link con `target="_blank" rel="noopener noreferrer"`.

## Permisos
- Solo `ADMIN` puede crear/enviar envíos y por tanto asignar la URL.

## Estados de carga y error
- Guardar envío con URL inválida devuelve `400 Bad Request`.
- Link inactivo si no hay URL.

## Criterios de aceptación
- [ ] `trackingUrl` agregado al modelo y migración creada.
- [ ] Endpoint de creación de envío acepta y valida `trackingUrl`.
- [ ] Respuesta de orden incluye `trackingUrl`.
- [ ] UI admin permite ingresar y abrir la URL.
- [ ] Email de envío incluye el link.
- [ ] Storefront muestra el link de rastreo.
- [ ] `api-client` regenerado y compila.
- [ ] Tests actualizados/pasando.

## Testing mínimo
- E2E: crear envío con `trackingUrl` y verificar que se persiste.
- Unitario: validación de URL inválida.
- Frontend: link renderiza y apunta a la URL correcta.

## Observaciones técnicas
- Se reutiliza `AdminShipmentResponseDto` y `ShipmentResponseDto` agregando el campo.
- Se puede extender luego para generar la URL automáticamente según el carrier.
