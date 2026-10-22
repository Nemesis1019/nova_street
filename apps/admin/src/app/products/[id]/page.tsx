'use client';

import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure, useHotkeys } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppModal } from '../../../components/ui/app-modal';
import { Button } from '../../../components/ui/button';
import { Card, SectionTitle } from '../../../components/ui/card';
import { Icon } from '../../../components/ui/icon';
import { Field, Input, Select, Textarea } from '../../../components/ui/input';
import { LAYOUT_SPRING } from '../../../components/ui/motion';
import { PageHeader } from '../../../components/ui/page-header';
import { QueryError } from '../../../components/ui/query-error';
import { SegmentedTabs } from '../../../components/ui/segmented-tabs';
import { StatusPill } from '../../../components/ui/status-pill';
import { Switch } from '../../../components/ui/switch';
import { apiClient } from '../../../lib/api';
import { createExternalAsset, deleteAsset, uploadAsset } from '../../../lib/assets';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';
import { useTranslation } from '../../../providers/i18n-provider';

type ImageMode = 'file' | 'url';

interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  basePrice: number;
  categoryId: string;
  isActive: boolean;
}

interface VariantFormValues {
  sku: string;
  size: string;
  color: string;
  garmentType: string;
  stockMode: 'MADE_TO_ORDER' | 'TRACKED';
  productionLeadTimeDays: number;
  priceAdjustment: number;
  isActive: boolean;
}

interface ProductImageWithUrl {
  id: string;
  url?: string;
  sortOrder?: number;
}

