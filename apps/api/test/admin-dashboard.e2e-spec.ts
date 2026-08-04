import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { getAdminToken } from './utils/test-auth';

describe('AdminDashboardController (e2e)', () => {
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

  it('returns dashboard metrics', async () => {
    const token = await getAdminToken(app);

    const res = await request(app.getHttpServer())
      .get('/admin/dashboard/metrics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(typeof res.body.totalOrders).toBe('number');
    expect(typeof res.body.totalRevenue).toBe('number');
    expect(typeof res.body.totalUsers).toBe('number');
    expect(Array.isArray(res.body.recentOrders)).toBe(true);
  });

  it('returns daily trends for the last 7 days', async () => {
    const token = await getAdminToken(app);

    const res = await request(app.getHttpServer())
      .get('/admin/dashboard/trends')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(7);

    for (const point of res.body.data) {
      expect(typeof point.date).toBe('string');
      expect(typeof point.orders).toBe('number');
      expect(typeof point.revenue).toBe('number');
    }
  });
});
