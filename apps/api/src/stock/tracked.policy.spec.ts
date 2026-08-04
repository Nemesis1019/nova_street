import { BadRequestException } from '@nestjs/common';

import { TrackedStockPolicy } from './tracked.policy';

describe('TrackedStockPolicy', () => {
  const variantId = 'variant-1';
  const inventoryId = 'inventory-1';
  const baseInventory = {
    id: inventoryId,
    productVariantId: variantId,
    quantity: 10,
    reservedQuantity: 2,
  };

  function buildMockPrisma(overrides: {
    inventory?: typeof baseInventory;
    reservation?: { id: string; quantity: number; status: string } | null;
  } = {}) {
    const inventory = overrides.inventory ?? baseInventory;
    const reservation = overrides.reservation ?? null;

    const update = jest.fn().mockResolvedValue({});
    const create = jest.fn().mockResolvedValue({});
    const findFirst = jest.fn().mockResolvedValue(reservation);

    const client: Record<string, unknown> = {
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({ id: variantId, stockMode: 'TRACKED', inventory }),
      },
      inventory: { update },
      stockReservation: { create, findFirst, update },
    };
    client.$transaction = jest.fn((cb: (tx: Record<string, unknown>) => Promise<unknown>) => cb(client));

    return { client, update, create, findFirst };
  }

  it('returns true when stock is available', async () => {
    const { client } = buildMockPrisma();
    const policy = new TrackedStockPolicy(client as never);
    await expect(policy.isAvailable(variantId, 8)).resolves.toBe(true);
  });

  it('returns false when stock is insufficient', async () => {
    const { client } = buildMockPrisma();
    const policy = new TrackedStockPolicy(client as never);
    await expect(policy.isAvailable(variantId, 9)).resolves.toBe(false);
  });

  it('throws when reserving more than available stock', async () => {
    const { client } = buildMockPrisma();
    const policy = new TrackedStockPolicy(client as never);
    await expect(policy.reserve(variantId, 9, { cartId: 'cart-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('increments reserved quantity and creates a reservation', async () => {
    const { client, update, create } = buildMockPrisma();
    const policy = new TrackedStockPolicy(client as never);

    await policy.reserve(variantId, 5, { cartId: 'cart-1' });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: inventoryId },
        data: { reservedQuantity: { increment: 5 } },
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productVariantId: variantId,
          inventoryId,
          cartId: 'cart-1',
          quantity: 5,
        }),
      }),
    );
  });

  it('releases an active reservation', async () => {
    const activeReservation = { id: 'res-1', quantity: 5, status: 'ACTIVE' };
    const { client, update } = buildMockPrisma({ reservation: activeReservation });
    const policy = new TrackedStockPolicy(client as never);

    await policy.release(variantId, 3, { cartId: 'cart-1' });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: inventoryId },
        data: { reservedQuantity: { decrement: 3 } },
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res-1' },
        data: { status: 'RELEASED', quantity: 2 },
      }),
    );
  });

  it('does nothing when releasing without an active reservation', async () => {
    const { client, update } = buildMockPrisma({ reservation: null });
    const policy = new TrackedStockPolicy(client as never);

    await expect(policy.release(variantId, 5, { cartId: 'cart-1' })).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });

  it('commits an active reservation reducing physical stock', async () => {
    const activeReservation = { id: 'res-1', quantity: 5, status: 'ACTIVE' };
    const { client, update } = buildMockPrisma({ reservation: activeReservation });
    const policy = new TrackedStockPolicy(client as never);

    await policy.commit(variantId, 4, { orderId: 'order-1' });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: inventoryId },
        data: { quantity: { decrement: 4 }, reservedQuantity: { decrement: 4 } },
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res-1' },
        data: { status: 'COMMITTED', quantity: 1 },
      }),
    );
  });

  it('throws when committing without an active reservation', async () => {
    const { client } = buildMockPrisma({ reservation: null });
    const policy = new TrackedStockPolicy(client as never);

    await expect(policy.commit(variantId, 1, { orderId: 'order-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
