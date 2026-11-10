import { z } from 'zod';

export const CustomizerColorOptionSchema = z.object({
  name: z.string().min(1),
  hex: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
  priceAdjustment: z.number().int().default(0),
});

export const CustomizerSizeOptionSchema = z.object({
  name: z.string().min(1),
  priceAdjustment: z.number().int().default(0),
});

export const CustomizerPrintZoneSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  /** Coordenadas normalizadas 0..1 respecto de la imagen de la prenda. */
  x: z.number().min(0).max(1).default(0.25),
  y: z.number().min(0).max(1).default(0.2),
  width: z.number().min(0.01).max(1).default(0.5),
  height: z.number().min(0.01).max(1).default(0.6),
  price: z.number().int().min(0).default(0),
  printMethod: z.enum(['DTG', 'DTF', 'SCREEN', 'EMBROIDERY']).default('DTG'),
  printDpi: z.number().int().min(72).max(1200).default(300),
  bleedMm: z.number().min(0).max(20).default(2),
  imageUrl: z.string().optional().nullable(),
  maxWidthCm: z.number().positive().optional().nullable(),
  maxHeightCm: z.number().positive().optional().nullable(),
  allowText: z.boolean().default(true),
  allowImage: z.boolean().default(true),
  allowClipart: z.boolean().default(true),
});

export const CustomizerQuantityTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  discountPercent: z.number().min(0).max(100),
});

export const CustomizerPricingRulesSchema = z.object({
  perElement: z.number().int().min(0).default(2_500),
  textPerCharacter: z.number().int().min(0).default(0),
  setupFee: z.number().int().min(0).default(0),
  minPrice: z.number().int().min(0).default(0),
  quantityTiers: z.array(CustomizerQuantityTierSchema).default([]),
});

export type CustomizerColorOption = z.infer<typeof CustomizerColorOptionSchema>;
export type CustomizerSizeOption = z.infer<typeof CustomizerSizeOptionSchema>;
export type CustomizerPrintZone = z.infer<typeof CustomizerPrintZoneSchema>;
export type CustomizerQuantityTier = z.infer<typeof CustomizerQuantityTierSchema>;
export type CustomizerPricingRules = z.infer<typeof CustomizerPricingRulesSchema>;

