import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchSourced, apiFetchSourcedList } from '@/lib/api';
import type { Expectation, UpdateExpectationInput } from '@shared/types';

export const expectationKeys = {
  all: (intentionId: string) => ['expectations', intentionId] as const,
  detail: (id: string) => ['expectations', 'detail', id] as const,
};

export function useExpectations(intentionId: string) {
  return useQuery({
    queryKey: expectationKeys.all(intentionId),
    queryFn: () => apiFetchSourcedList<Expectation>(`/expectations?intention_id=${intentionId}`),
    enabled: !!intentionId,
  });
}

export function useProductExpectations(productId: string) {
  return useQuery({
    queryKey: ['expectations', 'by-product', productId] as const,
    queryFn: () => apiFetchSourcedList<Expectation>(`/expectations?product_id=${productId}`),
    enabled: !!productId,
  });
}

export function useExpectation(id: string) {
  return useQuery({
    queryKey: expectationKeys.detail(id),
    queryFn: () => apiFetchSourced<Expectation>(`/expectations/${id}`),
    enabled: !!id,
  });
}

export function useUpdateExpectation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision, intention_id, ...input }: UpdateExpectationInput & { id: string; intention_id: string; revision: string }) =>
      apiFetchSourced<Expectation>(`/expectations/${id}`, { method: 'PUT', headers: {'If-Match':revision}, body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      qc.invalidateQueries({ queryKey: ['raw-yaml'] });
      qc.invalidateQueries({ queryKey: ['specs'] });
      qc.invalidateQueries({ queryKey: ['expectations'] });
      qc.invalidateQueries({ queryKey: expectationKeys.all(vars.intention_id) });
      qc.invalidateQueries({ queryKey: expectationKeys.detail(vars.id) });
    },
  });
}
