import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartItemType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StockPolicyResolver } from '../stock/stock-policy.resolver';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

export type CartItemSummary = {
  id: string;
  type: CartItemType;
  productVariantId: string | null;
  customDesignId: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  name?: string;
};

export type CartSummary = {
  id: string;
  items: CartItemSummary[];
  total: number;
};

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockPolicyResolver: StockPolicyResolver,
  ) {}

  async getCart(userId: string): Promise<CartSummary> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: { select: { name: true, slug: true } },
              },
            },
            customDesign: {
              include: {
                designTemplate: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      const created = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              productVariant: {
                include: {
                  product: { select: { name: true, slug: true } },
                },
              },
              customDesign: {
                include: {
                  designTemplate: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      return this.buildCartSummary(created);
    }

    return this.buildCartSummary(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartSummary> {
    const cart = await this.findOrCreateCart(userId);
    const unitPrice = await this.resolveUnitPrice(dto);

    if (dto.type === CartItemType.STANDARD && dto.productVariantId) {
      const policy = await this.stockPolicyResolver.resolve(dto.productVariantId);
      const existingQuantity = await this.getExistingQuantity(cart.id, dto);
      const available = await policy.isAvailable(dto.productVariantId, existingQuantity + dto.quantity);
      if (!available) {
        throw new BadRequestException('Insufficient stock for this variant');
      }
    }

    const existingItem = await this.findExistingCartItem(cart.id, dto);

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          type: dto.type,
          productVariantId: dto.productVariantId ?? null,
          customDesignId: dto.customDesignId ?? null,
          quantity: dto.quantity,
          unitPrice,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartSummary> {
    const cart = await this.findOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartSummary> {
    const cart = await this.findOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(userId);
  }

  async mergeCart(userId: string, dto: MergeCartDto): Promise<CartSummary> {
    for (const item of dto.anonymousItems) {
      await this.addItem(userId, item);
    }

    return this.getCart(userId);
  }

  private async findOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: true },
    });
  }

  private async findExistingCartItem(cartId: string, dto: AddCartItemDto) {
    return this.prisma.cartItem.findFirst({
      where: {
        cartId,
        type: dto.type,
        productVariantId: dto.productVariantId ?? null,
        customDesignId: dto.customDesignId ?? null,
      },
    });
  }

  private async getExistingQuantity(cartId: string, dto: AddCartItemDto): Promise<number> {
    const existing = await this.findExistingCartItem(cartId, dto);
    return existing?.quantity ?? 0;
  }

  private async resolveUnitPrice(dto: AddCartItemDto): Promise<number> {
    if (dto.type === CartItemType.STANDARD) {
      if (!dto.productVariantId) {
        throw new BadRequestException('productVariantId is required for standard items');
      }

      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.productVariantId },
        include: { product: true },
      });

      if (!variant || !variant.isActive || !variant.product.isActive) {
        throw new BadRequestException('Product variant is not available');
      }

      return variant.product.basePrice + (variant.priceAdjustment ?? 0);
    }

    if (dto.type === CartItemType.CUSTOM) {
      if (!dto.customDesignId) {
        throw new BadRequestException('customDesignId is required for custom items');
      }

      const design = await this.prisma.customDesign.findUnique({
        where: { id: dto.customDesignId },
        include: { designTemplate: true },
      });

      if (!design) {
        throw new BadRequestException('Custom design not found');
      }

      return design.designTemplate.basePrice + design.surcharge;
    }

    throw new BadRequestException('Invalid cart item type');
  }

  private buildCartSummary(
    cart: {
      id: string;
      items: Array<{
        id: string;
        type: CartItemType;
        productVariantId: string | null;
        customDesignId: string | null;
        quantity: number;
        unitPrice: number;
        productVariant?: { product?: { name: string } } | null;
        customDesign?: { designTemplate?: { name: string } } | null;
      }>;
    },
  ): CartSummary {
    const items = cart.items.map((item) => ({
      id: item.id,
      type: item.type,
      productVariantId: item.productVariantId,
      customDesignId: item.customDesignId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      name:
        item.productVariant?.product?.name ??
        item.customDesign?.designTemplate?.name ??
        'Producto personalizado',
    }));

    return {
      id: cart.id,
      items,
      total: items.reduce((sum, item) => sum + item.subtotal, 0),
    };
  }
}
