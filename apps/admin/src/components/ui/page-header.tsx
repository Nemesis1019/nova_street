import Link from 'next/link';
import { ReactNode } from 'react';

import { Icon } from './icon';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  overline?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({ overline, title, subtitle, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <Icon name="chevron_right" className="text-[14px] text-outline" />}
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-on-surface">
                  {item.label}
                </Link>
              ) : (
                <span className={index === breadcrumb.length - 1 ? 'font-medium text-on-surface' : ''}>
                  {item.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1">
          {overline}
          <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface">{title}</h1>
          {subtitle && <p className="font-body-md text-body-md text-on-surface-variant">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
