'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { restoreSession } from '../lib/api';
import { getAccessToken, getCurrentUser } from '../lib/auth';
import { getAdminTenantSlug, isPlatformMode, setPlatformMode } from '../lib/tenant';
import { usePlatformSession } from '../providers/platform-provider';
import { AdminShell } from './admin-shell';
import { PlatformOnlyShell } from './platform/platform-only-shell';
import { MOTION_DURATION, MOTION_EASE, MotionProvider } from './ui/motion';

/**
 * Mantiene el AdminShell montado entre navegaciones (el layout no se desmonta).
 *
 * Sesiones:
 * - Superadmin de plataforma: su token es también la sesión de los módulos de
 *   tienda; el backend lo acepta en cualquier tenant (usuario espejo) y el
 *   `X-Tenant` define qué BD se consulta. Puede cambiar de cliente sin
 *   impersonar ni cambiar de cuenta.
 * - Admin local de un tenant: login/refresh normal contra su BD.
 *
 * Guard de rutas:
 * - Sin credenciales → login (`/`), salvo rutas públicas.
 * - Modo plataforma (sin cliente activo) → solo `/clients`.
 * - `/clients` requiere perfil de plataforma (o el legacy del SUPER_ADMIN del
 *   tenant por defecto en desarrollo); si no, dashboard.
 */
export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [booting, setBooting] = useState(true);
  const [authVersion, setAuthVersion] = useState(0);
  const { user: platformUser, ready: platformReady } = usePlatformSession();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!platformReady) return;
    let cancelled = false;

    (async () => {
      // Con sesión de plataforma el token ya es válido para cualquier tenant.
      // En modo plataforma no se restaura la sesión de un tenant.
      if (!getAccessToken() && !platformUser && !isPlatformMode()) {
        await restoreSession();
      }
      if (!cancelled) setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [platformReady, platformUser]);

  useEffect(() => {
    // Si el modo plataforma quedó activo pero la sesión expiró, se vuelve al
    // login sin restaurar silenciosamente la cookie de un tenant.
    if (platformReady && !platformUser && isPlatformMode()) {
      setPlatformMode(false);
      if (pathname !== '/' && pathname !== '/platform-login') router.replace('/');
    }
  }, [platformReady, platformUser, pathname, router]);

  useEffect(() => {
    const onAuthChange = () => setAuthVersion((version) => version + 1);
    window.addEventListener('admin-auth-change', onAuthChange);
    return () => window.removeEventListener('admin-auth-change', onAuthChange);
  }, []);

  void authVersion;

  const ready = isClient && !booting && platformReady;
  const hasTenantToken = ready ? Boolean(getAccessToken()) : false;
  const isPlatformRoute = pathname === '/clients' || pathname.startsWith('/clients/');
  const isLoginRoute = pathname === '/' || pathname === '/platform-login';
  const defaultTenant = process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'nova';

  // El perfil de plataforma autentica también los módulos de tienda.
  const hasSession =
    hasTenantToken || (ready && Boolean(platformUser) && !isPlatformMode());
  const legacyPlatformAllowed =
    hasTenantToken &&
    getCurrentUser().role === 'SUPER_ADMIN' &&
    getAdminTenantSlug() === defaultTenant;

  const needsLogin = ready && !hasSession && !isLoginRoute;
  const needsPlatformPanel =
    ready && Boolean(platformUser) && isPlatformMode() && !isPlatformRoute;
  const platformRouteDenied =
    ready && hasSession && isPlatformRoute && !platformUser && !legacyPlatformAllowed;

  useEffect(() => {
    if (!ready) return;
    if (needsLogin) {
      router.replace('/');
      return;
    }
    if (needsPlatformPanel) {
      router.replace('/clients');
      return;
    }
    if (platformRouteDenied) {
      router.replace('/dashboard');
      return;
    }
    if (platformUser && pathname === '/platform-login') {
      router.replace('/clients');
    }
  }, [
    ready,
    needsLogin,
    needsPlatformPanel,
    platformRouteDenied,
    platformUser,
    pathname,
    router,
  ]);

  if (!ready || needsLogin || needsPlatformPanel || platformRouteDenied) return null;

  if (platformUser && isPlatformMode()) {
    return <PlatformOnlyShell>{children}</PlatformOnlyShell>;
  }

  if (!hasSession) {
    return (
      <MotionProvider>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: MOTION_DURATION }}>
          {children}
        </motion.div>
      </MotionProvider>
    );
  }

  return (
    <MotionProvider>
      <AdminShell>
        {/* Transición de página: la clave por pathname reinicia la entrada en cada navegación */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
        >
          {children}
        </motion.div>
      </AdminShell>
    </MotionProvider>
  );
}
