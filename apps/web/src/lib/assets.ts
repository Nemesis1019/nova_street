import { getAccessToken } from './api';

export type AssetPurpose = 'CATALOG_IMAGE' | 'CUSTOM_DESIGN_ASSET' | 'PRINT_FILE' | 'REVIEW_IMAGE';

async function presignAsset(
  file: File,
  purpose: AssetPurpose = 'CUSTOM_DESIGN_ASSET',
): Promise<{ id: string; uploadUrl: string; url: string }> {
  const token = getAccessToken();

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/assets/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      purpose,
      size: file.size,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Presign failed');
  }

  return response.json();
}

async function uploadToPresignedUrl(file: File, uploadUrl: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to storage');
  }
}

async function uploadAssetDirect(
  file: File,
  purpose: AssetPurpose = 'CUSTOM_DESIGN_ASSET',
): Promise<{ id: string; url: string }> {
  const token = getAccessToken();
  const endpoint = purpose === 'REVIEW_IMAGE' ? '/assets/upload-review' : '/assets/upload-custom';
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Upload failed');
  }

  return response.json();
}

export async function uploadAsset(
  file: File,
  purpose: AssetPurpose = 'CUSTOM_DESIGN_ASSET',
): Promise<{ id: string; url: string }> {
  try {
    const asset = await presignAsset(file, purpose);
    await uploadToPresignedUrl(file, asset.uploadUrl);
    return { id: asset.id, url: asset.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const isPresignUnavailable = message.toLowerCase().includes('presigned uploads require r2');
    if (isPresignUnavailable) {
      return uploadAssetDirect(file, purpose);
    }
    throw error;
  }
}
