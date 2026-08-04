import { BadRequestException } from '@nestjs/common';
import { StockMode } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StockPolicy, StockPolicyContext } from './stock-policy.interface';

export class TrackedStockPolicy implements StockPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async isAvailable(variantId: string, quantity: number): Promise<boolean> {
    const inventory = await this.getInventory(variantId);
    const available = inventory.quantity - inventory.reservedQuantity;
    return available >= quantity;
  }

  async reserve(variantId: string, quantity: number, context: StockPolicyContext): Promise<void> {
    const inventory = await this.getInventory(variantId);
    const available = inventory.quantity - inventory.reservedQuantity;

    if (available < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reservedQuantity: { increment: quantity } },
      });

      await tx.stockReservation.create({
        data: {
          productVariantId: variantId,
          inventoryId: inventory.id,
          cartId: context.cartId,
          orderId: context.orderId,
          quantity,
          expiresAt: this.computeExpiry(),
        },
      });
    });
  }

  async release(variantId: string, quantity: number, context: StockPolicyContext): Promise<void> {
    const inventory = await this.getInventory(variantId);

    const reservation = await this.prisma.stockReservation.findFirst({
      where: {
        productVariantId: variantId,
        status: 'ACTIVE',
        cartId: context.cartId ?? null,
        orderId: context.orderId ?? null,
      },
    });

    if (!reservation) {
      return;
    }

    const releaseQuantity = Math.min(quantity, reservation.quantity);

    await this.prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reservedQuantity: { decrement: releaseQuantity } },
      });

      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: 'RELEASED',
          quantity: reservation.quantity - releaseQuantity,
        },
      });
    });
  }

  async commit(variantId: string, quantity: number, context: StockPolicyContext): Promise<void> {
    const inventory = await this.getInventory(variantId);

    const reservation = await this.prisma.stockReservation.findFirst({
      where: {
        productVariantId: variantId,
        status: 'ACTIVE',
        cartId: context.cartId ?? null,
        orderId: context.orderId ?? null,
      },
    });

    if (!reservation) {
      throw new BadRequestException('No active reservation to commit');
    }

    const commitQuantity = Math.min(quantity, reservation.quantity);

    await this.prisma.$transaction(async (tx) => {
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { decrement: commitQuantity },
          reservedQuantity: { decrement: commitQuantity },
        },
      });

      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: {
          status: 'COMMITTED',
          quantity: reservation.quantity - commitQuantity,
        },
      });
    });
  }

  private async getInventory(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true },
    });

    if (!variant || variant.stockMode !== StockMode.TRACKED) {
      throw new BadRequestException('Variant is not tracked');
    }

    if (!variant.inventory) {
      throw new BadRequestException('Inventory record not found for tracked variant');
    }

    return variant.inventory;
  }

  private computeExpiry(): Date {
    const reservationMinutes = 30;
    return new Date(Date.now() + reservationMinutes * 60 * 1000);
  }
}
