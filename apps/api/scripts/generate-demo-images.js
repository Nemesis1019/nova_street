/**
 * Genera imágenes de demo con IA y las sube a R2, sobrescribiendo las claves
 * `demo/` existentes. Como las URLs no cambian, no hace falta tocar la DB.
 *
 * Proveedores:
 *   --provider=pollinations (default)  Gratis, sin API key. Modelo `sana`.
 *   --provider=gemini                  Requiere GEMINI_API_KEY con billing.
 *
 * Uso:
 *   doppler run -- node scripts/generate-demo-images.js
 *   doppler run -- node scripts/generate-demo-images.js --only=hero
 *   doppler run -- node scripts/generate-demo-images.js --only=remera-oversize-autonomy
 */
const { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const PROVIDER = (process.argv.find((arg) => arg.startsWith('--provider='))?.split('=')[1]) || 'pollinations';
const ONLY = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const STYLE =
  'Photorealistic editorial fashion photography, 35mm lens, natural light, muted palette of cream, olive green and black, urban Bogotá setting, high detail, authentic skin texture, no text, no logos, no watermarks.';

const PRODUCT_IMAGES = [
  ['remera-oversize-autonomy', 'Full-body editorial photo of a young man wearing a plain solid black oversized t-shirt with dropped shoulders, the t-shirt is black, standing against a raw concrete wall in a city alley, overcast daylight, streetwear lookbook'],
  ['remera-oversize-autonomy', 'Close-up detail of the chest and shoulder of a model wearing a plain solid black oversized cotton t-shirt, the fabric is black, soft natural window light, texture visible'],
  ['remera-boxy-nocturna', 'Editorial photo of a young woman wearing a plain solid black boxy-fit t-shirt, the t-shirt is black, standing on a city street at dusk, shallow depth of field, cinematic mood'],
  ['remera-boxy-nocturna', 'Back view of a model wearing a plain solid black boxy t-shirt, the t-shirt is black, in an urban underpass, moody light'],
  ['remera-clasica-esencial', 'Studio lookbook photo of a male model wearing a plain solid black regular-fit cotton t-shirt, the t-shirt is black, cream seamless background, soft even lighting'],
  ['remera-clasica-esencial', 'Studio lookbook photo of a female model wearing a plain solid white regular-fit cotton t-shirt, the t-shirt is white, warm grey seamless background, soft even lighting'],
  ['buzo-hoodie-urban', 'Editorial photo of a model wearing a plain solid heather grey pullover hoodie with the hood down, the hoodie is grey, on a city rooftop, soft afternoon light'],
  ['buzo-hoodie-urban', 'Close-up of a plain solid heather grey hoodie, the hoodie is grey: hood, drawstrings and ribbed cuffs, natural light, fabric texture'],
  ['buzo-oversize-grid', 'Editorial photo of a model wearing a solid black oversized crewneck sweatshirt with a subtle thin geometric line print across the chest, the sweatshirt is black, concrete parking garage'],
  ['buzo-oversize-grid', 'Detail shot of a thin geometric line print on the chest of a solid black oversized sweatshirt, studio light'],
  ['gorra-trucker-nova', 'Editorial portrait of a model wearing a plain solid black trucker cap with mesh back, the cap is black, urban street background, golden hour'],
  ['gorra-trucker-nova', 'Product photo of a plain solid black trucker cap with mesh back resting on a concrete ledge, the cap is black, soft daylight, no logos'],
  ['gorra-dad-hat-logo', 'Portrait of a model wearing a plain solid black dad hat, the hat is black, city street at midday, streetwear styling'],
  ['gorra-dad-hat-logo', 'Product photo of a plain solid cream canvas dad hat on a cream seamless background, the hat is cream, soft shadow, no logos'],
  ['pantalon-cargo-utility', 'Full-body editorial photo of a model wearing solid black ripstop cargo pants with side pockets, the pants are black, walking on a city street, streetwear lookbook'],
  ['pantalon-cargo-utility', 'Close-up detail of side cargo pockets on solid black ripstop pants, the pants are black, natural light'],
  ['jogger-off-duty', 'Studio photo of a model wearing solid black tapered joggers with elastic cuffs, the joggers are black, cream seamless background, soft light'],
  ['jogger-off-duty', 'Detail of the elastic cuff and drawcord of solid black fleece joggers, the fabric is black, natural light'],
  ['tote-bag-daily', 'Editorial street photo of a model carrying a plain solid cream canvas tote bag on the shoulder, the tote is cream, city background, daylight'],
  ['tote-bag-daily', 'Product photo of a plain solid cream heavyweight canvas tote bag hanging on a hook against a concrete wall, the tote is cream, soft light'],
  ['medias-stripe-x3', 'Close-up street style photo of a model wearing sneakers and solid black cotton socks with a single olive stripe, low angle, the socks are black with an olive stripe'],
  ['medias-stripe-x3', 'Flat-lay product photo of three pairs of folded cotton socks in black, cream and olive green, arranged on a cream surface, soft light'],
  ['campera-bomber-midnight', 'Editorial night photo of a model wearing a solid black padded bomber jacket, the jacket is black, city lights bokeh background'],
  ['campera-bomber-midnight', 'Detail shot of a solid black padded bomber jacket: metal zipper and ribbed collar, the jacket is black, studio light'],
];

const IMAGES = [
  {
    id: 'hero',
    key: 'demo/brand/hero.webp',
    width: 1920,
    height: 1080,
    request: { width: 1600, height: 900 },
    prompt:
      'Cinematic wide fashion campaign photo of a male model wearing black oversized streetwear leaning against a concrete wall in an urban alley at dusk, the clothes are black, dark moody tones with olive green accents, empty space on the left side of the frame for text overlay',
  },
  {
    id: 'tee-base',
    key: 'demo/design/tee.webp',
    width: 900,
    height: 1100,
    request: { width: 1024, height: 1250 },
    prompt:
      'Product photo of a plain solid black t-shirt displayed on an invisible mannequin, the t-shirt is black and blank, perfectly centered, full garment visible, flat even studio lighting, light cream seamless background',
  },
  {
    id: 'hoodie-base',
    key: 'demo/design/hoodie.webp',
    width: 900,
    height: 1100,
    request: { width: 1024, height: 1250 },
    prompt:
      'Product photo of a plain solid heather grey pullover hoodie displayed on an invisible mannequin, the hoodie is grey and blank, perfectly centered, full garment visible, flat even studio lighting, light cream seamless background',
  },
  {
    id: 'custom-preview',
    key: 'demo/design/custom-preview.webp',
    width: 900,
    height: 900,
    request: { width: 1024, height: 1024 },
    prompt:
      'Studio photo of a solid black t-shirt on an invisible mannequin with a circular olive green abstract graphic printed on the center chest, the t-shirt is black, no text, light cream background',
  },
  ...PRODUCT_IMAGES.map(([slug, prompt], index) => ({
    id: `${slug}-${(index % 2) + 1}`,
    key: `demo/products/${slug}-${(index % 2) + 1}.webp`,
    width: 1200,
    height: 1500,
    request: { width: 1024, height: 1280 },
    seed: 100 + index * 7,
    prompt,
    slug,
  })),
];

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function rawPollinations(image) {
  const url = new URL(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(`${image.prompt} ${STYLE}`)}`,
  );
  url.searchParams.set('width', String(image.request.width));
  url.searchParams.set('height', String(image.request.height));
  url.searchParams.set('model', 'sana');
  url.searchParams.set('seed', String(image.seed ?? 42));
  url.searchParams.set('safe', 'false');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function rawGemini(image) {
  const body = {
    contents: [{ parts: [{ text: `${image.prompt}. ${STYLE}` }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const json = await response.json();
  const part = (json.candidates?.[0]?.content?.parts ?? []).find((item) => item.inlineData?.data);
  if (!part) throw new Error('Gemini no devolvió imagen');
  return Buffer.from(part.inlineData.data, 'base64');
}

async function generate(image) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const raw = PROVIDER === 'gemini' ? await rawGemini(image) : await rawPollinations(image);

      // Pollinations agrega un logo en la esquina inferior derecha: recortamos
      // una franja inferior antes de escalar.
      const meta = await sharp(raw).metadata();
      const cropped = PROVIDER === 'pollinations'
        ? sharp(raw).extract({
            left: 0,
            top: 0,
            width: meta.width,
            height: Math.floor(meta.height * 0.958),
          })
        : sharp(raw);

      return await cropped
        .resize(image.width, image.height, { fit: 'cover', position: 'attention' })
        .webp({ quality: 86 })
        .toBuffer();
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(attempt * 5000);
    }
  }
  throw new Error('Sin resultado');
}

async function main() {
  if (PROVIDER === 'gemini' && !GEMINI_KEY) {
    console.error('Falta GEMINI_API_KEY.');
    process.exit(1);
  }
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error('Falta configuración de R2 en el entorno.');
    process.exit(1);
  }

  const targets = IMAGES.filter((image) => {
    if (!ONLY) return true;
    return image.id === ONLY || image.id.startsWith(`${ONLY}-`) || image.slug === ONLY;
  });
  if (targets.length === 0) {
    console.error(`No hay imágenes que coincidan con "${ONLY}".`);
    process.exit(1);
  }

  console.log(`Proveedor: ${PROVIDER} · Generando ${targets.length} imágenes...\n`);
  let done = 0;
  const queue = [...targets];

  async function worker(workerId) {
    while (queue.length > 0) {
      const image = queue.shift();
      if (!image) return;
      const current = targets.length - queue.length;
      console.log(`[w${workerId}] (${current}/${targets.length}) ${image.key}`);
      const buffer = await generate(image);
      await getR2().send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: image.key,
          Body: buffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=60',
        }),
      );
      done += 1;
      console.log(`[w${workerId}]   ✔ ${(buffer.length / 1024).toFixed(0)} KB`);
      await sleep(2500);
    }
  }

  await Promise.all([worker(1), worker(2)]);
  console.log(`\nListo: ${done}/${targets.length} imágenes actualizadas en R2.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
