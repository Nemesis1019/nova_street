'use client';

import { Loader, Stack } from '@mantine/core';
import dynamic from 'next/dynamic';

const CustomizerEditor = dynamic(
  () => import('../../../components/customizer/customizer-editor').then((mod) => mod.CustomizerEditor),
  {
    ssr: false,
    loading: () => (
      <Stack align="center" justify="center" py="xl">
        <Loader color="dark" />
      </Stack>
    ),
  },
);

interface CustomizerEditorWrapperProps {
  templateId: string;
}

export function CustomizerEditorWrapper({ templateId }: CustomizerEditorWrapperProps) {
  return <CustomizerEditor templateId={templateId} />;
}
