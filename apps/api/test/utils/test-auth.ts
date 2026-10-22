import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';

import { PrismaService } from '../../src/prisma/prisma.service';

export async function createUserAndGetToken(
  app: INestApplication,
  email?: string,
  password = 'Secure1234',
): Promise<{ token: string; userId: string; email: string }> {
  const userEmail = email ?? `test-${randomUUID()}@example.com`;

  const registerRes = await request(app.getHttpServer()).post('/auth/register').send({
    email: userEmail,
    password,
    firstName: 'Test',
    lastName: 'User',
    acceptedTerms: true,
  });

  if (registerRes.status === 409) {
    // Retry with a new uuid if email collided.
    return createUserAndGetToken(app, `test-${randomUUID()}@example.com`, password);
  }

  const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
    email: userEmail,
    password,
  });

  return {
    token: loginRes.body.accessToken,
    userId: registerRes.body.user.id,
    email: userEmail,
  };
}

/**
 * Marca el email como verificado directamente en DB. El link real de
 * verificación usa un token hasheado que no es recuperable, así que los tests
 * que solo necesitan un usuario verificado no pasan por el endpoint.
 */
export async function verifyUserEmail(app: INestApplication, email: string): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.user.update({
    where: { email },
    data: { emailVerified: true, emailVerifiedAt: new Date() },
  });
}

export async function createVerifiedUserAndGetToken(
  app: INestApplication,
  email?: string,
  password = 'Secure1234',
): Promise<{ token: string; userId: string; email: string }> {
  const result = await createUserAndGetToken(app, email, password);
  await verifyUserEmail(app, result.email);
  return result;
}

export async function getAdminToken(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'admin@tienda.com',
    password: 'Admin1234',
  });
  return res.body.accessToken;
}
