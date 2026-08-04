import { StoreConfigShippingProvider } from './store-config-shipping.provider';

describe('StoreConfigShippingProvider', () => {
  const provider = new StoreConfigShippingProvider();

  const config = (overrides: Record<string, unknown> = {}) =>
    ({
      shippingBaseCost: 10_000,
      freeShippingThreshold: null,
      shippingDiscountPercentage: null,
      shippingDiscountFixedAmount: null,
      ...overrides,
    } as Parameters<typeof provider.calculate>[0]['config']);

  it('returns base cost with flat rate', () => {
    expect(provider.calculate({ subtotal: 50_000, config: config() })).toBe(10_000);
  });

  it('returns 0 when subtotal reaches free shipping threshold', () => {
    expect(
      provider.calculate({
        subtotal: 150_000,
        config: config({ freeShippingThreshold: 100_000 }),
      }),
    ).toBe(0);
  });

  it('returns base cost when subtotal is below threshold', () => {
    expect(
      provider.calculate({
        subtotal: 50_000,
        config: config({ freeShippingThreshold: 100_000 }),
      }),
    ).toBe(10_000);
  });

  it('applies percentage discount', () => {
    expect(
      provider.calculate({
        subtotal: 50_000,
        config: config({ shippingDiscountPercentage: 50 }),
      }),
    ).toBe(5_000);
  });

  it('applies fixed discount', () => {
    expect(
      provider.calculate({
        subtotal: 50_000,
        config: config({ shippingDiscountFixedAmount: 3_000 }),
      }),
    ).toBe(7_000);
  });

  it('applies percentage then fixed discount', () => {
    expect(
      provider.calculate({
        subtotal: 50_000,
        config: config({ shippingDiscountPercentage: 50, shippingDiscountFixedAmount: 2_000 }),
      }),
    ).toBe(3_000);
  });

  it('never returns negative cost', () => {
    expect(
      provider.calculate({
        subtotal: 50_000,
        config: config({ shippingDiscountFixedAmount: 20_000 }),
      }),
    ).toBe(0);
  });
});
