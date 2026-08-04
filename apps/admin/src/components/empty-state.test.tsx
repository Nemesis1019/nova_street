import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { render } from '../test/render';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);

    expect(screen.getByText('No hay resultados')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay datos para mostrar en esta sección.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(<EmptyState title="Sin órdenes" description="No hay órdenes para mostrar." />);

    expect(screen.getByText('Sin órdenes')).toBeInTheDocument();
    expect(screen.getByText('No hay órdenes para mostrar.')).toBeInTheDocument();
  });
});
