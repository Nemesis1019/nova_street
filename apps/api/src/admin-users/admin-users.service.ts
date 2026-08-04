import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { page: number; limit: number; search?: string; role?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = { name: query.role };
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { role: { select: { name: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...rest } = user;
        return rest;
      }),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: { select: { name: true } } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async updateRole(id: string, roleName: string) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      include: { role: { select: { name: true } } },
    });

    await this.auditService.log({
      userId: undefined,
      action: 'UPDATE_ROLE',
      entity: 'User',
      entityId: id,
      after: { roleName },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async suspend(id: string, reason?: string, adminUserId?: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: reason ?? null,
      },
      include: { role: { select: { name: true } } },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'SUSPEND_USER',
      entity: 'User',
      entityId: id,
      after: { isSuspended: true, suspendedReason: reason },
    });

    // Revoke all refresh tokens to force re-login.
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async unsuspend(id: string, adminUserId?: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null,
      },
      include: { role: { select: { name: true } } },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UNSUSPEND_USER',
      entity: 'User',
      entityId: id,
      after: { isSuspended: false },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async findOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            productVariant: { include: { product: { select: { name: true } } } },
            customDesign: { include: { designTemplate: { select: { name: true } } } },
          },
        },
      },
    });

    return {
      data: orders.map((order) => ({
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
        trackingNumber: order.trackingNumber ?? undefined,
        carrier: order.carrier ?? undefined,
        items: order.items.map((item) => ({
          id: item.id,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          name:
            item.type === 'STANDARD'
              ? item.productVariant?.product?.name ?? 'Producto'
              : item.customDesign?.designTemplate?.name ?? 'Diseño personalizado',
        })),
      })),
    };
  }
}
