import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createUserAndGetToken } from './utils/test-auth';

async function createAdminUser(app: INestApplication) {
  const { token, userId } = await createUserAndGetToken(app);
  const prisma = app.get(PrismaService);
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (!adminRole) throw new Error('ADMIN role not found');
  await prisma.user.update({ where: { id: userId }, data: { roleId: adminRole.id } });
  return token;
}

describe('AdminCouponController (e2e)', () => {
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

  it('/admin/coupons (POST) creates a coupon as admin', async () => {
    const token = await createAdminUser(app);

    return request(app.getHttpServer())
      .post('/admin/coupons')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: `TEST-${Date.now()}`,
        discountType: 'PERCENTAGE',
        discountValue: 15,
        validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.code).toBeDefined();
      });
  });

  it('/admin/coupons (GET) lists coupons as admin', async () => {
    const token = await createAdminUser(app);

    return request(app.getHttpServer())
      .get('/admin/coupons')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        expect(res.body.meta).toBeDefined();
      });
  });
});
