import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { getAdminToken } from './utils/test-auth';

async function createTestAsset(app: INestApplication, token: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/admin/assets/upload')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.from('fake-image-data'), 'test.png')
    .expect(201);

  return res.body.id;
}

describe('AdminCatalogController (e2e)', () => {
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

  it('manages product images: add, reorder and remove', async () => {
    const token = await getAdminToken(app);

    const categoryRes = await request(app.getHttpServer())
      .post('/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Test ${Date.now()}`, slug: `test-${Date.now()}`, isActive: true })
      .expect(201);

    const productRes = await request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Producto test ${Date.now()}`,
        slug: `producto-test-${Date.now()}`,
        description: 'Test',
        basePrice: 10_000,
        categoryId: categoryRes.body.id,
        isActive: true,
      })
      .expect(201);

    const productId = productRes.body.id;

    const assetIdA = await createTestAsset(app, token);
    const assetIdB = await createTestAsset(app, token);

    const addResA = await request(app.getHttpServer())
      .post(`/admin/products/${productId}/images`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assetId: assetIdA })
      .expect(201);

    const imageAId = addResA.body.id;

    const addResB = await request(app.getHttpServer())
      .post(`/admin/products/${productId}/images`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assetId: assetIdB })
      .expect(201);

    const imageBId = addResB.body.id;

    const detailBefore = await request(app.getHttpServer())
      .get(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const imageIdsBefore = detailBefore.body.images.map((i: { id: string }) => i.id);
    expect(imageIdsBefore).toEqual([imageAId, imageBId]);

    await request(app.getHttpServer())
      .patch(`/admin/products/${productId}/images/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ imageIds: [imageBId, imageAId] })
      .expect(200);

    const detailAfter = await request(app.getHttpServer())
      .get(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const imageIdsAfter = detailAfter.body.images.map((i: { id: string }) => i.id);
    expect(imageIdsAfter).toEqual([imageBId, imageAId]);

    await request(app.getHttpServer())
      .delete(`/admin/products/${productId}/images/${imageAId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const detailFinal = await request(app.getHttpServer())
      .get(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const imageIdsFinal = detailFinal.body.images.map((i: { id: string }) => i.id);
    expect(imageIdsFinal).toEqual([imageBId]);
  });
});
