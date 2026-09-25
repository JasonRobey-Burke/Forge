import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchSourced, apiFetchSourcedList } from '@/lib/api';
import type { Spec, UpdateSpecInput } from '@shared/types';

export const specKeys = {
  all: (productId: string) => ['specs', productId] as const,
  detail: (id: string) => ['specs', 'detail', id] as const,
  expectations: (id: string) => ['specs', 'expectations', id] as const,
};

export function useSpecs(productId: string) {
  return useQuery({
    queryKey: specKeys.all(productId),
    queryFn: () => apiFetchSourcedList<Spec>(`/specs?product_id=${productId}`),
    enabled: !!productId,
  });
}

export function useSpec(id: string) {
  return useQuery({
    queryKey: specKeys.detail(id),
    queryFn: () => apiFetchSourced<Spec>(`/specs/${id}`),
    enabled: !!id,
  });
}

export function useUpdateSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision, product_id, ...input }: UpdateSpecInput & { id: string; product_id: string; revision: string }) =>
      apiFetchSourced<Spec>(`/specs/${id}`, { method: 'PUT', headers: {'If-Match':revision}, body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: specKeys.all(vars.product_id) });
      qc.invalidateQueries({ queryKey: specKeys.detail(vars.id) });
    },
  });
}

export function useSpecExpectations(specId: string) {
  return useQuery({
    queryKey: specKeys.expectations(specId),
    queryFn: () => apiFetch<{ id: string; title: string; status: string; description: string; edge_cases: string[] }[]>(`/specs/${specId}/expectations`),
    enabled: !!specId,
  });
}

export function useAcknowledgeWarnings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ specId, revision }: { specId: string; revision: string }) =>
      apiFetchSourced<Spec>(`/specs/${specId}/acknowledge-warnings`, { method: 'POST', headers: {'If-Match':revision} }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: specKeys.detail(vars.specId) });
      qc.invalidateQueries({ queryKey: ['specs'] });
    },
  });
}

export function useLinkExpectations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ specId, expectationIds, revision }: { specId: string; expectationIds: string[]; revision: string }) =>
      apiFetchSourced<{ linked: true }>(`/specs/${specId}/expectations`, {
        method: 'PUT',
        headers: {'If-Match':revision},
        body: JSON.stringify({ expectation_ids: expectationIds }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: specKeys.expectations(vars.specId) });
    },
  });
}
