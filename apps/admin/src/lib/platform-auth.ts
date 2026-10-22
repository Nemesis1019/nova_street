import { getAuthToken, setAuthToken, setPlatformRefreshHandler } from './api';
import { clearTokens, setAccessToken } from './auth';
import { getAdminTenantSlug } from './tenant';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface PlatformUser {
  id: string;
  email: string | null;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  legacy?: boolean;
}

let platformToken: string | undefined;
let stepUpToken: string | undefined;

export function getPlatformToken(): string | undefined {
  return platformToken;
}

/**
 * El token de plataforma es también la sesión de los módulos de tienda: el
 * backend lo acepta en cualquier tenant y resuelve un usuario espejo, así que
 * el superadmin mantiene su identidad al cambiar de cliente.
 */
function applyPlatformToken(token?: string): void {
  platformToken = token;
  if (token) {
    setAuthToken(token);
    setAccessToken(token);
  }
}

/** Token de 10 min que evita pedir la contraseña en cada cambio de cliente. */
export function getStepUpToken(): string | undefined {
  return stepUpToken;
}

function tenantHeader(): Record<string, string> {
  const tenant = getAdminTenantSlug();
  return tenant ? { 'X-Tenant': tenant } : {};
}

async function errorMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (Array.isArray(data.message)) return data.message.join(', ');
  return data.message ?? `Error ${res.status}`;
}

/**
 * Llamadas a /platform/* con la sesión de plataforma si existe; si no, cae al
 * token del tenant (modo legacy de desarrollo).
 */
export async function platformRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const doFetch = () => {
    const token = platformToken ?? getAuthToken();
    return fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Client': 'admin',
        ...tenantHeader(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  };

  let res = await doFetch();

  // Access token de plataforma vencido → renovar con la cookie y reintentar.
  if (res.status === 401 && platformToken) {
    const user = await restorePlatformSession();
    if (user) res = await doFetch();
  }

  if (!res.ok) throw new Error(await errorMessage(res));
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

interface LoginResponse {
  accessToken?: string;
  stepUpToken?: string;
  user?: PlatformUser;
  twoFactorRequired?: boolean;
  challengeToken?: string;
}

async function postAuth(path: string, body: unknown): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Client': 'admin', ...tenantHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as LoginResponse;
}

export async function loginPlatform(
  email: string,
  password: string,
  code?: string,
): Promise<LoginResponse> {
  const data = await postAuth('/platform/auth/login', { email, password, ...(code ? { code } : {}) });
  if (!data.twoFactorRequired && data.accessToken) {
    applyPlatformToken(data.accessToken);
    stepUpToken = data.stepUpToken;
  }
  return data;
}

export async function verifyPlatformTwoFactor(
  challengeToken: string,
  code: string,
): Promise<PlatformUser | null> {
  const data = await postAuth('/platform/auth/login/2fa', { challengeToken, code });
  if (data.accessToken) applyPlatformToken(data.accessToken);
  stepUpToken = data.stepUpToken;
  return data.user ?? null;
}

/** Confirma la contraseña del operador y renueva el token de step-up. */
export async function stepUpPlatform(password: string): Promise<void> {
  if (!platformToken) throw new Error('No hay sesión de plataforma');
  const res = await fetch(`${baseUrl}/platform/auth/step-up`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Client': 'admin',
      ...tenantHeader(),
      Authorization: `Bearer ${platformToken}`,
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const data = (await res.json()) as { stepUpToken?: string };
  stepUpToken = data.stepUpToken;
}

export async function restorePlatformSession(): Promise<PlatformUser | null> {
  try {
    const res = await fetch(`${baseUrl}/platform/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Client': 'admin', ...tenantHeader() },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LoginResponse;
    if (!data.accessToken) return null;
    applyPlatformToken(data.accessToken);
    // El refresh no emite step-up: se pide la contraseña al impersonar.
    stepUpToken = undefined;
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function logoutPlatform(): Promise<void> {
  try {
    await fetch(`${baseUrl}/platform/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Client': 'admin', ...tenantHeader() },
    });
  } finally {
    platformToken = undefined;
    stepUpToken = undefined;
    setAuthToken(undefined);
    clearTokens();
  }
}

// Cuando el api-client recibe 401, primero intenta refrescar la sesión de
// plataforma (el token es la sesión de los módulos de tienda).
setPlatformRefreshHandler(async () => {
  if (!platformToken) return null;
  const user = await restorePlatformSession();
  return user ? (platformToken ?? null) : null;
});
