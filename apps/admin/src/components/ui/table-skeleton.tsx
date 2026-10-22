'use client';

import { useTranslation } from '../../providers/i18n-provider';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** Muestra un círculo en la primera columna (ej. avatar) */
  withAvatar?: boolean;
  className?: string;
}

const COLUMN_WIDTHS = ['22%', '16%', '12%', '14%', '10%', '12%', '10%', '12%'];

/**
 * Skeleton de tabla para estados de carga de listados.
 * Mantiene la estructura visual (encabezado + filas) para evitar saltos de layout.
 */
export function TableSkeleton({ rows = 8, columns = 6, withAvatar = false, className = '' }: TableSkeletonProps) {
  const { t } = useTranslation();

  return (
    <div role="status" aria-label={t('common.loadingData')} aria-busy="true" className={`w-full overflow-hidden ${className}`}>
      {/* Encabezado */}
      <div className="flex items-center gap-4 border-b border-outline-variant/30 bg-surface-container-low px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={index}
            className="h-3 animate-pulse rounded bg-surface-container-high"
            style={{ width: COLUMN_WIDTHS[index % COLUMN_WIDTHS.length] }}
          />
        ))}
      </div>

      {/* Filas */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-outline-variant/20 px-4 py-4 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, columnIndex) => {
            if (withAvatar && columnIndex === 0) {
              return <div key={columnIndex} className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-container-high" />;
            }
            return (
              <div
                key={columnIndex}
                className="h-3.5 animate-pulse rounded bg-surface-container-high/70"
                style={{ width: COLUMN_WIDTHS[columnIndex % COLUMN_WIDTHS.length] }}
              />
            );
          })}
        </div>
      ))}

      <span className="sr-only">{t('common.loadingData')}</span>
    </div>
  );
}

interface TableSkeletonRowsProps {
  rows?: number;
  columns?: number;
  withAvatar?: boolean;
}

/** Filas de skeleton para usar dentro de un <tbody> existente. */
export function TableSkeletonRows({ rows = 6, columns = 6, withAvatar = false }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-outline-variant/20 last:border-0">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <td key={columnIndex} className="px-4 py-4">
              {withAvatar && columnIndex === 0 ? (
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-container-high" />
              ) : (
                <div
                  className="h-3.5 animate-pulse rounded bg-surface-container-high/70"
                  style={{ width: COLUMN_WIDTHS[columnIndex % COLUMN_WIDTHS.length] }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
