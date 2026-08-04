# Spec: Cálculo de costo de envío y políticas configurables

## Objetivo
Calcular el costo de envío de cada orden según políticas configurables desde el admin, permitiendo tarifa plana, envío gratis por monto mínimo y descuentos porcentuales/fijos.

## Alcance
- Abstracción `ShippingProvider` con implementaciones:
  - `flatRate` — tarifa fija.
  - `freeThreshold` — gratis si el subtotal supera un monto; si no, tarifa base.
  - `discount` — descuento porcentual y/o fijo sobre la tarifa base.
- Configuración de envío en `StoreConfig`:
  - `shippingProvider`
  - `shippingBaseCost`
  - `freeShippingThreshold`
  - `shippingDiscountPercentage`
  - `shippingDiscountFixedAmount`
- Endpoint público `POST /checkout/shipping-cost` para previsualizar el costo antes de crear la orden.
- Uso del proveedor activo en `CheckoutService.initCheckout` para calcular `shippingCost`.
- Panel admin en `/store-config` para editar políticas de envío.

## Fuera de alcance
- Integración con APIs externas de couriers (Coordinadora, FedEx, etc.).
- Cálculo por zona geográfica o peso/volumen.
- Envío gratuito condicionado por cupón.
- Múltiples opciones de envío elegibles por el cliente.

## Apps afectadas
- `apps/api`
- `apps/admin`
- `apps/web`

## Roles involucrados
- Cliente (ve el costo de envío en checkout).
- Admin (configura la política de envío).

## Casos de uso
1. Admin elige "Tarifa plana" y define un costo base.
2. Admin elige "Envío gratis desde" y define un monto mínimo.
3. Admin aplica un descuento porcentual o fijo sobre el costo de envío.
4. Cliente ve el costo de envío en el resumen del checkout antes de crear la orden.
5. El costo final se guarda en la orden.

## Reglas de negocio
- El costo de envío nunca puede ser negativo.
- El descuento porcentual se aplica sobre el costo base resultante.
- El descuento fijo se resta después del porcentaje (si ambos existen).
- Si el subtotal alcanza el umbral de envío gratis, el costo base es 0 antes de descuentos.
- El `freeShippingThreshold` solo aplica al subtotal de los productos (sin cupones ni envío).
- La política se resuelve en runtime leyendo `StoreConfig`.
- El monto calculado se almacena en `Order.shippingCost` y no se recalcula automáticamente salvo que el admin cambie la política antes de que el cliente pague.

## Modelo de datos
`StoreConfig` se extiende con:
- `shippingProvider String @default("flatRate")`
- `shippingBaseCost Int @default(10000)`
- `freeShippingThreshold Int?`
- `shippingDiscountPercentage Int?`
- `shippingDiscountFixedAmount Int?`

## API
### `POST /checkout/shipping-cost`
**Body:**
```json
{
  "shippingAddressId": "uuid"
}
```

**Response 200:**
```json
{
  "shippingCost": 5000,
  "freeShippingThreshold": 150000,
  "baseCost": 10000
}
```

### `CheckoutSummary` (ya existente)
Incluye `shippingCost` calculado según la política activa.

### `PATCH /store-config`
Acepta los nuevos campos de envío.

## UI / UX
- Admin: nueva sección "Envío" en `/store-config` con:
  - Select de proveedor/política.
  - Costo base.
  - Umbral de envío gratis (condicional).
  - Descuento % y/o fijo (condicional).
- Storefront: en `/checkout` mostrar el costo de envío en el resumen antes de crear la orden (llamada al endpoint de preview).
- Storefront: en el resumen de orden ya creada, mostrar el envío final.

## Validaciones
- Backend: `shippingBaseCost >= 0`.
- Backend: `freeShippingThreshold >= 0` si está presente.
- Backend: `shippingDiscountPercentage` entre 0 y 100 si está presente.
- Backend: `shippingDiscountFixedAmount >= 0` si está presente.
- Backend: la dirección de envío pertenece al usuario.
- Frontend: mostrar "Calculado al pagar" si no se puede calcular; actualizar cuando se elija dirección.

## Permisos
- Configuración de envío: solo `ADMIN`.
- Consulta de costo: cliente autenticado para su propia dirección.

## Estados de carga y error
- Loading mientras se consulta el costo.
- Error si no hay dirección o la política no puede resolverse.

## Criterios de aceptación
- [ ] El admin puede cambiar la política y los parámetros de envío.
- [ ] El checkout aplica la política activa al calcular el total.
- [ ] El endpoint de preview devuelve el costo correcto sin crear orden.
- [ ] Envío gratis se aplica cuando el subtotal supera el umbral.
- [ ] Descuentos se aplican correctamente.
- [ ] `api-client` regenerado y compila.
- [ ] Tests e2e verifican cada política.

## Testing mínimo
- Test unitario del `ShippingCostCalculator` para cada política y combinación.
- E2E: calcular envío con tarifa plana, gratis por umbral, y con descuentos.
- E2E: cambiar la política desde admin y verificar que el checkout usa la nueva política.

## Observaciones técnicas
- Se usa una factory `ShippingProviderResolver` para seleccionar la implementación según `StoreConfig`.
- Los cálculos se centralizan en `ShippingCostCalculator` para facilitar tests y evitar duplicar lógica en checkout.
- No se acopla a un courier real; la abstracción permite agregar proveedores externos más adelante.
