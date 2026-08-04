import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

async function createAdminUser(app: INestApplication) {
  const registerRes = await request(app.getHttpServer()).post('/auth/register').send({
    email: `admin-catalog-${Date.now()}@example.com`,
    password: 'Secure1234',
    firstName: 'Admin',
    lastName: 'Test',
    acceptedTerms: true,
  });

  const userId = registerRes.body.user.id;

  // Promote to ADMIN by updating the database directly (test-only convenience).
  const prismaService = app.get(PrismaService);
  const adminRole = await prismaService.role.findUnique({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    throw new Error('ADMIN role not found');
  }
  await prismaService.user.update({
    where: { id: userId },
    data: { roleId: adminRole.id },
  });

  const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
    email: registerRes.body.user.email,
    password: 'Secure1234',
  });

  return loginRes.body.accessToken as string;
}

describe('CatalogController (e2e)', () => {
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

  it('/catalog/categories (GET) returns active categories', () => {
    return request(app.getHttpServer())
      .get('/catalog/categories')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/catalog/products (GET) returns active products', () => {
    return request(app.getHttpServer())
      .get('/catalog/products')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        expect(res.body.meta).toBeDefined();
      });
  });

  it('/catalog/products/:slug (GET) returns product detail', async () => {
    const listRes = await request(app.getHttpServer()).get('/catalog/products').expect(200);
    const firstProduct = listRes.body.data[0];

    if (!firstProduct) {
      // Seed may not be present; skip gracefully.
      return;
    }

    return request(app.getHttpServer())
      .get(`/catalog/products/${firstProduct.slug}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.slug).toBe(firstProduct.slug);
      });
  });

  it('/admin/products (POST) requires admin role', () => {
    return request(app.getHttpServer())
      .post('/admin/products')
      .send({ name: 'Test', slug: 'test', basePrice: 10000 })
      .expect(401);
  });

  it('/admin/products (POST) creates a product as admin', async () => {
    const token = await createAdminUser(app);

    return request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Producto de prueba',
        slug: `producto-prueba-${Date.now()}`,
        basePrice: 50_000,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('Producto de prueba');
      });
  });

  it('exposes SEO fields for products and categories', async () => {
    const token = await createAdminUser(app);
    const timestamp = Date.now();

    const categoryRes = await request(app.getHttpServer())
      .post('/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'SEO Category',
        slug: `seo-category-${timestamp}`,
        metaTitle: 'Category Meta Title',
        metaDescription: 'Category Meta Description',
      })
      .expect(201);

    const productRes = await request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'SEO Product',
        slug: `seo-product-${timestamp}`,
        basePrice: 50_000,
        categoryId: categoryRes.body.id,
        metaTitle: 'Product Meta Title',
        metaDescription: 'Product Meta Description',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/catalog/products/${productRes.body.slug}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.metaTitle).toBe('Product Meta Title');
        expect(res.body.metaDescription).toBe('Product Meta Description');
      });

    await request(app.getHttpServer())
      .get('/catalog/categories')
      .expect(200)
      .expect((res) => {
        const category = res.body.find((c: { slug: string }) => c.slug === categoryRes.body.slug);
        expect(category).toBeDefined();
        expect(category.metaTitle).toBe('Category Meta Title');
        expect(category.metaDescription).toBe('Category Meta Description');
      });

    await request(app.getHttpServer())
      .get(`/catalog/categories/${categoryRes.body.slug}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.metaTitle).toBe('Category Meta Title');
        expect(res.body.metaDescription).toBe('Category Meta Description');
      });

    await request(app.getHttpServer())
      .delete(`/admin/products/${productRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/admin/categories/${categoryRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('includes averageRating and reviewCount from approved reviews', async () => {
    const adminToken = await createAdminUser(app);
    const timestamp = Date.now();

    const productRes = await request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Rated Product',
        slug: `rated-product-${timestamp}`,
        basePrice: 60_000,
      })
      .expect(201);

    const reviewerRes = await request(app.getHttpServer()).post('/auth/register').send({
      email: `reviewer-${timestamp}@example.com`,
      password: 'Secure1234',
      firstName: 'Reviewer',
      lastName: 'Test',
      acceptedTerms: true,
    });
    const reviewerToken = reviewerRes.body.accessToken as string;

    const reviewRes = await request(app.getHttpServer())
      .post(`/products/${productRes.body.id}/reviews`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ rating: 4, comment: 'Great product' })
      .expect(201);

    // Before approval the rating should not be counted.
    await request(app.getHttpServer())
      .get(`/catalog/products/${productRes.body.slug}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.averageRating).toBeUndefined();
        expect(res.body.reviewCount).toBeUndefined();
      });

    await request(app.getHttpServer())
      .patch(`/admin/reviews/${reviewRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/catalog/products/${productRes.body.slug}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.averageRating).toBe(4);
        expect(res.body.reviewCount).toBe(1);
      });

    await request(app.getHttpServer())
      .get('/catalog/products')
      .query({ search: 'Rated Product' })
      .expect(200)
      .expect((res) => {
        const rated = res.body.data.find((p: { slug: string }) => p.slug === productRes.body.slug);
        expect(rated.averageRating).toBe(4);
        expect(rated.reviewCount).toBe(1);
      });

    await request(app.getHttpServer())
      .delete(`/admin/products/${productRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
