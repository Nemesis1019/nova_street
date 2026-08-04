import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';

import { CheckoutService } from '../checkout/checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import type { PaymentProvider } from './providers/payment-provider.interface';
import { PAYMENT_PROVIDER } from './providers/payment-provider.token';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutService: CheckoutService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  isEnabled(): boolean {
    return this.provider !== null;
  }

  async createCheckoutSession(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            productVariant: { include: { product: true } },
            customDesign: { include: { designTemplate: { select: { name: true } } } },
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not pending payment');
    }

    const storeConfig = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    const currency = (storeConfig?.currencyCode ?? 'COP').toLowerCase();

    const session = await this.provider.createCheckoutSession({
      id: order.id,
      totalAmount: order.totalAmount,
      currency,
      userEmail: order.user.email,
      items: order.items.map((item) => {
        const productName =
          item.productVariant?.product.name ?? item.customDesign?.designTemplate.name ?? 'Producto';
        const variantLabel = item.productVariant
          ? [item.productVariant.size, item.productVariant.color].filter(Boolean).join(' / ')
          : undefined;
        return {
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          productName,
          variantLabel,
        };
      }),
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.provider.name,
        providerTransactionId: session.providerTransactionId,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
      },
    });

    return { url: session.url };
  }

  async handleWebhook(payload: string | Buffer, signature: string | undefined) {
    const event = await this.provider.handleWebhook(payload, signature);

    if (event.type === 'checkout.session.completed' && event.orderId) {
      await this.checkoutService.markOrderPaid(event.orderId, this.provider.name, event.providerTransactionId);
    }

    if (event.type === 'payment_failed') {
      await this.markPaymentFailed(event.orderId, event.providerTransactionId);
    }

    return { received: true };
  }

  private async markPaymentFailed(orderId?: string, providerTransactionId?: string) {
    if (!orderId && !providerTransactionId) return;

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ orderId }] : []),
          ...(providerTransactionId ? [{ providerTransactionId }] : []),
        ],
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
    }
  }

  async refundOrder(orderId: string, amount: number, reason: string, createdById?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = order.payments.find((p) => p.status === PaymentStatus.PAID || p.status === PaymentStatus.PENDING);

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: payment?.id,
        amount,
        reason,
        status: RefundStatus.PENDING,
        createdById,
      },
    });

    const result = await this.provider.refund({
      orderId,
      paymentProviderTransactionId: payment?.providerTransactionId ?? undefined,
      amount,
      reason,
    });

    const refundStatus = result.success ? RefundStatus.COMPLETED : RefundStatus.FAILED;

    await this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: refundStatus,
        providerRefundId: result.providerTransactionId ?? null,
      },
    });

    return { refundId: refund.id, success: result.success, errorMessage: result.errorMessage };
  }
}
