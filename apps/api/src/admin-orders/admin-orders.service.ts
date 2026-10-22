import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CartItemType, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

import { buildAssetUrl } from '../assets/asset-url.util';
import { AuditService } from '../audit/audit.service';
import { buildCarrierTrackingUrl } from '../common/tracking.util';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../payment/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
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
              productVariant: {
                include: {
                  product: {
                    select: {
                      name: true,
                      images: {
                        orderBy: { sortOrder: 'asc' },
                        take: 1,
                        include: { asset: { select: { bucket: true, objectKey: true } } },
                      },
                    },
                  },
                  images: {
                    orderBy: { sortOrder: 'asc' },
                    take: 1,
                    include: { asset: { select: { bucket: true, objectKey: true } } },
                  },
                },
              },
              customDesign: { include: { designTemplate: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((order) => ({
        ...order,
        items: this.mapItemImages(order.items),
      })),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: {
                      orderBy: { sortOrder: 'asc' },
                      take: 1,
                      include: { asset: { select: { bucket: true, objectKey: true } } },
                    },
                  },
                },
                images: {
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                  include: { asset: { select: { bucket: true, objectKey: true } } },
                },
              },
            },
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

    return {
      ...order,
      items: this.mapItemImages(order.items),
      shippingAddress,
      billingAddress,
    };
  }

  /** Agrega la imagen (variante o producto) a los ítems de una orden. */
  private mapItemImages<
    T extends {
      productVariant?: {
        images?: Array<{ asset: { bucket: string; objectKey: string } | null }>;
        product?: { images?: Array<{ asset: { bucket: string; objectKey: string } | null }> };
      } | null;
    },
  >(items: T[]) {
    return items.map((item) => {
      const image =
        item.productVariant?.images?.[0]?.asset ?? item.productVariant?.product?.images?.[0]?.asset;
      return {
        ...item,
        imageUrl: image ? buildAssetUrl(image.bucket, image.objectKey) : undefined,
      };
    });
  }

  /**
   * Crea una orden manual para un cliente existente (por id o email) con variantes
   * del catálogo. Es una carga administrativa: no reserva stock ni crea pagos.
   */
  async createManualOrder(dto: CreateManualOrderDto, adminUserId?: string) {
    const user = dto.userId
      ? await this.prisma.user.findUnique({ where: { id: dto.userId } })
      : dto.email
        ? await this.prisma.user.findUnique({ where: { email: dto.email } })
        : null;

    if (!user) {
      throw new NotFoundException('Customer not found');
    }

    // Dirección de envío/facturación: guardada, nueva o la default del cliente.
    let shippingAddressId: string;
    if (dto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: { id: dto.addressId, userId: user.id },
      });
      if (!address) {
        throw new BadRequestException('Address does not belong to the customer');
      }
      shippingAddressId = address.id;
    } else if (dto.address) {
      const created = await this.prisma.address.create({
        data: {
          userId: user.id,
          label: dto.address.label?.trim() || 'Manual',
          line1: dto.address.line1,
          line2: dto.address.line2 ?? null,
          city: dto.address.city,
          state: dto.address.state,
          country: dto.address.country,
          zipCode: dto.address.zipCode,
          phone: dto.address.phone ?? null,
          company: dto.address.company ?? null,
        },
      });
      shippingAddressId = created.id;
    } else {
      const address = await this.prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      if (!address) {
        throw new BadRequestException('Customer has no saved addresses; provide one');
      }
      shippingAddressId = address.id;
    }

    // Variantes y precios (misma regla que checkout: basePrice + priceAdjustment).
    const variantIds = [...new Set(dto.items.map((item) => item.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true, basePrice: true, isActive: true } } },
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));

    const missing = variantIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown variants: ${missing.join(', ')}`);
    }

    const items = dto.items.map((item) => {
      const variant = byId.get(item.variantId)!;
      return {
        variant,
        quantity: item.quantity,
        unitPrice: variant.product.basePrice + (variant.priceAdjustment ?? 0),
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    let shippingCost = 0;
    if (dto.shippingOptionId) {
      const option = await this.prisma.shippingOption.findUnique({
        where: { id: dto.shippingOptionId },
      });
      if (!option) {
        throw new BadRequestException('Shipping option not found');
      }
      shippingCost = option.price;
    }

    const totalAmount = subtotal + shippingCost;
    const paid = dto.paymentStatus === 'PAID';

    const order = await this.prisma.order.create({
      data: {
        userId: user.id,
        status: paid ? OrderStatus.PAID : OrderStatus.PENDING_PAYMENT,
        paymentStatus: paid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paidAt: paid ? new Date() : null,
        subtotal,
        shippingCost,
        discountAmount: 0,
        totalAmount,
        shippingAddressId,
        billingAddressId: shippingAddressId,
        shippingOptionId: dto.shippingOptionId ?? null,
        adminNotes: dto.adminNotes?.trim() || null,
        customerNotes: dto.customerNotes?.trim() || null,
        items: {
          create: items.map((item) => ({
            type: CartItemType.STANDARD,
            productVariantId: item.variant.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'CREATE_MANUAL_ORDER',
      entity: 'Order',
      entityId: order.id,
      after: {
        userId: user.id,
        itemCount: items.length,
        subtotal,
        shippingCost,
        totalAmount,
        paymentStatus: order.paymentStatus,
      },
    });

    return this.findOne(order.id);
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

  async bulkUpdateStatus(ids: string[], status: OrderStatus, adminUserId?: string) {
    const data: Prisma.OrderUpdateManyMutationInput = { status };
    if (status === OrderStatus.SHIPPED) {
      data.shippedAt = new Date();
    }

    await this.prisma.order.updateMany({
      where: { id: { in: ids } },
      data,
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'BULK_UPDATE_STATUS',
      entity: 'Order',
      entityId: ids.join(','),
      after: { ids, status },
    });

    return { status, count: ids.length };
  }

  async bulkUpdatePaymentStatus(ids: string[], paymentStatus: PaymentStatus, adminUserId?: string) {
    await this.prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { paymentStatus },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'BULK_UPDATE_PAYMENT_STATUS',
      entity: 'Order',
      entityId: ids.join(','),
      after: { ids, paymentStatus },
    });

    return { paymentStatus, count: ids.length };
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
