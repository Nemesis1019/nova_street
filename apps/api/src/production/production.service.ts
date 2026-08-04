import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CartItemType, OrderItemProductionStatus, OrderStatus } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignProductionItemDto } from './dto/assign-production-item.dto';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: {
    page: number;
    limit: number;
    status?: OrderItemProductionStatus;
    search?: string;
    assignedToId?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.productionStatus = query.status;
    }

    if (query.assignedToId) {
      if (query.assignedToId === 'null') {
        where.assignedToId = null;
      } else {
        where.assignedToId = query.assignedToId;
      }
    }

    if (search) {
      where.OR = [
        {
          productVariant: {
            product: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          customDesign: {
            designTemplate: { name: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.orderItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: { select: { id: true, status: true, user: { select: { id: true, email: true, firstName: true } } } },
          productVariant: { include: { product: { select: { name: true } } } },
          customDesign: { include: { designTemplate: { select: { name: true } } } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    const mapped = data.map((item) => this.mapToResponse(item));

    return { data: mapped, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, status: true, user: { select: { id: true, email: true, firstName: true } } } },
        productVariant: { include: { product: { select: { name: true } } } },
        customDesign: { include: { designTemplate: { select: { name: true } } } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Production item not found');
    }

    return this.mapToResponse(item);
  }

  async updateStatus(id: string, status: OrderItemProductionStatus, adminUserId?: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, status: true, user: { select: { id: true, email: true, firstName: true } } } },
        productVariant: { include: { product: { select: { name: true } } } },
        customDesign: { include: { designTemplate: { select: { name: true } } } },
      },
    });

    if (!item) {
      throw new NotFoundException('Production item not found');
    }

    if (item.productionStatus === status) {
      throw new BadRequestException('New status must be different from current status');
    }

    const updated = await this.prisma.orderItem.update({
      where: { id },
      data: { productionStatus: status },
      include: {
        order: { select: { id: true, status: true, user: { select: { id: true, email: true, firstName: true } } } },
        productVariant: { include: { product: { select: { name: true } } } },
        customDesign: { include: { designTemplate: { select: { name: true } } } },
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_PRODUCTION_STATUS',
      entity: 'OrderItem',
      entityId: id,
      before: { productionStatus: item.productionStatus },
      after: { productionStatus: updated.productionStatus },
    });

    await this.maybeAdvanceOrderStatus(updated.order.id, updated.order.status);

    if (updated.order.user?.email) {
      const itemName = this.getItemName(updated);
      void this.emailService
        .sendProductionStatusUpdate(
          updated.order.user.email,
          updated.order.id,
          itemName,
          updated.productionStatus,
        )
        .catch(() => undefined);
    }

    return this.mapToResponse(updated);
  }

  async assign(id: string, dto: AssignProductionItemDto, adminUserId?: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, status: true, user: { select: { id: true, email: true, firstName: true } } } },
        productVariant: { include: { product: { select: { name: true } } } },
        customDesign: { include: { designTemplate: { select: { name: true } } } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Production item not found');
    }

    if (dto.assignedToId) {
      const userExists = await this.prisma.user.count({ where: { id: dto.assignedToId } });
      if (userExists === 0) {
        throw new BadRequestException('Assigned user does not exist');
      }
    }

    const updated = await this.prisma.orderItem.update({
      where: { id },
      data: { assignedToId: dto.assignedToId ?? null },
      include: {
        order: { select: { id: true, status: true, user: { select: { id: true, email: true, firstName: true } } } },
        productVariant: { include: { product: { select: { name: true } } } },
        customDesign: { include: { designTemplate: { select: { name: true } } } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'ASSIGN_PRODUCTION_ITEM',
      entity: 'OrderItem',
      entityId: id,
      before: { assignedToId: item.assignedToId },
      after: { assignedToId: updated.assignedToId },
    });

    return this.mapToResponse(updated);
  }

  private async maybeAdvanceOrderStatus(orderId: string, currentStatus: OrderStatus) {
    if (currentStatus !== OrderStatus.PAID && currentStatus !== OrderStatus.IN_PRODUCTION) {
      return;
    }

    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    const allReady = items.length > 0 && items.every((i) => i.productionStatus === OrderItemProductionStatus.READY_TO_SHIP);

    if (allReady) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.READY_TO_SHIP },
      });
    } else if (currentStatus === OrderStatus.PAID && items.some((i) => i.productionStatus === OrderItemProductionStatus.IN_PRODUCTION)) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.IN_PRODUCTION },
      });
    }
  }

  private mapToResponse(item: {
    id: string;
    orderId: string;
    type: CartItemType;
    quantity: number;
    unitPrice: number;
    productionStatus: OrderItemProductionStatus;
    assignedToId: string | null;
    assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null;
    productVariantId: string | null;
    productVariant?: { product: { name: string }; size?: string | null; color?: string | null } | null;
    customDesignId: string | null;
    customDesign?: { designTemplate: { name: string } } | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      orderId: item.orderId,
      type: item.type,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      productionStatus: item.productionStatus,
      assignedToId: item.assignedToId ?? undefined,
      assignedTo: item.assignedTo
        ? { id: item.assignedTo.id, name: `${item.assignedTo.firstName} ${item.assignedTo.lastName}`, email: item.assignedTo.email }
        : undefined,
      productVariantId: item.productVariantId ?? undefined,
      productName: item.productVariant?.product.name,
      variantLabel: item.productVariant
        ? [item.productVariant.size, item.productVariant.color].filter(Boolean).join(' / ')
        : undefined,
      customDesignId: item.customDesignId ?? undefined,
      designTemplateName: item.customDesign?.designTemplate.name,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private getItemName(item: {
    productVariant?: { product: { name: string }; size?: string | null; color?: string | null } | null;
    customDesign?: { designTemplate: { name: string } } | null;
  }) {
    return (
      item.productVariant?.product.name ??
      item.customDesign?.designTemplate.name ??
      'Producto personalizado'
    );
  }
}
