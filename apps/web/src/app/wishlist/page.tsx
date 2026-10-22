'use client';

import { Container, Title } from '@mantine/core';

import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { WishlistContent } from '../../components/wishlist-content';

export default function WishlistPage() {
  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="xl" px={0}>
          <Title order={1} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Mis favoritos
          </Title>
          <WishlistContent />
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
