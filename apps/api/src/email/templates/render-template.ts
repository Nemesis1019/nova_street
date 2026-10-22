export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Interpola variables en una plantilla.
 * - `{{variable}}`  → valor escapado (seguro para HTML).
 * - `{{{variable}}}` → valor crudo (para bloques HTML generados por el servidor).
 * Variables desconocidas se reemplazan por string vacío.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{\{\s*(\w+)\s*\}\}\}/g, (_match, name: string) => vars[name] ?? '')
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => escapeHtml(vars[name] ?? ''));
}
