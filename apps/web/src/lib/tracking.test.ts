import { describe, expect, it } from 'vitest';

import { getCarrierTrackingUrl } from './tracking';

describe('getCarrierTrackingUrl', () => {
  it('returns Correo Argentino URL', () => {
    const url = getCarrierTrackingUrl('Correo Argentino', 'ABC123');
    expect(url).toContain('correoargentino');
    expect(url).toContain('ABC123');
  });

  it('returns Andreani URL', () => {
    const url = getCarrierTrackingUrl('Andreani', '999888');
    expect(url).toContain('andreani');
    expect(url).toContain('999888');
  });

  it('falls back to Google search for unknown carriers', () => {
    const url = getCarrierTrackingUrl('UnknownCarrier', 'XYZ789');
    expect(url).toContain('google.com');
    expect(url).toContain('XYZ789');
  });
});
