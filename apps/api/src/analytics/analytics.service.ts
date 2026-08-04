import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

interface DateRange {
  from: Date;
  to: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesReport(range: DateRange) {
    const orders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        paidAt: { gte: range.from, lte: range.to },
      },
      select: {
        totalAmount: true,
        paidAt: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const grouped = new Map<string, { revenue: number; orders: number }>();
    for (const order of orders) {
      const label = this.formatLabel(order.paidAt ?? range.from);
      const current = grouped.get(label) ?? { revenue: 0, orders: 0 };
      current.revenue += order.totalAmount;
      current.orders += 1;
      grouped.set(label, current);
    }

    const data = Array.from(grouped.entries())
      .map(([label, values]) => ({ label, ...values }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { totalRevenue, totalOrders, averageOrderValue, data };
  }

  async topProducts(range: DateRange, limit: number) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          paymentStatus: 'PAID',
          paidAt: { gte: range.from, lte: range.to },
        },
        type: 'STANDARD',
      },
      select: {
        quantity: true,
        unitPrice: true,
        productVariant: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const grouped = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of items) {
      const product = item.productVariant?.product;
      if (!product) continue;
      const current = grouped.get(product.id) ?? { name: product.name, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.unitPrice * item.quantity;
      grouped.set(product.id, current);
    }

    const data = Array.from(grouped.entries())
      .map(([productId, values]) => ({ productId, ...values }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return { data };
  }

  async conversionReport(range: DateRange) {
    const [paidOrders, carts] = await Promise.all([
      this.prisma.order.count({
        where: {
          paymentStatus: 'PAID',
          paidAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.cart.count({
        where: {
          createdAt: { gte: range.from, lte: range.to },
        },
      }),
    ]);

    const rate = carts > 0 ? paidOrders / carts : 0;
    return { cartToOrderRate: Number(rate.toFixed(4)) };
  }

  private formatLabel(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
