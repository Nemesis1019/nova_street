/**
 * Manejo de sesión del admin.
 *
 * El **access token vive solo en memoria** (nunca en localStorage/sessionStorage).
 * El **refresh token** viaja en una cookie httpOnly (`refresh_token` /
 * `__Host-refresh_token` en producción) y la sesión se restaura al cargar la app
 * llamando a `restoreSession()` (ver `lib/api.ts`).
 */
import { getAdminTenantSlug } from './tenant';

let accessToken: string | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearTokens() {
  accessToken = null;
}

/**
 * Cierra la sesión: revoca el refresh token en el backend (y limpia la cookie),
 * después limpia el token en memoria y vuelve al login.
 */
export async function logout() {
  const token = accessToken;
  try {
    const tenant = getAdminTenantSlug();
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Client': 'admin',
        ...(tenant ? { 'X-Tenant': tenant } : {}),
      },
    });
  } catch {
    // Best effort: aunque falle la revocación, cerramos la sesión local.
  }
  clearTokens();
  if (isBrowser()) {
    window.location.href = '/';
  }
}

export interface CurrentUser {
  name: string;
  email: string;
  role: string;
}

/**
 * Decodifica el payload del access token (sin verificar firma) para mostrar
 * el usuario en el shell. Si no hay token o no se puede leer, usa valores por defecto.
 */
export function getCurrentUser(): CurrentUser {
  const fallback: CurrentUser = { name: 'Admin Tienda', email: 'admin@nova.co', role: 'ADMIN' };
  const token = getAccessToken();
  if (!token || !isBrowser()) return fallback;

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return fallback;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(window.atob(padded)) as {
      email?: string;
      role?: string;
      name?: string;
      scope?: string;
    };
    return {
      name: payload.name ?? payload.email?.split('@')[0] ?? fallback.name,
      email: payload.email ?? fallback.email,
      // Los superadmins de plataforma operan con permisos completos en cada tenant.
      role: payload.scope === 'platform' ? 'SUPER_ADMIN' : (payload.role ?? fallback.role),
    };
  } catch {
    return fallback;
  }
}
