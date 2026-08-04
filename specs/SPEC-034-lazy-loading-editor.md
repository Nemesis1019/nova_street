# Spec: Lazy loading del editor de personalización

## Objetivo
Reducir el bundle inicial de `/personalizar/[templateId]` cargando el editor de personalización solo cuando la página se renderiza.

## Alcance
- Reemplazar import estático de `CustomizerEditor` por `next/dynamic` con `ssr: false`.
- Mostrar un estado de carga mientras se descarga el chunk.

## Fuera de alcance
- Code-splitting de librerías internas del editor.
- Precarga del chunk.

## Testing
- Build de web: el chunk del editor debe separarse.
- Lighthouse / bundle analyzer opcional.
