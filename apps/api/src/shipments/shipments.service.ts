import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, ShipmentStatus } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { buildCarrierTrackingUrl } from '../common/tracking.util';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async findByOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const shipments = await this.prisma.shipment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: shipments };
  }

  async create(
    orderId: string,
    dto: { carrier: string; trackingNumber: string; trackingUrl?: string; notes?: string },
    adminUserId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.READY_TO_SHIP && order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('Order must be ready to ship or shipped before creating a shipment');
    }

    const trackingUrl = dto.trackingUrl || buildCarrierTrackingUrl(dto.carrier, dto.trackingNumber);

    const shipment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          orderId,
          carrier: dto.carrier,
          trackingNumber: dto.trackingNumber,
          trackingUrl,
          notes: dto.notes,
          shippedAt: new Date(),
          status: ShipmentStatus.PENDING,
        },
      });

      if (order.status !== OrderStatus.SHIPPED) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.SHIPPED,
            shippedAt: new Date(),
            carrier: dto.carrier,
            trackingNumber: dto.trackingNumber,
            trackingUrl,
          },
        });
      }

      return created;
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'CREATE_SHIPMENT',
      entity: 'Shipment',
      entityId: shipment.id,
      after: { orderId, carrier: dto.carrier, trackingNumber: dto.trackingNumber, trackingUrl: dto.trackingUrl },
    });

    if (order.user?.email) {
      void this.emailService
        .sendShipmentUpdate(order.user.email, orderId, dto.carrier, dto.trackingNumber, trackingUrl, 'PENDIENTE')
        .catch(() => undefined);
    }


    return shipment;
  }

  async updateStatus(shipmentId: string, status: ShipmentStatus, adminUserId?: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: { include: { user: { select: { id: true, email: true, firstName: true } } } } },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status === status) {
      throw new BadRequestException('New status must be different from current status');
    }

    const data: Record<string, unknown> = { status };
    if (status === ShipmentStatus.DELIVERED) {
      data.deliveredAt = new Date();
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.shipment.update({ where: { id: shipmentId }, data });

      if (status === ShipmentStatus.DELIVERED) {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      } else if (status === ShipmentStatus.IN_TRANSIT && shipment.order.status !== OrderStatus.SHIPPED) {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.SHIPPED },
        });
      }

      return result;
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_SHIPMENT_STATUS',
      entity: 'Shipment',
      entityId: shipmentId,
      before: { status: shipment.status },
      after: { status: updated.status },
    });

    if (shipment.order.user?.email) {
      void this.emailService
        .sendShipmentUpdate(
          shipment.order.user.email,
          shipment.orderId,
          updated.carrier,
          updated.trackingNumber,
          updated.trackingUrl ?? undefined,
          updated.status,
        )
        .catch(() => undefined);
    }

    return updated;
  }
}
