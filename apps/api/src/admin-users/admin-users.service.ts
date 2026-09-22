import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';

import { AuditService } from '../audit/audit.service';
import { DEFAULT_NEW_USER_PERMISSIONS, Permission } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createUser(
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      roleName?: string;
      permissions?: Permission[];
    },
    adminUserId?: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const roleName = input.roleName ?? 'CUSTOMER';
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const passwordHash = await argon2.hash(input.password);
    const permissions = input.permissions ?? DEFAULT_NEW_USER_PERMISSIONS;

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: role.id,
        permissions: permissions as string[],
        emailVerified: true,
      },
      include: { role: { select: { name: true, permissions: true } } },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user.id,
      after: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleName: role.name,
        permissions: user.permissions,
      },
    });

     
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

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
        include: { role: { select: { name: true, permissions: true } } },
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
      include: { role: { select: { name: true, permissions: true } } },
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
      include: { role: { select: { name: true, permissions: true } } },
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
      include: { role: { select: { name: true, permissions: true } } },
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
      include: { role: { select: { name: true, permissions: true } } },
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

  async createRole(input: { name: string; description?: string; permissions: Permission[] }, adminUserId?: string) {
    const existing = await this.prisma.role.findUnique({ where: { name: input.name } });
    if (existing) {
      throw new NotFoundException('Role name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: input.name,
        description: input.description,
        permissions: input.permissions as string[],
      },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'CREATE_ROLE',
      entity: 'Role',
      entityId: role.id,
      after: { name: role.name, description: role.description, permissions: role.permissions },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    };
  }

  async findRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return {
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      })),
    };
  }

  async updateUserPermissions(
    id: string,
    permissions: Permission[],
    adminUserId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousPermissions = user.permissions;
    const updated = await this.prisma.user.update({
      where: { id },
      data: { permissions: permissions as string[] },
      include: { role: { select: { name: true, permissions: true } } },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_USER_PERMISSIONS',
      entity: 'User',
      entityId: id,
      before: { permissions: previousPermissions },
      after: { permissions: updated.permissions },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = updated;
    return rest;
  }

  async updateRolePermissions(
    id: string,
    permissions: Permission[],
    adminUserId?: string,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const previousPermissions = role.permissions;
    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: { permissions: permissions as string[] },
    });

    await this.auditService.log({
      userId: adminUserId,
      action: 'UPDATE_ROLE_PERMISSIONS',
      entity: 'Role',
      entityId: id,
      before: { permissions: previousPermissions },
      after: { permissions: updatedRole.permissions },
    });

    return {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      permissions: updatedRole.permissions,
    };
  }
}
