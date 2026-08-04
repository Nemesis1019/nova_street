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

describe('Permissions (e2e)', () => {
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects anonymous users from admin endpoints', async () => {
    await request(app.getHttpServer())
      .get('/admin/orders')
      .expect(401);

    await request(app.getHttpServer())
      .get('/admin/dashboard/metrics')
      .expect(401);

    await request(app.getHttpServer())
      .post('/admin/products')
      .send({ name: 'Test', slug: 'test', basePrice: 10000 })
      .expect(401);
  });

  it('rejects customer role from admin endpoints', async () => {
    const { token } = await createVerifiedUserAndGetToken(app);

    await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', slug: 'test', basePrice: 10000 })
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/admin/reviews')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('allows admin to access protected admin endpoints', async () => {
    const adminToken = await getAdminToken(app);

    await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
      });

    await request(app.getHttpServer())
      .get('/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.totalRevenue).toBeDefined();
      });

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  it('allows customer to access own resources but not other users data', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const prisma = app.get(PrismaService);
    const variant = await prisma.productVariant.findFirst();

    await request(app.getHttpServer())
      .get('/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Attempt to access a non-existent order should return 404, not expose data.
    await request(app.getHttpServer())
      .get('/orders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    if (!variant) return;

    const address = await createAddress(app, userId);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'STANDARD', productVariantId: variant.id, quantity: 1 })
      .expect(200);

    const initRes = await request(app.getHttpServer())
      .post('/checkout/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddressId: address.id, billingAddressId: address.id })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/orders/${initRes.body.orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(initRes.body.orderId);
      });
  });

  it('allows admin to suspend and unsuspend a customer', async () => {
    const adminToken = await getAdminToken(app);
    const { email: customerEmail, userId: customerId } = await createVerifiedUserAndGetToken(app);

    await request(app.getHttpServer())
      .patch(`/admin/users/${customerId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Test suspension' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: customerEmail, password: 'Secure1234' })
      .expect(401);

    // Re-fetch to assert suspension state.
    const userRes = await request(app.getHttpServer())
      .get(`/admin/users/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(userRes.body.isSuspended).toBe(true);

    await request(app.getHttpServer())
      .patch(`/admin/users/${customerId}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const unRes = await request(app.getHttpServer())
      .get(`/admin/users/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(unRes.body.isSuspended).toBe(false);
  });
});
