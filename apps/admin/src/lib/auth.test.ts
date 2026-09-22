import { beforeEach, describe, expect, it } from 'vitest';

import { clearTokens, getAccessToken, setAccessToken } from './auth';

describe('auth utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when token is not set', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and retrieves access token', () => {
    setAccessToken('access-123');
    expect(getAccessToken()).toBe('access-123');
  });

  it('clears tokens', () => {
    setAccessToken('access-123');
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it('does not break when not in a browser environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate non-browser environment
    delete globalThis.window;

    expect(getAccessToken()).toBeNull();
    setAccessToken('a');
    expect(getAccessToken()).toBeNull();

    globalThis.window = originalWindow;
  });
});
