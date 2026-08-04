import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';

export function useAddressesQuery() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/addresses');
      if (error) throw error;
      return data ?? [];
    },
  });
}
