import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createUserAndGetToken, createVerifiedUserAndGetToken } from './utils/test-auth';

async function createAdminUser(app: INestApplication) {
  const { token, userId } = await createUserAndGetToken(app);
  const prisma = app.get(PrismaService);
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (!adminRole) throw new Error('ADMIN role not found');
  await prisma.user.update({ where: { id: userId }, data: { roleId: adminRole.id } });
  return token;
}

async function createTrackedVariant(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const suffix = randomUUID();
  const category = await prisma.category.create({
    data: {
      name: `Test Category ${suffix}`,
      slug: `test-category-${suffix}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      name: `Test Product ${suffix}`,
      slug: `test-product-${suffix}`,
      categoryId: category.id,
      basePrice: 50_000,
      description: 'Test product for stock tracking',
      isActive: true,
    },
  });
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `SKU-${suffix}`,
      size: 'M',
      color: 'Black',
      stockMode: 'TRACKED',
      priceAdjustment: 0,
      isActive: true,
    },
  });
  await prisma.inventory.create({
    data: {
      productVariantId: variant.id,
      quantity: 2,
      reservedQuantity: 0,
    },
  });
  return { category, product, variant };
}

describe('Stock policies (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('tracks stock for TRACKED variants during cart and checkout', async () => {
    const prisma = app.get(PrismaService);
    const { variant } = await createTrackedVariant(app);
    const { token: customerToken, userId } = await createVerifiedUserAndGetToken(app);

    // Adding 3 units should fail.
    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 3 })
      .expect(400);

    // Adding 2 units should succeed.
    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 2 })
      .expect(200);

    // Create address and checkout.
    const address = await prisma.address.create({
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

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shippingAddressId: address.id,
        billingAddressId: address.id,
      })
      .expect(201);

    // Inventory should reflect the reservation.
    const inventoryAfterReserve = await prisma.inventory.findUnique({
      where: { productVariantId: variant.id },
    });
    expect(inventoryAfterReserve?.reservedQuantity).toBe(2);

    // Confirm payment commits stock.
    await request(app.getHttpServer())
      .post(`/checkout/${initRes.body.orderId}/confirm-payment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ providerPayload: {} })
      .expect(200);

    const inventoryAfterCommit = await prisma.inventory.findUnique({
      where: { productVariantId: variant.id },
    });
    expect(inventoryAfterCommit?.quantity).toBe(0);
    expect(inventoryAfterCommit?.reservedQuantity).toBe(0);
  });

  it('lists inventory as admin', async () => {
    const adminToken = await createAdminUser(app);

    return request(app.getHttpServer())
      .get('/admin/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        expect(res.body.meta).toBeDefined();
      });
  });

  it('allows admin to add stock and reflects in catalog and cart', async () => {
    const prisma = app.get(PrismaService);
    const adminToken = await createAdminUser(app);
    const { token: customerToken } = await createVerifiedUserAndGetToken(app);
    const { product, variant } = await createTrackedVariant(app);

    await prisma.inventory.update({
      where: { productVariantId: variant.id },
      data: { quantity: 0 },
    });

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(400);

    const addRes = await request(app.getHttpServer())
      .post(`/admin/variants/${variant.id}/add-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 5 })
      .expect(201);

    expect(addRes.body.quantity).toBe(5);

    const catalogRes = await request(app.getHttpServer())
      .get(`/catalog/products/${product.slug}`)
      .expect(200);

    const variantDto = catalogRes.body.variants.find((v: { id: string }) => v.id === variant.id);
    expect(variantDto.inStock).toBe(true);
    expect(variantDto.availableQuantity).toBe(5);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 5 })
      .expect(200);
  });

  it('rejects adding stock to a non-tracked variant', async () => {
    const prisma = app.get(PrismaService);
    const adminToken = await createAdminUser(app);
    const suffix = randomUUID();

    const category = await prisma.category.create({
      data: {
        name: `Test Category ${suffix}`,
        slug: `test-category-${suffix}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Test Product ${suffix}`,
        slug: `test-product-${suffix}`,
        categoryId: category.id,
        basePrice: 50_000,
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

    await request(app.getHttpServer())
      .post(`/admin/variants/${variant.id}/add-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 5 })
      .expect(400);
  });
});
