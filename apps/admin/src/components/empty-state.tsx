import { Stack, Text, Title } from '@mantine/core';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({
  title = 'No hay resultados',
  description = 'Todavía no hay datos para mostrar en esta sección.',
}: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" py="xl" gap="xs">
      <Title order={4} ta="center" fw={600}>
        {title}
      </Title>
      <Text ta="center" c="dimmed" size="sm">
        {description}
      </Text>
    </Stack>
  );
}
