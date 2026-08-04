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

describe('StoreConfigController (e2e)', () => {
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

  it('/store-config (GET) returns default config', () => {
    return request(app.getHttpServer())
      .get('/store-config')
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBeDefined();
        expect(res.body.primaryColor).toBeDefined();
      });
  });

  it('/store-config (PATCH) updates config as admin', async () => {
    const token = await createAdminUser(app);

    return request(app.getHttpServer())
      .patch('/store-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tienda Transversal', primaryColor: '#ff0000' })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('Tienda Transversal');
        expect(res.body.primaryColor).toBe('#ff0000');
      });
  });

  it('updates maintenance mode and feature flags as admin', async () => {
    const token = await createAdminUser(app);

    await request(app.getHttpServer())
      .patch('/store-config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        maintenanceMode: true,
        maintenanceMessage: 'Volvemos en breve',
        enableCustomDesigns: false,
        enableNewsletter: false,
        enableCatalogFilters: false,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.maintenanceMode).toBe(true);
        expect(res.body.maintenanceMessage).toBe('Volvemos en breve');
        expect(res.body.enableCustomDesigns).toBe(false);
        expect(res.body.enableNewsletter).toBe(false);
        expect(res.body.enableCatalogFilters).toBe(false);
      });

    const publicRes = await request(app.getHttpServer()).get('/store-config').expect(200);
    expect(publicRes.body.maintenanceMode).toBe(true);
    expect(publicRes.body.enableCustomDesigns).toBe(false);
  });

  it('updates template and templateConfig as admin', async () => {
    const token = await createAdminUser(app);

    return request(app.getHttpServer())
      .patch('/store-config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        template: 'storefront',
        templateConfig: JSON.stringify({ heroLayout: 'minimal', showMarquee: false }),
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.template).toBe('storefront');
        expect(res.body.templateConfig).toEqual({ heroLayout: 'minimal', showMarquee: false });
      });
  });
});
