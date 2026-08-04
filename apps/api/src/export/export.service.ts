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
}
