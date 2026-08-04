'use client';

import { Anchor, AnchorProps } from '@mantine/core';
import Link from 'next/link';
import { ReactNode } from 'react';

interface LinkAnchorProps extends AnchorProps {
  href: string;
  children: ReactNode;
  onClick?: () => void;
  target?: string;
  rel?: string;
}

export function LinkAnchor({ href, children, onClick, target, rel, ...props }: LinkAnchorProps) {
  return (
    <Anchor component={Link} href={href} onClick={onClick} target={target} rel={rel} {...props}>
      {children}
    </Anchor>
  );
}
