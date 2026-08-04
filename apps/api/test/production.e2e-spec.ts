import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createVerifiedUserAndGetToken, getAdminToken } from './utils/test-auth';

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

async function createCategory(app: INestApplication, suffix: string) {
  const prisma = app.get(PrismaService);
  const unique = `${suffix}-${randomUUID().slice(0, 8)}`;
  return prisma.category.create({
    data: {
      name: `Category ${unique}`,
      slug: `category-${unique}`,
      isActive: true,
    },
  });
}

async function createProductWithVariant(
  app: INestApplication,
  categoryId: string,
  suffix: string,
  price: number,
  productionLeadTimeDays: number,
) {
  const prisma = app.get(PrismaService);
  const unique = `${suffix}-${randomUUID().slice(0, 8)}`;
  const product = await prisma.product.create({
    data: {
      name: `Product ${unique}`,
      slug: `product-${unique}`,
      basePrice: price,
      categoryId,
      isActive: true,
    },
  });
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `SKU-${unique}`,
      size: 'M',
      color: 'Black',
      stockMode: 'MADE_TO_ORDER',
      productionLeadTimeDays,
      isActive: true,
    },
  });
  return { product, variant };
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

async function createPaidOrder(
  app: INestApplication,
  userId: string,
  variantId: string,
  unitPrice: number,
) {
  const prisma = app.get(PrismaService);
  const address = await createAddress(app, userId);
  const paidAt = new Date('2026-07-20T00:00:00.000Z');
  const order = await prisma.order.create({
    data: {
      userId,
      status: 'PAID',
      subtotal: unitPrice,
      shippingCost: 10_000,
      totalAmount: unitPrice + 10_000,
      shippingAddressId: address.id,
      billingAddressId: address.id,
      paymentStatus: 'PAID',
      paidAt,
      items: {
        create: {
          type: 'STANDARD',
          productVariantId: variantId,
          quantity: 1,
          unitPrice,
        },
      },
    },
  });
  return { order, paidAt };
}

describe('Production & delivery estimates (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await ensureStoreSettings(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns estimatedDeliveryDate based on the longest production lead time', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const category = await createCategory(app, 'delivery-est');
    const { variant } = await createProductWithVariant(app, category.id, 'delivery-est', 100_000, 5);
    const { order } = await createPaidOrder(app, userId, variant.id, 100_000);

    const res = await request(app.getHttpServer())
      .get(`/orders/${order.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.estimatedDeliveryDate).toBe('2026-07-25');
  });

  it('allows an admin to assign and unassign a production item', async () => {
    const { userId } = await createVerifiedUserAndGetToken(app);
    const adminToken = await getAdminToken(app);
    const category = await createCategory(app, 'assign');
    const { variant } = await createProductWithVariant(app, category.id, 'assign', 100_000, 3);
    const { order } = await createPaidOrder(app, userId, variant.id, 100_000);

    const item = await app.get(PrismaService).orderItem.findFirst({
      where: { orderId: order.id },
    });
    if (!item) throw new Error('Order item not found');

    const adminUser = await app.get(PrismaService).user.findUnique({
      where: { email: 'admin@tienda.com' },
    });
    if (!adminUser) throw new Error('Admin user not found');

    const assignRes = await request(app.getHttpServer())
      .patch(`/admin/production/items/${item.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: adminUser.id })
      .expect(200);

    expect(assignRes.body.assignedToId).toBe(adminUser.id);
    expect(assignRes.body.assignedTo).toMatchObject({
      id: adminUser.id,
      name: expect.stringContaining(adminUser.firstName) as string,
      email: adminUser.email,
    });

    const unassignRes = await request(app.getHttpServer())
      .patch(`/admin/production/items/${item.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: null })
      .expect(200);

    expect(unassignRes.body.assignedToId).toBeUndefined();
    expect(unassignRes.body.assignedTo).toBeUndefined();
  });

  it('filters production queue by assigned user', async () => {
    const { userId } = await createVerifiedUserAndGetToken(app);
    const adminToken = await getAdminToken(app);
    const category = await createCategory(app, 'filter');
    const { variant } = await createProductWithVariant(app, category.id, 'filter', 100_000, 2);
    const { order } = await createPaidOrder(app, userId, variant.id, 100_000);

    const item = await app.get(PrismaService).orderItem.findFirst({
      where: { orderId: order.id },
    });
    if (!item) throw new Error('Order item not found');

    const adminUser = await app.get(PrismaService).user.findUnique({
      where: { email: 'admin@tienda.com' },
    });
    if (!adminUser) throw new Error('Admin user not found');

    await request(app.getHttpServer())
      .patch(`/admin/production/items/${item.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: adminUser.id })
      .expect(200);

    const listRes = await request(app.getHttpServer())
      .get('/admin/production')
      .query({ assignedToId: adminUser.id })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listRes.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id })]));

    const unassignedRes = await request(app.getHttpServer())
      .get('/admin/production')
      .query({ assignedToId: 'null' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(unassignedRes.body.data.map((i: { id: string }) => i.id)).not.toContain(item.id);
  });
});
