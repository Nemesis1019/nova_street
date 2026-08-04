'use client';

import { ActionIcon, Button, FileInput, Group, Image, Rating, Stack, Text, Textarea, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { apiClient } from '../../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';
import { useTranslation } from '../../../providers/i18n-provider';
import { useAuthStore } from '../../../store/auth-store';

interface ProductReviewsProps {
  productId: string;
}

const MAX_REVIEW_PHOTOS = 4;

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [uploadedAssets, setUploadedAssets] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/products/{productId}/reviews', {
        params: { path: { productId } },
      });
      if (error) throw error;
      return data;
    },
  });

  const form = useForm({
    initialValues: { rating: 5, comment: '' },
  });

  const uploadPhoto = async (files: File[] | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = MAX_REVIEW_PHOTOS - uploadedAssets.length;
    const toUpload = files.slice(0, remainingSlots);
    if (toUpload.length === 0) {
      notifyError({ title: 'Límite alcanzado', message: `Máximo ${MAX_REVIEW_PHOTOS} fotos.` });
      return;
    }

    setUploading(true);
    try {
      const results = await Promise.all(
        toUpload.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const token = useAuthStore.getState().accessToken;
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/assets/upload-review`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          });
          if (!res.ok) throw new Error('Error al subir foto');
          return res.json() as Promise<{ id: string; url: string }>;
        }),
      );
      setUploadedAssets((prev) => [...prev, ...results].slice(0, MAX_REVIEW_PHOTOS));
    } catch (error) {
      notifyError({ title: 'Error al subir foto', message: getApiErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (id: string) => {
    setUploadedAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const createReview = useMutation({
    mutationFn: async (values: { rating: number; comment: string }) => {
      const { error } = await apiClient.POST('/products/{productId}/reviews', {
        params: { path: { productId } },
        body: { ...values, assetIds: uploadedAssets.map((a) => a.id) } as never,
      });
      if (error) throw error;
    },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
            form.reset();
            setUploadedAssets([]);
            notifySuccess({ title: t('product.reviewSent'), message: t('product.reviewPending') });
          },

    onError: (error) => {
      notifyError({ title: 'Error al enviar reseña', message: getApiErrorMessage(error) });
    },
  });

  const items = (reviews?.data ?? []) as Array<{
    id: string;
    user: { firstName: string; lastName: string };
    rating: number;
    comment?: string;
    createdAt: string;
    assets?: { id: string; url: string; thumbnailUrl: string }[];
  }>;

  return (
    <Stack gap="xl">
      <Group align="center" gap="xs">
        <Title order={2} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
          {t('product.reviews')}
        </Title>
        <Text c="dimmed">
          ({items.length}) · {Number(reviews?.averageRating ?? 0).toFixed(1)} estrellas
        </Text>
      </Group>

      {items.length === 0 ? (
        <Text c="dimmed">{t('product.noReviews')}</Text>
      ) : (
        <Stack gap="md">
          {items.map((review) => (
            <Stack key={review.id} gap={4} style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: 16 }}>
              <Group justify="space-between">
                <Text fw={600}>
                  {review.user.firstName} {review.user.lastName?.charAt(0)}.
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(review.createdAt).toLocaleDateString()}
                </Text>
              </Group>
              <Rating value={review.rating} readOnly />
              {review.comment && <Text size="sm">{review.comment}</Text>}
              {review.assets && review.assets.length > 0 && (
                <Group gap="xs">
                  {review.assets.map((asset) => (
                    <Image
                      key={asset.id}
                      src={asset.thumbnailUrl}
                      alt="Foto de reseña"
                      radius={0}
                      width={80}
                      height={80}
                      fit="cover"
                      style={{ border: '1px solid #0d0d0d' }}
                    />
                  ))}
                </Group>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {isHydrated && (
        <Stack gap="md" style={{ padding: 24, border: '1px solid #0d0d0d', backgroundColor: '#f6f3f2' }}>
          <Title order={3} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            {t('product.leaveReview')}
          </Title>
          {isAuthenticated ? (
            <form onSubmit={form.onSubmit((values) => createReview.mutate(values))}>
              <Stack gap="md">
                <Rating
                  value={form.values.rating}
                  onChange={(value) => form.setFieldValue('rating', value)}
                />
                <Textarea
                  label="Comentario"
                  placeholder="Contanos tu experiencia"
                  minRows={3}
                  {...form.getInputProps('comment')}
                />
                <FileInput
                  label={t('product.photos') + ` (${t('product.maxPhotos', { count: MAX_REVIEW_PHOTOS })})`}
                  placeholder="Elegir fotos"
                  multiple
                  accept="image/*"
                  disabled={uploadedAssets.length >= MAX_REVIEW_PHOTOS}
                  onChange={uploadPhoto}
                />
                {uploadedAssets.length > 0 && (
                  <Group gap="xs">
                    {uploadedAssets.map((asset) => (
                      <div key={asset.id} style={{ position: 'relative' }}>
                        <Image
                          src={asset.url}
                          alt="Vista previa"
                          radius={0}
                          width={80}
                          height={80}
                          fit="cover"
                          style={{ border: '1px solid #0d0d0d' }}
                        />
                        <ActionIcon
                          size="xs"
                          color="red"
                          style={{ position: 'absolute', top: -4, right: -4 }}
                          onClick={() => removePhoto(asset.id)}
                        >
                          ×
                        </ActionIcon>
                      </div>
                    ))}
                  </Group>
                )}
                <Button type="submit" loading={createReview.isPending || uploading}>
                  {t('product.submit')}
                </Button>
              </Stack>
            </form>
          ) : (
            <Text>
              <Link href="/login" style={{ textDecoration: 'underline' }}>
                Iniciá sesión
              </Link>{' '}
              para dejar una reseña.
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
