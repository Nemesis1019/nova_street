'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Card, EmptyState } from '../../components/ui/card';
import { Icon } from '../../components/ui/icon';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/ui/page-header';
import { QueryError } from '../../components/ui/query-error';
import { SegmentedTabs } from '../../components/ui/segmented-tabs';
import { apiClient } from '../../lib/api';
import { type AssetPurpose,deleteAsset, uploadAsset } from '../../lib/assets';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { useTranslation } from '../../providers/i18n-provider';

type MediaFilter = 'ALL' | 'IMAGES' | 'VIDEOS';

interface MediaAsset {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  purpose: string;
  createdAt: string;
}

const FILTER_PURPOSE: Record<Exclude<MediaFilter, 'ALL'>, AssetPurpose> = {
  IMAGES: 'CATALOG_IMAGE',
  VIDEOS: 'PRODUCT_VIDEO',
};

function isVideo(asset: MediaAsset) {
  return asset.mimeType.startsWith('video/');
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MediaFilter>('ALL');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const query = useQuery({
    queryKey: ['admin-media', filter],
    queryFn: async () => {
      const purpose = filter === 'ALL' ? undefined : FILTER_PURPOSE[filter];
      const { data, error } = await apiClient.GET('/admin/assets', {
        params: { query: { ...(purpose ? { purpose } : {}), limit: '100' } as never },
      });
      if (error) throw error;
      return ((data as { data?: MediaAsset[] } | undefined)?.data ?? []) as MediaAsset[];
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      notifySuccess({ title: t('pages.media.deleted') });
    },
    onError: (error) =>
      notifyError({ title: t('pages.media.deleteError'), message: getApiErrorMessage(error) }),
  });

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const purpose: AssetPurpose = file.type.startsWith('video/') ? 'PRODUCT_VIDEO' : 'CATALOG_IMAGE';
      await uploadAsset(file, purpose);
      queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      notifySuccess({ title: t('pages.media.uploaded') });
    } catch (error) {
      notifyError({ title: t('pages.media.uploadError'), message: getApiErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  const assets = (query.data ?? []).filter((asset) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      asset.url.toLowerCase().includes(term) ||
      asset.mimeType.toLowerCase().includes(term) ||
      asset.purpose.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('pages.media.title')}
        subtitle={t('pages.media.subtitle')}
        actions={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary">
            <Icon
              name={uploading ? 'progress_activity' : 'upload'}
              className={`text-[18px] ${uploading ? 'animate-spin' : ''}`}
            />
            {uploading ? t('pages.media.uploading') : t('pages.media.upload')}
            <input
              type="file"
              accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
              disabled={uploading}
              onChange={(event) => void upload(event.currentTarget.files?.[0])}
            />
          </label>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedTabs
            value={filter}
            onChange={(value) => setFilter(value as MediaFilter)}
            options={[
              { value: 'ALL', label: t('pages.media.all') },
              { value: 'IMAGES', label: t('pages.media.images') },
              { value: 'VIDEOS', label: t('pages.media.videos') },
            ]}
            variant="primary"
            size="sm"
            layoutId="media-filter"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={t('pages.media.search')}
            icon="search"
            className="w-full sm:w-72"
          />
        </div>
      </Card>

      {query.isError ? (
        <QueryError onRetry={() => void query.refetch()} retrying={query.isFetching} />
      ) : query.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin text-[20px]" />
          {t('pages.media.loading')}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          title={t('pages.media.emptyTitle')}
          description={t('pages.media.emptyDescription')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="group overflow-hidden p-0">
              <div className="relative aspect-[4/3] bg-surface-container">
                {isVideo(asset) ? (
                  <video
                    src={asset.url}
                    controls
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                  />
                ) : (
                  <img src={asset.url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 font-mono text-[9px] uppercase text-on-primary">
                  {isVideo(asset) ? t('pages.media.video') : t('pages.media.image')}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface">
                    {isVideo(asset) ? 'Video' : 'Imagen'} · {formatSize(asset.size)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      title={t('pages.media.copyUrl')}
                      onClick={() => {
                        void navigator.clipboard.writeText(asset.url);
                        notifySuccess({ title: t('pages.media.copied') });
                      }}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high"
                    >
                      <Icon name="content_copy" className="text-[17px]" />
                    </button>
                    <button
                      type="button"
                      title={t('pages.media.delete')}
                      onClick={() => {
                        if (window.confirm(t('pages.media.confirmDelete'))) {
                          remove.mutate(asset.id);
                        }
                      }}
                      disabled={remove.isPending}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container/20 hover:text-error disabled:opacity-50"
                    >
                      <Icon name="delete" className="text-[17px]" />
                    </button>
                  </div>
                </div>
                <p className="truncate font-mono text-[10px] text-on-surface-variant" title={asset.url}>
                  {asset.url}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
