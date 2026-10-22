import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../test/render';
import { CatalogFiltersProvider, useCatalogFilters } from './catalog-filters-context';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const PRICE_RANGES = [{ label: '$100k - $150k COP', min: 100000, max: 150000 }];

function Probe() {
  const { values, toggleSize } = useCatalogFilters();
  return (
    <div>
      <span data-testid="category">{values.category ?? 'none'}</span>
      <span data-testid="sizes">{values.sizes.join(',') || 'none'}</span>
      <button type="button" onClick={() => toggleSize('S')}>
        talla S
      </button>
    </div>
  );
}

interface ProviderProps {
  initialCategory?: string;
}

function renderProvider({ initialCategory }: ProviderProps = {}) {
  return render(
    <CatalogFiltersProvider
      categories={[]}
      priceRanges={PRICE_RANGES}
      initialCategory={initialCategory}
    >
      <Probe />
    </CatalogFiltersProvider>,
  );
}

describe('CatalogFiltersProvider', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('no navega al montar si el estado coincide con la URL', () => {
    window.history.replaceState({}, '', '/catalogo?category=remeras');

    renderProvider({ initialCategory: 'remeras' });

    expect(replace).not.toHaveBeenCalled();
  });

  it('no "corrige" la URL durante una transición (re-render sin cambios de estado)', async () => {
    window.history.replaceState({}, '', '/catalogo?category=remeras');
    const { rerender } = renderProvider({ initialCategory: 'remeras' });
    expect(replace).not.toHaveBeenCalled();

    // La URL cambia por una navegación externa y llega un re-render con props
    // nuevas identidades (como hace el server) antes de que el estado cambie:
    // no debe dispararse un router.replace que pelee con la navegación.
    window.history.replaceState({}, '', '/catalogo');
    rerender(
      <CatalogFiltersProvider
        categories={[]}
        priceRanges={[...PRICE_RANGES]}
        initialCategory="remeras"
      >
        <Probe />
      </CatalogFiltersProvider>,
    );

    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled();
    });
    expect(screen.getByTestId('category').textContent).toBe('remeras');
  });

  it('navega una sola vez cuando cambia un filtro', async () => {
    window.history.replaceState({}, '', '/catalogo');
    renderProvider();

    fireEvent.click(screen.getByRole('button', { name: 'talla S' }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledTimes(1);
    });
    expect(replace).toHaveBeenCalledWith('/catalogo?sizes=S', { scroll: false });
  });

  it('adopta un cambio externo de la URL sin navegar (atrás/adelante, links)', async () => {
    window.history.replaceState({}, '', '/catalogo');
    const { rerender } = renderProvider();

    window.history.replaceState({}, '', '/catalogo?category=remeras');
    rerender(
      <CatalogFiltersProvider
        categories={[]}
        priceRanges={[...PRICE_RANGES]}
        initialCategory="remeras"
      >
        <Probe />
      </CatalogFiltersProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('category').textContent).toBe('remeras');
    });
    expect(replace).not.toHaveBeenCalled();
  });
});
