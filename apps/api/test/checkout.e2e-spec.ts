import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PAYMENT_PROVIDER } from './../src/payment/providers/payment-provider.token';
import { PrismaService } from './../src/prisma/prisma.service';
import { createVerifiedUserAndGetToken } from './utils/test-auth';
import { TestPaymentProvider } from './utils/test-payment-provider';

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

async function createCoupon(app: INestApplication, code: string, overrides: Record<string, unknown> = {}) {
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
      ...overrides,
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

async function createProductWithVariant(
  app: INestApplication,
  categoryId: string,
  suffix: string,
  price: number,
) {
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

describe('CheckoutController (e2e)', () => {
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

  it('/checkout/init (POST) creates an order from cart', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();

    if (!variant) {
      return;
    }

    await ensureStock(app, variant.id, 100);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 2 })
      .expect(200);

    const address = await createAddress(app, userId);

    return request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddressId: address.id,
        billingAddressId: address.id,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.orderId).toBeDefined();
        expect(res.body.subtotal).toBeGreaterThan(0);
        expect(res.body.shippingCost).toBe(10_000);
        expect(res.body.totalAmount).toBe(res.body.subtotal + res.body.shippingCost);
        expect(res.body.paymentIntent).toBeDefined();
      });
  });

  it('/checkout/:orderId/apply-coupon (POST) applies a discount', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();

    if (!variant) {
      return;
    }

    await ensureStock(app, variant.id, 100);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 2 })
      .expect(200);

    const address = await createAddress(app, userId);
    const coupon = await createCoupon(app, `DESC-${Date.now()}`);

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddressId: address.id,
        billingAddressId: address.id,
      })
      .expect(201);

    return request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/apply-coupon`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: coupon.code })
      .expect(200)
      .expect((res) => {
        expect(res.body.discountAmount).toBeGreaterThan(0);
        expect(res.body.totalAmount).toBeLessThan(initRes.body.totalAmount);
      });
  });

  it('/checkout/:orderId/confirm-payment (POST) marks order as paid', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();

    if (!variant) {
      return;
    }

    await ensureStock(app, variant.id, 100);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
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

    return request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/confirm-payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ providerPayload: {} })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('PAID');
        expect(res.body.paymentStatus).toBe('PAID');
      });
  });

  it('rejects coupon when minimum order amount is not met', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();
    if (!variant) return;

    await ensureStock(app, variant.id, 100);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    const address = await createAddress(app, userId);
    const coupon = await createCoupon(app, `MIN-${Date.now()}`, { minOrderAmount: 1_000_000 });

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201);

    return request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/apply-coupon`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: coupon.code })
      .expect(400);
  });

  it('applies category-specific coupon only to eligible items', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const suffix = `${Date.now()}`;

    const eligibleCategory = await createCategory(app, `eligible-${suffix}`);
    const otherCategory = await createCategory(app, `other-${suffix}`);
    const { variant: eligibleVariant } = await createProductWithVariant(app, eligibleCategory.id, `el-${suffix}`, 50_000);
    const { variant: otherVariant } = await createProductWithVariant(app, otherCategory.id, `ot-${suffix}`, 30_000);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: eligibleVariant.id, quantity: 1 })
      .expect(200);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: otherVariant.id, quantity: 1 })
      .expect(200);

    const address = await createAddress(app, userId);
    const coupon = await createCoupon(app, `CAT-${Date.now()}`, {
      appliesTo: 'CATEGORY',
      categoryId: eligibleCategory.id,
      discountType: 'PERCENTAGE',
      discountValue: 50,
    });

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201);

    const applyRes = await request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/apply-coupon`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: coupon.code })
      .expect(200);

    expect(applyRes.body.discountAmount).toBe(25_000);
  });

  it('applies product-specific coupon only to eligible items', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const suffix = `${Date.now()}`;

    const category = await createCategory(app, `prod-${suffix}`);
    const { product: eligibleProduct, variant: eligibleVariant } = await createProductWithVariant(
      app,
      category.id,
      `el-${suffix}`,
      60_000,
    );
    const { variant: otherVariant } = await createProductWithVariant(app, category.id, `ot-${suffix}`, 20_000);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: eligibleVariant.id, quantity: 1 })
      .expect(200);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: otherVariant.id, quantity: 1 })
      .expect(200);

    const address = await createAddress(app, userId);
    const coupon = await createCoupon(app, `PROD-${Date.now()}`, {
      appliesTo: 'PRODUCT',
      productId: eligibleProduct.id,
      discountType: 'FIXED',
      discountValue: 10_000,
    });

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201);

    const applyRes = await request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/apply-coupon`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: coupon.code })
      .expect(200);

    expect(applyRes.body.discountAmount).toBe(10_000);
  });

  it('enforces max uses per user', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();
    if (!variant) return;

    await ensureStock(app, variant.id, 100);
    const address = await createAddress(app, userId);
    const coupon = await createCoupon(app, `USER-${Date.now()}`, { maxUsesPerUser: 1 });

    async function initAndApply() {
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'STANDARD', productVariantId: variant!.id, quantity: 1 })
        .expect(200);

      const initRes = await request(app.getHttpServer())
        .post('/checkout/init')
        .set('Authorization', `Bearer ${token}`)
        .send({ shippingAddressId: address.id, billingAddressId: address.id })
        .expect(201);

      return request(app.getHttpServer())
        .post(`/checkout/${initRes.body.orderId}/apply-coupon`)
        .set('Authorization', `Bearer ${token}`)
        .send({ couponCode: coupon.code });
    }

    const first = await initAndApply();
    expect(first.status).toBe(200);

    const second = await initAndApply();
    expect(second.status).toBe(400);
  });

  it('rejects first-purchase-only coupon for returning customers', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();
    if (!variant) return;

    await ensureStock(app, variant.id, 100);
    const address = await createAddress(app, userId);

    await prisma.order.create({
      data: {
        userId,
        status: 'PAID',
        paymentStatus: 'PAID',
        subtotal: 10_000,
        shippingCost: 0,
        totalAmount: 10_000,
        shippingAddressId: address.id,
        billingAddressId: address.id,
      },
    });

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    const coupon = await createCoupon(app, `FIRST-${Date.now()}`, { isFirstPurchaseOnly: true });

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201);

    return request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/apply-coupon`)
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: coupon.code })
      .expect(400);
  });

  it('/checkout/shipping-cost (POST) returns flat rate by default', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    await updateStoreConfigShipping(app, {
      shippingProvider: 'flatRate',
      shippingBaseCost: 12_000,
      freeShippingThreshold: null,
      shippingDiscountPercentage: null,
      shippingDiscountFixedAmount: null,
    });
    const address = await createAddress(app, userId);

    return request(app.getHttpServer())
      .post('/checkout/shipping-cost')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id })
      .expect(200)
      .expect((res) => {
        expect(res.body.shippingCost).toBe(12_000);
        expect(res.body.baseCost).toBe(12_000);
      });
  });

  it('applies free shipping threshold', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const suffix = `${Date.now()}`;
    const category = await createCategory(app, `shipping-${suffix}`);
    const { variant } = await createProductWithVariant(app, category.id, `ship-${suffix}`, 50_000);

    await updateStoreConfigShipping(app, {
      shippingProvider: 'freeThreshold',
      shippingBaseCost: 10_000,
      freeShippingThreshold: 150_000,
    });

    const address = await createAddress(app, userId);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    const lowCostRes = await request(app.getHttpServer())
      .post('/checkout/shipping-cost')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id })
      .expect(200);
    expect(lowCostRes.body.shippingCost).toBe(10_000);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 2 })
      .expect(200);

    const freeRes = await request(app.getHttpServer())
      .post('/checkout/shipping-cost')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id })
      .expect(200);
    expect(freeRes.body.shippingCost).toBe(0);
  });

  it('applies percentage and fixed shipping discounts', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    await updateStoreConfigShipping(app, {
      shippingProvider: 'discount',
      shippingBaseCost: 10_000,
      shippingDiscountPercentage: 50,
      shippingDiscountFixedAmount: 2_000,
    });
    const address = await createAddress(app, userId);

    return request(app.getHttpServer())
      .post('/checkout/shipping-cost')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id })
      .expect(200)
      .expect((res) => {
        // 10_000 * 0.5 = 5_000; 5_000 - 2_000 = 3_000
        expect(res.body.shippingCost).toBe(3_000);
      });
  });

  it('checkout uses configured shipping cost', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();
    if (!variant) return;

    await updateStoreConfigShipping(app, {
      shippingProvider: 'flatRate',
      shippingBaseCost: 15_000,
      freeShippingThreshold: null,
      shippingDiscountPercentage: null,
      shippingDiscountFixedAmount: null,
    });

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    const address = await createAddress(app, userId);

    return request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201)
      .expect((res) => {
        expect(res.body.shippingCost).toBe(15_000);
      });
  });

  it('allows retrying payment for pending orders', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();
    if (!variant) return;

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    const address = await createAddress(app, userId);

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201);

    const retryRes = await request(app.getHttpServer())
      .post(`/orders/${initRes.body.orderId}/retry-payment`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(retryRes.body.orderId).toBe(initRes.body.orderId);
    expect(retryRes.body.paymentUrl).toBeDefined();

    const payments = await prisma.payment.findMany({ where: { orderId: initRes.body.orderId } });
    expect(payments.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects payment retry for paid orders', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();
    if (!variant) return;

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    const address = await createAddress(app, userId);

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/confirm-payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ providerPayload: {} })
      .expect(200);

    return request(app.getHttpServer())
      .post(`/orders/${initRes.body.orderId}/retry-payment`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
