import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { buildCarrierTrackingUrl } from '../common/tracking.util';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../payment/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTrackingDto } from './dto/update-tracking.dto';

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly paymentService: PaymentService,
  ) {}

  async findAll(query: { page: number; limit: number; status?: OrderStatus; paymentStatus?: PaymentStatus; search?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (search) {
      where.user = {
        email: { contains: search, mode: 'insensitive' },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: {
            include: {
              productVariant: { include: { product: { select: { name: true } } } },
              customDesign: { include: { designTemplate: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: {
          include: {
            productVariant: { include: { product: { select: { name: true } } } },
            customDesign: { include: { designTemplate: { select: { name: true } } } },
          },
        },
        coupon: { select: { code: true, discountType: true, discountValue: true } },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const addresses = await this.prisma.address.findMany({
      where: { id: { in: [order.shippingAddressId, order.billingAddressId] } },
    });

    const shippingAddress = addresses.find((a) => a.id === order.shippingAddressId);
    const billingAddress = addresses.find((a) => a.id === order.billingAddressId);

    return { ...order, shippingAddress, billingAddress };
  }

  async updateStatus(id: string, status: OrderStatus, adminUserId?: string) {
    const existing = await this.findOne(id);

    const data: Record<string, unknown> = { status };
    if (status === OrderStatus.SHIPPED) {
      data.shippedAt = new Date();
    }

    const order = await this.prisma.order.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, email: true } },
        items: true,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_STATUS',
      entity: 'Order',
      entityId: id,
      before: { status: existing.status },
      after: { status: order.status, shippedAt: order.shippedAt },
    });

    if (order.user?.email) {
      await this.emailService.sendOrderStatusUpdate(
        order.user.email,
        order.id,
        order.status,
        order.trackingNumber ?? undefined,
        order.carrier ?? undefined,
        order.trackingUrl ?? undefined,
      );
    }

    return order;
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus, adminUserId?: string) {
    const existing = await this.findOne(id);

    const order = await this.prisma.order.update({
      where: { id },
      data: { paymentStatus },
      include: {
        user: { select: { id: true, email: true } },
        items: true,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_PAYMENT_STATUS',
      entity: 'Order',
      entityId: id,
      before: { paymentStatus: existing.paymentStatus },
      after: { paymentStatus: order.paymentStatus },
    });

    return order;
  }

  async updateTracking(id: string, dto: UpdateTrackingDto, adminUserId?: string) {
    const existing = await this.findOne(id);

    const carrier = dto.carrier !== undefined ? dto.carrier : existing.carrier;
    const trackingNumber = dto.trackingNumber !== undefined ? dto.trackingNumber : existing.trackingNumber;
    let trackingUrl = dto.trackingUrl;

    if (carrier && trackingNumber && !trackingUrl) {
      trackingUrl = buildCarrierTrackingUrl(carrier, trackingNumber);
    }

    const data: Prisma.OrderUpdateInput = {};
    if (dto.trackingNumber !== undefined) data.trackingNumber = dto.trackingNumber;
    if (dto.carrier !== undefined) data.carrier = dto.carrier;
    if (trackingUrl !== undefined) {
      data.trackingUrl = trackingUrl ?? null;
    }

    const order = await this.prisma.order.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, email: true } },
        items: true,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_TRACKING',
      entity: 'Order',
      entityId: id,
      before: { trackingNumber: existing.trackingNumber, carrier: existing.carrier, trackingUrl: existing.trackingUrl },
      after: { trackingNumber: order.trackingNumber, carrier: order.carrier, trackingUrl: order.trackingUrl },
    });

    return order;
  }

  async assignOrder(id: string, assignedToId: string | undefined, adminUserId?: string) {
    const existing = await this.findOne(id);

    if (assignedToId) {
      const user = await this.prisma.user.findUnique({ where: { id: assignedToId } });
      if (!user) {
        throw new NotFoundException('Assignee user not found');
      }
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: { assignedToId: assignedToId ?? null },
      include: {
        user: { select: { id: true, email: true } },
        items: true,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'ASSIGN_ORDER',
      entity: 'Order',
      entityId: id,
      before: { assignedToId: existing.assignedToId },
      after: { assignedToId: order.assignedToId },
    });

    return order;
  }

  async updateNotes(id: string, adminNotes: string | undefined, adminUserId?: string) {
    const existing = await this.findOne(id);

    const order = await this.prisma.order.update({
      where: { id },
      data: { adminNotes: adminNotes ?? null },
      include: {
        user: { select: { id: true, email: true } },
        items: true,
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_NOTES',
      entity: 'Order',
      entityId: id,
      before: { adminNotes: existing.adminNotes },
      after: { adminNotes: order.adminNotes },
    });

    return order;
  }

  async cancelOrder(id: string, reason: string, adminUserId?: string) {
    const existing = await this.findOne(id);

    if (existing.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if (existing.status === OrderStatus.REFUNDED || existing.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a refunded or delivered order');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
        include: {
          user: { select: { id: true, email: true } },
          items: true,
        },
      });

      await this.releaseStockReservations(tx, id);

      return updated;
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'CANCEL_ORDER',
      entity: 'Order',
      entityId: id,
      before: { status: existing.status },
      after: { status: order.status, cancellationReason: order.cancellationReason, cancelledAt: order.cancelledAt },
    });

    return order;
  }

  async refundOrder(id: string, reason: string, amount?: number, adminUserId?: string) {
    const existing = await this.findOne(id);

    if (existing.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Order is already refunded');
    }

    const refundAmount = amount ?? existing.totalAmount;
    const refundResult = await this.paymentService.refundOrder(id, refundAmount, reason, adminUserId);

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.REFUNDED,
          paymentStatus: PaymentStatus.REFUNDED,
          refundReason: reason,
          refundedAt: new Date(),
        },
        include: {
          user: { select: { id: true, email: true } },
          items: true,
        },
      });

      await this.releaseStockReservations(tx, id);

      return updated;
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'REFUND_ORDER',
      entity: 'Order',
      entityId: id,
      before: { status: existing.status, paymentStatus: existing.paymentStatus },
      after: {
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundReason: order.refundReason,
        refundedAt: order.refundedAt,
        refundId: refundResult.refundId,
        refundSuccess: refundResult.success,
      },
    });

    return { ...order, refund: refundResult };
  }

  async findTimeline(id: string) {
    await this.findOne(id);

    const logs = await this.auditService.findMany({
      entity: 'Order',
      entityId: id,
      page: 1,
      limit: 100,
    });

    return logs;
  }

  private async releaseStockReservations(tx: Prisma.TransactionClient, orderId: string) {
    const reservations = await tx.stockReservation.findMany({
      where: { orderId, status: 'ACTIVE' },
      include: { inventory: true },
    });

    for (const reservation of reservations) {
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED' },
      });

      await tx.inventory.update({
        where: { id: reservation.inventoryId },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      });
    }
  }
}
