import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { render } from '../test/render';
import { ProductRating } from './product-rating';

describe('ProductRating', () => {
  it('renders nothing when there are no reviews', () => {
    render(<ProductRating averageRating={0} reviewCount={0} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('renders average rating and review count', () => {
    render(<ProductRating averageRating={4.3} reviewCount={12} />);

    expect(screen.getByText('★ 4.3 (12 reseñas)')).toBeInTheDocument();
  });

  it('uses singular form for one review', () => {
    render(<ProductRating averageRating={5} reviewCount={1} />);

    expect(screen.getByText('★ 5.0 (1 reseña)')).toBeInTheDocument();
  });
});