export interface CustomizerElementLike {
  type: 'TEXT' | 'UPLOADED_IMAGE' | 'CLIPART';
  printAreaKey?: string | null;
  textContent?: string | null;
  fontSize?: number | null;
  scale?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface CustomizerTemplateLike {
  basePrice: number;
  colorOptions?: unknown;
  sizeOptions?: unknown;
  printAreas?: unknown;
  pricingRules?: unknown;
  availableColors?: string[];
  availableSizes?: string[];
}

export interface CustomizerPriceBreakdownItem {
  key: string;
  label: string;
  amount: number;
}

export interface CustomizerPriceResult {
  unitPrice: number;
  basePrice: number;
  colorAdjustment: number;
  sizeAdjustment: number;
  printZones: number;
  elements: number;
  textCharacters: number;
  setupFee: number;
  beforeDiscount: number;
  discountAmount: number;
  discountPercent: number;
  quantity: number;
  breakdown: CustomizerPriceBreakdownItem[];
}

export const DEFAULT_CUSTOMIZER_PRICING: CustomizerPricingRules = {
  perElement: 2_500,
  textPerCharacter: 0,
  setupFee: 0,
  minPrice: 0,
  quantityTiers: [],
};

const COLOR_HEX: Record<string, string> = {
  blanco: '#ffffff',
  blanca: '#ffffff',
  white: '#ffffff',
  negro: '#0d0d0d',
  negra: '#0d0d0d',
  preta: '#0d0d0d',
  black: '#0d0d0d',
  gris: '#888888',
  gray: '#888888',
  grey: '#888888',
  cinza: '#888888',
  rojo: '#c92a2a',
  vermelho: '#c92a2a',
  red: '#c92a2a',
  azul: '#1864ab',
  blue: '#1864ab',
  verde: '#2f9e44',
  green: '#2f9e44',
  amarillo: '#f08c00',
  yellow: '#f08c00',
  rosa: '#d6336c',
  pink: '#d6336c',
  oliva: '#6f7a4e',
  olive: '#6f7a4e',
  beige: '#eaddcf',
  marron: '#5c3a21',
  brown: '#5c3a21',
  celeste: '#74c0fc',
  arena: '#d8c3a5',
};

export function colorNameToHex(name: string): string {
  return COLOR_HEX[name.trim().toLowerCase()] ?? '#cccccc';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeColorOptions(template: Pick<CustomizerTemplateLike, 'colorOptions' | 'availableColors'>): CustomizerColorOption[] {
  if (Array.isArray(template.colorOptions)) {
    const parsed = z.array(CustomizerColorOptionSchema).safeParse(template.colorOptions);
    if (parsed.success && parsed.data.length > 0) return parsed.data;
  }

  return (template.availableColors ?? []).map((name) => ({
    name,
    hex: colorNameToHex(name),
    priceAdjustment: 0,
  }));
}

export function normalizeSizeOptions(template: Pick<CustomizerTemplateLike, 'sizeOptions' | 'availableSizes'>): CustomizerSizeOption[] {
  if (Array.isArray(template.sizeOptions)) {
    const parsed = z.array(CustomizerSizeOptionSchema).safeParse(template.sizeOptions);
    if (parsed.success && parsed.data.length > 0) return parsed.data;
  }

  return (template.availableSizes ?? []).map((name) => ({ name, priceAdjustment: 0 }));
}

export function normalizePrintZones(printAreas: unknown): CustomizerPrintZone[] {
  const record = asRecord(printAreas);
  if (Array.isArray(record.zones)) {
    const parsed = z.array(CustomizerPrintZoneSchema).safeParse(record.zones);
    if (parsed.success && parsed.data.length > 0) return parsed.data;
  }

  // Compatibilidad con la forma legacy `{ front: { x, y, width, height } }`.
  const legacy = Object.entries(record).filter(([key]) => key !== 'zones');
  if (legacy.length > 0) {
    return legacy.map(([key, value]) => {
      const area = asRecord(value);
      const x = Number(area.x);
      const y = Number(area.y);
      const width = Number(area.width);
      const height = Number(area.height);
      const normalized =
        [x, y, width, height].every(Number.isFinite) &&
        x <= 1 && y <= 1 && width <= 1 && height <= 1;

      return {
        key,
        label: ({ front: 'Frente', back: 'Espalda', leftSleeve: 'Manga izquierda', rightSleeve: 'Manga derecha' } as Record<string, string>)[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
        x: normalized ? x : 0.25,
        y: normalized ? y : 0.2,
        width: normalized ? width : 0.5,
        height: normalized ? height : 0.6,
        price: 0,
        printMethod: 'DTG',
        printDpi: 300,
        bleedMm: 2,
        imageUrl: null,
        allowText: true,
        allowImage: true,
        allowClipart: true,
        maxWidthCm: null,
        maxHeightCm: null,
      };
    });
  }

  return [
    {
      key: 'front',
      label: 'Frente',
      x: 0.25,
      y: 0.2,
      width: 0.5,
      height: 0.6,
      price: 0,
      printMethod: 'DTG',
      printDpi: 300,
      bleedMm: 2,
      imageUrl: null,
      allowText: true,
      allowImage: true,
      allowClipart: true,
      maxWidthCm: null,
      maxHeightCm: null,
    },
  ];
}

export function normalizePricingRules(rules: unknown): CustomizerPricingRules {
  const parsed = CustomizerPricingRulesSchema.safeParse(rules);
  return parsed.success ? parsed.data : DEFAULT_CUSTOMIZER_PRICING;
}

export function calculateCustomizerPrice(input: {
  template: CustomizerTemplateLike;
  elements: CustomizerElementLike[];
  color?: string | null;
  size?: string | null;
  quantity?: number;
}): CustomizerPriceResult {
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
  const colors = normalizeColorOptions(input.template);
  const sizes = normalizeSizeOptions(input.template);
  const zones = normalizePrintZones(input.template.printAreas);
  const pricing = normalizePricingRules(input.template.pricingRules);

  const colorAdjustment = colors.find((color) => color.name === input.color)?.priceAdjustment ?? 0;
  const sizeAdjustment = sizes.find((size) => size.name === input.size)?.priceAdjustment ?? 0;
  const usedZoneKeys = new Set(input.elements.map((element) => element.printAreaKey || 'front'));
  const usedZones = zones.filter((zone) => usedZoneKeys.has(zone.key));
  const printZones = usedZones.reduce((sum, zone) => sum + zone.price, 0);
  const elements = input.elements.length * pricing.perElement;
  const textCharacters = input.elements
    .filter((element) => element.type === 'TEXT')
    .reduce((sum, element) => sum + (element.textContent?.length ?? 0), 0);
  const textCost = textCharacters * pricing.textPerCharacter;
  const beforeDiscount =
    input.template.basePrice +
    colorAdjustment +
    sizeAdjustment +
    printZones +
    elements +
    textCost +
    pricing.setupFee;

  const tier = [...pricing.quantityTiers]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((item) => quantity >= item.minQuantity);
  const discountPercent = tier?.discountPercent ?? 0;
  const discountAmount = Math.round((beforeDiscount * discountPercent) / 100);
  const unitPrice = Math.max(pricing.minPrice, beforeDiscount - discountAmount);

  const breakdown: CustomizerPriceBreakdownItem[] = [
    { key: 'base', label: 'Prenda base', amount: input.template.basePrice },
  ];
  if (colorAdjustment) breakdown.push({ key: 'color', label: 'Color', amount: colorAdjustment });
  if (sizeAdjustment) breakdown.push({ key: 'size', label: 'Talle', amount: sizeAdjustment });
  for (const zone of usedZones) {
    if (zone.price) breakdown.push({ key: `zone:${zone.key}`, label: `Zona ${zone.label}`, amount: zone.price });
  }
  if (elements) breakdown.push({ key: 'elements', label: 'Elementos', amount: elements });
  if (textCost) breakdown.push({ key: 'text', label: 'Texto', amount: textCost });
  if (pricing.setupFee) breakdown.push({ key: 'setup', label: 'Setup', amount: pricing.setupFee });
  if (discountAmount) {
    breakdown.push({
      key: 'discount',
      label: `Descuento ${discountPercent}%`,
      amount: -discountAmount,
    });
  }

  return {
    unitPrice,
    basePrice: input.template.basePrice,
    colorAdjustment,
    sizeAdjustment,
    printZones,
    elements,
    textCharacters,
    setupFee: pricing.setupFee,
    beforeDiscount,
    discountAmount,
    discountPercent,
    quantity,
    breakdown,
  };
}
