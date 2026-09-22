import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { getAdminToken } from './utils/test-auth';

describe('AdminCatalogProductivityController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    token = await getAdminToken(app);
  });

  beforeEach(async () => {
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await app.close();
  });

  async function createCategory() {
    return prisma.category.create({
      data: { name: 'Test', slug: `test-${Date.now()}`, isActive: true },
    });
  }

  async function createProduct(categoryId: string, overrides: Partial<{ name: string; slug: string; isActive: boolean }> = {}) {
    return prisma.product.create({
      data: {
        name: overrides.name ?? 'Test Product',
        slug: overrides.slug ?? `test-${Date.now()}`,
        basePrice: 100,
        categoryId,
        isActive: overrides.isActive ?? true,
      },
    });
  }

  it('POST /admin/products/bulk should activate selected products', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { isActive: false });

    await request(app.getHttpServer())
      .post('/admin/products/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'activate', ids: [product.id] })
      .expect(201);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated?.isActive).toBe(true);
  });

  it('POST /admin/products/bulk should delete selected products', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id);

    await request(app.getHttpServer())
      .post('/admin/products/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'delete', ids: [product.id] })
      .expect(201);

    const found = await prisma.product.findUnique({ where: { id: product.id } });
    expect(found).toBeNull();
  });

  it('POST /admin/products/import should create products from CSV', async () => {
    const category = await createCategory();
    const csv = `name,slug,description,basePrice,categoryId,metaTitle,metaDescription,isActive\nImported,imported-1,Desc,200,${category.id},Meta,Meta,true\nImported 2,imported-2,Desc,300,${category.id},Meta,Meta,true`;

    const res = await request(app.getHttpServer())
      .post('/admin/products/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), 'products.csv')
      .expect(201);

    expect(res.body.created).toBe(2);
    expect(res.body.errors).toHaveLength(0);

    const products = await prisma.product.findMany({ where: { slug: { startsWith: 'imported' } } });
    expect(products).toHaveLength(2);
  });

  it('GET /admin/search should find products by name', async () => {
    const category = await createCategory();
    const product = await createProduct(category.id, { name: 'Unique Searchable Product', slug: `unique-${Date.now()}` });

    const res = await request(app.getHttpServer())
      .get('/admin/search?q=Unique')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].id).toBe(product.id);
  });
});
