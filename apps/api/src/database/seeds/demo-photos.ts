/**
 * Fotos reales del catálogo demo (Unsplash, licencia libre para uso comercial).
 *
 * El seed descarga cada foto desde Unsplash, la procesa con sharp (1200×1200 webp)
 * y la sube a R2 con la clave estable `demo/products/<slug>-<n>.webp`, que es la
 * misma que ya referencian los `ProductImage`/`Asset` de la base.
 *
 * Si una descarga falla, el seed cae al SVG de marca generado con sharp.
 */
import sharp from 'sharp';

export interface DemoProductPhoto {
  /** IDs de fotos de Unsplash (https://unsplash.com/photos/<id>). */
  unsplashIds: [string, string];
  /** Créditos (no obligatorios por licencia, pero se documentan). */
  credits: string;
}

export const DEMO_PRODUCT_PHOTOS: Record<string, DemoProductPhoto> = {
  'campera-bomber-midnight': {
    unsplashIds: ['5I3kClMGVz0', '8nBHI9FMOr4'],
    credits: 'Enrique Fernandez, lhon karwan (Unsplash)',
  },
  'buzo-hoodie-urban': {
    unsplashIds: ['7k73_NUaXDg', 'S2qA7JhjI6Y'],
    credits: 'Tobias van Schneider, Luis Villasmil (Unsplash)',
  },
  'buzo-oversize-grid': {
    unsplashIds: ['WgkqAQbKc4E', '6OOU-VK2bhU'],
    credits: 'Michael Kyule, Lerone Pieters (Unsplash)',
  },
  'gorra-dad-hat-logo': {
    unsplashIds: ['2loKxdi6Hmo', 't8HiP3e5abg'],
    credits: 'Yang Deng, Mediamodifier (Unsplash)',
  },
  'gorra-trucker-nova': {
    unsplashIds: ['ozdzzeBu4Go', 'VGNUKRMN87A'],
    credits: 'personalgraphic.com, Jeferson Santu (Unsplash)',
  },
  'jogger-off-duty': {
    unsplashIds: ['nS1kxf6nP24', 'IbMNh9rnVoo'],
    credits: 'The Photo Studio Brisbane, Unsplash (Unsplash)',
  },
  'medias-stripe-x3': {
    unsplashIds: ['bPZjkCnmyQw', 'Xd_YG4iJLUo'],
    credits: 'INVICTUS Tailoring, NIKHIL (Unsplash)',
  },
  'pantalon-cargo-utility': {
    unsplashIds: ['cjEkVJg2Huw', 'EuKHA6uaAUw'],
    credits: 'Anton K Wibowo, Cord Allman (Unsplash)',
  },
  'remera-boxy-nocturna': {
    unsplashIds: ['Cs4GVbMqKGY', 'Rvu_XqWgp80'],
    credits: 'Ryan Hoffman, Unsplash (Unsplash)',
  },
  'remera-clasica-esencial': {
    unsplashIds: ['acn5ERAeSb4', 'Q0zoxQF7OUY'],
    credits: 'Haryo Setyadi, Mediamodifier (Unsplash)',
  },
  'remera-oversize-autonomy': {
    unsplashIds: ['6Nub980bI3I', 'cxQqh5FQt6g'],
    credits: 'Ryan Hoffman, BANDAR BAANT (Unsplash)',
  },
  'tote-bag-daily': {
    unsplashIds: ['U7_DueUJ2L4', 'TK-rrTgYqzo'],
    credits: 'JIN Qin, Tereza Rubá (Unsplash)',
  },
};

/** Descarga la foto original desde Unsplash (sigue el redirect de /download). */
export async function downloadUnsplashPhoto(photoId: string): Promise<Buffer> {
  const response = await fetch(`https://unsplash.com/photos/${photoId}/download?force=true&w=1600`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Unsplash ${photoId}: HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/** Normaliza la foto a 1200×1200 webp (cover centrado en la zona de interés). */
export async function processCatalogPhoto(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1200, 1200, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toBuffer();
}
