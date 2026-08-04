# Spec: Dashboard con gráficos en admin

## Objetivo
Mostrar visualmente las métricas clave de la tienda en el dashboard administrativo.

## Alcance
- Reemplazar/amplificar la página `/admin/dashboard` actual con KPIs y gráficos.
- Gráfico de ingresos y órdenes en el tiempo.
- Top productos vendidos.
- Tasa de conversión resumida.

## Fuera de alcance
- Filtros avanzados de período.
- Reportes detallados (ver SPEC-019).

## Apps afectadas
- `apps/admin`

## Roles
- ADMIN.

## UI / UX
- Tarjetas de KPI en la parte superior.
- Gráfico de líneas o barras con Recharts.
- Tabla pequeña de top productos.
- Selector de rango de fechas rápido (7, 30, 90 días).

## Dependencias
- `@ecommerce/api-client` actualizado con endpoints de analytics.
- Librería de gráficos (ya en admin o instalar `recharts`).

## Criterios de aceptación
- [ ] Dashboard carga datos de analytics.
- [ ] Gráficos se renderizan sin errores.
- [ ] Responsive básico.
- [ ] Tests verifican renderizado de KPIs.

## Testing mínimo
- Unit test del componente Dashboard con mocks de analytics.
