import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { EmailService } from './../src/email/email.service';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let lastVerificationUrl: string | undefined;
  let sendEmailVerificationMock: jest.Mock;

  beforeEach(async () => {
    lastVerificationUrl = undefined;
    sendEmailVerificationMock = jest
      .fn()
      .mockImplementation(async (_email: string, _firstName: string, verificationUrl: string) => {
        lastVerificationUrl = verificationUrl;
      });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendWelcome: jest.fn().mockResolvedValue(undefined),
        sendEmailVerification: sendEmailVerificationMock,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/register (POST) creates a user and returns access token in body and refresh token in HTTP-only cookie', () => {
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
        expect(res.body.verificationEmailSent).toBe(true);
        expect(res.body.refreshToken).toBeUndefined();
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        expect(cookieArray.some((c: string) => c.includes('refresh_token'))).toBe(true);
      });
  });

  it('/auth/login (POST) returns access token in body and refresh token in HTTP-only cookie', async () => {
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
        expect(res.body.refreshToken).toBeUndefined();
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        expect(cookieArray.some((c: string) => c.includes('refresh_token'))).toBe(true);
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

  it('/auth/register (POST) rejects passwords that do not meet the policy', async () => {
    const email = `weak-pw-${Date.now()}@example.com`;

    // Sin mayúscula
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'weakpassword1',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
      })
      .expect(400);

    // Sin número
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'WeakPassword',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
      })
      .expect(400);
  });

  it('/auth/verify-email (POST) verifies the email with the token sent by email', async () => {
    const email = `verify-link-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Secure1234',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
      })
      .expect(201);

    expect(lastVerificationUrl).toBeDefined();
    const token = new URL(lastVerificationUrl as string).searchParams.get('token');
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(200)
      .expect((res) => {
        expect(res.body.user.emailVerified).toBe(true);
      });

    // El token es de un solo uso
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(401);
  });

  it('/auth/resend-verification (POST) invalidates previous tokens', async () => {
    const email = `resend-${Date.now()}@example.com`;

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Secure1234',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
      })
      .expect(201);

    const firstToken = new URL(lastVerificationUrl as string).searchParams.get('token');

    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
      .expect(200);

    const secondToken = new URL(lastVerificationUrl as string).searchParams.get('token');
    expect(secondToken).not.toBe(firstToken);

    // El token anterior queda invalidado
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: firstToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: secondToken })
      .expect(200);
  });

  it('/auth/resend-verification (POST) returns 503 when the email provider fails', async () => {
    const email = `resend-fail-${Date.now()}@example.com`;

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Secure1234',
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
      })
      .expect(201);

    sendEmailVerificationMock.mockRejectedValueOnce(new Error('provider down'));

    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
      .expect(503)
      .expect((res) => {
        // Los e2e no aplican HttpExceptionTranslationFilter (solo está en main.ts).
        expect(JSON.stringify(res.body.message)).toContain('Could not send verification email');
      });
  });
});
