import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Intention, UpdateIntentionInput } from '@shared/types';

export const intentionKeys = {
  all: (productId: string) => ['intentions', productId] as const,
  detail: (id: string) => ['intentions', 'detail', id] as const,
};

export function useIntentions(productId: string) {
  return useQuery({
    queryKey: intentionKeys.all(productId),
    queryFn: () => apiFetch<Intention[]>(`/intentions?product_id=${productId}`),
    enabled: !!productId,
  });
}

export function useIntention(id: string) {
  return useQuery({
    queryKey: intentionKeys.detail(id),
    queryFn: () => apiFetch<Intention & { dependencies?: { id: string; title: string }[] }>(`/intentions/${id}`),
    enabled: !!id,
  });
}

export function useUpdateIntention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateIntentionInput & { id: string; product_id: string }) =>
      apiFetch<Intention>(`/intentions/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: intentionKeys.all(vars.product_id) });
      qc.invalidateQueries({ queryKey: intentionKeys.detail(vars.id) });
    },
  });
}

export function useAddDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ intentionId, dependsOnId }: { intentionId: string; dependsOnId: string }) =>
      apiFetch<{ created: true }>(`/intentions/${intentionId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ depends_on_id: dependsOnId }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: intentionKeys.detail(vars.intentionId) });
    },
  });
}

export function useRemoveDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ intentionId, dependsOnId }: { intentionId: string; dependsOnId: string }) =>
      apiFetch<{ removed: true }>(`/intentions/${intentionId}/dependencies/${dependsOnId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: intentionKeys.detail(vars.intentionId) });
    },
  });
}
