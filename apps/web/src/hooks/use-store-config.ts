import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';

export function useStoreConfigQuery() {
  return useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/store-config');
      return data;
    },
  });
}
