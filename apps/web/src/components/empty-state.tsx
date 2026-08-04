import { Button, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({
  title = 'No hay resultados',
  description = 'Todavía no hay datos para mostrar en esta sección.',
  action,
}: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" py="xl" gap="xs">
      <Title order={4} ta="center" fw={600} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {title}
      </Title>
      <Text ta="center" c="dimmed" size="sm">
        {description}
      </Text>
      {action && (
        <Button component={Link} href={action.href} variant="outline" mt="sm">
          {action.label}
        </Button>
      )}
    </Stack>
  );
}