function formatPrice(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<ImageMode>('file');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const variantForm = useForm<VariantFormValues>({
    initialValues: {
      sku: '',
      size: '',
      color: '',
      garmentType: '',
      stockMode: 'MADE_TO_ORDER',
      productionLeadTimeDays: 7,
      priceAdjustment: 0,
      isActive: true,
    },
  });

  const { data: product, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/products/{id}', {
        params: { path: { id: productId } },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/categories');
      return data ?? [];
    },
  });

  const form = useForm<ProductFormValues>({
    initialValues: {
      name: '',
      slug: '',
      description: '',
      metaTitle: '',
      metaDescription: '',
      basePrice: 0,
      categoryId: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (product && !isInitialized) {
      form.setValues({
        name: product.name,
        slug: product.slug,
        description: product.description ?? '',
        metaTitle: product.metaTitle ?? '',
        metaDescription: product.metaDescription ?? '',
        basePrice: product.basePrice,
        categoryId: product.categoryId ?? '',
        isActive: product.isActive,
      });
      setIsInitialized(true);
    }
  }, [product, isInitialized, form]);

  useEffect(() => {
    const saved = localStorage.getItem(`product-draft-${productId}`);
    setHasDraft(Boolean(saved));
  }, [productId]);

  useEffect(() => {
    if (imageMode === 'file') {
      if (!imageFile) {
        setImagePreviewUrl(null);
        return undefined;
      }
      const url = URL.createObjectURL(imageFile);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    const url = imageUrl.trim();
    setImagePreviewUrl(url || null);
    return undefined;
  }, [imageFile, imageUrl, imageMode]);

  const [debouncedValues] = useDebouncedValue(form.values, 1000);

  useEffect(() => {
    if (isInitialized && productId) {
      localStorage.setItem(`product-draft-${productId}`, JSON.stringify(debouncedValues));
    }
  }, [debouncedValues, isInitialized, productId]);

  const restoreDraft = () => {
    const saved = localStorage.getItem(`product-draft-${productId}`);
    if (saved) {
      form.setValues(JSON.parse(saved) as ProductFormValues);
      notifySuccess({ title: t('pages.productDetail.toastDraftRestored') });
    }
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(`product-draft-${productId}`);
    setHasDraft(false);
    if (product) {
      form.setValues({
        name: product.name,
        slug: product.slug,
        description: product.description ?? '',
        metaTitle: product.metaTitle ?? '',
        metaDescription: product.metaDescription ?? '',
        basePrice: product.basePrice,
        categoryId: product.categoryId ?? '',
        isActive: product.isActive,
      });
    }
    notifySuccess({ title: t('pages.productDetail.toastDraftDiscarded') });
  };

  const updateProduct = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const { error } = await apiClient.PATCH('/admin/products/{id}', {
        params: { path: { id: productId } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      localStorage.removeItem(`product-draft-${productId}`);
      setHasDraft(false);
      notifySuccess({ title: t('pages.productDetail.toastUpdated') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.productDetail.toastUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const createVariant = useMutation({
    mutationFn: async (values: VariantFormValues) => {
      const { error } = await apiClient.POST('/admin/products/{id}/variants', {
        params: { path: { id: productId } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      notifySuccess({ title: t('pages.productDetail.toastVariantCreated') });
      close();
      variantForm.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.productDetail.toastVariantCreateError'), message: getApiErrorMessage(error) });
    },
  });

  const updateVariant = useMutation({
    mutationFn: async ({ variantId, values }: { variantId: string; values: VariantFormValues }) => {
      const { error } = await apiClient.PATCH('/admin/products/{id}/variants/{variantId}', {
        params: { path: { id: productId, variantId } },
        body: values as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      notifySuccess({ title: t('pages.productDetail.toastVariantUpdated') });
      close();
      setEditingVariant(null);
      variantForm.reset();
    },
    onError: (error) => {
      notifyError({ title: t('pages.productDetail.toastVariantUpdateError'), message: getApiErrorMessage(error) });
    },
  });

  const removeVariant = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await apiClient.DELETE('/admin/products/{id}/variants/{variantId}', {
        params: { path: { id: productId, variantId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      notifySuccess({ title: t('pages.productDetail.toastVariantDeleted') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.productDetail.toastVariantDeleteError'), message: getApiErrorMessage(error) });
    },
  });

  const addImage = useMutation({
    mutationFn: async ({ file, url }: { file?: File; url?: string }) => {
      let asset: { id: string };
      if (file) {
        asset = await uploadAsset(file);
      } else if (url) {
        asset = await createExternalAsset(url);
      } else {
        throw new Error('No image provided');
      }

      try {
        const { error } = await apiClient.POST('/admin/products/{id}/images', {
          params: { path: { id: productId } },
          body: { assetId: asset.id } as never,
        });
        if (error) throw error;
      } catch (error) {
        await deleteAsset(asset.id).catch(() => undefined);
        throw error;
      }
      return asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      notifySuccess({ title: t('pages.productDetail.toastImageAdded') });
      setImageFile(null);
      setImageUrl('');
    },
    onError: (error) => {
      notifyError({ title: t('pages.productDetail.toastImageAddError'), message: getApiErrorMessage(error) });
    },
  });

  const removeImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await apiClient.DELETE('/admin/products/{id}/images/{imageId}', {
        params: { path: { id: productId, imageId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      notifySuccess({ title: t('pages.productDetail.toastImageDeleted') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.productDetail.toastImageDeleteError'), message: getApiErrorMessage(error) });
    },
  });

  const reorderImages = useMutation({
    mutationFn: async (imageIds: string[]) => {
      const { error } = await apiClient.PATCH('/admin/products/{id}/images/reorder', {
        params: { path: { id: productId } },
        body: { imageIds } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      notifySuccess({ title: t('pages.productDetail.toastImagesReordered') });
    },
    onError: (error) => {
      notifyError({ title: t('pages.productDetail.toastImagesReorderError'), message: getApiErrorMessage(error) });
    },
  });

  const submitProduct = () => {
    form.onSubmit((values) => updateProduct.mutate(values))();
  };

  useHotkeys([['mod+S', (event) => {
    event.preventDefault();
    submitProduct();
  }]]);

  const startVariantCreate = () => {
    setEditingVariant(null);
    variantForm.reset();
    open();
  };

  const startVariantEdit = (variant: NonNullable<typeof product>['variants'][number]) => {
    setEditingVariant(variant.id);
    variantForm.setValues({
      sku: variant.sku,
      size: variant.size ?? '',
      color: variant.color ?? '',
      garmentType: variant.garmentType ?? '',
      stockMode: variant.stockMode as 'MADE_TO_ORDER' | 'TRACKED',
      productionLeadTimeDays: variant.productionLeadTimeDays,
      priceAdjustment: variant.priceAdjustment ?? 0,
      isActive: variant.isActive,
    });
    open();
  };

  const categoryOptions = categories?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const images = (product?.images ?? []) as unknown as ProductImageWithUrl[];
  const activeVariants = product?.variants.filter((variant) => variant.isActive).length ?? 0;

  const seoScore = (() => {
    let score = 0;
    const titleLength = form.values.metaTitle.length;
    const descriptionLength = form.values.metaDescription.length;
    if (titleLength >= 10 && titleLength <= 60) score += 40;
    if (descriptionLength >= 50 && descriptionLength <= 160) score += 40;
    if (form.values.description.length >= 50) score += 20;
    return score;
  })();

  const copySlug = async () => {
    const webUrl = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000')
      .replace(/^\[|\]$/g, '')
      .split(',')[0]
      .trim();
    try {
      await navigator.clipboard.writeText(`${webUrl}/productos/${form.values.slug}`);
      notifySuccess({ title: t('pages.productDetail.toastLinkCopied') });
    } catch {
      notifyError({ title: t('pages.productDetail.toastLinkCopyError') });
    }
  };

  if (isError) {
    return <QueryError onRetry={() => refetch()} retrying={isFetching} />;
  }

  if (!product) return null;

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={[
            { label: t('pages.productDetail.breadcrumbCatalog'), href: '/products' },
            ...(product.category ? [{ label: product.category.name }] : []),
          ]}
          overline={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/products')}
                title={t('pages.productDetail.backToProducts')}
                className="flex items-center justify-center rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                <Icon name="arrow_back" className="text-[20px]" />
              </button>
              <StatusPill
                label={product.isActive ? t('pages.productDetail.statusOnline') : t('pages.productDetail.statusDraft')}
                tone={product.isActive ? 'success' : 'warning'}
              />
            </div>
          }
          title={product.name}
          actions={
            <>
              {hasDraft && (
                <Button variant="ghost" icon="history" onClick={restoreDraft}>
                  {t('pages.productDetail.restoreDraft')}
                </Button>
              )}
              <Button variant="ghost" icon="close" className="text-error hover:bg-error-container/20" onClick={discardDraft}>
                {t('pages.productDetail.discardChanges')}
              </Button>
              <Button icon="check" onClick={submitProduct} disabled={updateProduct.isPending}>
                <span>
                  {updateProduct.isPending ? t('common.saving') : t('pages.products.saveProduct')}
                </span>
                <kbd className="ml-1 rounded border border-white/30 px-1.5 py-0.5 font-label-sm text-label-sm">⌘S</kbd>
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="flex flex-col gap-6 xl:col-span-8">
            <Card>
              <SectionTitle
                icon="tune"
                title={t('pages.productDetail.generalInfo')}
                subtitle={t('pages.productDetail.requiredFields')}
                className="mb-5"
              />
              <form onSubmit={form.onSubmit((values) => updateProduct.mutate(values))} className="flex flex-col gap-4">
                <Field label={t('pages.productDetail.fieldName')} required>
                  <Input {...form.getInputProps('name')} />
                </Field>

                <Field
                  label={t('pages.productDetail.fieldSlug')}
                  tooltip={t('pages.products.tooltipSlug')}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest">
                      <span className="border-r border-outline-variant/40 bg-surface-container-low px-3 py-2 font-mono text-label-sm text-on-surface-variant">
                        /producto/
                      </span>
                      <input
                        className="w-full bg-transparent px-3 py-2 font-mono text-body-sm text-on-surface focus:outline-none"
                        {...form.getInputProps('slug')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={copySlug}
                      title={t('pages.productDetail.copyLink')}
                      className="flex items-center justify-center rounded-lg border border-outline-variant/50 p-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                    >
                      <Icon name="content_copy" className="text-[18px]" />
                    </button>
                  </div>
                </Field>

                <Field label={t('pages.productDetail.productDescription')} hint={t('pages.productDetail.markdownCompatible')}>
                  <Textarea rows={5} {...form.getInputProps('description')} />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label={t('pages.productDetail.fieldCategory')}
                    required
                    tooltip={t('pages.products.tooltipCategory')}
                  >
                    <Select {...form.getInputProps('categoryId')}>
                      <option value="">{t('pages.productDetail.noCategory')}</option>
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label={t('pages.productDetail.basePriceCop')}
                    required
                    tooltip={t('pages.products.tooltipBasePrice')}
                  >
                    <div className="flex items-center overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest">
                      <span className="border-r border-outline-variant/40 bg-surface-container-low px-3 py-2 font-numeric-tabular text-body-sm text-on-surface-variant">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-transparent px-3 py-2 font-numeric-tabular text-body-sm text-on-surface focus:outline-none"
                        value={form.values.basePrice}
                        onChange={(event) => form.setFieldValue('basePrice', Number(event.currentTarget.value))}
                      />
                      <span className="border-l border-outline-variant/40 bg-surface-container-low px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">
                        COP
                      </span>
                    </div>
                  </Field>
                </div>

                <div className="mt-2 rounded-xl bg-surface-container-low p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon name="search_insights" className="text-[20px] text-on-surface-variant" />
                      <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                        {t('pages.productDetail.seoTitle')}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-numeric-tabular text-label-sm ${
                        seoScore >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : seoScore >= 50
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {t('pages.productDetail.seoScore').replace('{{score}}', String(seoScore))}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label={t('pages.productDetail.metaTitle')}
                      tooltip={t('pages.productDetail.tooltipMetaTitle')}
                    >
                      <Input {...form.getInputProps('metaTitle')} />
                      <span className="font-numeric-tabular text-label-sm text-on-surface-variant">
                        {form.values.metaTitle.length} / 60
                      </span>
                    </Field>
                    <Field
                      label={t('pages.productDetail.metaDescription')}
                      tooltip={t('pages.productDetail.tooltipMetaDescription')}
                    >
                      <Input {...form.getInputProps('metaDescription')} />
                      <span className="font-numeric-tabular text-label-sm text-on-surface-variant">
                        {form.values.metaDescription.length} / 160
                      </span>
                    </Field>
                  </div>
                </div>
              </form>
            </Card>

            <Card className="p-0">
              <div className="p-6 pb-4">
                <SectionTitle
                  icon="style"
                  title={t('pages.productDetail.variantsTitle')}
                  subtitle={t('pages.productDetail.variantsSubtitle')}
                  actions={
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                        {t('pages.productDetail.activeVariants').replace('{{count}}', String(activeVariants))}
                      </span>
                      <Button variant="secondary" icon="add" onClick={startVariantCreate}>
                        {t('pages.productDetail.newVariant')}
                      </Button>
                    </div>
                  }
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary">
                      <th className="px-6 py-3">{t('pages.productDetail.columnSku')}</th>
                      <th className="px-3 py-3">{t('pages.productDetail.columnSize')}</th>
                      <th className="px-3 py-3">{t('pages.productDetail.columnColor')}</th>
                      <th className="px-3 py-3">{t('pages.productDetail.columnStockMode')}</th>
                      <th className="px-3 py-3">{t('pages.productDetail.columnPriceAdjustment')}</th>
                      <th className="rounded-r-lg px-6 py-3 text-right">{t('pages.productDetail.columnActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => (
                      <tr
                        key={variant.id}
                        className="border-b border-outline-variant/20 transition-colors last:border-0 hover:bg-surface-container-low"
                      >
                        <td className="px-6 py-3.5 font-mono text-label-sm text-on-surface">{variant.sku}</td>
                        <td className="px-3 py-3.5">
                          {variant.size ? (
                            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded border border-outline-variant/50 px-2 font-numeric-tabular text-label-sm text-on-surface">
                              {variant.size}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/60">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          {variant.color ? (
                            <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                              <span className="h-3.5 w-3.5 rounded-full border border-outline-variant bg-primary ring-2 ring-white" />
                              {variant.color}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/60">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusPill
                            label={variant.stockMode === 'TRACKED' ? 'TRACKED' : 'MADE_TO_ORDER'}
                            tone={variant.stockMode === 'TRACKED' ? 'secondary' : 'neutral'}
                          />
                        </td>
                        <td className="px-3 py-3.5 font-numeric-tabular text-body-sm text-on-surface">
                          {variant.priceAdjustment ? `+ ${formatPrice(variant.priceAdjustment)}` : '+ $0'}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startVariantEdit(variant)}
                              className="rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              title={t('pages.productDetail.deleteVariant')}
                              onClick={() => {
                                if (window.confirm(t('pages.productDetail.confirmDeleteVariant').replace('{{sku}}', variant.sku))) {
                                  removeVariant.mutate(variant.id);
                                }
                              }}
                              className="flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-error-container/20 hover:text-error"
                            >
                              <Icon name="delete" className="text-[18px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {product.variants.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center font-body-sm text-body-sm text-on-surface-variant">
                          {t('pages.productDetail.noVariants')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <SectionTitle
                icon="photo_library"
                title={t('pages.productDetail.galleryTitle')}
                subtitle={t('pages.productDetail.gallerySubtitle')}
                actions={
                  <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-numeric-tabular text-label-sm text-on-surface-variant">
                    {t('pages.productDetail.slotsCount').replace('{{count}}', String(images.length))}
                  </span>
                }
                className="mb-5"
              />

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map((image, index) => (
                  <motion.div
                    layout
                    transition={LAYOUT_SPRING}
                    key={image.id}
                    className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container"
                  >
                    {image.url ? (
                      <img src={image.url} alt={t('pages.productDetail.imageAltProduct')} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                        <Icon name="image" className="text-[28px]" />
                      </div>
                    )}
                    {index === 0 && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-label-sm text-label-sm text-on-primary">
                        <Icon name="star" className="text-[12px]" />
                        {t('pages.productDetail.cover')}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={t('pages.productDetail.moveUpImage')}
                          disabled={index === 0 || reorderImages.isPending}
                          onClick={() => {
                            const ids = images.map((i) => i.id);
                            const [moved] = ids.splice(index, 1);
                            ids.splice(index - 1, 0, moved);
                            reorderImages.mutate(ids);
                          }}
                          className="flex items-center justify-center rounded p-0.5 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                        >
                          <Icon name="chevron_left" className="text-[18px]" />
                        </button>
                        <span className="font-numeric-tabular text-label-sm text-white">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <button
                          type="button"
                          title={t('pages.productDetail.moveDownImage')}
                          disabled={index === images.length - 1 || reorderImages.isPending}
                          onClick={() => {
                            const ids = images.map((i) => i.id);
                            const [moved] = ids.splice(index, 1);
                            ids.splice(index + 1, 0, moved);
                            reorderImages.mutate(ids);
                          }}
                          className="flex items-center justify-center rounded p-0.5 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                        >
                          <Icon name="chevron_right" className="text-[18px]" />
                        </button>
                      </div>
                      <button
                        type="button"
                        title={t('pages.productDetail.deleteImage')}
                        onClick={() => {
                          if (window.confirm(t('pages.productDetail.confirmDeleteImage'))) {
                            removeImage.mutate(image.id);
                          }
                        }}
                        className="flex items-center justify-center rounded p-0.5 text-white transition-colors hover:bg-error"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container">
                  <Icon name="add_photo_alternate" className="text-[24px]" />
                  <span className="font-label-sm text-label-sm">{t('pages.productDetail.addPhoto')}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant/70">{t('pages.productDetail.dropHint')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) {
                        setImageMode('file');
                        setImageFile(file);
                      }
                    }}
                  />
                </label>

                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-low/50 text-on-surface-variant/50">
                  <Icon name="crop_original" className="text-[24px]" />
                  <span className="font-label-sm text-label-sm">{t('pages.productDetail.freeSlot')}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant/30 pt-4">
                <SegmentedTabs
                  value={imageMode}
                  options={[
                    { value: 'file', label: t('pages.productDetail.imageModeFile') },
                    { value: 'url', label: t('pages.productDetail.imageModeUrl') },
                  ]}
                  onChange={(value) => setImageMode(value)}
                  layoutId="product-detail-image-mode"
                  className="w-fit"
                />

                {imageMode === 'file' ? (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-4 py-4 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container">
                    <Icon name="attach_file" className="text-[20px]" />
                    <span>{imageFile ? imageFile.name : t('pages.productDetail.selectImage')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setImageFile(event.currentTarget.files?.[0] ?? null)}
                    />
                  </label>
                ) : (
                  <Input
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.currentTarget.value)}
                  />
                )}

                {imagePreviewUrl && (
                  <div className="overflow-hidden rounded-lg border border-outline-variant/40">
                    <img src={imagePreviewUrl} alt={t('pages.productDetail.imageAltPreview')} className="h-40 w-full object-contain" />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button
                      icon="add"
                      onClick={() => {
                        if (imageMode === 'file' && imageFile) {
                          addImage.mutate({ file: imageFile });
                        } else if (imageMode === 'url' && imageUrl.trim()) {
                          addImage.mutate({ url: imageUrl.trim() });
                        }
                      }}
                      disabled={imageMode === 'file' ? !imageFile : !imageUrl.trim()}
                    >
                      {addImage.isPending ? t('pages.productDetail.adding') : t('pages.productDetail.addImage')}
                    </Button>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.productDetail.imageFormatHint')}</span>
                  </div>
                  <button
                    type="button"
                    disabled
                    title={t('common.comingSoon')}
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-outline-variant/50 px-3 py-2 font-label-md text-label-md text-on-surface-variant opacity-60"
                  >
                    <Icon name="folder_open" className="text-[18px]" />
                    {t('pages.productDetail.openMediaManager')}
                  </button>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6 xl:col-span-4">
            <Card>
              <SectionTitle
                icon="publish"
                title={t('pages.productDetail.publicationStatus')}
                actions={
                  <StatusPill
                    label={product.isActive ? t('pages.productDetail.published') : t('pages.productDetail.statusDraft')}
                    tone={product.isActive ? 'success' : 'warning'}
                  />
                }
                className="mb-4"
              />
              <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5">
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">{t('pages.productDetail.activeInCatalog')}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{t('pages.productDetail.visibleForPurchase')}</span>
                </div>
                <Switch
                  checked={form.values.isActive}
                  onChange={(checked) => form.setFieldValue('isActive', checked)}
                  label={t('pages.productDetail.activeInCatalog')}
                />
              </div>

              <div className="mt-4 flex flex-col divide-y divide-outline-variant/20">
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                    <Icon name="visibility" className="text-[18px]" />
                    {t('pages.productDetail.totalVisits')}
                  </span>
                  <span className="font-numeric-tabular text-label-sm text-on-surface-variant" title={t('common.comingSoon')}>
                    —
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                    <Icon name="shopping_cart" className="text-[18px]" />
                    {t('pages.productDetail.conversion')}
                  </span>
                  <span className="font-numeric-tabular text-label-sm text-on-surface-variant" title={t('common.comingSoon')}>
                    —
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                    <Icon name="calendar_today" className="text-[18px]" />
                    {t('pages.productDetail.created')}
                  </span>
                  <span className="font-numeric-tabular text-label-sm text-on-surface-variant">
                    {new Date(product.createdAt).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <Button icon="save" className="mt-4 w-full" onClick={submitProduct} disabled={updateProduct.isPending}>
                {updateProduct.isPending ? t('common.saving') : t('pages.products.saveProduct')}
              </Button>
            </Card>

            <Card>
              <SectionTitle icon="sell" title={t('pages.productDetail.collectionTags')} subtitle={t('pages.productDetail.collectionTagsSubtitle')} className="mb-4" />
              <div className="flex flex-wrap gap-2">
                {[t('pages.productDetail.tagWinter'), t('pages.productDetail.tagOversized')].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant"
                  >
                    {tag}
                    <Icon name="close" className="text-[13px] opacity-50" />
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-outline-variant px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant/60">
                  {t('common.comingSoon')}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input placeholder={t('pages.productDetail.tagPlaceholder')} disabled />
                <button
                  type="button"
                  disabled
                  title={t('common.comingSoon')}
                  className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-outline-variant/50 text-on-surface-variant opacity-60"
                >
                  <Icon name="add" className="text-[18px]" />
                </button>
              </div>
            </Card>

            <Card>
              <SectionTitle icon="verified" title={t('pages.productDetail.changeTraceability')} className="mb-3" />
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t('pages.productDetail.lastEditedPrefix')}{' '}
                <span className="font-medium text-on-surface">
                  {new Date(product.updatedAt).toLocaleString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                .
              </p>
              <Link
                href={`/audit-logs?entity=Product&entityId=${product.id}`}
                className="mt-3 inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold text-secondary transition-colors hover:text-on-surface"
              >
                {t('pages.productDetail.viewFullAuditLog')}
                <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </Card>
          </div>
        </div>
      </div>

      <AppModal
        opened={opened}
        onClose={close}
        title={editingVariant ? t('pages.productDetail.modalEditVariantTitle') : t('pages.productDetail.modalNewVariantTitle')}
        subtitle={t('pages.productDetail.variantsSubtitle')}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              icon="check"
              onClick={() =>
                variantForm.onSubmit((values) =>
                  editingVariant
                    ? updateVariant.mutate({ variantId: editingVariant, values })
                    : createVariant.mutate(values),
                )()
              }
              disabled={createVariant.isPending || updateVariant.isPending}
            >
              {createVariant.isPending || updateVariant.isPending ? t('common.saving') : t('pages.productDetail.save')}
            </Button>
          </>
        }
      >
        <form
          onSubmit={variantForm.onSubmit((values) =>
            editingVariant
              ? updateVariant.mutate({ variantId: editingVariant, values })
              : createVariant.mutate(values),
          )}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t('pages.productDetail.fieldSku')}
              required
              tooltip={t('pages.productDetail.tooltipSku')}
            >
              <Input {...variantForm.getInputProps('sku')} />
            </Field>
            <Field label={t('pages.productDetail.fieldSize')}>
              <Input {...variantForm.getInputProps('size')} />
            </Field>
            <Field label={t('pages.productDetail.fieldColor')}>
              <Input {...variantForm.getInputProps('color')} />
            </Field>
            <Field
              label={t('pages.productDetail.fieldGarmentType')}
              tooltip={t('pages.productDetail.tooltipGarmentType')}
            >
              <Input {...variantForm.getInputProps('garmentType')} />
            </Field>
            <Field
              label={t('pages.productDetail.fieldStockMode')}
              tooltip={t('pages.productDetail.tooltipStockMode')}
            >
              <Select {...variantForm.getInputProps('stockMode')}>
                <option value="MADE_TO_ORDER">{t('pages.productDetail.optionMadeToOrder')}</option>
                <option value="TRACKED">{t('pages.productDetail.optionTracked')}</option>
              </Select>
            </Field>
            <Field
              label={t('pages.productDetail.fieldProductionDays')}
              tooltip={t('pages.productDetail.tooltipProductionDays')}
            >
              <Input
                type="number"
                min={0}
                value={variantForm.values.productionLeadTimeDays}
                onChange={(event) =>
                  variantForm.setFieldValue('productionLeadTimeDays', Number(event.currentTarget.value))
                }
              />
            </Field>
            <Field
              label={t('pages.productDetail.fieldPriceAdjustment')}
              tooltip={t('pages.productDetail.tooltipPriceAdjustment')}
            >
              <Input
                type="number"
                value={variantForm.values.priceAdjustment}
                onChange={(event) => variantForm.setFieldValue('priceAdjustment', Number(event.currentTarget.value))}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5">
            <span className="font-body-sm text-body-sm font-semibold text-on-surface">{t('pages.productDetail.variantActive')}</span>
            <Switch
              checked={variantForm.values.isActive}
              onChange={(checked) => variantForm.setFieldValue('isActive', checked)}
              label={t('pages.productDetail.variantActive')}
            />
          </div>
        </form>
      </AppModal>
    </>
  );
}
