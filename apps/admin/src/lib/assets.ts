import { getAuthToken } from './api';

export async function uploadAsset(file: File): Promise<{ id: string; url: string }> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/admin/assets/upload`, {
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
