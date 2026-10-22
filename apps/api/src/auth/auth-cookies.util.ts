import type { Request, Response } from 'express';

import { cookieSameSite } from '../common/cors-policy.service';
import { getCurrentTenantSlug } from '../tenant/tenant-runtime';

const REFRESH_TOKEN_COOKIE_BASE = 'refresh_token';
const TRUSTED_DEVICE_COOKIE_BASE = 'trusted_device';
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;
const TRUSTED_DEVICE_MAX_AGE_MS = 30 * ONE_DAY_MS;

/**
 * Aislamiento de sesiones por cliente: el storefront y el admin comparten host
 * (localhost en dev, mismo dominio en prod), y las cookies NO distinguen
 * puertos, así que ambos reutilizaban la misma cookie de refresh y una app
 * "heredaba" la sesión de la otra. Cada app envía `X-Client` (`store`/`admin`)
 * y la API usa una cookie distinta por cliente.
 */
const CLIENT_HEADER = 'x-client';
const ADMIN_COOKIE_PREFIX = 'admin_';
const TENANT_COOKIE_SEPARATOR = '__';

export function isAdminClient(req: Request): boolean {
  const header = req.headers[CLIENT_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.toLowerCase() === 'admin';
}

/** Sufijo por tenant para que las sesiones de distintos clientes no colisionen. */
export function tenantCookieSuffix(slug?: string | null): string {
  const value = slug === undefined ? getCurrentTenantSlug() : slug;
  return value ? `${TENANT_COOKIE_SEPARATOR}${value}` : '';
}

export function refreshCookieBase(
  req: Request,
  slug?: string | null,
  client?: 'admin' | 'store',
): string {
  const admin = client ? client === 'admin' : isAdminClient(req);
  const base = admin ? `${ADMIN_COOKIE_PREFIX}${REFRESH_TOKEN_COOKIE_BASE}` : REFRESH_TOKEN_COOKIE_BASE;
  return `${base}${tenantCookieSuffix(slug)}`;
}

export function trustedDeviceCookieBase(req: Request, slug?: string | null): string {
  const base = isAdminClient(req)
    ? `${ADMIN_COOKIE_PREFIX}${TRUSTED_DEVICE_COOKIE_BASE}`
    : TRUSTED_DEVICE_COOKIE_BASE;
  return `${base}${tenantCookieSuffix(slug)}`;
}

/**
 * Estándar de cookies: en producción se usa el prefijo `__Host-` (cookie ligada
 * al origen: requiere Secure + Path=/ y sin Domain). En desarrollo se mantiene
 * el nombre simple con Path=/auth para no romper http://localhost.
 */
export function refreshCookieName(req: Request, slug?: string | null, client?: 'admin' | 'store'): string {
  const base = refreshCookieBase(req, slug, client);
  return process.env.NODE_ENV === 'production' ? `__Host-${base}` : base;
}

export function trustedDeviceCookieName(req: Request, slug?: string | null): string {
  const base = trustedDeviceCookieBase(req, slug);
  return process.env.NODE_ENV === 'production' ? `__Host-${base}` : base;
}

export function authCookiePath(): string {
  return process.env.NODE_ENV === 'production' ? '/' : '/auth';
}

export function refreshTokenCookieMaxAge(
  expiration = process.env.JWT_REFRESH_EXPIRATION ?? '7d',
): number {
  const value = parseInt(expiration, 10);
  const unit = expiration.replace(/\d+/g, '').trim();

  switch (unit) {
    case 'd':
      return value * ONE_DAY_MS;
    case 'h':
      return value * 60 * 60 * 1_000;
    case 'm':
      return value * 60 * 1_000;
    default:
      return 7 * ONE_DAY_MS;
  }
}

interface RefreshCookieOptions {
  remember?: boolean;
  /** Tenant explícito (impersonación); por defecto el tenant del request. */
  tenantSlug?: string | null;
  client?: 'admin' | 'store';
  maxAge?: number;
}

export function setRefreshTokenCookie(
  req: Request,
  res: Response,
  token: string,
  options: RefreshCookieOptions = {},
): void {
  const remember = options.remember ?? true;
  // Dominios propios (cross-site con la API) requieren SameSite=None + Secure;
  // los subdominios de la plataforma siguen en Strict.
  const sameSite = cookieSameSite(req);
  res.cookie(refreshCookieName(req, options.tenantSlug, options.client), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: authCookiePath(),
    // "Recordarme" = cookie persistente; sin recordar, cookie de sesión (se borra al cerrar el navegador).
    ...(remember ? { maxAge: options.maxAge ?? refreshTokenCookieMaxAge() } : {}),
  });
}

export function setTrustedDeviceCookie(
  req: Request,
  res: Response,
  token: string,
  tenantSlug?: string | null,
): void {
  const sameSite = cookieSameSite(req);
  res.cookie(trustedDeviceCookieName(req, tenantSlug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
    sameSite,
    path: authCookiePath(),
    maxAge: TRUSTED_DEVICE_MAX_AGE_MS,
  });
}

export function getRefreshTokenFromRequest(req: Request, tenantSlug?: string | null): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return (
    cookies?.[refreshCookieName(req, tenantSlug)] ??
    cookies?.[refreshCookieBase(req, tenantSlug)]
  );
}

export function getTrustedDeviceFromRequest(req: Request, tenantSlug?: string | null): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return (
    cookies?.[trustedDeviceCookieName(req, tenantSlug)] ??
    cookies?.[trustedDeviceCookieBase(req, tenantSlug)]
  );
}

export function clearRefreshTokenCookie(req: Request, res: Response, tenantSlug?: string | null): void {
  // Limpia ambos nombres (prod/dev) del cliente actual y ambos paths (cubre cambios de entorno/nombre).
  for (const name of new Set([refreshCookieName(req, tenantSlug), refreshCookieBase(req, tenantSlug)])) {
    for (const path of new Set([authCookiePath(), '/auth'])) {
      res.clearCookie(name, { path });
    }
  }
}
