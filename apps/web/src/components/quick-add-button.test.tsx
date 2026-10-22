import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCartStore } from '../store/cart-store';
import { render } from '../test/render';
import { QuickAddButton } from './quick-add-button';

vi.mock('../lib/fly-to-cart', () => ({ flyToCart: vi.fn() }));
vi.mock('../lib/api', () => ({
  apiClient: { POST: vi.fn().mockResolvedValue({ data: {}, error: null }) },
}));

const PRODUCT = {
  name: 'Campera Bomber Midnight',
  basePrice: 219000,
  imageUrl: 'https://example.com/img.webp',
  variants: [
    { id: 'v1', sku: 'MDN-S-NEG', size: 'S', color: 'Negro', stockMode: 'MADE_TO_ORDER', inStock: true },
    { id: 'v2', sku: 'MDN-M-NEG', size: 'M', color: 'Negro', stockMode: 'MADE_TO_ORDER', inStock: true },
  ],
};

describe('QuickAddButton', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('agrega al carrito local tras elegir una variante (invitado)', async () => {
    render(<QuickAddButton product={PRODUCT} />);

    fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));
    expect(await screen.findByText('Elegí una opción')).toBeInTheDocument();

    fireEvent.click(screen.getByText('S · Negro'));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(1);
    });
    expect(useCartStore.getState().items[0]).toMatchObject({
      productVariantId: 'v1',
      quantity: 1,
      sku: 'MDN-S-NEG',
    });
  });

  it('agrega directo cuando hay una sola variante', async () => {
    render(<QuickAddButton product={{ ...PRODUCT, variants: [PRODUCT.variants[0]] }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));

    await waitFor(() => {
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });
});
