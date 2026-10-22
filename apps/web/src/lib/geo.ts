/**
 * Datos geográficos para el formulario de direcciones:
 * - países/estados/ciudades desde countriesnow.space (API pública, CORS abierto)
 * - geocodificación inversa desde Nominatim (OpenStreetMap)
 */

const COUNTRIES_URL = 'https://countriesnow.space/api/v0.1/countries/iso';
const STATES_URL = 'https://countriesnow.space/api/v0.1/countries/states/q';
const CITIES_URL = 'https://countriesnow.space/api/v0.1/countries/state/cities/q';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export interface CountryOption {
  name: string;
  iso2: string;
}

export interface StateOption {
  /** Nombre para mostrar (sin sufijos en inglés tipo "Department"). */
  label: string;
  /** Nombre exacto que espera la API para pedir las ciudades. */
  apiName: string;
}

export interface ReverseGeocodeResult {
  country?: string;
  state?: string;
  city?: string;
  line1?: string;
  zipCode?: string;
  displayName?: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName?: string;
}

/** Geocodificación directa (dirección → coordenadas) con Nominatim. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const payload = await getJson<Array<{ lat: string; lon: string; display_name: string }>>(
    `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=1&accept-language=es&q=${encodeURIComponent(query)}`,
  );
  const first = Array.isArray(payload) ? payload[0] : undefined;
  if (!first) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return { latitude, longitude, displayName: first.display_name };
}

/** Lista de respaldo si la API de países no responde. */
const FALLBACK_COUNTRIES: CountryOption[] = [
  { name: 'Colombia', iso2: 'CO' },
  { name: 'México', iso2: 'MX' },
  { name: 'Argentina', iso2: 'AR' },
  { name: 'Chile', iso2: 'CL' },
  { name: 'Perú', iso2: 'PE' },
  { name: 'Ecuador', iso2: 'EC' },
  { name: 'Brasil', iso2: 'BR' },
  { name: 'Venezuela', iso2: 'VE' },
  { name: 'Panamá', iso2: 'PA' },
  { name: 'Costa Rica', iso2: 'CR' },
  { name: 'Uruguay', iso2: 'UY' },
  { name: 'Paraguay', iso2: 'PY' },
  { name: 'Bolivia', iso2: 'BO' },
  { name: 'Guatemala', iso2: 'GT' },
  { name: 'República Dominicana', iso2: 'DO' },
  { name: 'España', iso2: 'ES' },
  { name: 'Estados Unidos', iso2: 'US' },
];

/** Quita sufijos en inglés comunes en los estados ("Antioquia Department"). */
export function cleanStateName(name: string): string {
  return name.replace(/\s+(Department|State|Province|Region|District|Prefecture|Canton)$/i, '').trim();
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchCountries(): Promise<CountryOption[]> {
  try {
    const payload = await getJson<{ error: boolean; data: Array<{ name: string; Iso2: string }> }>(COUNTRIES_URL);
    if (payload.error || !Array.isArray(payload.data)) return FALLBACK_COUNTRIES;
    return payload.data
      .map((item) => ({ name: item.name, iso2: item.Iso2 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return FALLBACK_COUNTRIES;
  }
}

export async function fetchStates(country: string): Promise<StateOption[]> {
  const payload = await getJson<{
    error: boolean;
    data: { states: Array<{ name: string; state_code: string }> };
  }>(`${STATES_URL}?country=${encodeURIComponent(country)}`);

  if (payload.error || !payload.data?.states) return [];
  return payload.data.states.map((state) => ({
    label: cleanStateName(state.name),
    apiName: state.name,
  }));
}

export async function fetchCities(country: string, stateApiName: string): Promise<string[]> {
  const payload = await getJson<{ error: boolean; data: string[] }>(
    `${CITIES_URL}?country=${encodeURIComponent(country)}&state=${encodeURIComponent(stateApiName)}`,
  );
  if (payload.error || !Array.isArray(payload.data)) return [];
  return payload.data;
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const payload = await getJson<{
    address?: Record<string, string>;
    display_name?: string;
  }>(`${NOMINATIM_URL}?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`);

  const address = payload.address ?? {};
  const road = [address.road, address.house_number].filter(Boolean).join(' ').trim();

  return {
    country: address.country,
    state: address.state,
    city: address.city ?? address.town ?? address.village ?? address.municipality,
    line1: road || undefined,
    zipCode: address.postcode,
    displayName: payload.display_name,
  };
}

export interface BrowserLocation {
  latitude: number;
  longitude: number;
}

export function getBrowserLocation(): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Tu navegador no soporta geolocalización.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Permiso de ubicación denegado.'));
        } else {
          reject(new Error('No pudimos obtener tu ubicación.'));
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
