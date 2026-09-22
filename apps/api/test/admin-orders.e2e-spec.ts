import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import request from 'supertest';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { createVerifiedUserAndGetToken, getAdminToken } from './utils/test-auth';

describe('AdminOrdersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists, filters and updates orders', async () => {
    const adminToken = await getAdminToken(app);
    const { userId } = await createVerifiedUserAndGetToken(app);

    const category = await prisma.category.create({
      data: { name: `Cat ${Date.now()}`, slug: `cat-${Date.now()}`, isActive: true },
    });

    const product = await prisma.product.create({
      data: {
        name: `Product ${Date.now()}`,
        slug: `product-${Date.now()}`,
        description: 'Test',
        basePrice: 10_000,
        categoryId: category.id,
        isActive: true,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-${Date.now()}`,
        size: 'M',
        color: 'Negro',
        stockMode: 'TRACKED',
        inventory: { create: { quantity: 10 } },
      },
    });

    const address = await prisma.address.create({
      data: {
        userId,
        label: 'Casa',
        line1: 'Av Siempre Viva 123',
        city: 'Montevideo',
        state: 'Montevideo',
        zipCode: '11800',
        country: 'UY',
        phone: '099123456',
      },
    });

    const order = await prisma.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 10_000,
        shippingCost: 500,
        totalAmount: 10_500,
        shippingAddressId: address.id,
        billingAddressId: address.id,
        items: {
          create: {
            type: 'STANDARD',
            productVariantId: variant.id,
            quantity: 1,
            unitPrice: 10_000,
          },
        },
      },
    });

    const listRes = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((o: { id: string }) => o.id === order.id)).toBe(true);

    const detailRes = await request(app.getHttpServer())
      .get(`/admin/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detailRes.body.id).toBe(order.id);
    expect(detailRes.body.status).toBe(OrderStatus.PENDING_PAYMENT);

    await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrderStatus.PAID })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/payment-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: PaymentStatus.PAID })
      .expect(200);

    const trackingRes = await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/tracking`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trackingNumber: 'ABC123456', carrier: 'Correo', trackingUrl: 'https://courier.example.com/ABC123456' })
      .expect(200);

    expect(trackingRes.body.trackingNumber).toBe('ABC123456');
    expect(trackingRes.body.carrier).toBe('Correo');
    expect(trackingRes.body.trackingUrl).toBe('https://courier.example.com/ABC123456');

    const autoTrackingRes = await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/tracking`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trackingNumber: 'XYZ999', carrier: 'Andreani' })
      .expect(200);

    expect(autoTrackingRes.body.trackingNumber).toBe('XYZ999');
    expect(autoTrackingRes.body.carrier).toBe('Andreani');
    expect(autoTrackingRes.body.trackingUrl).toBe('https://www.andreani.com/envio/XYZ999');

    const shippedRes = await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrderStatus.SHIPPED })
      .expect(200);

    expect(shippedRes.body.status).toBe(OrderStatus.SHIPPED);
    expect(shippedRes.body.shippedAt).toBeTruthy();

    const filteredRes = await request(app.getHttpServer())
      .get('/admin/orders')
      .query({ status: OrderStatus.SHIPPED })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(filteredRes.body.data.some((o: { id: string }) => o.id === order.id)).toBe(true);
  });

  it('assigns an operator, updates notes, cancels and refunds an order with audit timeline', async () => {
    const adminToken = await getAdminToken(app);
    const { userId } = await createVerifiedUserAndGetToken(app);
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@tienda.com' },
      include: { role: { select: { name: true } } },
    });

    const category = await prisma.category.create({
      data: { name: `Cat ${Date.now()}`, slug: `cat-${Date.now()}`, isActive: true },
    });

    const product = await prisma.product.create({
      data: {
        name: `Product ${Date.now()}`,
        slug: `product-${Date.now()}`,
        description: 'Test',
        basePrice: 10_000,
        categoryId: category.id,
        isActive: true,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-${Date.now()}`,
        size: 'M',
        color: 'Negro',
        stockMode: 'TRACKED',
        inventory: { create: { quantity: 10 } },
      },
    });

    const address = await prisma.address.create({
      data: {
        userId,
        label: 'Casa',
        line1: 'Av Siempre Viva 123',
        city: 'Montevideo',
        state: 'Montevideo',
        zipCode: '11800',
        country: 'UY',
        phone: '099123456',
      },
    });

    const order = await prisma.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 10_000,
        shippingCost: 500,
        totalAmount: 10_500,
        shippingAddressId: address.id,
        billingAddressId: address.id,
        items: {
          create: {
            type: 'STANDARD',
            productVariantId: variant.id,
            quantity: 2,
            unitPrice: 10_000,
          },
        },
      },
    });

    await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: adminUser?.id })
      .expect(200);

    const notesRes = await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminNotes: 'Llamar al cliente antes del envío' })
      .expect(200);

    expect(notesRes.body.adminNotes).toBe('Llamar al cliente antes del envío');

    const cancelRes = await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Cliente solicitó cancelación' })
      .expect(200);

    expect(cancelRes.body.status).toBe(OrderStatus.CANCELLED);
    expect(cancelRes.body.cancellationReason).toBe('Cliente solicitó cancelación');

    const inventoryAfterCancel = await prisma.inventory.findUnique({
      where: { productVariantId: variant.id },
    });
    expect(inventoryAfterCancel?.reservedQuantity).toBe(0);

    const timelineRes = await request(app.getHttpServer())
      .get(`/admin/orders/${order.id}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(timelineRes.body.data.length).toBeGreaterThanOrEqual(3);
    const actions = timelineRes.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toContain('ASSIGN_ORDER');
    expect(actions).toContain('UPDATE_NOTES');
    expect(actions).toContain('CANCEL_ORDER');

    const refundRes = await request(app.getHttpServer())
      .patch(`/admin/orders/${order.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Reembolso por error de cobro' })
      .expect(200);

    expect(refundRes.body.status).toBe(OrderStatus.REFUNDED);
    expect(refundRes.body.paymentStatus).toBe(PaymentStatus.REFUNDED);
    expect(refundRes.body.refundReason).toBe('Reembolso por error de cobro');
  });

  it('bulk updates status for selected orders', async () => {
    const adminToken = await getAdminToken(app);
    const { userId } = await createVerifiedUserAndGetToken(app);

    const address = await prisma.address.create({
      data: {
        userId,
        label: 'Casa',
        line1: 'Av Siempre Viva 123',
        city: 'Montevideo',
        state: 'Montevideo',
        zipCode: '11800',
        country: 'UY',
        phone: '099123456',
      },
    });

    const order = await prisma.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 10_000,
        shippingCost: 500,
        totalAmount: 10_500,
        shippingAddressId: address.id,
        billingAddressId: address.id,
      },
    });

    const res = await request(app.getHttpServer())
      .post('/admin/orders/bulk/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrderStatus.PAID, ids: [order.id] })
      .expect(201);

    expect(res.body.status).toBe(OrderStatus.PAID);
    expect(res.body.count).toBe(1);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe(OrderStatus.PAID);
  });
});
