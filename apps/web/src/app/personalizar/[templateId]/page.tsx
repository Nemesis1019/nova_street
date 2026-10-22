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
      <CustomizerEditorWrapper templateId={templateId} />
      <StoreFooter />
    </>
  );
}
