import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { specKeys } from './useSpecs';

export function useTransitionSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ specId, toPhase, overrideReason }: {
      specId: string; toPhase: string; overrideReason?: string;
    }) => apiFetch(`/specs/${specId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ to_phase: toPhase, override_reason: overrideReason }),
    }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: specKeys.detail(vars.specId) });
    },
  });
}
