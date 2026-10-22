'use client';

import { Stack, Text, Title } from '@mantine/core';

import { useTranslation } from '../providers/i18n-provider';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('common.emptyTitle');
  const resolvedDescription = description ?? t('common.emptyDescription');

  return (
    <Stack align="center" justify="center" py="xl" gap="xs">
      <Title order={4} ta="center" fw={600}>
        {resolvedTitle}
      </Title>
      <Text ta="center" c="dimmed" size="sm">
        {resolvedDescription}
      </Text>
    </Stack>
  );
}
