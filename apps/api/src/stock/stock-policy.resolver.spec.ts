import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { MadeToOrderStockPolicy } from './made-to-order.policy';
import { StockPolicyResolver } from './stock-policy.resolver';
import { TrackedStockPolicy } from './tracked.policy';

describe('StockPolicyResolver', () => {
  let resolver: StockPolicyResolver;
  const findUnique = jest.fn();

  beforeEach(async () => {
    findUnique.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockPolicyResolver,
        { provide: PrismaService, useValue: { productVariant: { findUnique } } },
      ],
    }).compile();

    resolver = module.get<StockPolicyResolver>(StockPolicyResolver);
  });

  it('throws when variant does not exist', async () => {
    findUnique.mockResolvedValue(null);
    await expect(resolver.resolve('missing-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns TrackedStockPolicy for TRACKED mode', async () => {
    findUnique.mockResolvedValue({ id: 'variant-1', stockMode: 'TRACKED' });
    const policy = await resolver.resolve('variant-1');
    expect(policy).toBeInstanceOf(TrackedStockPolicy);
  });

  it('returns MadeToOrderStockPolicy for MADE_TO_ORDER mode', async () => {
    findUnique.mockResolvedValue({ id: 'variant-2', stockMode: 'MADE_TO_ORDER' });
    const policy = await resolver.resolve('variant-2');
    expect(policy).toBeInstanceOf(MadeToOrderStockPolicy);
  });
});
