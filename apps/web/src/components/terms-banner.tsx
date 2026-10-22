'use client';

import { Button, Group, Text } from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { apiClient } from '../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../lib/notifications';
import { useStoreConfig } from '../providers/config-provider';
import { useAuthStore } from '../store/auth-store';

/**
 * Muestra un banner si el usuario autenticado no aceptó la versión vigente
 * de los términos y condiciones configurada en el admin.
 */
export function TermsBanner() {
  const { isAuthenticated, isHydrated, acceptedTermsVersion, setAcceptedTermsVersion } = useAuthStore();
  const config = useStoreConfig();
  const currentVersion = config.termsVersion ?? 1;
  const accepted = Number(acceptedTermsVersion ?? 0);

  const { data: pages } = useQuery({
    queryKey: ['public-pages'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/pages');
      // El endpoint devuelve `{ data: [...] }` (PageListResponseDto).
      return (data?.data ?? []) as Array<{ id: string; slug: string; title: string }>;
    },
    enabled: isAuthenticated && isHydrated && accepted < currentVersion && !!config.termsPageId,
  });

  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST('/auth/accept-terms', { body: {} as never });
      if (error) throw error;
    },
    onSuccess: () => {
      setAcceptedTermsVersion(String(currentVersion));
      notifySuccess({ title: 'Términos aceptados' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al aceptar términos', message: getApiErrorMessage(error) });
    },
  });

  if (!isHydrated || !isAuthenticated || accepted >= currentVersion) {
    return null;
  }

  const termsPage = pages?.find((page) => page.id === config.termsPageId);

  return (
    <div style={{ backgroundColor: '#fff4d6', borderBottom: '1px solid #e0a800', padding: '12px 16px' }}>
      <Group justify="center" gap="md" wrap="wrap">
        <Text size="sm" style={{ color: '#5f4500' }}>
          Actualizamos nuestros términos y condiciones.
        </Text>
        {termsPage && (
          <Text size="sm" component={Link} href={`/pagina/${termsPage.slug}`} style={{ textDecoration: 'underline', color: '#5f4500' }}>
            Leer términos
          </Text>
        )}
        <Button size="xs" onClick={() => accept.mutate()} loading={accept.isPending} style={{ backgroundColor: '#0d0d0d' }}>
          Aceptar
        </Button>
      </Group>
    </div>
  );
}
