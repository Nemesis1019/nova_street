import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createUserAndGetToken } from './utils/test-auth';

describe('CartController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await app.close();
  });

  async function ensureStock(variantId: string, quantity: number) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true },
    });
    if (!variant) return;
    if (variant.stockMode === 'TRACKED') {
      await prisma.stockReservation.deleteMany({ where: { productVariantId: variantId } });
      await prisma.inventory.upsert({
        where: { productVariantId: variantId },
        update: { quantity, reservedQuantity: 0 },
        create: { productVariantId: variantId, quantity, reservedQuantity: 0 },
      });
    }
  }

  it('/cart (GET) returns empty cart for authenticated user', async () => {
    const { token } = await createUserAndGetToken(app);

    return request(app.getHttpServer())
      .get('/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toEqual([]);
        expect(res.body.total).toBe(0);
      });
  });

  it('/cart/items (POST) adds a standard item', async () => {
    const { token } = await createUserAndGetToken(app);
    const variant = await prisma.productVariant.findFirst({
      where: { isActive: true, product: { isActive: true } },
      include: { product: true },
    });

    if (!variant) {
      return;
    }

    await ensureStock(variant.id, 100);

    return request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 2 })
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].quantity).toBe(2);
        expect(res.body.total).toBe(res.body.items[0].unitPrice * 2);
      });
  });

  it('/cart/items (POST) merges quantities for the same variant', async () => {
    const { token } = await createUserAndGetToken(app);
    const variant = await prisma.productVariant.findFirst();

    if (!variant) {
      return;
    }

    await ensureStock(variant.id, 100);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    return request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 2 })
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].quantity).toBe(3);
      });
  });

  it('/cart/merge (POST) merges anonymous items', async () => {
    const { token } = await createUserAndGetToken(app);
    const variant = await prisma.productVariant.findFirst();

    if (!variant) {
      return;
    }

    await ensureStock(variant.id, 100);

    return request(app.getHttpServer())
      .post('/cart/merge')
      .set('Authorization', `Bearer ${token}`)
      .send({ anonymousItems: [{ type: 'STANDARD', productVariantId: variant.id, quantity: 2 }] })
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].quantity).toBe(2);
      });
  });
});
