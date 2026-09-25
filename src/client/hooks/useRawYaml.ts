import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetchSourced } from '@/lib/api';

interface RawYaml {
  id: string;
  type: string;
  content: string;
}

export function useRawYaml(type: string, id: string) {
  return useQuery({
    queryKey: ['raw-yaml', type, id],
    queryFn: () => apiFetchSourced<RawYaml>(`/docs/raw/${type}/${id}`),
    enabled: !!type && !!id,
  });
}

export function useSaveRawYaml() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, content, revision }: { type: string; id: string; content: string; revision: string }) =>
      apiFetchSourced(`/docs/raw/${type}/${id}`, {
        method: 'PUT', headers: {'If-Match':revision},
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      // Broad invalidation — refetch everything since raw YAML edit can change any field
      queryClient.invalidateQueries();
    },
  });
}
