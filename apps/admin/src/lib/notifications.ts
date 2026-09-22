import { notifications } from '@mantine/notifications';

export function notifySuccess({ title, message }: { title: string; message?: string }) {
  notifications.show({
    title,
    message: message ?? '',
    color: 'green',
    autoClose: 4000,
    withCloseButton: true,
  });
}

export function notifyError({ title, message }: { title: string; message?: string }) {
  notifications.show({
    title,
    message: message ?? '',
    color: 'red',
    autoClose: 6000,
    withCloseButton: true,
  });
}

function extractMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (Array.isArray(obj.message)) return obj.message.map(String).join(', ');
    if (Array.isArray(obj.errors)) {
      return obj.errors
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const itemObj = item as Record<string, unknown>;
            if (typeof itemObj.message === 'string') return itemObj.message;
            if (typeof itemObj.msg === 'string') return itemObj.msg;
          }
          return String(item);
        })
        .filter(Boolean)
        .join(', ');
    }
    if (typeof obj.error === 'string') return obj.error;
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown): string {
  if (error === null || error === undefined) {
    return 'Ocurrió un error inesperado';
  }

  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || 'Ocurrió un error inesperado';

  const direct = extractMessage(error);
  if (direct) return direct;

  // openapi-fetch sometimes wraps the response body in an `error` property.
  if (error && typeof error === 'object' && 'error' in error) {
    const nested = extractMessage((error as Record<string, unknown>).error);
    if (nested) return nested;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Ocurrió un error inesperado';
  }
}
