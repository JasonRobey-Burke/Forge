import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { specKeys } from './useSpecs';

export function useSpecStaleness(specId: string, phase: string) {
  return useQuery({
    queryKey: [...specKeys.detail(specId), 'staleness'] as const,
    queryFn: () => apiFetch<{ stale: boolean; staleExpectationIds: string[] }>(`/specs/${specId}/staleness`),
    enabled: !!specId && phase !== 'Draft',
  });
}

export function useStaleSpecIds(productId: string) {
  return useQuery({
    queryKey: ['specs', 'staleness', productId] as const,
    queryFn: () => apiFetch<string[]>(`/specs/staleness?product_id=${productId}`),
    enabled: !!productId,
  });
}
