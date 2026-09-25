import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchSourced, apiFetchSourcedList } from '@/lib/api';
import type { Intention, UpdateIntentionInput } from '@shared/types';

export const intentionKeys = {
  all: (productId: string) => ['intentions', productId] as const,
  detail: (id: string) => ['intentions', 'detail', id] as const,
};

export function useIntentions(productId: string) {
  return useQuery({
    queryKey: intentionKeys.all(productId),
    queryFn: () => apiFetchSourcedList<Intention>(`/intentions?product_id=${productId}`),
    enabled: !!productId,
  });
}

export function useIntention(id: string) {
  return useQuery({
    queryKey: intentionKeys.detail(id),
    queryFn: () => apiFetchSourced<Intention & { dependencies?: { id: string; title: string; status: string; archived_at?: string | null }[] }>(`/intentions/${id}`),
    enabled: !!id,
  });
}

export function useUpdateIntention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision, product_id, ...input }: UpdateIntentionInput & { id: string; product_id: string; revision: string }) =>
      apiFetchSourced<Intention>(`/intentions/${id}`, { method: 'PUT', headers: {'If-Match':revision}, body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: intentionKeys.all(vars.product_id) });
      qc.invalidateQueries({ queryKey: intentionKeys.detail(vars.id) });
    },
  });
}

export function useAddDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ intentionId, dependsOnId, revision }: { intentionId: string; dependsOnId: string; revision: string }) =>
      apiFetchSourced<{ created: true }>(`/intentions/${intentionId}/dependencies`, {
        method: 'POST',
        headers: {'If-Match':revision},
        body: JSON.stringify({ depends_on_id: dependsOnId }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: intentionKeys.detail(vars.intentionId) });
    },
  });
}

export function useRemoveDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ intentionId, dependsOnId, revision }: { intentionId: string; dependsOnId: string; revision: string }) =>
      apiFetchSourced<{ removed: true }>(`/intentions/${intentionId}/dependencies/${dependsOnId}`, {
        method: 'DELETE',
        headers: {'If-Match':revision},
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: intentionKeys.detail(vars.intentionId) });
    },
  });
}
