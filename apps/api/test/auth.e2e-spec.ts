import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
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

  it('/auth/register (POST) creates a user and returns tokens', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `auth-test-${Date.now()}@example.com`,
        password: 'Secure1234',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.user).toBeDefined();
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
      });
  });

  it('/auth/login (POST) returns tokens for valid credentials', async () => {
    const email = `login-test-${Date.now()}@example.com`;
    const password = 'Secure1234';

    await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      acceptedTerms: true,
    });

    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
      });
  });

  it('/auth/change-password (PATCH) updates password and invalidates old one', async () => {
    const email = `change-pw-test-${Date.now()}@example.com`;
    const oldPassword = 'Secure1234';
    const newPassword = 'NewSecure5678';

    const registerRes = await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password: oldPassword,
      firstName: 'Test',
      lastName: 'User',
      acceptedTerms: true,
    });

    const token = registerRes.body.accessToken;

    await request(app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: oldPassword, newPassword })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: oldPassword })
      .expect(401);

    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: newPassword })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });

  it('/auth/login (POST) rejects suspended users', async () => {
    const email = `suspended-test-${Date.now()}@example.com`;
    const password = 'Secure1234';

    await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      acceptedTerms: true,
    });

    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { email },
      data: { isSuspended: true, suspendedReason: 'Test suspension' },
    });

    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('suspended');
      });
  });
});
