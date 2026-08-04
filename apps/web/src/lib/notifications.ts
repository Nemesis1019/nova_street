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

export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as Error).message === 'string') {
      return (error as Error).message;
    }
  }
  return 'Ocurrió un error inesperado';
}
