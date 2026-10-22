'use client';

import { Center, Loader, Text } from '@mantine/core';

import { useTranslation } from '../providers/i18n-provider';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useTranslation();

  return (
    <Center py="xl" style={{ flexDirection: 'column', gap: 12 }}>
      <Loader color="dark" size="md" />
      <Text size="sm" c="dimmed">
        {message ?? t('common.loading')}
      </Text>
    </Center>
  );
}
