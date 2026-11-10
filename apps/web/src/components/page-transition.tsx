'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode,useEffect, useRef } from 'react';

/**
 * Transición de entrada por ruta. Solo opacidad y solo en navegación cliente:
 * la carga inicial no se oculta para no afectar LCP.
 */
export function PageTransition({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const animate = enabled && pathname !== previousPathname.current;

  useEffect(() => {
    previousPathname.current = pathname;
  }, [pathname]);

  if (!enabled) return <>{children}</>;

  return (
    <div key={pathname} className={animate ? 'sf-page-transition' : undefined}>
      {children}
    </div>
  );
}
