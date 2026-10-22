import { beforeEach, describe, expect, it } from 'vitest';

import { clearTokens, getAccessToken, setAccessToken } from './auth';

describe('auth utilities', () => {
  beforeEach(() => {
    clearTokens();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns null when token is not set', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and retrieves the access token in memory', () => {
    setAccessToken('access-123');
    expect(getAccessToken()).toBe('access-123');
  });

  it('never persists the token in localStorage or sessionStorage', () => {
    setAccessToken('access-123');
    expect(localStorage.getItem('admin_access_token')).toBeNull();
    expect(sessionStorage.getItem('admin_access_token')).toBeNull();
  });

  it('clears tokens', () => {
    setAccessToken('access-123');
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });
});
