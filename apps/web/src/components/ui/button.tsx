'use client';

import { Button, type ButtonProps } from '@mantine/core';
import { IconArrowForward, IconArrowLeft, IconLogout, type IconProps,IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { ReactNode } from 'react';

type IconName = 'arrow-forward' | 'arrow-left' | 'logout' | 'x';

const icons: Record<IconName, React.FC<IconProps>> = {
  'arrow-forward': IconArrowForward,
  'arrow-left': IconArrowLeft,
  logout: IconLogout,
  x: IconX,
};

interface UiButtonProps extends ButtonProps {
  href?: string;
  iconLeft?: IconName;
  iconRight?: IconName;
  children: ReactNode;
}

export function UiButton({ href, iconLeft, iconRight, children, ...props }: UiButtonProps) {
  const LeftIcon = iconLeft ? icons[iconLeft] : null;
  const RightIcon = iconRight ? icons[iconRight] : null;

  const buttonProps: ButtonProps = {
    leftSection: LeftIcon ? <LeftIcon size={18} /> : undefined,
    rightSection: RightIcon ? <RightIcon size={18} /> : undefined,
    ...props,
  };

  if (href) {
    return (
      <Button component={Link} href={href} {...buttonProps}>
        {children}
      </Button>
    );
  }

  return <Button {...buttonProps}>{children}</Button>;
}

export function PrimaryButton(props: Omit<UiButtonProps, 'variant'>) {
  return (
    <UiButton
      {...props}
      style={{
        backgroundColor: '#0d0d0d',
        color: '#fcf9f8',
        fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
        letterSpacing: '0.05em',
        ...props.style,
      }}
    />
  );
}

export function OutlineButton(props: Omit<UiButtonProps, 'variant'>) {
  return (
    <UiButton
      {...props}
      variant="outline"
      style={{
        borderColor: '#0d0d0d',
        color: '#0d0d0d',
        fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
        letterSpacing: '0.05em',
        ...props.style,
      }}
    />
  );
}
