import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      totalRevenueAgg,
      ordersToday,
      pendingOrders,
      totalUsers,
      lowStock,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { paymentStatus: { in: ['PAID', 'AUTHORIZED'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'READY_TO_SHIP'] } } }),
      this.prisma.user.count(),
      this.prisma.inventory.count({
        where: {
          quantity: { lte: 3 },
        },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { email: true } } },
      }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenueAgg._sum.totalAmount ?? 0,
      ordersToday,
      pendingOrders,
      totalUsers,
      lowStockCount: lowStock,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
        customerEmail: order.user.email,
      })),
    };
  }

  async getTrends() {
    const days = 7;
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    const data = await Promise.all(
      dates.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const [ordersAgg, revenueAgg] = await Promise.all([
          this.prisma.order.aggregate({
            where: { createdAt: { gte: date, lt: nextDay } },
            _count: { id: true },
          }),
          this.prisma.order.aggregate({
            where: {
              createdAt: { gte: date, lt: nextDay },
              paymentStatus: { in: ['PAID', 'AUTHORIZED'] },
            },
            _sum: { totalAmount: true },
          }),
        ]);

        return {
          date: date.toISOString().split('T')[0],
          orders: ordersAgg._count.id,
          revenue: revenueAgg._sum.totalAmount ?? 0,
        };
      }),
    );

    return { data };
  }
}
