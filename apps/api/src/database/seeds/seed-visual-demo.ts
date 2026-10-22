/**
 * Seed de demo visual: deja la tienda "totalmente configurada" para recorrerla
 * de punta a punta (home, catálogo, producto, checkout, cuenta, admin).
 *
 * - Genera imágenes de marca con sharp y las sube a R2 (claves estables en `demo/`).
 * - Crea categorías, productos, variantes, stock, páginas, envíos, cupones,
 *   usuarios demo, órdenes en todos los estados, reseñas, wishlist y redirects.
 * - Es idempotente: usa upserts/markers y no borra datos existentes.
 *
 * Uso: doppler run -- pnpm exec ts-node src/database/seeds/seed-visual-demo.ts
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  AssetPurpose,
  CartItemType,
  CustomDesignElementType,
  CustomDesignStatus,
  DiscountType,
  OrderItemProductionStatus,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  RefundStatus,
  ShipmentStatus,
  StockMode,
} from '@prisma/client';
import argon2 from 'argon2';
import sharp from 'sharp';

import { DEMO_PRODUCT_PHOTOS, downloadUnsplashPhoto, processCatalogPhoto } from './demo-photos';

const prisma = new PrismaClient();

// eslint-disable-next-line no-console
const log = (...args: unknown[]) => console.log(...args);

const BRAND = {
  cream: '#fcf9f8',
  black: '#0d0d0d',
  olive: '#6f7a4e',
  muted: '#f6f3f2',
  gray: '#c9c6c5',
};

const R2_PUBLIC = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

/* -------------------------------------------------------------------------- */
/*                                   R2 + SVG                                  */
/* -------------------------------------------------------------------------- */

let r2Client: S3Client | null = null;

function getR2(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: true,
    });
  }
  return r2Client;
}

async function uploadObject(key: string, buffer: Buffer, contentType = 'image/webp'): Promise<{ key: string; url: string; size: number }> {
  await getR2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return { key, url: `${R2_PUBLIC}/${key}`, size: buffer.length };
}

async function renderWebp(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).webp({ quality: 84 }).toBuffer();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const IMPACT = "Impact, 'Arial Black', sans-serif";
const MONO = "Consolas, 'Courier New', monospace";

function productImageSvg(name: string, category: string, variant: number): string {
  const dark = variant === 1;
  const bg = dark ? BRAND.black : BRAND.muted;
  const fg = dark ? BRAND.cream : BRAND.black;
  const accent = BRAND.olive;
  const nameFont = name.length > 26 ? 60 : 76;
  const circleX = dark ? 880 : 300;
  const rotated = dark ? 14 : -14;

  return `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1200" fill="${bg}"/>
  <rect x="56" y="56" width="1088" height="1088" fill="none" stroke="${fg}" stroke-width="3"/>
  <circle cx="${circleX}" cy="340" r="230" fill="none" stroke="${accent}" stroke-width="6"/>
  <circle cx="${circleX}" cy="340" r="150" fill="${accent}" opacity="0.16"/>
  <g transform="rotate(${rotated} 800 660)">
    <rect x="620" y="500" width="360" height="360" fill="none" stroke="${fg}" stroke-width="4" opacity="0.5"/>
    <rect x="678" y="558" width="360" height="360" fill="${accent}" opacity="0.15"/>
  </g>
  <text x="600" y="700" text-anchor="middle" font-family="${IMPACT}" font-size="190" letter-spacing="14" fill="${fg}" opacity="0.07">NÖVA</text>
  <text x="112" y="1012" font-family="${IMPACT}" font-size="${nameFont}" letter-spacing="1" fill="${fg}">${escapeXml(name.toUpperCase())}</text>
  <text x="114" y="1066" font-family="${MONO}" font-size="28" letter-spacing="8" fill="${accent}">${escapeXml(category.toUpperCase())} · SERIES 01</text>
  <rect x="112" y="1092" width="140" height="10" fill="${accent}"/>
</svg>`;
}

function heroSvg(): string {
  return `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1920" height="1080" fill="${BRAND.black}"/>
  <g opacity="0.16">
    <rect x="120" y="-260" width="90" height="1700" fill="${BRAND.olive}" transform="rotate(24 165 0)"/>
    <rect x="320" y="-260" width="90" height="1700" fill="${BRAND.olive}" transform="rotate(24 365 0)"/>
    <rect x="1500" y="-260" width="90" height="1700" fill="${BRAND.olive}" transform="rotate(24 1545 0)"/>
    <rect x="1700" y="-260" width="90" height="1700" fill="${BRAND.olive}" transform="rotate(24 1745 0)"/>
  </g>
  <circle cx="1430" cy="540" r="430" fill="none" stroke="${BRAND.olive}" stroke-width="3"/>
  <circle cx="1430" cy="540" r="320" fill="${BRAND.olive}" opacity="0.12"/>
  <text x="1430" y="600" text-anchor="middle" font-family="${IMPACT}" font-size="180" letter-spacing="10" fill="${BRAND.olive}" opacity="0.85">NÖVA</text>
  <text x="126" y="960" font-family="${MONO}" font-size="26" letter-spacing="12" fill="${BRAND.olive}">URBAN AUTONOMY — SERIES 01</text>
  <rect x="126" y="1000" width="180" height="10" fill="${BRAND.olive}"/>
</svg>`;
}

