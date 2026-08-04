import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { render } from '../test/render';
import { LoadingState } from './loading-state';

describe('LoadingState', () => {
  it('renders default message', () => {
    render(<LoadingState />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingState message="Cargando productos..." />);

    expect(screen.getByText('Cargando productos...')).toBeInTheDocument();
  });
});
