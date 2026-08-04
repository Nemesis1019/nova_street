import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { createUserAndGetToken, getAdminToken } from './utils/test-auth';

describe('AdminUsersController (e2e)', () => {
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

  it('lists users and updates role', async () => {
    const adminToken = await getAdminToken(app);
    const { userId, email } = await createUserAndGetToken(app);

    const listRes = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((u: { id: string }) => u.id === userId)).toBe(true);

    const detailRes = await request(app.getHttpServer())
      .get(`/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detailRes.body.email).toBe(email);
    expect(detailRes.body.role.name).toBe('CUSTOMER');

    await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleName: 'ADMIN' })
      .expect(200);

    const afterRes = await request(app.getHttpServer())
      .get(`/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(afterRes.body.role.name).toBe('ADMIN');
  });

  it('suspends and unsuspends a user', async () => {
    const adminToken = await getAdminToken(app);
    const { userId } = await createUserAndGetToken(app);

    const suspendRes = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Incumplimiento de términos' })
      .expect(200);

    expect(suspendRes.body.isSuspended).toBe(true);
    expect(suspendRes.body.suspendedReason).toBe('Incumplimiento de términos');

    const unsuspendRes = await request(app.getHttpServer())
      .patch(`/admin/users/${userId}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(unsuspendRes.body.isSuspended).toBe(false);
    expect(unsuspendRes.body.suspendedReason).toBeNull();
  });
});
