import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '../test/render';
import { CookieConsent, openCookieConsent, readCookieConsent } from './cookie-consent';

vi.mock('../providers/i18n-provider', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'es',
    setLocale: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  apiClient: {
    // El endpoint real devuelve { data: [...] } (PageListResponseDto).
    GET: vi.fn().mockResolvedValue({ data: { data: [{ slug: 'politica-de-cookies' }] }, error: null }),
  },
}));

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the panel when there is no stored consent', async () => {
    render(<CookieConsent />);

    expect(await screen.findByText('cookies.title')).toBeInTheDocument();
    expect(screen.getByText('cookies.accept')).toBeInTheDocument();
    expect(screen.getByText('cookies.reject')).toBeInTheDocument();
  });

  it('stores the decision and hides the panel on accept', async () => {
    render(<CookieConsent />);

    fireEvent.click(await screen.findByText('cookies.accept'));

    await waitFor(() => {
      expect(screen.queryByText('cookies.title')).not.toBeInTheDocument();
    });
    expect(readCookieConsent()?.decision).toBe('accepted');
  });

  it('stores the decision on reject', async () => {
    render(<CookieConsent />);

    fireEvent.click(await screen.findByText('cookies.reject'));

    await waitFor(() => {
      expect(readCookieConsent()?.decision).toBe('rejected');
    });
  });

  it('does not show when a valid consent already exists', () => {
    localStorage.setItem(
      'nova-cookie-consent',
      JSON.stringify({ version: 1, decision: 'accepted', decidedAt: new Date().toISOString() }),
    );

    render(<CookieConsent />);

    expect(screen.queryByText('cookies.title')).not.toBeInTheDocument();
  });

  it('reopens the panel when openCookieConsent is called', async () => {
    localStorage.setItem(
      'nova-cookie-consent',
      JSON.stringify({ version: 1, decision: 'accepted', decidedAt: new Date().toISOString() }),
    );
    render(<CookieConsent />);

    openCookieConsent();

    expect(await screen.findByText('cookies.title')).toBeInTheDocument();
  });
});
