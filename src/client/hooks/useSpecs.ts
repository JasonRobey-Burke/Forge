import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Spec, CreateSpecInput, UpdateSpecInput } from '@shared/types';

export const specKeys = {
  all: (productId: string) => ['specs', productId] as const,
  detail: (id: string) => ['specs', 'detail', id] as const,
  expectations: (id: string) => ['specs', 'expectations', id] as const,
};

export function useSpecs(productId: string) {
  return useQuery({
    queryKey: specKeys.all(productId),
    queryFn: () => apiFetch<Spec[]>(`/specs?product_id=${productId}`),
    enabled: !!productId,
  });
}

export function useSpec(id: string) {
  return useQuery({
    queryKey: specKeys.detail(id),
    queryFn: () => apiFetch<Spec>(`/specs/${id}`),
    enabled: !!id,
  });
}

export function useCreateSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpecInput) =>
      apiFetch<Spec>('/specs', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: specKeys.all(vars.product_id) });
    },
  });
}

export function useUpdateSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateSpecInput & { id: string; product_id: string }) =>
      apiFetch<Spec>(`/specs/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: specKeys.all(vars.product_id) });
      qc.invalidateQueries({ queryKey: specKeys.detail(vars.id) });
    },
  });
}

export function useDeleteSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; product_id: string }) =>
      apiFetch<{ archived: true }>(`/specs/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: specKeys.all(vars.product_id) });
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

export function useLinkExpectations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ specId, expectationIds }: { specId: string; expectationIds: string[] }) =>
      apiFetch<{ linked: true }>(`/specs/${specId}/expectations`, {
        method: 'PUT',
        body: JSON.stringify({ expectation_ids: expectationIds }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: specKeys.expectations(vars.specId) });
    },
  });
}
