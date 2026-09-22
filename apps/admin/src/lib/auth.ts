const ACCESS_TOKEN_KEY = 'admin_access_token';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getAccessToken(): string | null {
  return isBrowser() ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
}

export function setAccessToken(accessToken: string) {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens() {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function logout() {
  clearTokens();
  if (isBrowser()) {
    window.location.href = '/';
  }
}
