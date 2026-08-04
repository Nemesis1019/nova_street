import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PAYMENT_PROVIDER } from './../src/payment/providers/payment-provider.token';
import { PrismaService } from './../src/prisma/prisma.service';
import { createVerifiedUserAndGetToken, getAdminToken } from './utils/test-auth';
import { TestPaymentProvider } from './utils/test-payment-provider';

async function ensureStoreSettings(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const existing = await prisma.storeSettings.findFirst();
  if (existing) return existing;
  return prisma.storeSettings.create({
    data: {
      defaultStockMode: 'MADE_TO_ORDER',
      productionLeadTimeDaysDefault: 7,
      shippingCostDefault: 10_000,
    },
  });
}

async function updateStoreConfigShipping(app: INestApplication, overrides: Record<string, unknown>) {
  const prisma = app.get(PrismaService);
  const config = await prisma.storeConfig.findFirst({ where: { isActive: true } });
  const defaults = {
    shippingProvider: 'flatRate',
    shippingBaseCost: 10_000,
    freeShippingThreshold: null,
    shippingDiscountPercentage: null,
    shippingDiscountFixedAmount: null,
  };
  if (config) {
    return prisma.storeConfig.update({ where: { id: config.id }, data: { ...defaults, ...overrides } });
  }
  return prisma.storeConfig.create({
    data: {
      name: 'Test Store',
      currencyCode: 'COP',
      ...defaults,
      ...overrides,
    },
  });
}

async function createAddress(app: INestApplication, userId: string) {
  const prisma = app.get(PrismaService);
  return prisma.address.create({
    data: {
      userId,
      label: 'Casa',
      line1: 'Calle 123',
      city: 'Asunción',
      state: 'Central',
      country: 'PY',
      zipCode: '001',
    },
  });
}

async function createCoupon(app: INestApplication, code: string) {
  const prisma = app.get(PrismaService);
  return prisma.coupon.upsert({
    where: { code },
    update: {},
    create: {
      code,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      maxUses: 100,
      usedCount: 0,
      isActive: true,
      appliesTo: 'ALL',
    },
  });
}

async function createCategory(app: INestApplication, suffix: string) {
  const prisma = app.get(PrismaService);
  return prisma.category.create({
    data: {
      name: `Category ${suffix}`,
      slug: `category-${suffix}`,
      isActive: true,
    },
  });
}

async function createProductWithVariant(app: INestApplication, categoryId: string, suffix: string, price: number) {
  const prisma = app.get(PrismaService);
  const product = await prisma.product.create({
    data: {
      name: `Product ${suffix}`,
      slug: `product-${suffix}`,
      basePrice: price,
      categoryId,
      isActive: true,
    },
  });
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `SKU-${suffix}`,
      size: 'M',
      color: 'Black',
      stockMode: 'MADE_TO_ORDER',
      isActive: true,
    },
  });
  return { product, variant };
}

async function ensureStock(app: INestApplication, variantId: string, quantity: number) {
  const prisma = app.get(PrismaService);
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true },
  });
  if (!variant) return;
  if (variant.stockMode === 'TRACKED') {
    await prisma.inventory.upsert({
      where: { productVariantId: variantId },
      update: { quantity, reservedQuantity: 0 },
      create: { productVariantId: variantId, quantity, reservedQuantity: 0 },
    });
  }
}

async function ensureDesignTemplate(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const existing = await prisma.designTemplate.findFirst();
  if (existing) return existing;
  return prisma.designTemplate.create({
    data: {
      name: 'Remera test',
      garmentType: 'Remera',
      baseImageUrl: 'https://placehold.co/600x400/png',
      printAreas: JSON.stringify({ front: { x: 100, y: 100, width: 300, height: 300 } }),
      basePrice: 45_000,
      availableColors: ['Preta', 'Blanca'],
      availableSizes: ['S', 'M'],
      stockMode: 'MADE_TO_ORDER',
      productionLeadTimeDays: 7,
    },
  });
}

