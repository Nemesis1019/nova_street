'use client';

import { Stack, Text, Title } from '@mantine/core';

import { AccountLayout } from '../../../components/account-layout';
import { WishlistContent } from '../../../components/wishlist-content';

export default function AccountWishlistPage() {
  return (
    <AccountLayout>
      <Stack gap="xl">
        <Stack gap="xs">
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Mi cuenta
          </Text>
          <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            MIS FAVORITOS
          </Title>
        </Stack>
        <WishlistContent />
      </Stack>
    </AccountLayout>
  );
}
