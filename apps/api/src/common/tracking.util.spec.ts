import { buildCarrierTrackingUrl } from './tracking.util';

describe('buildCarrierTrackingUrl', () => {
  it('returns correo argentino tracking url', () => {
    const url = buildCarrierTrackingUrl('Correo Argentino', 'ABC123');
    expect(url).toBe('https://www.correoargentino.com.ar/formularios/e-commerce?id=ABC123');
  });

  it('returns andreani tracking url', () => {
    const url = buildCarrierTrackingUrl('Andreani', '999888');
    expect(url).toBe('https://www.andreani.com/envio/999888');
  });

  it('returns ups tracking url', () => {
    const url = buildCarrierTrackingUrl('UPS', '1Z999AA1234567890');
    expect(url).toBe('https://www.ups.com/track?tracknum=1Z999AA1234567890');
  });

  it('falls back to google search for unknown carrier', () => {
    const url = buildCarrierTrackingUrl('UnknownCarrier', 'XYZ789');
    expect(url).toBe('https://www.google.com/search?q=UnknownCarrier%20XYZ789');
  });
});
