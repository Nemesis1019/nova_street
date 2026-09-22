import { Badge, Button, Container, Grid, GridCol, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { apiClient } from '../../lib/api';
import type { DesignTemplate } from '../../lib/customizer-types';

export const metadata = {
  title: 'Personalizar',
};

export default async function CustomizePage() {
  let templates: DesignTemplate[] = [];
  try {
    const { data } = await apiClient.GET('/design-templates');
    templates = (data ?? []) as DesignTemplate[];
  } catch {
    templates = [];
  }

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8' }}>
        <section style={{ padding: '96px 16px 48px', borderBottom: '1px solid #0d0d0d' }}>
          <Container size="xl" px={0}>
            <Stack gap="xs">
              <Text
                size="xs"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Studio NÖVA
              </Text>
              <Title
                order={1}
                style={{
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                  fontSize: 'clamp(48px, 8vw, 96px)',
                  lineHeight: 0.9,
                }}
              >
                CREA TU PROPIO DISEÑO.
              </Title>
              <Text size="lg" c="dimmed" maw={600}>
                Elegí una prenda base, subí tu imagen y posicionala exactamente donde querés.
              </Text>
            </Stack>
          </Container>
        </section>

        <section style={{ padding: '64px 16px 128px' }}>
          <Container size="xl" px={0}>
            {templates.length === 0 && (
              <Text c="dimmed">No hay plantillas de personalización disponibles.</Text>
            )}
            <Grid gap="xl">
              {templates.map((template) => (
                <GridCol span={{ base: 12, sm: 6, lg: 4 }} key={template.id}>
                  <div style={{ border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
                    <div
                      style={{
                        aspectRatio: '4/3',
                        backgroundImage: `url(${template.baseImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderBottom: '1px solid #0d0d0d',
                      }}
                    />
                    <Stack gap="md" p="lg">
                      <div>
                        <Badge variant="outline" color="dark" radius={0} mb="xs">
                          {template.garmentType}
                        </Badge>
                        <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                          {template.name}
                        </Title>
                        <Text size="sm" c="dimmed">
                          Desde ${template.basePrice.toLocaleString()}
                        </Text>
                      </div>
                      <Link href={`/personalizar/${template.id}`} passHref legacyBehavior>
                        <Button
                          component="a"
                          fullWidth
                          style={{
                            backgroundColor: '#0d0d0d',
                            color: '#fcf9f8',
                            fontFamily: 'var(--font-bebas-neue)',
                          }}
                        >
                          Personalizar
                        </Button>
                      </Link>
                    </Stack>
                  </div>
                </GridCol>
              ))}
            </Grid>
          </Container>
        </section>
      </main>
      <StoreFooter />
    </>
  );
}
