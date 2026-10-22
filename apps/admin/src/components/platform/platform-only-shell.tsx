'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useStoreConfig } from '../../providers/config-provider';
import { useTranslation } from '../../providers/i18n-provider';
import { usePlatformSession } from '../../providers/platform-provider';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { ClientSwitcher } from './client-switcher';

const PLATFORM_ROUTES = ['/clients'];

/**
 * Shell mínimo cuando el super admin está en el perfil de plataforma sin una
 * sesión de cliente activa: no muestra los módulos del tenant, solo el
 * selector de clientes y el panel de plataforma.
 */
export function PlatformOnlyShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const config = useStoreConfig();
  const { user, logout } = usePlatformSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const allowed = PLATFORM_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
    if (!allowed) router.replace('/clients');
  }, [pathname, router]);

  const handleLogout = async () => {
    await logout();
    // Se deja el flag de modo plataforma para que el boot no restaure
    // silenciosamente una cookie de tenant; AdminFrame lo limpia al no haber
    // sesión de plataforma y muestra el login.
    window.location.href = '/';
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name="shield_person" className="text-[19px]" />
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-label-md text-label-md text-on-surface">
                {t('header.platformProfile')}
              </span>
              <span className="truncate font-label-sm text-[11px] text-on-surface-variant">
                {config.name} · {t('header.platformOnlySubtitle')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <ClientSwitcher enabled alwaysVisible />
            <Link
              href="/clients"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low md:flex"
            >
              <Icon name="dns" className="text-[17px]" />
              {t('header.platformClients')}
            </Link>
            <div className="hidden flex-col items-end sm:flex">
              <span className="max-w-[180px] truncate font-label-sm text-label-sm text-on-surface">
                {user?.email ?? ''}
              </span>
              <span className="font-label-sm text-[10px] uppercase tracking-wide text-on-surface-variant">
                {user?.role ?? ''}
              </span>
            </div>
            <Button variant="ghost" icon="logout" onClick={() => void handleLogout()}>
              <span className="hidden sm:inline">{t('header.platformLogout')}</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-screen w-full bg-surface pt-16">
        <div className="flex w-full flex-col px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </>
  );
}
