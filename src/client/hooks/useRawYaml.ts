import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface RawYaml {
  id: string;
  type: string;
  content: string;
}

export function useRawYaml(type: string, id: string) {
  return useQuery<RawYaml>({
    queryKey: ['raw-yaml', type, id],
    queryFn: () => apiFetch<RawYaml>(`/docs/raw/${type}/${id}`),
    enabled: !!type && !!id,
  });
}

export function useSaveRawYaml() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, content }: { type: string; id: string; content: string }) =>
      apiFetch(`/docs/raw/${type}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_data, variables) => {
      // Invalidate both the raw yaml cache and the entity cache
      queryClient.invalidateQueries({ queryKey: ['raw-yaml', variables.type, variables.id] });
      // Invalidate entity-specific queries so the detail page refreshes
      const entityKey = variables.type === 'products' ? 'product'
        : variables.type === 'intentions' ? 'intention'
        : variables.type === 'expectations' ? 'expectation'
        : 'spec';
      queryClient.invalidateQueries({ queryKey: [entityKey, variables.id] });
      queryClient.invalidateQueries({ queryKey: [variables.type] });
    },
  });
}
