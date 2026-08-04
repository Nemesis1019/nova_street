import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../test/render';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('renders default title and description', () => {
    render(<ErrorState />);

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByText('No pudimos cargar esta sección. Intentá de nuevo en unos segundos.')).toBeInTheDocument();
  });

  it('calls reset when retry button is clicked', () => {
    const reset = vi.fn();
    render(<ErrorState reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
