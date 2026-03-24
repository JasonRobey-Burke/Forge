import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Expectation, UpdateExpectationInput } from '@shared/types';

export const expectationKeys = {
  all: (intentionId: string) => ['expectations', intentionId] as const,
  detail: (id: string) => ['expectations', 'detail', id] as const,
};

export function useExpectations(intentionId: string) {
  return useQuery({
    queryKey: expectationKeys.all(intentionId),
    queryFn: () => apiFetch<Expectation[]>(`/expectations?intention_id=${intentionId}`),
    enabled: !!intentionId,
  });
}

export function useExpectation(id: string) {
  return useQuery({
    queryKey: expectationKeys.detail(id),
    queryFn: () => apiFetch<Expectation>(`/expectations/${id}`),
    enabled: !!id,
  });
}

export function useUpdateExpectation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateExpectationInput & { id: string; intention_id: string }) =>
      apiFetch<Expectation>(`/expectations/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: expectationKeys.all(vars.intention_id) });
      qc.invalidateQueries({ queryKey: expectationKeys.detail(vars.id) });
    },
  });
}
