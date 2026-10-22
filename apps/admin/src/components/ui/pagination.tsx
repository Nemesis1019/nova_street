'use client';

import { useTranslation } from '../../providers/i18n-provider';
import { Icon } from './icon';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  summary?: string;
}

function getPageNumbers(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) {
      result.push('ellipsis');
    }
    result.push(value);
  });
  return result;
}

export function Pagination({ page, totalPages, onChange, summary }: PaginationProps) {
  const { t } = useTranslation();
  const pages = getPageNumbers(page, Math.max(totalPages, 1));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      {summary && <span className="font-label-sm text-label-sm text-on-surface-variant">{summary}</span>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label={t('common.previousPage')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/40 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="chevron_left" className="text-[18px]" />
        </button>
        {pages.map((value, index) =>
          value === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 font-label-sm text-label-sm text-on-surface-variant">
              ...
            </span>
          ) : (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-numeric-tabular text-label-sm transition-colors ${
                value === page
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              {value}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label={t('common.nextPage')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/40 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
