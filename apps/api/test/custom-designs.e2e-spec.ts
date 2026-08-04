import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createVerifiedUserAndGetToken, getAdminToken } from './utils/test-auth';

async function ensureDesignTemplate(app: INestApplication) {
  const prisma = app.get(PrismaService);
  const existing = await prisma.designTemplate.findFirst();
  if (existing) return existing;

  return prisma.designTemplate.create({
    data: {
      name: 'Remera test',
      garmentType: 'Remera',
      baseImageUrl: 'https://placehold.co/600x400/png',
      printAreas: JSON.stringify({ front: { x: 100, y: 100, width: 300, height: 300 } }),
      basePrice: 45_000,
      availableColors: ['Preta', 'Blanca'],
      availableSizes: ['S', 'M'],
      stockMode: 'MADE_TO_ORDER',
      productionLeadTimeDays: 7,
    },
  });
}

describe('CustomDesignsController (e2e)', () => {
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

  it('creates, submits and admin approves a custom design', async () => {
    const { token, userId } = await createVerifiedUserAndGetToken(app);
    const adminToken = await getAdminToken(app);
    const template = await ensureDesignTemplate(app);

    const createRes = await request(app.getHttpServer())
      .post('/custom-designs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        designTemplateId: template.id,
        color: 'Preta',
        size: 'M',
        surcharge: 5_000,
        elements: [
          {
            type: 'TEXT',
            textContent: 'Test',
            fontSize: 24,
            fill: '#000000',
            positionX: 120,
            positionY: 120,
            scale: 1,
            rotation: 0,
            zIndex: 1,
          },
        ],
      })
      .expect(201);

    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.status).toBe('DRAFT');
    expect(createRes.body.userId).toBe(userId);

    const designId = createRes.body.id;

    await request(app.getHttpServer())
      .get('/custom-designs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: designId })]));
      });

    await request(app.getHttpServer())
      .patch(`/custom-designs/${designId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        previewImageUrl: 'https://placehold.co/300x300/png?text=Preview',
        surcharge: 7_000,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.surcharge).toBe(7_000);
        expect(res.body.previewImageUrl).toBe('https://placehold.co/300x300/png?text=Preview');
      });

    await request(app.getHttpServer())
      .post(`/custom-designs/${designId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('PENDING_REVIEW');
      });

    const adminListRes = await request(app.getHttpServer())
      .get('/custom-designs/admin/all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminListRes.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: designId, status: 'PENDING_REVIEW' })]),
    );

    await request(app.getHttpServer())
      .patch(`/custom-designs/admin/${designId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/custom-designs/${designId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('APPROVED');
      });
  });

  it('rejects a custom design with a reason', async () => {
    const { token } = await createVerifiedUserAndGetToken(app);
    const adminToken = await getAdminToken(app);
    const template = await ensureDesignTemplate(app);

    const createRes = await request(app.getHttpServer())
      .post('/custom-designs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        designTemplateId: template.id,
        color: 'Preta',
        size: 'M',
        elements: [{ type: 'TEXT', textContent: 'X', fontSize: 24, fill: '#000000', positionX: 0, positionY: 0, scale: 1, rotation: 0, zIndex: 1 }],
      })
      .expect(201);

    const designId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/custom-designs/${designId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/custom-designs/admin/${designId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' })
      .expect(400);

    const rejectRes = await request(app.getHttpServer())
      .patch(`/custom-designs/admin/${designId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', rejectionReason: 'No se puede imprimir este contenido' })
      .expect(200);

    expect(rejectRes.body.status).toBe('REJECTED');
    expect(rejectRes.body.rejectionReason).toBe('No se puede imprimir este contenido');
    expect(rejectRes.body.reviewedAt).toBeDefined();
  });

  it('adds an approved custom design to the cart', async () => {
    const { token } = await createVerifiedUserAndGetToken(app);
    const adminToken = await getAdminToken(app);
    const template = await ensureDesignTemplate(app);

    const createRes = await request(app.getHttpServer())
      .post('/custom-designs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        designTemplateId: template.id,
        color: 'Blanca',
        size: 'S',
        surcharge: 3_000,
        elements: [
          {
            type: 'CLIPART',
            assetUrl: 'https://placehold.co/100x100/png?text=Star',
            positionX: 150,
            positionY: 150,
            scale: 1,
            rotation: 0,
            zIndex: 1,
          },
        ],
      })
      .expect(201);

    const designId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/custom-designs/${designId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/custom-designs/admin/${designId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/custom-designs/${designId}/add-to-cart`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 })
      .expect(201);

    const cartRes = await request(app.getHttpServer())
      .get('/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(cartRes.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CUSTOM',
          customDesignId: designId,
          quantity: 2,
        }),
      ]),
    );
  });
});
