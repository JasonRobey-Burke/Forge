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
    onSuccess: () => {
      // Broad invalidation — refetch everything since raw YAML edit can change any field
      queryClient.invalidateQueries();
    },
  });
}
