'use client';

import { Container } from '@mantine/core';

import { ErrorState } from '../../../components/error-state';
import { StoreFooter } from '../../../components/store-footer';
import { StoreHeader } from '../../../components/store-header';

export default function CustomizerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="xl" px={0}>
          <ErrorState
            title="No se pudo cargar el diseño"
            description="La plantilla no está disponible o hubo un error al cargarla."
            reset={reset}
          />
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
