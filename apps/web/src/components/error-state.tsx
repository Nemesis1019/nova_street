import { Button, Stack, Text, Title } from '@mantine/core';

interface ErrorStateProps {
  title?: string;
  description?: string;
  reset?: () => void;
}

export function ErrorState({
  title = 'Algo salió mal',
  description = 'No pudimos cargar esta sección. Intentá de nuevo en unos segundos.',
  reset,
}: ErrorStateProps) {
  return (
    <Stack align="center" justify="center" py="xl" gap="xs">
      <Title order={4} ta="center" fw={600} style={{ fontFamily: 'var(--var-bebas-neue)' }}>
        {title}
      </Title>
      <Text ta="center" c="dimmed" size="sm">
        {description}
      </Text>
      {reset && (
        <Button onClick={reset} variant="outline" mt="sm">
          Reintentar
        </Button>
      )}
    </Stack>
  );
}
