import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma, RefundStatus } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { PaymentService } from '../payment/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundDto } from './dto/create-refund.dto';

const REFUND_INCLUDE = {
  order: { select: { id: true, totalAmount: true, status: true, paymentStatus: true } },
  createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.RefundInclude;

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly paymentService: PaymentService,
  ) {}

  async findAll(query: { page: number; limit: number; orderId?: string; status?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.orderId) {
      where.orderId = query.orderId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: REFUND_INCLUDE,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        ...REFUND_INCLUDE,
        payment: { select: { id: true, provider: true, providerTransactionId: true } },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return refund;
  }

  /** Crea un reembolso manual; queda PENDING hasta aprobarlo. */
  async createManual(dto: CreateRefundDto, adminUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const amount = dto.amount ?? order.totalAmount;
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    if (amount > order.totalAmount) {
      throw new BadRequestException('Amount exceeds the order total');
    }

    const payment = order.payments.find(
      (p) => p.status === PaymentStatus.PAID || p.status === PaymentStatus.PENDING,
    );

    const refund = await this.prisma.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment?.id ?? null,
        amount,
        reason: dto.reason,
        status: RefundStatus.PENDING,
        createdById: adminUserId ?? null,
      },
      include: REFUND_INCLUDE,
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'CREATE_REFUND',
      entity: 'Refund',
      entityId: refund.id,
      after: { orderId: order.id, amount, reason: dto.reason },
    });

    return refund;
  }

  /** Aprueba y procesa un reembolso pendiente o fallido contra el proveedor. */
  async approve(id: string, adminUserId?: string) {
    const refund = await this.findOne(id);
    if (refund.status === RefundStatus.COMPLETED) {
      throw new BadRequestException('Refund is already completed');
    }

    const processed = await this.paymentService.processExistingRefund(id);

    if (processed.status === RefundStatus.COMPLETED) {
      await this.settleOrderIfFullyRefunded(processed.orderId, adminUserId);
    }

    await this.auditService.log({
      userId: adminUserId,
      action: 'APPROVE_REFUND',
      entity: 'Refund',
      entityId: id,
      before: { status: refund.status },
      after: { status: processed.status, providerRefundId: processed.providerRefundId },
    });

    return processed;
  }

  /** Rechaza un reembolso pendiente (queda FAILED). */
  async reject(id: string, adminUserId?: string) {
    const refund = await this.findOne(id);
    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be rejected');
    }

    const updated = await this.prisma.refund.update({
      where: { id },
      data: { status: RefundStatus.FAILED },
      include: REFUND_INCLUDE,
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'REJECT_REFUND',
      entity: 'Refund',
      entityId: id,
      before: { status: refund.status },
      after: { status: updated.status },
    });

    return updated;
  }

  /** Reintenta un reembolso fallido. */
  async retry(id: string, adminUserId?: string) {
    const refund = await this.findOne(id);
    if (refund.status !== RefundStatus.FAILED) {
      throw new BadRequestException('Only failed refunds can be retried');
    }

    await this.prisma.refund.update({ where: { id }, data: { status: RefundStatus.PENDING } });

    return this.approve(id, adminUserId);
  }

  /**
   * Si el total de reembolsos COMPLETADOS cubre el total de la orden,
   * la marca como REFUNDED y libera las reservas de stock activas.
   */
  private async settleOrderIfFullyRefunded(orderId: string, adminUserId?: string) {
    const [order, completed] = await Promise.all([
      this.prisma.order.findUnique({ where: { id: orderId } }),
      this.prisma.refund.aggregate({
        where: { orderId, status: RefundStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    if (!order || order.status === OrderStatus.REFUNDED) {
      return;
    }

    const refunded = completed._sum.amount ?? 0;
    if (refunded < order.totalAmount) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REFUNDED,
          paymentStatus: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
        },
      });

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
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'ORDER_FULLY_REFUNDED',
      entity: 'Order',
      entityId: orderId,
      after: { refundedAmount: refunded, totalAmount: order.totalAmount },
    });
  }
}
