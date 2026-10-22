/**
 * Shim de resolución de rutas para @nestjs/swagger.
 *
 * El plugin CLI de @nestjs/swagger genera `_OPENAPI_METADATA_FACTORY` con
 * `require()` a rutas ABSOLUTAS de los archivos fuente (.ts) cuando la ruta del
 * proyecto contiene caracteres no ASCII (p. ej. "NÖVA"): TypeScript los escapa
 * como `\u00D6`, el plugin no logra convertir la ruta a relativa y el require
 * queda apuntando a `src/`, por lo que falla al ejecutar `dist/`.
 *
 * Este shim reescribe en caliente esos requires hacia el árbol de `dist/`
 * actual (relativo a este archivo compilado), de modo que la documentación
 * funcione en dev, en build y en despliegues con otra ruta absoluta.
 *
 * Debe importarse antes de generar el documento Swagger (ver main.ts).
 */
import Module from "module";
import { join, resolve } from "path";

const SOURCE_MARKER = "/apps/api/src/";

const moduleInternals = Module as unknown as {
  _resolveFilename: (request: unknown, ...args: unknown[]) => unknown;
};

const originalResolveFilename = moduleInternals._resolveFilename;

moduleInternals._resolveFilename = function (
  request: unknown,
  ...args: unknown[]
): unknown {
  if (typeof request === "string") {
    const normalized = request.replace(/\\/g, "/");
    const markerIndex = normalized.indexOf(SOURCE_MARKER);
    if (markerIndex !== -1) {
      const relativePath = normalized.slice(markerIndex + SOURCE_MARKER.length);
      const distPath = join(resolve(__dirname, ".."), relativePath);
      return originalResolveFilename.call(moduleInternals, distPath, ...args);
    }
  }
  return originalResolveFilename.call(moduleInternals, request, ...args);
};
