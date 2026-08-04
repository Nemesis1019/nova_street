const carrierUrls: Record<string, string> = {
  correoargentino: 'https://www.correoargentino.com.ar/formularios/e-commerce?id=',
  andreani: 'https://www.andreani.com/envio/',
  oca: 'https://www.oca.com.ar/BusquedaEnvios?id=',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr=',
  ups: 'https://www.ups.com/track?tracknum=',
  dhl: 'https://www.dhl.com/en/express/tracking.html?AWB=',
};

export function buildCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const key = carrier.toLowerCase().replace(/[^a-z]/g, '');
  const base = carrierUrls[key];
  if (base) {
    return `${base}${encodeURIComponent(trackingNumber)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} ${trackingNumber}`)}`;
}
