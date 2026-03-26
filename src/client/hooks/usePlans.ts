import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface PlanListItem {
  name: string;
  size: number;
}

interface PlanDetail {
  name: string;
  content: string;
}

export function usePlans() {
  return useQuery<PlanListItem[]>({
    queryKey: ['plans'],
    queryFn: () => apiFetch<PlanListItem[]>('/docs/plans'),
  });
}

export function usePlan(name: string) {
  return useQuery<PlanDetail>({
    queryKey: ['plans', name],
    queryFn: () => apiFetch<PlanDetail>(`/docs/plans/${encodeURIComponent(name)}`),
    enabled: !!name,
  });
}
