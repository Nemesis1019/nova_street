export function buildAssetUrl(bucket: string, objectKey: string): string {
  if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
    return objectKey;
  }

  const cdnBaseUrl = process.env.CDN_BASE_URL;
  if (cdnBaseUrl) {
    return `${cdnBaseUrl.replace(/\/$/, '')}/${objectKey}`;
  }

  if (bucket === 'r2') {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl) {
      return `${publicUrl.replace(/\/$/, '')}/${objectKey}`;
    }
  }

  const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
  return `${baseUrl}/uploads/${objectKey}`;
}

function appendImageParams(url: string, width: number, format: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&format=${format}`;
}

export function buildImageVariantUrl(bucket: string, objectKey: string, width: number, format: string): string {
  if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
    return appendImageParams(objectKey, width, format);
  }

  const cdnBaseUrl = process.env.CDN_BASE_URL;
  if (cdnBaseUrl) {
    return appendImageParams(`${cdnBaseUrl.replace(/\/$/, '')}/${objectKey}`, width, format);
  }

  if (bucket === 'r2') {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl) {
      return appendImageParams(`${publicUrl.replace(/\/$/, '')}/${objectKey}`, width, format);
    }
  }

  const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
  return `${baseUrl}/images/${objectKey}?w=${width}&format=${format}`;
}
