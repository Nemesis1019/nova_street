import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../../store/auth-store';
import { render } from '../../../test/render';
import AddressesPage from './page';

const { ADDRESS } = vi.hoisted(() => ({
  ADDRESS: {
    id: 'a1',
    userId: 'u1',
    label: 'Casa',
    line1: 'Calle 1',
    line2: 'Apto 2',
    city: 'Medellín',
    state: 'Antioquia',
    country: 'Colombia',
    zipCode: '050001',
    phone: '3001234567',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
}));

vi.mock('../../../lib/api', () => ({
  apiClient: {
    GET: vi.fn(async () => ({ data: [ADDRESS], error: null })),
    POST: vi.fn(async () => ({ data: {}, error: null })),
    PATCH: vi.fn(async () => ({ data: {}, error: null })),
    DELETE: vi.fn(async () => ({ data: {}, error: null })),
  },
}));

vi.mock('../../../lib/geo', () => ({
  fetchCountries: vi.fn(async () => [{ name: 'Colombia', iso2: 'CO' }]),
  fetchStates: vi.fn(async () => [{ label: 'Antioquia', apiName: 'Antioquia Department' }]),
  fetchCities: vi.fn(async () => ['Medellín']),
  geocodeAddress: vi.fn(async () => null),
  getBrowserLocation: vi.fn(),
  reverseGeocode: vi.fn(),
}));

vi.mock('../../../components/address-map', () => ({
  AddressMap: () => <div data-testid="address-map" />,
}));

vi.mock('../../../components/account-layout', () => ({
  AccountLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/account/addresses',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/font/google', () => ({
  Bebas_Neue: () => ({ className: 'font-bebas', style: { fontFamily: 'Bebas Neue' } }),
  Inter: () => ({ className: 'font-inter', style: { fontFamily: 'Inter' } }),
  JetBrains_Mono: () => ({ className: 'font-mono', style: { fontFamily: 'JetBrains Mono' } }),
}));

describe('AddressesPage — modal de direcciones', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'token',
      email: 'customer@tienda.com',
      isAuthenticated: true,
      isHydrated: true,
      emailVerified: true,
    });
  });

  it('"Ver detalle" precarga los datos y "Agregar nueva" abre el formulario limpio', async () => {
    render(<AddressesPage />);

    expect(await screen.findByText('Casa')).toBeInTheDocument();

    // Ver detalle → formulario precargado
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Nombre')).toHaveValue('Casa');
    expect(within(dialog).getByLabelText('Dirección línea 1')).toHaveValue('Calle 1');
    expect(within(dialog).getByLabelText('País')).toHaveValue('Colombia');

    // Cancelar y abrir "Agregar nueva dirección" → no debe conservar el estado anterior
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Agregar nueva dirección' }));

    const reopened = await screen.findByRole('dialog');
    expect(within(reopened).getByLabelText('Nombre')).toHaveValue('');
    expect(within(reopened).getByLabelText('Dirección línea 1')).toHaveValue('');
    expect(within(reopened).getByLabelText('País')).toHaveValue('');
    expect(within(reopened).getByLabelText('Ciudad')).toHaveValue('');
  });

  it('no permite guardar una dirección con campos vacíos', async () => {
    render(<AddressesPage />);

    expect(await screen.findByText('Casa')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ Agregar nueva dirección' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar dirección' }));

    expect(await within(dialog).findByText('Ingresá un nombre (Casa, Oficina...)')).toBeInTheDocument();
    expect(within(dialog).getByText('Ingresá la dirección')).toBeInTheDocument();
    expect(within(dialog).getByText('Elegí el país')).toBeInTheDocument();
    expect(within(dialog).getByText('Ingresá el código postal')).toBeInTheDocument();
  });
});
