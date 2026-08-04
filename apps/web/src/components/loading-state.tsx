import { Center, Loader, Text } from '@mantine/core';

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <Center py="xl" style={{ flexDirection: 'column', gap: 12 }}>
      <Loader color="dark" size="md" />
      <Text size="sm" c="dimmed">
        {message}
      </Text>
    </Center>
  );
}