function logoSvg(): string {
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${BRAND.black}"/>
  <text x="256" y="340" text-anchor="middle" font-family="${IMPACT}" font-size="250" fill="${BRAND.cream}">N</text>
  <rect x="146" y="372" width="220" height="16" fill="${BRAND.olive}"/>
</svg>`;
}

function faviconSvg(): string {
  return `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="${BRAND.black}"/>
  <text x="64" y="88" text-anchor="middle" font-family="${IMPACT}" font-size="66" fill="${BRAND.cream}">N</text>
  <rect x="34" y="96" width="60" height="6" fill="${BRAND.olive}"/>
</svg>`;
}

function garmentSvg(kind: 'tee' | 'hoodie'): string {
  const hood = kind === 'hoodie'
    ? `<path d="M360 210 Q450 90 540 210 L500 260 Q450 210 400 260 Z" fill="${BRAND.black}"/>`
    : '';
  const pocket = kind === 'hoodie'
    ? `<rect x="370" y="620" width="160" height="110" fill="none" stroke="${BRAND.cream}" stroke-width="6"/>`
    : '';
  return `<svg width="900" height="1100" viewBox="0 0 900 1100" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="1100" fill="${BRAND.cream}"/>
  <rect x="40" y="40" width="820" height="1020" fill="none" stroke="${BRAND.black}" stroke-width="3"/>
  ${hood}
  <path d="M350 220 Q450 170 550 220 L670 330 L610 430 L550 395 L550 940 L350 940 L350 395 L290 430 L230 330 Z" fill="${BRAND.black}"/>
  ${pocket}
  <text x="450" y="1050" text-anchor="middle" font-family="${MONO}" font-size="24" letter-spacing="10" fill="${BRAND.olive}">NÖVA · BASE PARA PERSONALIZAR</text>
</svg>`;
}

function customPreviewSvg(): string {
  return `<svg width="900" height="900" viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="900" fill="${BRAND.muted}"/>
  <path d="M330 240 Q450 180 570 240 L690 350 L630 450 L570 415 L570 940 L330 940 L330 415 L270 450 L210 350 Z" fill="${BRAND.black}"/>
  <circle cx="450" cy="560" r="110" fill="none" stroke="${BRAND.olive}" stroke-width="10"/>
  <text x="450" y="580" text-anchor="middle" font-family="${IMPACT}" font-size="56" fill="${BRAND.olive}">NOVA</text>
  <text x="450" y="860" text-anchor="middle" font-family="${MONO}" font-size="22" letter-spacing="8" fill="${BRAND.gray}">DESIGN PREVIEW</text>
</svg>`;
}

/* -------------------------------------------------------------------------- */
/*                                   Datos                                     */
/* -------------------------------------------------------------------------- */

interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  parentSlug?: string;
}

const CATEGORIES: CategorySeed[] = [
  { name: 'Remeras', slug: 'remeras', description: 'Remeras oversize y boxy de algodón premium.' },
  { name: 'Buzos y Hoodies', slug: 'buzos', description: 'Buzos, hoodies y camperas de edición limitada.' },
  { name: 'Gorras', slug: 'gorras', description: 'Gorras trucker y dad hats.' },
  { name: 'Pantalones', slug: 'pantalones', description: 'Cargos, joggers y siluetas utility.' },
  { name: 'Accesorios', slug: 'accesorios', description: 'Complementos para el día a día.' },
  // Subsecciones (columnas del mega menú de "Catálogo").
  { name: 'Oversize', slug: 'remeras-oversize', parentSlug: 'remeras', description: 'Remeras oversize y boxy.' },
  { name: 'Básicas', slug: 'remeras-basicas', parentSlug: 'remeras', description: 'Remeras de calce regular.' },
  { name: 'Hoodies', slug: 'buzos-hoodies', parentSlug: 'buzos', description: 'Hoodies y buzos de frisa.' },
  { name: 'Camperas', slug: 'buzos-camperas', parentSlug: 'buzos', description: 'Camperas y abrigos.' },
  { name: 'Trucker', slug: 'gorras-trucker', parentSlug: 'gorras', description: 'Gorras trucker con malla.' },
  { name: 'Dad Hats', slug: 'gorras-dad-hats', parentSlug: 'gorras', description: 'Gorras dad hat de algodón.' },
  { name: 'Cargos', slug: 'pantalones-cargos', parentSlug: 'pantalones', description: 'Pantalones cargo utility.' },
  { name: 'Joggers', slug: 'pantalones-joggers', parentSlug: 'pantalones', description: 'Joggers y calces tapered.' },
  { name: 'Bolsos', slug: 'accesorios-bolsos', parentSlug: 'accesorios', description: 'Bolsos y totes.' },
  { name: 'Medias', slug: 'accesorios-medias', parentSlug: 'accesorios', description: 'Medias y calcetines.' },
];

/** Subsección a la que pertenece cada producto (navegación del mega menú). */
const SUBCATEGORY_BY_PRODUCT: Record<string, string> = {
  'remera-oversize-autonomy': 'remeras-oversize',
  'remera-boxy-nocturna': 'remeras-oversize',
  'remera-clasica-esencial': 'remeras-basicas',
  'buzo-hoodie-urban': 'buzos-hoodies',
  'buzo-oversize-grid': 'buzos-hoodies',
  'campera-bomber-midnight': 'buzos-camperas',
  'gorra-trucker-nova': 'gorras-trucker',
  'gorra-dad-hat-logo': 'gorras-dad-hats',
  'pantalon-cargo-utility': 'pantalones-cargos',
  'jogger-off-duty': 'pantalones-joggers',
  'tote-bag-daily': 'accesorios-bolsos',
  'medias-stripe-x3': 'accesorios-medias',
};

interface VariantSeed {
  sku: string;
  size: string;
  color: string;
  stock?: number;
  priceAdjustment?: number;
}

interface ProductSeed {
  slug: string;
  name: string;
  categorySlug: string;
  basePrice: number;
  description: string;
  metaTitle: string;
  metaDescription: string;
  stockMode: StockMode;
  variants: VariantSeed[];
}

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'remera-oversize-autonomy',
    name: 'Remera Oversize Autonomy',
    categorySlug: 'remeras',
    basePrice: 59_000,
    description: 'Remera oversize de algodón peinado 240g con estampa frontal y hombros caídos. La pieza insignia del drop.',
    metaTitle: 'Remera Oversize Autonomy',
    metaDescription: 'Remera oversize de algodón premium con estampa del drop Urban Autonomy.',
    stockMode: StockMode.TRACKED,
    variants: [
      { sku: 'AUT-S-NEG', size: 'S', color: 'Negro', stock: 12 },
      { sku: 'AUT-M-NEG', size: 'M', color: 'Negro', stock: 8 },
      { sku: 'AUT-L-NEG', size: 'L', color: 'Negro', stock: 3 },
      { sku: 'AUT-XL-NEG', size: 'XL', color: 'Negro', stock: 0, priceAdjustment: 3_000 },
      { sku: 'AUT-M-BLA', size: 'M', color: 'Blanco', stock: 15 },
      { sku: 'AUT-L-BLA', size: 'L', color: 'Blanco', stock: 6 },
    ],
  },
  {
    slug: 'remera-boxy-nocturna',
    name: 'Remera Boxy Nocturna',
    categorySlug: 'remeras',
    basePrice: 65_000,
    description: 'Corte boxy con caída recta, tela reactiva y estampa trasera. Fabricada a pedido en 5 días.',
    metaTitle: 'Remera Boxy Nocturna',
    metaDescription: 'Remera boxy de tela reactiva con estampa trasera. Fabricada a pedido.',
    stockMode: StockMode.MADE_TO_ORDER,
    variants: [
      { sku: 'NOC-S-NEG', size: 'S', color: 'Negro' },
      { sku: 'NOC-M-NEG', size: 'M', color: 'Negro' },
      { sku: 'NOC-L-NEG', size: 'L', color: 'Negro' },
      { sku: 'NOC-XL-NEG', size: 'XL', color: 'Negro' },
    ],
  },
  {
    slug: 'remera-clasica-esencial',
    name: 'Remera Clásica Esencial',
    categorySlug: 'remeras',
    basePrice: 45_000,
    description: 'La remera de todos los días: algodón 180g, cuello reforzado y calce regular.',
    metaTitle: 'Remera Clásica Esencial',
    metaDescription: 'Remera de algodón 180g de calce regular, ideal para el día a día.',
    stockMode: StockMode.TRACKED,
    variants: [
      { sku: 'ESE-S-NEG', size: 'S', color: 'Negro', stock: 20 },
      { sku: 'ESE-M-NEG', size: 'M', color: 'Negro', stock: 25 },
      { sku: 'ESE-L-NEG', size: 'L', color: 'Negro', stock: 18 },
      { sku: 'ESE-XL-NEG', size: 'XL', color: 'Negro', stock: 9 },
      { sku: 'ESE-M-BLA', size: 'M', color: 'Blanco', stock: 14 },
    ],
  },
  {
    slug: 'buzo-hoodie-urban',
    name: 'Buzo Hoodie Urban',
    categorySlug: 'buzos',
    basePrice: 129_000,
    description: 'Hoodie con frisa de algodón, capucha forrada y cordón de algodón encerado. Fabricado a pedido.',
    metaTitle: 'Buzo Hoodie Urban',
    metaDescription: 'Hoodie de frisa premium con capucha forrada, fabricado a pedido.',
    stockMode: StockMode.MADE_TO_ORDER,
    variants: [
      { sku: 'URB-S-GRI', size: 'S', color: 'Gris' },
      { sku: 'URB-M-GRI', size: 'M', color: 'Gris' },
      { sku: 'URB-L-GRI', size: 'L', color: 'Gris' },
      { sku: 'URB-XL-GRI', size: 'XL', color: 'Gris' },
    ],
  },
  {
    slug: 'buzo-oversize-grid',
    name: 'Buzo Oversize Grid',
    categorySlug: 'buzos',
    basePrice: 139_000,
    description: 'Buzo oversize con estampa geométrica a base de serigrafía y puños rebatidos.',
    metaTitle: 'Buzo Oversize Grid',
    metaDescription: 'Buzo oversize con estampa geométrica serigrafiada y calce amplio.',
    stockMode: StockMode.TRACKED,
    variants: [
      { sku: 'GRD-M-NEG', size: 'M', color: 'Negro', stock: 7 },
      { sku: 'GRD-L-NEG', size: 'L', color: 'Negro', stock: 5 },
      { sku: 'GRD-XL-NEG', size: 'XL', color: 'Negro', stock: 2 },
    ],
  },
  {
    slug: 'gorra-trucker-nova',
    name: 'Gorra Trucker Nova',
    categorySlug: 'gorras',
    basePrice: 45_000,
    description: 'Gorra trucker con panel frontal para personalizar, malla trasera y cierre snapback.',
    metaTitle: 'Gorra Trucker Nova',
    metaDescription: 'Gorra trucker personalizable con malla trasera y cierre regulable.',
    stockMode: StockMode.TRACKED,
    variants: [
      { sku: 'NOV-UNI-NEG', size: 'Único', color: 'Negro', stock: 30 },
      { sku: 'NOV-UNI-OLI', size: 'Único', color: 'Oliva', stock: 12 },
    ],
  },
  {
    slug: 'gorra-dad-hat-logo',
    name: 'Gorra Dad Hat Logo',
    categorySlug: 'gorras',
    basePrice: 42_000,
    description: 'Dad hat de sarga de algodón con bordado del logo en el frente. Calce relajado.',
    metaTitle: 'Gorra Dad Hat Logo',
    metaDescription: 'Dad hat de sarga con bordado frontal, calce relajado.',
    stockMode: StockMode.MADE_TO_ORDER,
    variants: [
      { sku: 'LOG-UNI-NEG', size: 'Único', color: 'Negro' },
      { sku: 'LOG-UNI-CRE', size: 'Único', color: 'Crema' },
    ],
  },
  {
    slug: 'pantalon-cargo-utility',
    name: 'Pantalón Cargo Utility',
    categorySlug: 'pantalones',
    basePrice: 149_000,
    description: 'Pantalón cargo de ripstop con bolsillos laterales, cordón interno y calce recto.',
    metaTitle: 'Pantalón Cargo Utility',
    metaDescription: 'Cargo de ripstop con bolsillos utilitarios y calce recto.',
    stockMode: StockMode.TRACKED,
    variants: [
      { sku: 'UTL-30-NEG', size: '30', color: 'Negro', stock: 10 },
      { sku: 'UTL-32-NEG', size: '32', color: 'Negro', stock: 14 },
      { sku: 'UTL-34-NEG', size: '34', color: 'Negro', stock: 6 },
      { sku: 'UTL-36-NEG', size: '36', color: 'Negro', stock: 0 },
    ],
  },
  {
    slug: 'jogger-off-duty',
    name: 'Jogger Off-Duty',
    categorySlug: 'pantalones',
    basePrice: 119_000,
    description: 'Jogger de frisa liviana con puños elásticos y cordón plano. Comodidad para todos los días.',
    metaTitle: 'Jogger Off-Duty',
    metaDescription: 'Jogger de frisa liviana con puños elásticos y calce tapered.',
    stockMode: StockMode.MADE_TO_ORDER,
    variants: [
      { sku: 'OFF-S-NEG', size: 'S', color: 'Negro' },
      { sku: 'OFF-M-NEG', size: 'M', color: 'Negro' },
      { sku: 'OFF-L-NEG', size: 'L', color: 'Negro' },
    ],
  },
  {
    slug: 'tote-bag-daily',
    name: 'Tote Bag Daily',
    categorySlug: 'accesorios',
    basePrice: 39_000,
    description: 'Tote de lona gruesa con asas reforzadas y bolsillo interno.',
    metaTitle: 'Tote Bag Daily',
    metaDescription: 'Tote de lona gruesa con asas reforzadas y bolsillo interno.',
    stockMode: StockMode.TRACKED,
    variants: [{ sku: 'TOT-UNI-CRE', size: 'Único', color: 'Crema', stock: 40 }],
  },
  {
    slug: 'medias-stripe-x3',
    name: 'Medias Stripe (x3)',
    categorySlug: 'accesorios',
    basePrice: 29_000,
    description: 'Pack de 3 pares de medias de algodón con franja en el puño.',
    metaTitle: 'Medias Stripe x3',
    metaDescription: 'Pack de 3 pares de medias de algodón con franja.',
    stockMode: StockMode.TRACKED,
    variants: [{ sku: 'MDS-UNI-MIX', size: 'Único', color: 'Mix', stock: 50 }],
  },
  {
    slug: 'campera-bomber-midnight',
    name: 'Campera Bomber Midnight',
    categorySlug: 'buzos',
    basePrice: 219_000,
    description: 'Bomber acolchada con interior térmico, cierre metálico y detalles reflectivos.',
    metaTitle: 'Campera Bomber Midnight',
    metaDescription: 'Bomber acolchada con interior térmico y detalles reflectivos.',
    stockMode: StockMode.MADE_TO_ORDER,
    variants: [
      { sku: 'MDN-S-NEG', size: 'S', color: 'Negro' },
      { sku: 'MDN-M-NEG', size: 'M', color: 'Negro' },
      { sku: 'MDN-L-NEG', size: 'L', color: 'Negro' },
      { sku: 'MDN-XL-NEG', size: 'XL', color: 'Negro' },
    ],
  },
];

const PAGES = [
  {
    slug: 'terminos-y-condiciones',
    title: 'Términos y Condiciones',
    content: `
      <h2>1. Aceptación</h2>
      <p>Al crear una cuenta y realizar una compra en NÖVA aceptás estos términos y condiciones, así como nuestra política de privacidad.</p>
      <h2>2. Productos y personalización</h2>
      <p>Las prendas personalizadas se fabrican a pedido. Los tiempos de producción y envío se informan en cada producto y en el checkout. Las variaciones de color pueden diferir levemente respecto de las fotos.</p>
      <h2>3. Precios y pagos</h2>
      <p>Los precios están expresados en pesos colombianos (COP) e incluyen impuestos. El pago se procesa a través de pasarelas seguras.</p>
      <h2>4. Envíos</h2>
      <p>Realizamos envíos a todo el país. Los plazos comienzan a contar desde la confirmación del pago y la aprobación del diseño, si corresponde.</p>
      <h2>5. Cambios y devoluciones</h2>
      <p>Aceptamos cambios dentro de los 30 días posteriores a la recepción, siempre que el producto no haya sido usado y conserve su empaque. Los productos personalizados solo se cambian por fallas de fabricación.</p>
      <h2>6. Cuenta de usuario</h2>
      <p>Sos responsable de mantener la confidencialidad de tu contraseña. Podés solicitar la baja de tu cuenta escribiéndonos a hola@nova.test.</p>
    `,
    metaTitle: 'Términos y Condiciones — NÖVA',
    metaDescription: 'Términos, condiciones y políticas de compra de NÖVA.',
    sortOrder: 0,
  },
  {
    slug: 'preguntas-frecuentes',
    title: 'Preguntas Frecuentes',
    content: `
      <h2>¿Cuánto tarda mi pedido?</h2>
      <p>Las prendas a pedido se producen en 5 días hábiles. Luego, el envío estándar demora entre 3 y 5 días y el express entre 1 y 2 días.</p>
      <h2>¿Cómo personalizo una prenda?</h2>
      <p>Entrá a <a href="/personalizar">Personalizar</a>, elegí una prenda base, subí tu diseño o agregá texto y envialo a revisión. Nuestro equipo lo aprueba y podés agregarlo al carrito.</p>
      <h2>¿Qué medios de pago aceptan?</h2>
      <p>Tarjetas de crédito y débito a través de Stripe.</p>
      <h2>¿Hacen envíos a todo el país?</h2>
      <p>Sí, trabajamos con transportadoras nacionales. En compras superiores a $150.000 el envío estándar es gratis.</p>
      <h2>¿Cómo sigo mi pedido?</h2>
      <p>Desde <a href="/orders">Mis pedidos</a> podés ver el estado y el número de seguimiento cuando esté disponible.</p>
    `,
    metaTitle: 'Preguntas Frecuentes — NÖVA',
    metaDescription: 'Respuestas sobre tiempos, personalización, pagos y envíos.',
    sortOrder: 1,
  },
  {
    slug: 'envios-y-devoluciones',
    title: 'Envíos y Devoluciones',
    content: `
      <h2>Envíos</h2>
      <ul>
        <li><strong>Envío estándar:</strong> $10.000 — 3 a 5 días hábiles.</li>
        <li><strong>Envío express:</strong> $18.000 — 1 a 2 días hábiles.</li>
        <li><strong>Retiro en showroom:</strong> sin costo — coordinamos por email.</li>
      </ul>
      <p>El envío estándar es gratuito en compras superiores a $150.000.</p>
      <h2>Devoluciones</h2>
      <p>Tenés 30 días para solicitar un cambio o devolución. Escribinos a hola@nova.test con tu número de orden y te enviamos las instrucciones. Los costos de envío de una devolución por cambio de talle corren por cuenta del cliente.</p>
    `,
    metaTitle: 'Envíos y Devoluciones — NÖVA',
    metaDescription: 'Plazos, costos y política de devoluciones de NÖVA.',
    sortOrder: 2,
  },
  {
    slug: 'sobre-nosotros',
    title: 'Sobre Nosotros',
    content: `
      <h2>Urban Autonomy</h2>
      <p>NÖVA nace en Bogotá con una idea simple: ropa urbana de edición limitada, producida de forma responsable y sin sobrestock.</p>
      <p>Trabajamos con talleres locales y algodón de origen certificado. Cada drop se produce en tiradas cortas y no se repone.</p>
      <h2>Nuestro proceso</h2>
      <p>Diseñamos, estampamos y controlamos cada prenda en nuestro taller. Si comprás una pieza personalizada, pasa por revisión antes de producción para asegurar la calidad del estampado.</p>
    `,
    metaTitle: 'Sobre Nosotros — NÖVA',
    metaDescription: 'Quiénes somos y cómo producimos en NÖVA.',
    sortOrder: 3,
  },
  {
    slug: 'politica-de-privacidad',
    title: 'Política de Privacidad',
    content: `
      <h2>Datos que recopilamos</h2>
      <p>Recopilamos tu nombre, email, dirección y datos de pedido para procesar compras, enviar confirmaciones y brindar soporte.</p>
      <h2>Uso de la información</h2>
      <p>No vendemos tus datos. Los compartimos únicamente con las transportadoras y pasarelas de pago necesarias para completar tu compra.</p>
      <h2>Tus derechos</h2>
      <p>Podés solicitar acceso, corrección o eliminación de tus datos escribiendo a hola@nova.test.</p>
    `,
    metaTitle: 'Política de Privacidad — NÖVA',
    metaDescription: 'Cómo tratamos y protegemos tus datos personales.',
    sortOrder: 4,
  },
  {
    slug: 'politica-de-cookies',
    title: 'Política de Cookies',
    content: `
      <h2>¿Qué son las cookies?</h2>
      <p>Las cookies son pequeños archivos que se almacenan en tu dispositivo al navegar. También usamos tecnologías similares, como el almacenamiento local del navegador, para recordar tu carrito, tu sesión y tus preferencias.</p>
      <h2>Cookies y tecnologías que usamos</h2>
      <ul>
        <li><strong>Necesarias (siempre activas):</strong> cookie de sesión <em>refresh_token</em> (HttpOnly) para mantener tu sesión iniciada de forma segura, y almacenamiento local para el carrito, favoritos y preferencias de idioma.</li>
        <li><strong>De análisis:</strong> métricas agregadas de tráfico para mejorar la tienda (solo si aceptás).</li>
        <li><strong>De personalización:</strong> contenido y recomendaciones adaptadas a tu navegación (solo si aceptás).</li>
      </ul>
      <h2>Cómo gestionarlas</h2>
      <p>Podés aceptar o rechazar las cookies no esenciales desde el panel que aparece al ingresar, o volver a abrirlo desde el enlace "Cookies" en el pie de página. También podés borrar las cookies y el almacenamiento local desde la configuración de tu navegador.</p>
    `,
    metaTitle: 'Política de Cookies — NÖVA',
    metaDescription: 'Qué cookies usamos, para qué y cómo gestionarlas.',
    sortOrder: 5,
  },
];

function daysAgo(days: number, hour = 12): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/* -------------------------------------------------------------------------- */
/*                                    Main                                     */
/* -------------------------------------------------------------------------- */

async function main() {
  if (!R2_PUBLIC || !process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    throw new Error('R2 no está configurado: revisá R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_PUBLIC_URL.');
  }

  /* ------------------------------ Roles y usuarios ------------------------------ */

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrator with full access' },
  });
  const customerRole = await prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: { name: 'CUSTOMER', description: 'Customer role' },
  });

  const adminHash = await argon2.hash('Admin1234');
  const customerHash = await argon2.hash('Customer1234');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tienda.com' },
    update: { passwordHash: adminHash, roleId: adminRole.id, emailVerified: true, emailVerifiedAt: new Date(), isActive: true },
    create: {
      email: 'admin@tienda.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'NÖVA',
      roleId: adminRole.id,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@tienda.com' },
    update: { passwordHash: customerHash, roleId: customerRole.id, emailVerified: true, emailVerifiedAt: new Date(), isActive: true },
    create: {
      email: 'customer@tienda.com',
      passwordHash: customerHash,
      firstName: 'Carlos',
      lastName: 'Demo',
      phone: '+57 300 123 4567',
      roleId: customerRole.id,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const anaHash = await argon2.hash('Customer1234');
  await prisma.user.upsert({
    where: { email: 'ana.torres@demo.test' },
    update: { passwordHash: anaHash, roleId: customerRole.id, emailVerified: true, emailVerifiedAt: new Date(), isActive: true },
    create: {
      email: 'ana.torres@demo.test',
      passwordHash: anaHash,
      firstName: 'Ana',
      lastName: 'Torres',
      roleId: customerRole.id,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const shippingAddress = await ensureAddress(customer.id, 'Casa', 'Calle 85 #12-42, Apto 502', 'Bogotá', 'Cundinamarca', true);
  await ensureAddress(customer.id, 'Oficina', 'Carrera 7 #71-21, Torre B, Piso 9', 'Bogotá', 'Cundinamarca', false);

  /* --------------------------------- Categorías --------------------------------- */

  const categories: Record<string, { id: string; name: string }> = {};
  for (const category of CATEGORIES.filter((item) => !item.parentSlug)) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, isActive: true, parentId: null },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: true,
      },
    });
    categories[category.slug] = { id: row.id, name: row.name };
  }

  for (const category of CATEGORIES.filter((item) => item.parentSlug)) {
    const parent = category.parentSlug ? categories[category.parentSlug] : undefined;
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
        parentId: parent?.id ?? null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: true,
        parentId: parent?.id ?? null,
      },
    });
    categories[category.slug] = { id: row.id, name: row.name };
  }
  log(`✔ ${CATEGORIES.length} categorías`);

  /* ---------------------------- Productos e imágenes ---------------------------- */

  const variantIdBySku = new Map<string, string>();
  const variantPriceBySku = new Map<string, number>();
  const productIdBySlug = new Map<string, string>();
  let createdProducts = 0;
  let uploadedImages = 0;

  for (const product of PRODUCTS) {
    const category = categories[SUBCATEGORY_BY_PRODUCT[product.slug] ?? product.categorySlug];
    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        basePrice: product.basePrice,
        categoryId: category.id,
        isActive: true,
      },
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        basePrice: product.basePrice,
        categoryId: category.id,
        isActive: true,
      },
      include: { images: true },
    });
    productIdBySlug.set(product.slug, row.id);
    createdProducts += 1;

    // Fotos reales (Unsplash) cuando el producto está en el manifiesto; si no,
    // se genera el SVG de marca. `SEED_REFRESH_PHOTOS=1` fuerza re-subir fotos.
    const demoPhoto = DEMO_PRODUCT_PHOTOS[product.slug];
    const shouldSyncImages = row.images.length === 0 || process.env.SEED_REFRESH_PHOTOS === '1';

    if (shouldSyncImages) {
      for (let index = 0; index < 2; index += 1) {
        const key = `demo/products/${product.slug}-${index + 1}.webp`;
        let buffer: Buffer;
        if (demoPhoto) {
          try {
            buffer = await processCatalogPhoto(await downloadUnsplashPhoto(demoPhoto.unsplashIds[index]));
          } catch (error) {
            log(`⚠ Foto ${demoPhoto.unsplashIds[index]} no disponible (${error instanceof Error ? error.message : error}); se usa el SVG de marca`);
            buffer = await renderWebp(productImageSvg(product.name, category.name, index));
          }
        } else {
          buffer = await renderWebp(productImageSvg(product.name, category.name, index));
        }
        const uploaded = await uploadObject(key, buffer);
        uploadedImages += 1;

        const existingAsset = await prisma.asset.findFirst({ where: { objectKey: uploaded.key } });
        const asset = existingAsset
          ? await prisma.asset.update({
              where: { id: existingAsset.id },
              data: { bucket: 'r2', purpose: AssetPurpose.CATALOG_IMAGE, relatedId: row.id, mimeType: 'image/webp', size: uploaded.size },
            })
          : await prisma.asset.create({
              data: {
                ownerId: admin.id,
                uploadedById: admin.id,
                purpose: AssetPurpose.CATALOG_IMAGE,
                relatedId: row.id,
                bucket: 'r2',
                objectKey: uploaded.key,
                mimeType: 'image/webp',
                size: uploaded.size,
              },
            });

        await prisma.productImage.upsert({
          where: { id: (await prisma.productImage.findFirst({ where: { productId: row.id, assetId: asset.id } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
          update: { sortOrder: index },
          create: { productId: row.id, assetId: asset.id, sortOrder: index },
        });
      }
    }

    for (const variant of product.variants) {
      const stockMode = variant.stock === undefined ? StockMode.MADE_TO_ORDER : product.stockMode;
      const variantRow = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: row.id,
          size: variant.size,
          color: variant.color,
          garmentType: product.name.split(' ')[0],
          stockMode,
          priceAdjustment: variant.priceAdjustment ?? null,
          isActive: true,
        },
        create: {
          productId: row.id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          garmentType: product.name.split(' ')[0],
          stockMode,
          productionLeadTimeDays: stockMode === StockMode.MADE_TO_ORDER ? 5 : 0,
          priceAdjustment: variant.priceAdjustment ?? null,
          lowStockThreshold: 5,
          isActive: true,
        },
      });
      variantIdBySku.set(variant.sku, variantRow.id);
      variantPriceBySku.set(variant.sku, product.basePrice + (variant.priceAdjustment ?? 0));

      if (variant.stock !== undefined) {
        await prisma.inventory.upsert({
          where: { productVariantId: variantRow.id },
          update: { quantity: variant.stock },
          create: { productVariantId: variantRow.id, quantity: variant.stock, reservedQuantity: 0 },
        });
      }
    }
  }
  log(`✔ ${createdProducts} productos con variantes (${uploadedImages} imágenes nuevas a R2)`);

  /* ---------------------------------- Páginas ---------------------------------- */

  const pageIds: Record<string, string> = {};
  for (const page of PAGES) {
    const row = await prisma.page.upsert({
      where: { slug: page.slug },
      update: { title: page.title, content: page.content, metaTitle: page.metaTitle, metaDescription: page.metaDescription, isVisible: true, sortOrder: page.sortOrder },
      create: { ...page, isVisible: true },
    });
    pageIds[page.slug] = row.id;
  }
  log(`✔ ${PAGES.length} páginas`);

  /* --------------------------------- Envíos ------------------------------------ */

  const shippingSeeds = [
    { name: 'Envío estándar', description: 'Llega en 3 a 5 días hábiles', price: 10_000, estimatedDaysMin: 3, estimatedDaysMax: 5, freeShippingThreshold: 150_000, isDefault: true, sortOrder: 0 },
    { name: 'Envío express', description: 'Llega en 1 a 2 días hábiles', price: 18_000, estimatedDaysMin: 1, estimatedDaysMax: 2, freeShippingThreshold: null, isDefault: false, sortOrder: 1 },
    { name: 'Retiro en showroom', description: 'Coordinamos turno por email', price: 0, estimatedDaysMin: 1, estimatedDaysMax: 1, freeShippingThreshold: null, isDefault: false, sortOrder: 2 },
  ];
  const shippingOptions: Record<string, { id: string }> = {};
  for (const option of shippingSeeds) {
    const existing = await prisma.shippingOption.findFirst({ where: { name: option.name } });
    const row = existing
      ? await prisma.shippingOption.update({ where: { id: existing.id }, data: { ...option, isActive: true } })
      : await prisma.shippingOption.create({ data: { ...option, isActive: true } });
    shippingOptions[option.name] = { id: row.id };
  }
  log(`✔ ${shippingSeeds.length} opciones de envío`);

  /* --------------------------------- Cupones ----------------------------------- */

  const now = new Date();
  const coupons = [
    { code: 'BIENVENIDO10', discountType: DiscountType.PERCENTAGE, discountValue: 10, maxUses: 1000, maxUsesPerUser: 1, isFirstPurchaseOnly: true, minOrderAmount: null as number | null, validUntil: daysFromNow(180) },
    { code: 'DROP20', discountType: DiscountType.PERCENTAGE, discountValue: 20, maxUses: 300, maxUsesPerUser: 1, isFirstPurchaseOnly: false, minOrderAmount: 150_000, validUntil: daysFromNow(30) },
    { code: 'ENVIO5K', discountType: DiscountType.FIXED, discountValue: 5_000, maxUses: 500, maxUsesPerUser: 2, isFirstPurchaseOnly: false, minOrderAmount: 80_000, validUntil: daysFromNow(90) },
    { code: 'URBAN15', discountType: DiscountType.PERCENTAGE, discountValue: 15, maxUses: 200, maxUsesPerUser: 1, isFirstPurchaseOnly: false, minOrderAmount: null as number | null, validUntil: daysFromNow(15) },
  ];
  const couponIds: Record<string, string> = {};
  for (const coupon of coupons) {
    const row = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { ...coupon, validFrom: now, isActive: true },
      create: { ...coupon, validFrom: now, isActive: true },
    });
    couponIds[coupon.code] = row.id;
  }

  // Desactiva cupones de test (códigos con timestamp) para limpiar el admin
  const allCoupons = await prisma.coupon.findMany({ select: { id: true, code: true } });
  const testCouponIds = allCoupons.filter((c) => /-\d{12,}$/.test(c.code)).map((c) => c.id);
  if (testCouponIds.length > 0) {
    await prisma.coupon.updateMany({ where: { id: { in: testCouponIds } }, data: { isActive: false } });
  }
  log(`✔ ${coupons.length} cupones (${testCouponIds.length} cupones de test desactivados)`);

  /* ----------------------------- Store config + marca --------------------------- */

  const settings = await prisma.storeSettings.findFirst();
  if (settings) {
    await prisma.storeSettings.update({
      where: { id: settings.id },
      data: { defaultStockMode: StockMode.MADE_TO_ORDER, productionLeadTimeDaysDefault: 5, shippingCostDefault: 10_000, updatedById: admin.id },
    });
  } else {
    await prisma.storeSettings.create({ data: { defaultStockMode: StockMode.MADE_TO_ORDER, productionLeadTimeDaysDefault: 5, shippingCostDefault: 10_000 } });
  }

  const heroUrl = (await uploadObject('demo/brand/hero.webp', await renderWebp(heroSvg()))).url;
  const logoUrl = (await uploadObject('demo/brand/logo.webp', await renderWebp(logoSvg()))).url;
  const faviconUrl = (await uploadObject('demo/brand/favicon.webp', await renderWebp(faviconSvg()))).url;
  const teeUrl = (await uploadObject('demo/design/tee.webp', await renderWebp(garmentSvg('tee')))).url;
  const hoodieUrl = (await uploadObject('demo/design/hoodie.webp', await renderWebp(garmentSvg('hoodie')))).url;
  const previewUrl = (await uploadObject('demo/design/custom-preview.webp', await renderWebp(customPreviewSvg()))).url;

  const storefrontConfig = {
    announcementBar: {
      enabled: true,
      text: 'ENVÍO GRATIS EN COMPRAS DESDE $150.000 — DROP 01 DISPONIBLE',
      link: '/catalogo',
      backgroundColor: '#0d0d0d',
      textColor: '#fcf9f8',
      startsAt: now.toISOString(),
      endsAt: daysFromNow(14).toISOString(),
    },
    navigation: [
      { label: 'Catálogo', href: '/catalogo', newTab: false },
      { label: 'Personalizar', href: '/personalizar', newTab: false },
      { label: 'Nosotros', href: '/pagina/sobre-nosotros', newTab: false },
    ],
    homeSections: ['hero', 'collectionShowcase', 'featuredProducts', 'promoBanner', 'countdown', 'newsletter', 'productSpotlight'],
    productSpotlight: {
      eyebrow: 'Prenda de la semana',
      productSlug: 'campera-bomber-midnight',
      title: '',
      text: '',
      ctaLabel: 'Comprar ahora',
      imagePosition: 'right',
      showPrice: true,
    },
    collectionShowcase: {
      title: "COPA MUNDO '26",
      linkLabel: 'Ver toda la colección',
      linkHref: '/catalogo',
      story: {
        enabled: true,
        title: 'La Fusión Definitiva',
        text: 'Nuestra colección COPA MUNDO 2026 intersecta la pasión del fútbol sudamericano con la intensidad visual del anime contemporáneo. Siluetas oversized de 240 GSM, diseñadas para dominar las calles. Una edición limitada, una declaración de intenciones.',
        linkLabel: 'Descubre el proceso',
        linkHref: '/pagina/sobre-nosotros',
      },
    },
    featuredProducts: { title: 'Nueva Colección', limit: 8 },
    countdown: { enabled: true, title: 'PRÓXIMO DROP: URBAN AUTONOMY 02', targetAt: daysFromNow(12).toISOString() },
    promoBanner: {
      enabled: true,
      title: 'DROP 01 — URBAN AUTONOMY',
      subtitle: 'Siluetas oversized, edición limitada. Una vez agotado, no se repone.',
      link: '/catalogo',
      backgroundColor: '#6f7a4e',
      textColor: '#ffffff',
    },
    footer: {
      showNewsletter: true,
      showSocialLinks: true,
      copyrightText: '',
      extraLinks: [
        { label: 'Preguntas frecuentes', href: '/pagina/preguntas-frecuentes' },
        { label: 'Envíos y devoluciones', href: '/pagina/envios-y-devoluciones' },
        { label: 'Sobre nosotros', href: '/pagina/sobre-nosotros' },
        { label: 'Términos y condiciones', href: '/pagina/terminos-y-condiciones' },
      ],
    },
    productCard: { showSku: true, showRating: true, showStockBadge: true, showWishlist: true, showQuickView: false },
    productBadges: { showNew: true, showSale: true, showLowStock: true, lowStockThreshold: 5, newDaysThreshold: 14 },
    catalog: { defaultSort: 'newest', defaultPageSize: 24, showFilters: true },
    relatedProducts: { enabled: true, strategy: 'sameCategory', limit: 4 },
    cart: { trustBadges: ['Envío seguro', 'Pago protegido', 'Atención al cliente'], showFreeShippingProgress: true },
    checkout: { requirePhone: false, showCompanyField: false, showOrderNotes: true, thankYouMessage: 'Gracias por tu compra. Te enviamos un email con los detalles de tu pedido.' },
    featureFlags: { enableWishlist: true, enableCompare: true, enableReviews: true, enableCustomizer: true, enableGuestCheckout: true, enableQuickView: false },
    crossSell: { enabled: true, title: 'También te puede interesar', strategy: 'sameCategory', limit: 4 },
    branding: { logoUrl, customCss: '' },
    seo: {
      defaultTitleTemplate: '{title} | {storeName}',
      defaultDescription: 'Ropa urbana de edición limitada — envíos a todo el país.',
      ogImageUrl: heroUrl,
      productTitleTemplate: '{productName} — {storeName}',
      categoryTitleTemplate: '{categoryName} — {storeName}',
      pageTitleTemplate: '{pageTitle} — {storeName}',
    },
    externalScripts: [],
    whatsappButton: { enabled: true, phone: '+573001234567', message: '¡Hola! Quiero consultar por un producto de NÖVA.', position: 'bottomRight' },
    notFound: { title: 'Página no encontrada', message: 'La página que buscás no existe o fue movida. Volvé al catálogo para seguir explorando.' },
    fonts: { heading: 'Bebas Neue', body: 'Inter', mono: 'JetBrains Mono' },
    legal: { legalName: 'NÖVA DESIGN GROUP S.A.S.', taxId: '901.442.890-4' },
    popups: [
      {
        id: 'bienvenida-10',
        name: 'Descuento de bienvenida',
        enabled: true,
        trigger: 'afterDelay',
        delaySeconds: 12,
        scrollPercent: 50,
        title: '10% OFF EN TU PRIMERA COMPRA',
        content: 'Creá tu cuenta y usá el código BIENVENIDO10 al finalizar la compra.',
        buttonText: 'Crear cuenta',
        buttonLink: '/register',
        backgroundColor: '#0d0d0d',
        textColor: '#fcf9f8',
        showOnce: true,
      },
    ],
  };

  const activeConfig = await prisma.storeConfig.findFirst({ where: { isActive: true } });
  const configData = {
    name: 'NÖVA',
    description: 'Streetwear urbano de edición limitada.',
    logoUrl,
    faviconUrl,
    heroImageUrl: heroUrl,
    heroTitle: 'URBAN AUTONOMY',
    heroSubtitle: 'Drop 01 — siluetas oversized construidas para las calles. Edición limitada, no se repone.',
    contactEmail: 'hola@nova.test',
    contactPhone: '+57 300 123 4567',
    socialLinks: {
      instagram: 'https://instagram.com/nova.urban',
      tiktok: 'https://tiktok.com/@nova.urban',
      facebook: 'https://facebook.com/nova.urban',
    },
    primaryColor: '#0d0d0d',
    secondaryColor: '#6f7a4e',
    backgroundColor: '#fcf9f8',
    textColor: '#0d0d0d',
    surfaceColor: '#ffffff',
    surfaceMutedColor: '#f6f3f2',
    borderColor: '#0d0d0d',
    appearanceMode: 'LIGHT' as const,
    maintenanceMode: false,
    enableCustomDesigns: true,
    enableNewsletter: true,
    enableCatalogFilters: true,
    template: 'storefront',
    templateConfig: { heroLayout: 'split', showMarquee: true, showIdentitySection: true, productCardVariant: 'default', headerVariant: 'default' },
    storefrontConfig,
    termsPageId: pageIds['terminos-y-condiciones'],
    productionEstimateDays: 5,
    deliveryEstimateDays: 4,
    shippingProvider: 'freeThreshold',
    shippingBaseCost: 10_000,
    freeShippingThreshold: 150_000,
    updatedById: admin.id,
  };

  if (activeConfig) {
    await prisma.storeConfig.update({ where: { id: activeConfig.id }, data: configData });
  } else {
    await prisma.storeConfig.create({ data: { ...configData, isActive: true } });
  }
  log('✔ Store config completo (marca, hero, home, banner, countdown, popup, envío, términos)');

  /* --------------------------- Plantillas de diseño ----------------------------- */

  const existingTemplate = await prisma.designTemplate.findFirst({ where: { name: 'Remera frontal' } });
  if (existingTemplate) {
    await prisma.designTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        baseImageUrl: teeUrl,
        printAreas: { front: { x: 300, y: 320, width: 300, height: 340 } },
        basePrice: 59_000,
        availableColors: ['Negro', 'Blanco', 'Gris'],
        availableSizes: ['S', 'M', 'L', 'XL'],
        productionLeadTimeDays: 5,
      },
    });
  } else {
    await prisma.designTemplate.create({
      data: {
        name: 'Remera frontal',
        garmentType: 'Remera',
        baseImageUrl: teeUrl,
        printAreas: { front: { x: 300, y: 320, width: 300, height: 340 } },
        basePrice: 59_000,
        availableColors: ['Negro', 'Blanco', 'Gris'],
        availableSizes: ['S', 'M', 'L', 'XL'],
        stockMode: StockMode.MADE_TO_ORDER,
        productionLeadTimeDays: 5,
      },
    });
  }

  const hoodieTemplate = await prisma.designTemplate.findFirst({ where: { name: 'Buzo hoodie frontal' } });
  if (!hoodieTemplate) {
    await prisma.designTemplate.create({
      data: {
        name: 'Buzo hoodie frontal',
        garmentType: 'Buzo',
        baseImageUrl: hoodieUrl,
        printAreas: { front: { x: 290, y: 340, width: 320, height: 300 } },
        basePrice: 129_000,
        availableColors: ['Gris', 'Negro'],
        availableSizes: ['S', 'M', 'L', 'XL'],
        stockMode: StockMode.MADE_TO_ORDER,
        productionLeadTimeDays: 7,
      },
    });
  }

  const templateForDesign = existingTemplate ?? (await prisma.designTemplate.findFirst({ where: { name: 'Remera frontal' } }));
  const pendingDesign = await prisma.customDesign.findFirst({ where: { userId: customer.id, status: CustomDesignStatus.PENDING_REVIEW } });
  if (!pendingDesign && templateForDesign) {
    await prisma.customDesign.create({
      data: {
        userId: customer.id,
        designTemplateId: templateForDesign.id,
        status: CustomDesignStatus.PENDING_REVIEW,
        color: 'Negro',
        size: 'M',
        previewImageUrl: previewUrl,
        surcharge: 5_000,
        elements: {
          create: [
            { type: CustomDesignElementType.TEXT, textContent: 'NOVA', fontSize: 64, fill: '#6f7a4e', positionX: 450, positionY: 560, scale: 1, rotation: 0, zIndex: 1 },
            { type: CustomDesignElementType.CLIPART, assetUrl: previewUrl, positionX: 450, positionY: 300, scale: 0.6, rotation: 0, zIndex: 0 },
          ],
        },
      },
    });
  }
  log('✔ Plantillas de diseño + 1 diseño pendiente de revisión');

  /* ---------------------------------- Órdenes ----------------------------------- */

  const orderIds = await seedOrders({
    userId: customer.id,
    addressId: shippingAddress.id,
    adminId: admin.id,
    shippingOptions,
    couponIds,
    variantIdBySku,
    variantPriceBySku,
  });
  log(`✔ ${orderIds.length} órdenes demo en todos los estados`);

  /* ---------------------------------- Reseñas ----------------------------------- */

  const reviewsSeeded = await seedReviews({ customerId: customer.id, variantIdBySku, productIdBySlug });
  log(`✔ ${reviewsSeeded} reseñas (aprobadas y pendientes)`);

  /* ------------------------ Wishlist, newsletter y redirects --------------------- */

  const wishlistSkus = ['AUT-XL-NEG', 'GRD-M-NEG', 'NOV-UNI-OLI'];
  const wishlistData = wishlistSkus
    .map((sku) => variantIdBySku.get(sku))
    .filter((id): id is string => Boolean(id))
    .map((productVariantId) => ({ userId: customer.id, productVariantId }));
  if (wishlistData.length > 0) {
    await prisma.wishlistItem.createMany({ data: wishlistData, skipDuplicates: true });
  }

  for (const email of ['newsletter1@demo.test', 'newsletter2@demo.test', 'newsletter3@demo.test']) {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { unsubscribedAt: null },
      create: { email, source: 'seed-demo' },
    });
  }

  await prisma.storeRedirect.upsert({
    where: { fromPath: '/ig' },
    update: { toUrl: 'https://instagram.com/nova.urban', isActive: true, statusCode: 302 },
    create: { fromPath: '/ig', toUrl: 'https://instagram.com/nova.urban', statusCode: 302, isActive: true },
  });

  log('✔ Wishlist, newsletter y redirect de ejemplo');

  log('\n=== Demo visual listo ===');
  log('Admin:    admin@tienda.com / Admin1234');
  log('Cliente:  customer@tienda.com / Customer1234 (verificado, 2 direcciones)');
  log('Cupones:  BIENVENIDO10, DROP20, ENVIO5K, URBAN15');
}

async function ensureAddress(userId: string, label: string, line1: string, city: string, state: string, isDefault: boolean) {
  const existing = await prisma.address.findFirst({ where: { userId, label } });
  if (existing) {
    return prisma.address.update({ where: { id: existing.id }, data: { line1, city, state, country: 'Colombia', zipCode: '110111', isDefault } });
  }
  return prisma.address.create({
    data: { userId, label, line1, city, state, country: 'Colombia', zipCode: '110111', phone: '+57 300 123 4567', isDefault },
  });
}

interface OrderSeedItem {
  sku: string;
  quantity: number;
  productionStatus: OrderItemProductionStatus;
}

interface OrderSeed {
  marker: string;
  daysAgo: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderSeedItem[];
  shippingCost: number;
  shippingOptionName: string;
  discountAmount?: number;
  couponCode?: string;
  assignedToAdmin?: boolean;
  customerNotes?: string;
  cancellationReason?: string;
  payment?: { provider: string; providerTransactionId: string };
  shipment?: { carrier: string; trackingNumber: string; trackingUrl?: string; status: ShipmentStatus; delivered?: boolean };
  refund?: { reason: string };
}

async function seedOrders(input: {
  userId: string;
  addressId: string;
  adminId: string;
  shippingOptions: Record<string, { id: string }>;
  couponIds: Record<string, string>;
  variantIdBySku: Map<string, string>;
  variantPriceBySku: Map<string, number>;
}): Promise<string[]> {
  const { userId, addressId, adminId, shippingOptions, couponIds, variantIdBySku } = input;

  const orders: OrderSeed[] = [
    {
      marker: 'DEMO-SEED:1',
      daysAgo: 2,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      shippingCost: 10_000,
      shippingOptionName: 'Envío estándar',
      items: [
        { sku: 'AUT-L-NEG', quantity: 1, productionStatus: OrderItemProductionStatus.PENDING_PRODUCTION },
        { sku: 'NOV-UNI-NEG', quantity: 1, productionStatus: OrderItemProductionStatus.PENDING_PRODUCTION },
      ],
      customerNotes: 'Dejar en portería si no hay nadie.',
    },
    {
      marker: 'DEMO-SEED:2',
      daysAgo: 8,
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 10_000,
      shippingOptionName: 'Envío estándar',
      discountAmount: 12_900,
      couponCode: 'BIENVENIDO10',
      items: [{ sku: 'URB-M-GRI', quantity: 1, productionStatus: OrderItemProductionStatus.PENDING_PRODUCTION }],
      payment: { provider: 'stripe', providerTransactionId: 'pi_demo_0001' },
    },
    {
      marker: 'DEMO-SEED:3',
      daysAgo: 14,
      status: OrderStatus.IN_PRODUCTION,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 0,
      shippingOptionName: 'Envío estándar',
      assignedToAdmin: true,
      items: [
        { sku: 'NOC-L-NEG', quantity: 2, productionStatus: OrderItemProductionStatus.IN_PRODUCTION },
        { sku: 'MDS-UNI-MIX', quantity: 1, productionStatus: OrderItemProductionStatus.READY_TO_SHIP },
      ],
      payment: { provider: 'stripe', providerTransactionId: 'pi_demo_0002' },
    },
    {
      marker: 'DEMO-SEED:4',
      daysAgo: 21,
      status: OrderStatus.READY_TO_SHIP,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 10_000,
      shippingOptionName: 'Envío estándar',
      assignedToAdmin: true,
      items: [{ sku: 'UTL-32-NEG', quantity: 1, productionStatus: OrderItemProductionStatus.READY_TO_SHIP }],
      payment: { provider: 'stripe', providerTransactionId: 'pi_demo_0003' },
    },
    {
      marker: 'DEMO-SEED:5',
      daysAgo: 28,
      status: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 10_000,
      shippingOptionName: 'Envío express',
      assignedToAdmin: true,
      items: [{ sku: 'GRD-L-NEG', quantity: 1, productionStatus: OrderItemProductionStatus.READY_TO_SHIP }],
      payment: { provider: 'stripe', providerTransactionId: 'pi_demo_0004' },
      shipment: {
        carrier: 'Servientrega',
        trackingNumber: 'SRV-4821937',
        trackingUrl: 'https://www.servientrega.com/rastreo?guia=SRV-4821937',
        status: ShipmentStatus.IN_TRANSIT,
      },
    },
    {
      marker: 'DEMO-SEED:6',
      daysAgo: 38,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      shippingCost: 10_000,
      shippingOptionName: 'Envío estándar',
      items: [
        { sku: 'ESE-M-NEG', quantity: 2, productionStatus: OrderItemProductionStatus.READY_TO_SHIP },
        { sku: 'TOT-UNI-CRE', quantity: 1, productionStatus: OrderItemProductionStatus.READY_TO_SHIP },
      ],
      payment: { provider: 'stripe', providerTransactionId: 'pi_demo_0005' },
      shipment: {
        carrier: 'Envía',
        trackingNumber: 'ENV-77120456',
        trackingUrl: 'https://envia.co/rastreo/ENV-77120456',
        status: ShipmentStatus.DELIVERED,
        delivered: true,
      },
    },
    {
      marker: 'DEMO-SEED:7',
      daysAgo: 10,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.PENDING,
      shippingCost: 10_000,
      shippingOptionName: 'Envío estándar',
      cancellationReason: 'El cliente canceló antes de pagar.',
      items: [{ sku: 'MDN-M-NEG', quantity: 1, productionStatus: OrderItemProductionStatus.PENDING_PRODUCTION }],
    },
    {
      marker: 'DEMO-SEED:8',
      daysAgo: 45,
      status: OrderStatus.REFUNDED,
      paymentStatus: PaymentStatus.REFUNDED,
      shippingCost: 10_000,
      shippingOptionName: 'Envío estándar',
      items: [{ sku: 'OFF-L-NEG', quantity: 1, productionStatus: OrderItemProductionStatus.READY_TO_SHIP }],
      payment: { provider: 'stripe', providerTransactionId: 'pi_demo_0006' },
      refund: { reason: 'Talla incorrecta, se coordinó devolución.' },
    },
  ];

  const createdIds: string[] = [];

  for (const order of orders) {
    const existing = await prisma.order.findFirst({ where: { adminNotes: order.marker } });
    if (existing) {
      createdIds.push(existing.id);
      continue;
    }

    const items = order.items.map((item) => {
      const variantId = variantIdBySku.get(item.sku);
      if (!variantId) throw new Error(`Variante no encontrada para el SKU ${item.sku}`);
      const unitPrice = input.variantPriceBySku.get(item.sku) ?? 0;
      return { variantId, quantity: item.quantity, unitPrice, productionStatus: item.productionStatus };
    });

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = order.discountAmount ?? 0;
    const totalAmount = subtotal + order.shippingCost - discountAmount;
    const createdAt = daysAgo(order.daysAgo);
    const paidAt = order.payment ? daysAgo(order.daysAgo - 1) : undefined;

    await prisma.order.create({
      data: {
        userId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal,
        shippingCost: order.shippingCost,
        discountAmount,
        totalAmount,
        shippingAddressId: addressId,
        billingAddressId: addressId,
        shippingOptionId: shippingOptions[order.shippingOptionName]?.id,
        couponId: order.couponCode ? couponIds[order.couponCode] : undefined,
        assignedToId: order.assignedToAdmin ? adminId : undefined,
        adminNotes: order.marker,
        customerNotes: order.customerNotes,
        cancellationReason: order.cancellationReason,
        cancelledAt: order.status === OrderStatus.CANCELLED ? daysAgo(order.daysAgo - 1) : undefined,
        refundReason: order.refund ? order.refund.reason : undefined,
        refundedAt: order.refund ? daysAgo(order.daysAgo - 3) : undefined,
        paidAt,
        shippedAt: order.shipment ? daysAgo(order.daysAgo - 3) : undefined,
        trackingNumber: order.shipment?.trackingNumber,
        carrier: order.shipment?.carrier,
        trackingUrl: order.shipment?.trackingUrl,
        createdAt,
        updatedAt: daysAgo(Math.max(0, order.daysAgo - 4)),
        items: {
          create: items.map((item) => ({
            type: CartItemType.STANDARD,
            productVariantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productionStatus: item.productionStatus,
            assignedToId: order.assignedToAdmin ? adminId : undefined,
          })),
        },
        payments: order.payment
          ? {
              create: [
                {
                  provider: order.payment.provider,
                  providerTransactionId: order.payment.providerTransactionId,
                  amount: totalAmount,
                  status: order.paymentStatus,
                  payload: { demo: true },
                  createdAt,
                },
              ],
            }
          : undefined,
        shipments: order.shipment
          ? {
              create: [
                {
                  carrier: order.shipment.carrier,
                  trackingNumber: order.shipment.trackingNumber,
                  trackingUrl: order.shipment.trackingUrl,
                  status: order.shipment.status,
                  shippedAt: daysAgo(order.daysAgo - 3),
                  deliveredAt: order.shipment.delivered ? daysAgo(order.daysAgo - 6) : undefined,
                  createdAt,
                },
              ],
            }
          : undefined,
        refunds: order.refund
          ? {
              create: [
                {
                  amount: totalAmount,
                  reason: order.refund.reason,
                  status: RefundStatus.COMPLETED,
                  providerRefundId: 're_demo_0001',
                  createdById: adminId,
                  createdAt: daysAgo(order.daysAgo - 3),
                },
              ],
            }
          : undefined,
      },
    });
  }

  const rows = await prisma.order.findMany({ where: { adminNotes: { startsWith: 'DEMO-SEED:' } }, select: { id: true } });
  return rows.map((row) => row.id);
}

async function seedReviews(input: {
  customerId: string;
  variantIdBySku: Map<string, string>;
  productIdBySlug: Map<string, string>;
}): Promise<number> {
  let count = 0;

  const deliveredOrder = await prisma.order.findFirst({ where: { adminNotes: 'DEMO-SEED:6' }, include: { items: true } });
  if (deliveredOrder) {
    const reviewedProducts = await prisma.review.findMany({ where: { userId: input.customerId }, select: { productId: true } });
    const reviewed = new Set(reviewedProducts.map((r) => r.productId));

    for (const item of deliveredOrder.items) {
      if (!item.productVariantId) continue;
      const variant = await prisma.productVariant.findUnique({ where: { id: item.productVariantId }, select: { productId: true } });
      if (!variant || reviewed.has(variant.productId)) continue;

      await prisma.review.create({
        data: {
          productId: variant.productId,
          userId: input.customerId,
          orderId: deliveredOrder.id,
          rating: 5,
          comment: 'Excelente calidad y calce perfecto. El envío llegó antes de lo esperado.',
          isApproved: true,
        },
      });
      reviewed.add(variant.productId);
      count += 1;
    }
  }

  const ana = await prisma.user.findUnique({ where: { email: 'ana.torres@demo.test' } });
  if (ana) {
    const pendingSeeds = [
      { slug: 'buzo-hoodie-urban', rating: 4, comment: 'Muy cómodo, aunque el talle queda un poco grande. ¿Tienen guía de talles?' },
      { slug: 'gorra-trucker-nova', rating: 5, comment: 'Hermosa la gorra, el bordado es impecable.' },
    ];
    for (const seed of pendingSeeds) {
      const productId = input.productIdBySlug.get(seed.slug);
      if (!productId) continue;
      const existing = await prisma.review.findFirst({ where: { productId, userId: ana.id } });
      if (existing) continue;
      await prisma.review.create({
        data: { productId, userId: ana.id, rating: seed.rating, comment: seed.comment, isApproved: false },
      });
      count += 1;
    }
  }

  return count;
}

main()
  .catch((error) => {
     
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
