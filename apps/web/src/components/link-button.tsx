import { Button, type ButtonProps } from '@mantine/core';
import Link from 'next/link';

interface LinkButtonProps extends ButtonProps {
  href: string;
  children: React.ReactNode;
}

export function LinkButton({ href, children, ...props }: LinkButtonProps) {
  return (
   
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  );
}