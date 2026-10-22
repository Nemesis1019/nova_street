import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from './client';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createApiClient — middleware de refresh', () => {
  let calls: string[];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
        calls.push(`${method} ${url}`);

        if (url.includes('/auth/login')) return jsonResponse({ statusCode: 401 }, 401);
        if (url.includes('/auth/refresh')) return jsonResponse({ accessToken: 'refreshed' }, 200);
        if (url.includes('/cart')) return jsonResponse({ statusCode: 401 }, 401);
        return jsonResponse({}, 200);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no refresca la sesión cuando el login falla (401 de credenciales)', async () => {
    const onTokenRefreshed = vi.fn();
    const client = createApiClient({
      baseUrl: 'http://api.test',
      clientId: 'store',
      onTokenRefreshed,
    });

    const result = await client.POST('/auth/login', { body: {} as never });

    expect(result.response.status).toBe(401);
    expect(calls.some((call) => call.includes('/auth/refresh'))).toBe(false);
    expect(onTokenRefreshed).not.toHaveBeenCalled();
  });

  it('refresca y reintenta cuando un endpoint protegido responde 401', async () => {
    const onTokenRefreshed = vi.fn();
    const client = createApiClient({
      baseUrl: 'http://api.test',
      clientId: 'store',
      onTokenRefreshed,
    });

    await client.GET('/cart');

    expect(calls.filter((call) => call.includes('/auth/refresh'))).toHaveLength(1);
    expect(onTokenRefreshed).toHaveBeenCalledWith('refreshed');
    expect(calls.filter((call) => call.includes('/cart'))).toHaveLength(2);
  });
});
