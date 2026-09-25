import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetchSourced } from '@/lib/api';
import { specKeys } from './useSpecs';

export function useTransitionSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ specId, toPhase, overrideReason, revision }: {
      specId: string; revision: string; toPhase: string; overrideReason?: string;
    }) => apiFetchSourced(`/specs/${specId}/transition`, {
      method: 'POST', headers: {'If-Match':revision},
      body: JSON.stringify({ to_phase: toPhase, override_reason: overrideReason }),
    }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({queryKey:['workspace']});
      qc.invalidateQueries({queryKey:['raw-yaml']});
      qc.invalidateQueries({ queryKey: specKeys.detail(vars.specId) });
      // Also invalidate any specs list queries since phase is visible in list views
      qc.invalidateQueries({ queryKey: ['specs'] });
    },
  });
}
