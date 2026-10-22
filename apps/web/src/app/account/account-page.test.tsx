import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../store/auth-store';
import { render } from '../../test/render';
import AccountPage from './page';

vi.mock('../../lib/api', () => ({
  apiClient: {
    GET: vi.fn(async () => ({
      data: {
        id: 'u1',
        email: 'customer@tienda.com',
        firstName: 'Cliente',
        lastName: 'Demo',
        phone: '+57 300 111 2233',
        document: 'CC 1020304050',
        role: 'CUSTOMER',
        emailVerified: true,
      },
      error: null,
    })),
    PATCH: vi.fn(async () => ({ data: {}, error: null })),
  },
  logoutSession: vi.fn(),
}));

vi.mock('../../components/account-layout', () => ({
  AccountLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe('AccountPage — perfil', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'token',
      email: 'customer@tienda.com',
      isAuthenticated: true,
      isHydrated: true,
      emailVerified: true,
      sessionReady: true,
    });
  });

  it('carga los datos del perfil sin entrar en un loop de renders', async () => {
    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre')).toHaveValue('Cliente');
    });
    expect(screen.getByLabelText('Apellido')).toHaveValue('Demo');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('+57 300 111 2233');
    expect(screen.getByLabelText('Documento')).toHaveValue('CC 1020304050');
  });
});
