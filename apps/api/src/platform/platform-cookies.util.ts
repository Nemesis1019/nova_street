import { createHash, randomBytes } from 'node:crypto';

import type { Request, Response } from 'express';

const REFRESH_COOKIE = 'platform_refresh_token';

function cookiePath(): string {
  return process.env.NODE_ENV === 'production' ? '/' : '/platform/auth';
}

function cookieName(): string {
  return process.env.NODE_ENV === 'production' ? `__Host-${REFRESH_COOKIE}` : REFRESH_COOKIE;
}

export function platformRefreshExpiresAt(): Date {
  const expiration = process.env.PLATFORM_REFRESH_EXPIRATION ?? '7d';
  const value = parseInt(expiration, 10) || 7;
  const unit = expiration.replace(/\d+/g, '').trim();
  const dayMs = 24 * 60 * 60 * 1_000;
  const ms = unit === 'h' ? value * 60 * 60 * 1_000 : unit === 'm' ? value * 60 * 1_000 : value * dayMs;
  return new Date(Date.now() + ms);
}

export function hashPlatformToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newPlatformRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

export function setPlatformRefreshCookie(res: Response, token: string): void {
  res.cookie(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: cookiePath(),
    maxAge: platformRefreshExpiresAt().getTime() - Date.now(),
  });
}

export function getPlatformRefreshToken(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.[cookieName()];
}

export function clearPlatformRefreshCookie(res: Response): void {
  for (const name of new Set([cookieName(), REFRESH_COOKIE])) {
    for (const path of new Set([cookiePath(), '/platform/auth', '/'])) {
      res.clearCookie(name, { path });
    }
  }
}
