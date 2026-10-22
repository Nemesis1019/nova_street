'use client';

import { motion } from 'framer-motion';
import { ComponentProps, ReactNode } from 'react';

import { Icon } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-surface-tint shadow-md px-4 py-2',
  secondary: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low shadow-sm px-3.5 py-2',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface px-3 py-2',
  danger: 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error px-3.5 py-2',
};

interface ButtonProps extends Omit<ComponentProps<typeof motion.button>, 'children'> {
  variant?: ButtonVariant;
  icon?: string;
  iconClassName?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  icon,
  iconClassName = 'text-[18px]',
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-label-md text-label-md transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} className={iconClassName} />}
      {children}
    </motion.button>
  );
}
