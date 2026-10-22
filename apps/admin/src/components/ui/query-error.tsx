'use client';

import { useTranslation } from '../../providers/i18n-provider';
import { Button } from './button';
import { Icon } from './icon';

interface QueryErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * Estado de error para queries de listados: se muestra en lugar del contenido
 * (o del estado vacío) cuando la API falla, con acción de reintento.
 */
export function QueryError({ title, description, onRetry, retrying = false }: QueryErrorProps) {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-on-error-container">
        <Icon name="cloud_off" className="text-[24px]" />
      </div>
      <p className="font-headline-sm text-headline-sm text-on-surface">{title ?? t('common.loadErrorTitle')}</p>
      <p className="max-w-md font-body-sm text-body-sm text-on-surface-variant">
        {description ?? t('common.loadErrorDescription')}
      </p>
      {onRetry && (
        <Button variant="secondary" icon="refresh" className="mt-2" onClick={onRetry} disabled={retrying}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
