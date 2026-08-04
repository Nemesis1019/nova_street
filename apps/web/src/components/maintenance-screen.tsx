import { Container, Stack, Text, Title } from '@mantine/core';

import type { StoreConfig } from '../providers/config-provider';

interface MaintenanceScreenProps {
  config: StoreConfig;
}

export function MaintenanceScreen({ config }: MaintenanceScreenProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: config.backgroundColor || '#fcf9f8',
        color: config.textColor || '#0d0d0d',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <Container size="sm">
        <Stack gap="lg">
          <Title
            order={1}
            style={{
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              fontSize: 'clamp(48px, 8vw, 96px)',
              lineHeight: 0.9,
            }}
          >
            {config.name}
          </Title>
          <Text size="lg" style={{ lineHeight: 1.6 }}>
            {config.maintenanceMessage || 'Estamos realizando tareas de mantenimiento. Volvemos pronto.'}
          </Text>
          <Text size="sm" c="dimmed">
            Disculpá las molestias.
          </Text>
        </Stack>
      </Container>
    </div>
  );
}
