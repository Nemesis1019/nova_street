'use client';

import {
  Button,
  FileInput,
  Group,
  Image,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AdminShell } from '../../../components/admin-shell';
import { apiClient } from '../../../lib/api';
import { createExternalAsset, uploadAsset } from '../../../lib/assets';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../../lib/notifications';

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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const queryClient = useQueryClient();
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

  const { data: product } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: async () => {
      const { data } = await apiClient.GET('/admin/products/{id}', {
        params: { path: { id: productId } },
      });
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
        categoryId: product.categoryId,
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
      notifySuccess({ title: 'Borrador restaurado' });
    }
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(`product-draft-${productId}`);
    setHasDraft(false);
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
      notifySuccess({ title: 'Producto actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar producto', message: getApiErrorMessage(error) });
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
      notifySuccess({ title: 'Variante creada' });
      close();
      variantForm.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al crear variante', message: getApiErrorMessage(error) });
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
      notifySuccess({ title: 'Variante actualizada' });
      close();
      setEditingVariant(null);
      variantForm.reset();
    },
    onError: (error) => {
      notifyError({ title: 'Error al actualizar variante', message: getApiErrorMessage(error) });
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
      notifySuccess({ title: 'Variante eliminada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al eliminar variante', message: getApiErrorMessage(error) });
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

      const { error } = await apiClient.POST('/admin/products/{id}/images', {
        params: { path: { id: productId } },
        body: { assetId: asset.id } as never,
      });
      if (error) throw error;
      return asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
      notifySuccess({ title: 'Imagen agregada' });
      setImageFile(null);
      setImageUrl('');
    },
    onError: (error) => {
      notifyError({ title: 'Error al agregar imagen', message: getApiErrorMessage(error) });
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
      notifySuccess({ title: 'Imagen eliminada' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al eliminar imagen', message: getApiErrorMessage(error) });
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
      notifySuccess({ title: 'Orden actualizado' });
    },
    onError: (error) => {
      notifyError({ title: 'Error al reordenar imágenes', message: getApiErrorMessage(error) });
    },
  });

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

  if (!product) return null;

  return (
    <AdminShell>
      <Group justify="space-between" mb="md">
        <Title order={1}>Editar producto</Title>
        <Group gap="xs">
          {hasDraft && (
            <>
              <Button size="xs" variant="light" onClick={restoreDraft}>
                Restaurar borrador
              </Button>
              <Button size="xs" variant="subtle" color="red" onClick={discardDraft}>
                Descartar borrador
              </Button>
            </>
          )}
          <Button variant="subtle" onClick={() => router.push('/products')}>
            Volver
          </Button>
        </Group>
      </Group>

      <Paper p="md" mb="xl">
        <form onSubmit={form.onSubmit((values) => updateProduct.mutate(values))}>
          <Stack maw={600}>
            <TextInput label="Nombre" {...form.getInputProps('name')} />
            <TextInput label="Slug" {...form.getInputProps('slug')} />
            <TextInput label="Descripción" {...form.getInputProps('description')} />
            <TextInput label="Meta título" {...form.getInputProps('metaTitle')} />
            <TextInput label="Meta descripción" {...form.getInputProps('metaDescription')} />
            <NumberInput label="Precio base" {...form.getInputProps('basePrice')} />
            <Select label="Categoría" data={categoryOptions} {...form.getInputProps('categoryId')} />
            <Switch label="Activo" {...form.getInputProps('isActive', { type: 'checkbox' })} />
            <Button type="submit" loading={updateProduct.isPending}>
              Guardar producto
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper p="md" mb="xl">
        <Group justify="space-between" mb="md">
          <Title order={2}>Variantes</Title>
          <Button onClick={startVariantCreate}>Nueva variante</Button>
        </Group>

        <Table withTableBorder striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Talla</Table.Th>
              <Table.Th>Color</Table.Th>
              <Table.Th>Modo stock</Table.Th>
              <Table.Th>Ajuste precio</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {product.variants.map((variant) => (
              <Table.Tr key={variant.id}>
                <Table.Td>{variant.sku}</Table.Td>
                <Table.Td>{variant.size ?? '-'}</Table.Td>
                <Table.Td>{variant.color ?? '-'}</Table.Td>
                <Table.Td>{variant.stockMode}</Table.Td>
                <Table.Td>{variant.priceAdjustment ?? 0}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" variant="outline" onClick={() => startVariantEdit(variant)}>
                      Editar
                    </Button>
                    <Button size="xs" variant="outline" color="red" onClick={() => removeVariant.mutate(variant.id)}>
                      Eliminar
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Paper p="md">
        <Group justify="space-between" mb="md">
          <Title order={2}>Imágenes</Title>
        </Group>

        <Group gap="md" mb="md" align="flex-start">
          {product?.images?.map((image, index) => (
            <Stack key={image.id} align="center" gap="xs">
              <Image
                src={(image as { url?: string }).url}
                alt="Producto"
                width={120}
                height={120}
                fit="cover"
                radius="md"
              />
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={index === 0 || reorderImages.isPending}
                  onClick={() => {
                    const ids = product.images.map((i) => i.id);
                    const [moved] = ids.splice(index, 1);
                    ids.splice(index - 1, 0, moved);
                    reorderImages.mutate(ids);
                  }}
                >
                  ↑
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={index === (product.images.length - 1) || reorderImages.isPending}
                  onClick={() => {
                    const ids = product.images.map((i) => i.id);
                    const [moved] = ids.splice(index, 1);
                    ids.splice(index + 1, 0, moved);
                    reorderImages.mutate(ids);
                  }}
                >
                  ↓
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  color="red"
                  loading={removeImage.isPending}
                  onClick={() => removeImage.mutate(image.id)}
                >
                  Eliminar
                </Button>
              </Group>
            </Stack>
          ))}
        </Group>

        <Stack gap="sm">
          <SegmentedControl
            data={[
              { label: 'Subir archivo', value: 'file' },
              { label: 'Usar URL', value: 'url' },
            ]}
            value={imageMode}
            onChange={(value) => setImageMode(value as ImageMode)}
          />
          {imageMode === 'file' ? (
            <FileInput
              placeholder="Seleccionar imagen"
              value={imageFile}
              onChange={setImageFile}
              accept="image/*"
              style={{ flex: 1 }}
            />
          ) : (
            <TextInput
              placeholder="https://..."
              value={imageUrl}
              onChange={(event) => setImageUrl(event.currentTarget.value)}
              style={{ flex: 1 }}
            />
          )}
          {imagePreviewUrl && (
            <Image
              src={imagePreviewUrl}
              alt="Vista previa"
              radius="md"
              height={160}
              fit="contain"
            />
          )}
          <Button
            onClick={() => {
              if (imageMode === 'file' && imageFile) {
                addImage.mutate({ file: imageFile });
              } else if (imageMode === 'url' && imageUrl.trim()) {
                addImage.mutate({ url: imageUrl.trim() });
              }
            }}
            loading={addImage.isPending}
            disabled={imageMode === 'file' ? !imageFile : !imageUrl.trim()}
          >
            Agregar imagen
          </Button>
        </Stack>
      </Paper>

      <Modal opened={opened} onClose={close} title={editingVariant ? 'Editar variante' : 'Nueva variante'}>
        <form
          onSubmit={variantForm.onSubmit((values) =>
            editingVariant
              ? updateVariant.mutate({ variantId: editingVariant, values })
              : createVariant.mutate(values),
          )}
        >
          <Stack>
            <TextInput label="SKU" {...variantForm.getInputProps('sku')} />
            <TextInput label="Talla" {...variantForm.getInputProps('size')} />
            <TextInput label="Color" {...variantForm.getInputProps('color')} />
            <TextInput label="Tipo de prenda" {...variantForm.getInputProps('garmentType')} />
            <Select
              label="Modo de stock"
              data={[
                { value: 'MADE_TO_ORDER', label: 'Made to order' },
                { value: 'TRACKED', label: 'Tracked' },
              ]}
              {...variantForm.getInputProps('stockMode')}
            />
            <NumberInput label="Días de producción" {...variantForm.getInputProps('productionLeadTimeDays')} />
            <NumberInput label="Ajuste de precio" {...variantForm.getInputProps('priceAdjustment')} />
            <Switch label="Activo" {...variantForm.getInputProps('isActive', { type: 'checkbox' })} />
            <Button type="submit" loading={createVariant.isPending || updateVariant.isPending}>
              Guardar
            </Button>
          </Stack>
        </form>
      </Modal>
    </AdminShell>
  );
}