describe('Critical flows (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_PROVIDER)
      .useValue(new TestPaymentProvider())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await ensureStoreSettings(app);
    await updateStoreConfigShipping(app, {});
  });

  afterEach(async () => {
    await app.close();
  });

  it('completes a full purchase flow (register, verify, cart, checkout, coupon, payment)', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const suffix = `${Date.now()}`;

    const category = await createCategory(app, suffix);
    const { variant } = await createProductWithVariant(app, category.id, suffix, 50_000);
    await ensureStock(app, variant.id, 100);
    const coupon = await createCoupon(app, `FLOW-${suffix}`);

    await request(app.getHttpServer())
      .get('/catalog/products')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        expect(res.body.meta).toBeDefined();
      });

    await request(app.getHttpServer())
      .get(`/catalog/categories/${category.slug}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 2 })
      .expect(200);

    const address = await createAddress(app, userId);

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddressId: address.id,
        billingAddressId: address.id,
      })
      .expect(201);

    expect(initRes.body.orderId).toBeDefined();
    expect(initRes.body.totalAmount).toBe(initRes.body.subtotal + initRes.body.shippingCost);

    const couponRes = await request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/apply-coupon`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: coupon.code })
      .expect(200);

    expect(couponRes.body.discountAmount).toBeGreaterThan(0);
    expect(couponRes.body.totalAmount).toBeLessThan(initRes.body.totalAmount);

    await request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/confirm-payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ providerPayload: {} })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('PAID');
        expect(res.body.paymentStatus).toBe('PAID');
      });

    await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: initRes.body.orderId,
              status: 'PAID',
            }),
          ]),
        );
      });
  });

  it('completes a guest checkout flow', async () => {
    const suffix = `${Date.now()}`;
    const category = await createCategory(app, suffix);
    const { variant } = await createProductWithVariant(app, category.id, suffix, 60_000);
    await ensureStock(app, variant.id, 100);

    const guestRes = await request(app.getHttpServer())
      .post('/checkout/guest/init')
      .send({
        email: `guest-${suffix}@example.com`,
        items: [{ productVariantId: variant.id, quantity: 1 }],
        shippingAddress: {
          label: 'Casa',
          line1: 'Calle Guest',
          city: 'Asunción',
          state: 'Central',
          country: 'PY',
          zipCode: '002',
        },
        billingAddress: {
          label: 'Casa',
          line1: 'Calle Guest',
          city: 'Asunción',
          state: 'Central',
          country: 'PY',
          zipCode: '002',
        },
      })
      .expect(201);

    expect(guestRes.body.orderId).toBeDefined();
    expect(guestRes.body.guestToken).toBeDefined();

    await request(app.getHttpServer())
      .get(`/checkout/guest/orders/${guestRes.body.guestToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(guestRes.body.orderId);
      });
  });

  it('approves a custom design and purchases it end-to-end', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const adminToken = await getAdminToken(app);
    const template = await ensureDesignTemplate(app);
    const address = await createAddress(app, userId);
    const suffix = `${Date.now()}`;

    const createRes = await request(app.getHttpServer())
      .post('/custom-designs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        designTemplateId: template.id,
        color: 'Preta',
        size: 'M',
        surcharge: 5_000,
        elements: [
          {
            type: 'TEXT',
            textContent: `Nova ${suffix}`,
            fontSize: 24,
            fill: '#000000',
            positionX: 120,
            positionY: 120,
            scale: 1,
            rotation: 0,
            zIndex: 1,
          },
        ],
      })
      .expect(201);

    const designId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/custom-designs/${designId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/custom-designs/admin/${designId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/custom-designs/${designId}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 })
      .expect(201);

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddressId: address.id,
        billingAddressId: address.id,
      })
      .expect(201);

    expect(initRes.body.orderId).toBeDefined();

    await request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/confirm-payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ providerPayload: {} })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('PAID');
      });

    await request(app.getHttpServer())
      .get(`/orders/${initRes.body.orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'CUSTOM',
              customDesignId: designId,
            }),
          ]),
        );
      });
  });
});
