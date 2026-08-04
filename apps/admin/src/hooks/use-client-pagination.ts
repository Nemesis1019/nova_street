import { useMemo, useState } from 'react';

interface UseClientPaginationOptions<T> {
  data: T[] | undefined;
  pageSize?: number;
  search?: string;
  getSearchFields?: (item: T) => (string | null | undefined)[];
}

interface UseClientPaginationResult<T> {
  page: number;
  setPage: (page: number) => void;
  paginatedData: T[];
  totalPages: number;
}

export function useClientPagination<T>({
  data,
  pageSize = 10,
  search,
  getSearchFields,
}: UseClientPaginationOptions<T>): UseClientPaginationResult<T> {
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!search || !getSearchFields) return data;
    const term = search.toLowerCase().trim();
    if (!term) return data;
    return data.filter((item) =>
      getSearchFields(item).some((field) =>
        String(field ?? '').toLowerCase().includes(term),
      ),
    );
  }, [data, search, getSearchFields]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    paginatedData,
    totalPages,
  };
}
