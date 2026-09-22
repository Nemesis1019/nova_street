import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CartItemType,
  CouponAppliesTo,
  DiscountType,
  OrderItemProductionStatus,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingOptionsService } from '../shipping/shipping-options.service';
import { StockPolicyResolver } from '../stock/stock-policy.resolver';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { CalculateShippingCostDto } from './dto/calculate-shipping-cost.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { InitCheckoutDto } from './dto/init-checkout.dto';
import { PlaceholderProvider } from './payment/placeholder.provider';

export type CheckoutSummary = {
  orderId: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  paymentIntent: {
    provider: string;
    clientSecret: string;
    amount: number;
    currency: string;
  };
};

@Injectable()
export class CheckoutService {
  private readonly paymentProvider = new PlaceholderProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockPolicyResolver: StockPolicyResolver,
    private readonly emailService: EmailService,
    private readonly shippingOptionsService: ShippingOptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async calculateShippingCost(userId: string, dto: CalculateShippingCostDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });

    if (!address) {
      throw new BadRequestException('Invalid shipping address');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    const subtotal = cart?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) ?? 0;
    const options = await this.shippingOptionsService.calculateEstimatedOptions(subtotal);
    const defaultOption = options.find((o) => o.isDefault) ?? options[0];

    return {
      shippingCost: defaultOption?.price ?? 0,
      options,
      baseCost: defaultOption?.price ?? 0,
      freeShippingThreshold: defaultOption?.isFree ? 0 : null,
    };
  }

  async initCheckout(userId: string, dto: InitCheckoutDto): Promise<CheckoutSummary> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { productVariant: { include: { product: true } }, customDesign: { include: { designTemplate: true } } } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const addresses = await this.prisma.address.findMany({
      where: { id: { in: [dto.shippingAddressId, dto.billingAddressId] }, userId },
    });

    const addressIds = new Set(addresses.map((a) => a.id));
    if (!addressIds.has(dto.shippingAddressId) || !addressIds.has(dto.billingAddressId)) {
      throw new BadRequestException('Invalid shipping or billing address');
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const estimatedOptions = await this.shippingOptionsService.calculateEstimatedOptions(subtotal);
    const selectedOption = dto.shippingOptionId
      ? estimatedOptions.find((o) => o.id === dto.shippingOptionId)
      : undefined;
    const defaultOption = estimatedOptions.find((o) => o.isDefault) ?? estimatedOptions[0];
    const shippingOption = selectedOption ?? defaultOption;
    const shippingCost = shippingOption?.price ?? 0;
    const shippingOptionId = shippingOption && shippingOption.id !== 'fallback' ? shippingOption.id : null;

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING_PAYMENT,
          subtotal,
          shippingCost,
          discountAmount: 0,
          totalAmount: subtotal + shippingCost,
          shippingAddressId: dto.shippingAddressId,
          billingAddressId: dto.billingAddressId,
          paymentStatus: PaymentStatus.PENDING,
          customerNotes: dto.orderNotes,
          shippingOptionId,
        },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: createdOrder.id,
          type: item.type as CartItemType,
          productVariantId: item.productVariantId,
          customDesignId: item.customDesignId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return createdOrder;
    });

    let updatedOrder = order;
    if (dto.couponCode) {
      updatedOrder = await this.applyCouponInternal(order.id, userId, dto.couponCode);
    }

    await this.reserveStockForOrder(updatedOrder.id, cart.items);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    this.notificationsService.emit({
      type: 'order.created',
      payload: {
        orderId: updatedOrder.id,
        totalAmount: updatedOrder.totalAmount,
        email: user?.email ?? null,
      },
    });

    const paymentIntent = await this.paymentProvider.createPaymentIntent(
      updatedOrder.id,
      updatedOrder.totalAmount,
    );

    await this.prisma.payment.create({
      data: {
        orderId: updatedOrder.id,
        provider: this.paymentProvider.name,
        amount: updatedOrder.totalAmount,
        status: PaymentStatus.PENDING,
      },
    });

    void this.sendOrderEmails(userId, updatedOrder).catch(() => undefined);

    return {
      orderId: updatedOrder.id,
      subtotal: updatedOrder.subtotal,
      shippingCost: updatedOrder.shippingCost,
      discountAmount: updatedOrder.discountAmount,
      totalAmount: updatedOrder.totalAmount,
      paymentIntent,
    };
  }

  async guestCheckout(dto: GuestCheckoutDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser && !existingUser.isGuest) {
      throw new BadRequestException('Email already registered. Please log in.');
    }

    const customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) {
      throw new Error('CUSTOMER role not found');
    }

    const guestUser = await this.prisma.$transaction(async (tx) => {
      const passwordHash = await argon2.hash(randomUUID());
      return tx.user.upsert({
        where: { email: dto.email },
        update: { isGuest: true, guestToken: randomUUID() },
        create: {
          email: dto.email,
          firstName: dto.email.split('@')[0],
          lastName: 'Guest',
          passwordHash,
          isGuest: true,
          guestToken: randomUUID(),
          roleId: customerRole.id,
        },
      });
    });

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: dto.items.map((i) => i.productVariantId) }, isActive: true },
      include: { product: { select: { isActive: true, basePrice: true } } },
    });

    if (variants.length !== dto.items.length) {
      throw new BadRequestException('One or more product variants are invalid');
    }

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.create({ data: { userId: guestUser.id } });
      await tx.cartItem.createMany({
        data: dto.items.map((item) => {
          const variant = variants.find((v) => v.id === item.productVariantId)!;
          return {
            cartId: cart.id,
            type: 'STANDARD' as CartItemType,
            productVariantId: variant.id,
            quantity: item.quantity,
            unitPrice: variant.product.isActive ? variant.product.basePrice + (variant.priceAdjustment ?? 0) : 0,
          };
        }),
      });
    });

    const [shippingAddress, billingAddress] = await Promise.all([
      this.createAddressForGuest(guestUser.id, dto.shippingAddress),
      this.createAddressForGuest(guestUser.id, dto.billingAddress),
    ]);

    const result = await this.initCheckout(guestUser.id, {
      shippingAddressId: shippingAddress.id,
      billingAddressId: billingAddress.id,
      couponCode: dto.couponCode,
    });

    return { ...result, guestToken: guestUser.guestToken };
  }

  async findGuestByToken(token: string) {
    return this.prisma.user.findUnique({
      where: { guestToken: token, isGuest: true },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true } } },
    });
  }

  private async createAddressForGuest(userId: string, address: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }) {
    return this.prisma.address.create({
      data: { ...address, userId },
    });
  }

  private async sendOrderEmails(userId: string, order: { id: string; totalAmount: number }) {
    const [user, storeConfig] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.storeConfig.findFirst({ where: { isActive: true } }),
    ]);

    if (user?.email) {
      await this.emailService.sendOrderCreated(
        user.email,
        order.id,
        order.totalAmount,
        storeConfig?.currencyCode ?? 'COP',
      );
    }
  }

  async applyCoupon(orderId: string, userId: string, dto: ApplyCouponDto) {
    const order = await this.applyCouponInternal(orderId, userId, dto.couponCode);
    return {
      orderId: order.id,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
    };
  }

  async confirmPayment(orderId: string, userId: string): Promise<{ orderId: string; status: OrderStatus; paymentStatus: PaymentStatus }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder = await this.markOrderPaidInternal(orderId);

    void this.sendPaymentConfirmationEmails(userId, updatedOrder).catch(() => undefined);

    return {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    };
  }

  async markOrderPaid(
    orderId: string,
    provider: string,
    providerTransactionId?: string,
  ): Promise<{ orderId: string; status: OrderStatus; paymentStatus: PaymentStatus }> {
    const updatedOrder = await this.markOrderPaidInternal(orderId, provider, providerTransactionId);

    if (updatedOrder.userId) {
      void this.sendPaymentConfirmationEmails(updatedOrder.userId, updatedOrder).catch(() => undefined);
    }

    return {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    };
  }

  private async markOrderPaidInternal(orderId: string, provider?: string, providerTransactionId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true, user: { select: { id: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not pending payment');
    }

    await this.commitStockForOrder(orderId, order.items);

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });

      await tx.orderItem.updateMany({
        where: { orderId },
        data: { productionStatus: OrderItemProductionStatus.PENDING_PRODUCTION },
      });

      const payment = order.payments[0];
      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PAID, provider, providerTransactionId },
        });
      }

      return result;
    });

    return { ...updatedOrder, userId: order.userId };
  }

  private async sendPaymentConfirmationEmails(
    userId: string,
    order: { id: string; totalAmount: number },
  ) {
    const [user, storeConfig] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.storeConfig.findFirst({ where: { isActive: true } }),
    ]);

    if (user?.email) {
      await this.emailService.sendPaymentConfirmed(
        user.email,
        order.id,
        order.totalAmount,
        storeConfig?.currencyCode ?? 'COP',
      );
    }
  }

  private async reserveStockForOrder(
    orderId: string,
    items: { type: CartItemType; productVariantId: string | null; quantity: number }[],
  ) {
    for (const item of items) {
      if (item.type === CartItemType.STANDARD && item.productVariantId) {
        const policy = await this.stockPolicyResolver.resolve(item.productVariantId);
        await policy.reserve(item.productVariantId, item.quantity, { orderId });
      }
    }
  }

  private async commitStockForOrder(
    orderId: string,
    items: { type: CartItemType; productVariantId: string | null; quantity: number }[],
  ) {
    for (const item of items) {
      if (item.type === CartItemType.STANDARD && item.productVariantId) {
        const policy = await this.stockPolicyResolver.resolve(item.productVariantId);
        await policy.commit(item.productVariantId, item.quantity, { orderId });
      }
    }
  }

  private async applyCouponInternal(orderId: string, userId: string, couponCode: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            productVariant: { include: { product: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid coupon');
    }

    const now = new Date();
    if (coupon.validFrom > now || (coupon.validUntil && coupon.validUntil < now)) {
      throw new BadRequestException('Coupon is not valid at this time');
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (coupon.isFirstPurchaseOnly) {
      const previousOrders = await this.prisma.order.count({
        where: { userId, status: { not: OrderStatus.PENDING_PAYMENT } },
      });
      if (previousOrders > 0) {
        throw new BadRequestException('Coupon is only valid for first purchase');
      }
    }

    if (coupon.maxUsesPerUser !== null) {
      const usage = await this.prisma.couponUsage.findUnique({
        where: { userId_couponId: { userId, couponId: coupon.id } },
      });
      if (usage && usage.count >= coupon.maxUsesPerUser) {
        throw new BadRequestException('Coupon usage limit reached for this user');
      }
    }

    const eligibleSubtotal = this.calculateEligibleSubtotal(order.items, coupon);

    if (coupon.minOrderAmount !== null && eligibleSubtotal < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
      );
    }

    if (coupon.appliesTo !== CouponAppliesTo.ALL && eligibleSubtotal === 0) {
      throw new BadRequestException('Coupon does not apply to any item in this order');
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = Math.floor((eligibleSubtotal * coupon.discountValue) / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    if (discountAmount > order.subtotal) {
      discountAmount = order.subtotal;
    }

    const totalAmount = order.subtotal + order.shippingCost - discountAmount;

    await this.prisma.couponUsage.upsert({
      where: { userId_couponId: { userId, couponId: coupon.id } },
      update: { count: { increment: 1 } },
      create: { userId, couponId: coupon.id, count: 1 },
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });

      return tx.order.update({
        where: { id: orderId },
        data: {
          couponId: coupon.id,
          discountAmount,
          totalAmount,
        },
      });
    });
  }

  private calculateEligibleSubtotal(
    items: {
      quantity: number;
      unitPrice: number;
      productVariant?: { product?: { id: string; categoryId?: string | null } } | null;
    }[],
    coupon: { appliesTo: CouponAppliesTo; categoryId?: string | null; productId?: string | null },
  ): number {
    if (coupon.appliesTo === CouponAppliesTo.ALL) {
      return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    }

    return items.reduce((sum, item) => {
      const product = item.productVariant?.product;
      if (!product) return sum;

      if (coupon.appliesTo === CouponAppliesTo.PRODUCT && product.id === coupon.productId) {
        return sum + item.unitPrice * item.quantity;
      }

      if (coupon.appliesTo === CouponAppliesTo.CATEGORY && product.categoryId === coupon.categoryId) {
        return sum + item.unitPrice * item.quantity;
      }

      return sum;
    }, 0);
  }
}
