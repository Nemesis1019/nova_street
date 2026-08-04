import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function formatDateIso(date: Date): string {
  return date.toISOString().split('T')[0];
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const [orders, storeSettings] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              productVariant: { include: { product: { select: { name: true } } } },
              customDesign: { include: { designTemplate: { select: { name: true } } } },
            },
          },
          shipments: true,
        },
      }),
      this.prisma.storeSettings.findFirst(),
    ]);

    return orders.map((order) => this.mapOrderItems(order, storeSettings?.productionLeadTimeDaysDefault ?? 7));
  }

  async findOne(userId: string, id: string) {
    const [order, storeSettings] = await Promise.all([
      this.prisma.order.findFirst({
        where: { id, userId },
        include: {
          items: {
            include: {
              productVariant: { include: { product: { select: { name: true } } } },
              customDesign: { include: { designTemplate: { select: { name: true } } } },
            },
          },
          shipments: true,
        },
      }),
      this.prisma.storeSettings.findFirst(),
    ]);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrderItems(order, storeSettings?.productionLeadTimeDaysDefault ?? 7);
  }

  private mapOrderItems(order: OrderWithItems, defaultLeadTimeDays: number) {
    const estimatedDate = this.calculateEstimatedDeliveryDate(order, defaultLeadTimeDays);

    const shipments = (order.shipments ?? []) as Array<{ trackingUrl?: string }>;
    const orderTrackingUrl = (order as { trackingUrl?: string }).trackingUrl;

    return {
      ...order,
      estimatedDeliveryDate: estimatedDate,
      trackingUrl: orderTrackingUrl ?? shipments[0]?.trackingUrl,
      items: order.items.map((item) => ({
        ...item,
        name:
          item.productVariant?.product?.name ??
          item.customDesign?.designTemplate?.name ??
          item.type,
      })),
    };
  }

  private calculateEstimatedDeliveryDate(order: OrderWithItems, defaultLeadTimeDays: number): string | undefined {
    if (!order.items || order.items.length === 0) return undefined;

    const leadTimes = order.items.map((item) => {
      if (item.type === 'CUSTOM') return defaultLeadTimeDays;
      return item.productVariant?.productionLeadTimeDays ?? defaultLeadTimeDays;
    });

    const maxLeadTime = Math.max(...leadTimes);
    if (maxLeadTime <= 0) return undefined;

    const baseDate = order.paidAt ?? order.createdAt;
    return formatDateIso(addDays(baseDate, maxLeadTime));
  }
}

interface OrderWithItems extends Record<string, unknown> {
  paidAt?: Date | null;
  createdAt: Date;
  items: Array<
    Record<string, unknown> & {
      type?: string;
      productVariant?: { productionLeadTimeDays?: number; product?: { name?: string } } | null;
      customDesign?: { designTemplate?: { name?: string } } | null;
    }
  >;
  shipments?: unknown[];
}
