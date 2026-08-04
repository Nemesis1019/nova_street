import { Container } from '@mantine/core';

import { StoreFooter } from '../../../components/store-footer';
import { StoreHeader } from '../../../components/store-header';
import { CustomizerEditorWrapper } from './customizer-editor-wrapper';

export const metadata = {
  title: 'Editor de personalización',
};

export default async function CustomizerPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '96px 16px 128px' }}>
        <Container size="xl" px={0}>
          <CustomizerEditorWrapper templateId={templateId} />
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
