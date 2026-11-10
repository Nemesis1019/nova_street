import { calculateCustomizerPrice } from '@ecommerce/shared';

describe('customizer pricing', () => {
  it('suma prenda, color, talle, zona, elementos, texto y descuento por cantidad', () => {
    const result = calculateCustomizerPrice({
      template: {
        basePrice: 50_000,
        colorOptions: [
          { name: 'Negro', hex: '#000000', priceAdjustment: 0 },
          { name: 'Oliva', hex: '#6f7a4e', priceAdjustment: 5_000 },
        ],
        sizeOptions: [
          { name: 'M', priceAdjustment: 0 },
          { name: 'XL', priceAdjustment: 1_000 },
        ],
        printAreas: {
          zones: [
            { key: 'front', label: 'Frente', x: 0.2, y: 0.2, width: 0.5, height: 0.5, price: 3_000 },
            { key: 'back', label: 'Espalda', x: 0.2, y: 0.2, width: 0.5, height: 0.5, price: 4_000 },
          ],
        },
        pricingRules: {
          perElement: 2_500,
          textPerCharacter: 10,
          setupFee: 2_000,
          minPrice: 0,
          quantityTiers: [{ minQuantity: 10, discountPercent: 10 }],
        },
      },
      elements: [
        { type: 'TEXT', printAreaKey: 'front', textContent: 'HOLA' },
        { type: 'UPLOADED_IMAGE', printAreaKey: 'back' },
      ],
      color: 'Oliva',
      size: 'XL',
      quantity: 10,
    });

    expect(result.beforeDiscount).toBe(50_000 + 5_000 + 1_000 + 3_000 + 4_000 + 5_000 + 40 + 2_000);
    expect(result.discountPercent).toBe(10);
    expect(result.unitPrice).toBe(63_036);
    expect(result.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'color', amount: 5_000 }),
        expect.objectContaining({ key: 'size', amount: 1_000 }),
        expect.objectContaining({ key: 'zone:front', amount: 3_000 }),
        expect.objectContaining({ key: 'zone:back', amount: 4_000 }),
        expect.objectContaining({ key: 'elements', amount: 5_000 }),
        expect.objectContaining({ key: 'text', amount: 40 }),
        expect.objectContaining({ key: 'discount', amount: -7_004 }),
      ]),
    );
  });

  it('respeta el precio mínimo y no inventa costos por zonas no usadas', () => {
    const result = calculateCustomizerPrice({
      template: {
        basePrice: 10_000,
        colorOptions: [],
        sizeOptions: [],
        printAreas: {
          zones: [
            { key: 'front', label: 'Frente', x: 0.2, y: 0.2, width: 0.5, height: 0.5, price: 2_000 },
            { key: 'back', label: 'Espalda', x: 0.2, y: 0.2, width: 0.5, height: 0.5, price: 3_000 },
          ],
        },
        pricingRules: {
          perElement: 0,
          textPerCharacter: 0,
          setupFee: 0,
          minPrice: 15_000,
          quantityTiers: [],
        },
      },
      elements: [{ type: 'TEXT', printAreaKey: 'front', textContent: 'A' }],
      quantity: 1,
    });

    expect(result.printZones).toBe(2_000);
    expect(result.unitPrice).toBe(15_000);
  });
});
