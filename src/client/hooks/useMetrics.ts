import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PipelineMetrics } from '@shared/lib/pipelineMetrics';

export type { PipelineMetrics, SpecMetricsRow } from '@shared/lib/pipelineMetrics';

export function usePipelineMetrics(productId: string) {
  return useQuery<PipelineMetrics>({
    queryKey: ['metrics', productId],
    queryFn: () => apiFetch<PipelineMetrics>(`/metrics?product_id=${encodeURIComponent(productId)}`),
    enabled: !!productId,
  });
}
