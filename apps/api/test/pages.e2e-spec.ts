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

describe('PagesController (e2e)', () => {
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

  it('/pages (GET) returns empty list when no pages exist', () => {
    return request(app.getHttpServer())
      .get('/pages')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toEqual([]);
      });
  });

  it('creates, exposes, updates and deletes pages as admin', async () => {
    const token = await createAdminUser(app);

    const createRes = await request(app.getHttpServer())
      .post('/admin/pages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slug: 'terminos',
        title: 'Términos y condiciones',
        content: '<p>Estos son los términos.</p>',
        metaTitle: 'Términos',
        metaDescription: 'Términos de uso',
        isVisible: true,
        sortOrder: 1,
      })
      .expect(201);

    const pageId = createRes.body.id;
    expect(createRes.body.slug).toBe('terminos');

    await request(app.getHttpServer())
      .get('/pages')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].slug).toBe('terminos');
      });

    await request(app.getHttpServer())
      .get('/pages/terminos')
      .expect(200)
      .expect((res) => {
        expect(res.body.title).toBe('Términos y condiciones');
        expect(res.body.content).toContain('términos');
      });

    await request(app.getHttpServer())
      .patch(`/admin/pages/${pageId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Términos actualizados' })
      .expect(200)
      .expect((res) => {
        expect(res.body.title).toBe('Términos actualizados');
      });

    await request(app.getHttpServer())
      .delete(`/admin/pages/${pageId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer()).get('/pages/terminos').expect(404);
  });

  it('does not expose invisible pages publicly', async () => {
    const token = await createAdminUser(app);

    const createRes = await request(app.getHttpServer())
      .post('/admin/pages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slug: 'borrador',
        title: 'Borrador',
        content: 'Contenido oculto',
        isVisible: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/pages')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toEqual([]);
      });

    await request(app.getHttpServer()).get('/pages/borrador').expect(404);

    await request(app.getHttpServer())
      .delete(`/admin/pages/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
