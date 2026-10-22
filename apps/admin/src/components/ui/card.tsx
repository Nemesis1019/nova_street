import { motion } from 'framer-motion';
import { ReactNode } from 'react';

import { Icon } from './icon';
import { fadeInUp } from './motion';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl bg-surface-container-lowest p-6 shadow-sm ${className}`}>{children}</div>
  );
}

interface SectionTitleProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionTitle({ icon, title, subtitle, actions, className = '' }: SectionTitleProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container">
            <Icon name={icon} className="text-[18px] text-on-surface" />
          </div>
        )}
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h2>
          {subtitle && <p className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} className="text-[24px]" />
      </div>
      <p className="font-headline-sm text-headline-sm text-on-surface">{title}</p>
      {description && <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
