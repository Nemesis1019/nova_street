import { beforeEach, describe, expect, it } from 'vitest';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth';

describe('auth utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when tokens are not set', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('stores and retrieves tokens', () => {
    setTokens('access-123', 'refresh-456');
    expect(getAccessToken()).toBe('access-123');
    expect(getRefreshToken()).toBe('refresh-456');
  });

  it('clears tokens', () => {
    setTokens('access-123', 'refresh-456');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('does not break when not in a browser environment', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate non-browser environment
    delete globalThis.window;

    expect(getAccessToken()).toBeNull();
    setTokens('a', 'b');
    expect(getAccessToken()).toBeNull();

    globalThis.window = originalWindow;
  });
});
