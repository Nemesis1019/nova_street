import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, RefundStatus } from '@prisma/client';

import { CheckoutService } from '../checkout/checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import type { PaymentButtonConfig } from './providers/payment-provider.interface';
import { PaymentProviderResolver } from './providers/payment-provider.resolver';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutService: CheckoutService,
    private readonly paymentProviderResolver: PaymentProviderResolver,
  ) {}

  /** Info del proveedor activo para que el storefront elija el flujo de pago. */
  async getActiveProviderInfo() {
    const provider = await this.paymentProviderResolver.resolve();
    return {
      provider: provider.name,
      supportsButton: typeof provider.createButtonCheckout === 'function',
    };
  }

  /** Config del botón de pagos embebido (Bold) para una orden del usuario. */
  async getButtonCheckout(orderId: string, userId: string): Promise<PaymentButtonConfig> {
    const provider = await this.paymentProviderResolver.resolve();
    if (typeof provider.createButtonCheckout !== 'function') {
      throw new BadRequestException('El proveedor de pagos activo no soporta el botón de pagos embebido');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not pending payment');
    }

    const storeConfig = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    const currency = storeConfig?.currencyCode ?? 'COP';

    return provider.createButtonCheckout({
      id: order.id,
      totalAmount: order.totalAmount,
      currency,
      userEmail: order.user.email,
    });
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
    const provider = await this.paymentProviderResolver.resolve();

    const session = await provider.createCheckoutSession({
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
        provider: provider.name,
        providerTransactionId: session.providerTransactionId,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
      },
    });

    return { url: session.url };
  }

  async handleWebhook(payload: string | Buffer, signature: string | undefined) {
    const provider = await this.paymentProviderResolver.resolve();
    const event = await provider.handleWebhook(payload, signature);

    if (event.type === 'checkout.session.completed' && event.orderId) {
      try {
        await this.checkoutService.markOrderPaid(event.orderId, provider.name, event.providerTransactionId);
      } catch (error) {
        // Idempotencia: Bold reintenta webhooks y puede notificar una orden ya pagada.
        // Respondemos 200 igualmente para evitar reintentos infinitos.
        this.logger.warn(
          `Webhook ${provider.name}: no se pudo marcar la orden ${event.orderId} como pagada (${
            error instanceof Error ? error.message : String(error)
          })`,
        );
      }
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

    const result = await (await this.paymentProviderResolver.resolve()).refund({
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

  /**
   * Procesa un reembolso ya registrado (PENDING o FAILED): llama al proveedor
   * y actualiza estado + ID de proveedor. Se usa al aprobar/reintentar desde el panel.
   */
  async processExistingRefund(refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: { include: { payments: true } } },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    if (refund.status === RefundStatus.COMPLETED) {
      throw new BadRequestException('Refund is already completed');
    }

    const payment = refund.order.payments.find(
      (p) => p.status === PaymentStatus.PAID || p.status === PaymentStatus.PENDING,
    );

    const result = await (await this.paymentProviderResolver.resolve()).refund({
      orderId: refund.orderId,
      paymentProviderTransactionId: payment?.providerTransactionId ?? undefined,
      amount: refund.amount,
      reason: refund.reason,
    });

    return this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: result.success ? RefundStatus.COMPLETED : RefundStatus.FAILED,
        providerRefundId: result.providerTransactionId ?? null,
        paymentId: payment?.id ?? refund.paymentId,
      },
      include: {
        order: { select: { id: true, totalAmount: true, status: true, paymentStatus: true } },
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}
