/**
 * Sube las fotos reales del catálogo demo (Unsplash) a R2 y sincroniza
 * `Asset` + `ProductImage` con las claves estables `demo/products/<slug>-<n>.webp`.
 *
 * Uso: doppler run -- pnpm exec ts-node src/database/seeds/seed-product-photos.ts
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AssetPurpose, PrismaClient } from '@prisma/client';

import { DEMO_PRODUCT_PHOTOS, downloadUnsplashPhoto, processCatalogPhoto } from './demo-photos';

const prisma = new PrismaClient();
// eslint-disable-next-line no-console
const log = (...args: unknown[]) => console.log(...args);

const R2_PUBLIC = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

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
    });
  }
  return r2Client;
}

async function uploadObject(key: string, buffer: Buffer): Promise<void> {
  await getR2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

async function main() {
  if (!R2_PUBLIC || !process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    throw new Error('R2 no está configurado: revisá R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_PUBLIC_URL.');
  }

  const admin = await prisma.user.findFirst({ where: { email: 'admin@tienda.com' } });

  let uploaded = 0;
  let failed = 0;

  for (const [slug, photo] of Object.entries(DEMO_PRODUCT_PHOTOS)) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      log(`⚠ ${slug}: producto no encontrado, se omite`);
      continue;
    }

    for (let index = 0; index < 2; index += 1) {
      const key = `demo/products/${slug}-${index + 1}.webp`;
      try {
        const original = await downloadUnsplashPhoto(photo.unsplashIds[index]);
        const webp = await processCatalogPhoto(original);
        await uploadObject(key, webp);

        const existingAsset = await prisma.asset.findFirst({ where: { objectKey: key } });
        const asset = existingAsset
          ? await prisma.asset.update({
              where: { id: existingAsset.id },
              data: {
                bucket: 'r2',
                purpose: AssetPurpose.CATALOG_IMAGE,
                relatedId: product.id,
                mimeType: 'image/webp',
                size: webp.length,
              },
            })
          : await prisma.asset.create({
              data: {
                ownerId: admin?.id ?? null,
                uploadedById: admin?.id ?? null,
                purpose: AssetPurpose.CATALOG_IMAGE,
                relatedId: product.id,
                bucket: 'r2',
                objectKey: key,
                mimeType: 'image/webp',
                size: webp.length,
              },
            });

        const existingImage = await prisma.productImage.findFirst({
          where: { productId: product.id, assetId: asset.id },
        });
        if (existingImage) {
          await prisma.productImage.update({ where: { id: existingImage.id }, data: { sortOrder: index } });
        } else {
          await prisma.productImage.create({
            data: { productId: product.id, assetId: asset.id, sortOrder: index },
          });
        }

        uploaded += 1;
        log(`✔ ${key} (${(webp.length / 1024).toFixed(0)} KB) — ${photo.credits}`);
      } catch (error) {
        failed += 1;
        log(`✖ ${key}: ${error instanceof Error ? error.message : error}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  log(`\nFotos subidas: ${uploaded} · fallidas: ${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
