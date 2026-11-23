/**
 * Tenant que administra el panel. Hoy es el cliente por defecto (la tienda
 * actual); el valor se guarda en localStorage para permitir un selector de
 * clientes a futuro sin cambiar el resto del código.
 */
const STORAGE_KEY = 'nova-admin-tenant';
const PLATFORM_MODE_KEY = 'nova-admin-platform-mode';
const PLATFORM_SESSION_KEY = 'nova-admin-platform-session';

export function getAdminTenantSlug(): string | undefined {
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'nova';
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(STORAGE_KEY) || fallback;
}

export function setAdminTenantSlug(slug: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, slug);
}

/**
 * Modo plataforma: el super admin está en el panel transversal (sin una
 * sesión de tenant activa). Al elegir un cliente se sale del modo y se abre
 * la sesión impersonada de ese cliente.
 */
export function isPlatformMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PLATFORM_MODE_KEY) === '1';
}

export function setPlatformMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.setItem(PLATFORM_MODE_KEY, '1');
  else window.localStorage.removeItem(PLATFORM_MODE_KEY);
}

/**
 * Marca que la sesión activa es de plataforma, incluso después de entrar a un
 * cliente (cuando `isPlatformMode()` vuelve a false). Permite restaurar solo
 * `/platform/auth/refresh` y no disparar además `/auth/refresh`.
 */
export function isPlatformSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PLATFORM_SESSION_KEY) === '1';
}

export function setPlatformSession(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.setItem(PLATFORM_SESSION_KEY, '1');
  else window.localStorage.removeItem(PLATFORM_SESSION_KEY);
}
