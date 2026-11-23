export type ActiveLinkEffect = 'underline' | 'pill' | 'none';

export interface ActiveLinkConfig {
  effect: ActiveLinkEffect;
  animate: boolean;
}

export const DEFAULT_ACTIVE_LINK: ActiveLinkConfig = {
  effect: 'underline',
  animate: true,
};

export function isPathActive(pathname: string, href: string): boolean {
  const target = href.split('?')[0] || '/';
  if (target === '/') return pathname === '/';
  if (target.startsWith('/catalogo')) {
    return pathname.startsWith('/catalogo') || pathname.startsWith('/producto');
  }
  if (target.startsWith('/personalizar')) return pathname.startsWith('/personalizar');
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function activeLinkClass(config?: Partial<ActiveLinkConfig> | null): string {
  const effect = config?.effect ?? DEFAULT_ACTIVE_LINK.effect;
  const animate = config?.animate ?? DEFAULT_ACTIVE_LINK.animate;
  return `sf-nav-link sf-nav-link--${effect}${animate ? ' sf-nav-link--animated' : ' sf-nav-link--static'}`;
}
