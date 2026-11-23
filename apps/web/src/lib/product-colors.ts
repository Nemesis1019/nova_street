export interface ProductColorVariant {
  id: string;
  color?: string | null;
  colorHex?: string | null;
}

const COLOR_FALLBACKS: Record<string, string> = {
  negro: '#0d0d0d',
  black: '#0d0d0d',
  blanco: '#f7f5ef',
  white: '#f7f5ef',
  crema: '#eee4cf',
  cream: '#eee4cf',
  beige: '#d8c8b3',
  arena: '#d8c8b3',
  camel: '#b38355',
  marron: '#6b4a35',
  marrón: '#6b4a35',
  oliva: '#6f7a4e',
  olive: '#6f7a4e',
  verde: '#4a6b50',
  green: '#4a6b50',
  azul: '#344e7a',
  blue: '#344e7a',
  marino: '#1d2b46',
  navy: '#1d2b46',
  rojo: '#a32a2a',
  red: '#a32a2a',
  bordo: '#5b1e28',
  burdeos: '#5b1e28',
  rosa: '#d59aa6',
  pink: '#d59aa6',
  amarillo: '#d6b34a',
  yellow: '#d6b34a',
  gris: '#8c8c8c',
  grey: '#8c8c8c',
  gray: '#8c8c8c',
  mix: '#9d9a94',
};

export function resolveColorHex(
  color?: string | null,
  colorHex?: string | null,
): string {
  if (colorHex && /^#[0-9A-Fa-f]{6}$/.test(colorHex)) return colorHex;
  const key = color?.trim().toLowerCase() ?? '';
  return COLOR_FALLBACKS[key] ?? '#b8b5ae';
}

/** Colores únicos por nombre, manteniendo el orden del primer variante. */
export function uniqueProductColors(variants?: ProductColorVariant[]) {
  const seen = new Set<string>();
  const colors: Array<{ color: string; hex: string; variantId: string }> = [];

  for (const variant of variants ?? []) {
    const color = variant.color?.trim();
    if (!color) continue;
    const key = color.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    colors.push({
      color,
      hex: resolveColorHex(color, variant.colorHex),
      variantId: variant.id,
    });
  }

  return colors;
}
