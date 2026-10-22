/**
 * Importa las imágenes generadas a mano (carpeta `demo-images/`) y las sube a R2
 * sobrescribiendo las claves `demo/` existentes. No toca la base de datos.
 *
 * Uso:
 *   doppler run -- node scripts/import-demo-images.js --list
 *   doppler run -- node scripts/import-demo-images.js
 *   doppler run -- node scripts/import-demo-images.js --only=hero
 *   doppler run -- node scripts/import-demo-images.js --trim-bottom=0.04
 */
const fs = require('fs');
const path = require('path');
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', 'demo-images');
const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const TRIM_BOTTOM = Number(process.argv.find((arg) => arg.startsWith('--trim-bottom='))?.split('=')[1] ?? 0);
const LIST_ONLY = process.argv.includes('--list');
const DRY_RUN = process.argv.includes('--dry-run');
const EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif'];

const SLUGS = [
  'remera-oversize-autonomy',
  'remera-boxy-nocturna',
  'remera-clasica-esencial',
  'buzo-hoodie-urban',
  'buzo-oversize-grid',
  'gorra-trucker-nova',
  'gorra-dad-hat-logo',
  'pantalon-cargo-utility',
  'jogger-off-duty',
  'tote-bag-daily',
  'medias-stripe-x3',
  'campera-bomber-midnight',
];

const TARGETS = [
  { file: 'hero', key: 'demo/brand/hero.webp', width: 1920, height: 1080 },
  { file: 'design/tee', key: 'demo/design/tee.webp', width: 900, height: 1100 },
  { file: 'design/hoodie', key: 'demo/design/hoodie.webp', width: 900, height: 1100 },
  { file: 'design/custom-preview', key: 'demo/design/custom-preview.webp', width: 900, height: 900 },
  ...SLUGS.flatMap((slug) => [
    { file: `products/${slug}-1`, key: `demo/products/${slug}-1.webp`, width: 1200, height: 1500 },
    { file: `products/${slug}-2`, key: `demo/products/${slug}-2.webp`, width: 1200, height: 1500 },
  ]),
];

function findLocalFile(relative) {
  for (const ext of EXTENSIONS) {
    const full = path.join(ROOT, `${relative}${ext}`);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

let r2Client = null;
function getR2() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return r2Client;
}

async function main() {
  const targets = TARGETS.filter((target) => !ONLY || target.file === ONLY || target.file.endsWith(`/${ONLY}`));

  console.log(LIST_ONLY ? 'Imágenes esperadas:\n' : 'Procesando imágenes...\n');
  let done = 0;
  let missing = 0;

  for (const target of targets) {
    const local = findLocalFile(target.file);
    if (!local) {
      console.log(`  ✖ falta ${target.file}.(png|jpg|webp)`);
      missing += 1;
      continue;
    }

    if (LIST_ONLY) {
      console.log(`  ✔ ${target.file} → ${target.key}`);
      continue;
    }

    let pipeline = sharp(local);
    const meta = await pipeline.metadata();
    if (TRIM_BOTTOM > 0) {
      pipeline = pipeline.extract({
        left: 0,
        top: 0,
        width: meta.width,
        height: Math.floor(meta.height * (1 - TRIM_BOTTOM)),
      });
    }

    const webp = await pipeline
      .resize(target.width, target.height, { fit: 'cover', position: 'attention' })
      .webp({ quality: 88 })
      .toBuffer();

    if (!DRY_RUN) {
      await getR2().send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: target.key,
          Body: webp,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=60',
        }),
      );
    }

    done += 1;
    console.log(`  ✔ ${target.file} → ${target.key} (${(webp.length / 1024).toFixed(0)} KB)`);
  }

  if (LIST_ONLY) {
    console.log(`\nEncontradas: ${targets.length - missing}/${targets.length}`);
    console.log(`Guardá las que faltan en: ${ROOT}`);
  } else {
    console.log(`\nListo: ${done} subidas, ${missing} faltantes.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
