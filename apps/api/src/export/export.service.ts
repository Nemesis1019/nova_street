import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

function csvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const str = v === null || v === undefined ? '' : String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(',') + '\n';
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportOrdersCsv(from?: string, to?: string) {
    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, Date>).lte = new Date(to);
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      include: {
        user: { select: { email: true } },
        _count: { select: { items: true } },
      },
    });

    let csv = '\uFEFF';
    csv += csvRow(['id', 'createdAt', 'status', 'paymentStatus', 'subtotal', 'shippingCost', 'discountAmount', 'totalAmount', 'customerEmail', 'itemCount']);
    for (const order of orders) {
      csv += csvRow([
        order.id,
        order.createdAt.toISOString(),
        order.status,
        order.paymentStatus,
        order.subtotal,
        order.shippingCost,
        order.discountAmount,
        order.totalAmount,
        order.user?.email ?? '',
        order._count.items,
      ]);
    }
    return csv;
  }

  async exportProductsCsv() {
    const products = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      include: {
        category: { select: { name: true } },
        variants: { where: { isActive: true }, select: { id: true } },
      },
    });

    let csv = '\uFEFF';
    csv += csvRow(['id', 'name', 'slug', 'basePrice', 'category', 'isActive', 'variantCount']);
    for (const product of products) {
      csv += csvRow([
        product.id,
        product.name,
        product.slug,
        product.basePrice,
        product.category?.name ?? '',
        product.isActive ? 'yes' : 'no',
        product.variants.length,
      ]);
    }
    return csv;
  }

  /** Exporta usuarios/clientes con filtros opcionales de búsqueda, rol y estado. */
  async exportUsersCsv(filters: { search?: string; role?: string; status?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.role) {
      where.role = { name: filters.role };
    }
    if (filters.status === 'active') {
      where.isActive = true;
      where.isSuspended = false;
    }
    if (filters.status === 'suspended') {
      where.isSuspended = true;
    }
    if (filters.status === 'inactive') {
      where.isActive = false;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      include: { role: { select: { name: true } } },
    });

    let csv = '\uFEFF';
    csv += csvRow([
      'id',
      'email',
      'firstName',
      'lastName',
      'phone',
      'role',
      'isActive',
      'isSuspended',
      'emailVerified',
      'isGuest',
      'createdAt',
    ]);
    for (const user of users) {
      csv += csvRow([
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.phone,
        user.role.name,
        user.isActive ? 'yes' : 'no',
        user.isSuspended ? 'yes' : 'no',
        user.emailVerified ? 'yes' : 'no',
        user.isGuest ? 'yes' : 'no',
        user.createdAt.toISOString(),
      ]);
    }
    return csv;
  }

  /** Exporta la auditoría de cambios con filtros opcionales de acción, entidad y rango. */
  async exportAuditLogsCsv(filters: { action?: string; entity?: string; from?: string; to?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.entity) {
      where.entity = filters.entity;
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as Record<string, Date>).gte = new Date(filters.from);
      if (filters.to) (where.createdAt as Record<string, Date>).lte = new Date(filters.to);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      include: { user: { select: { email: true } } },
    });

    let csv = '\uFEFF';
    csv += csvRow(['id', 'createdAt', 'userEmail', 'action', 'entity', 'entityId', 'before', 'after']);
    for (const log of logs) {
      csv += csvRow([
        log.id,
        log.createdAt.toISOString(),
        log.user?.email ?? '',
        log.action,
        log.entity,
        log.entityId,
        log.before ? JSON.stringify(log.before) : '',
        log.after ? JSON.stringify(log.after) : '',
      ]);
    }
    return csv;
  }
}
