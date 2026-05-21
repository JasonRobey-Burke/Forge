import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ParseError {
  filePath: string;
  message: string;
}

export interface HealthData {
  status: string;
  timestamp: string;
  store: {
    products: number;
    intentions: number;
    expectations: number;
    specs: number;
    parseErrors: ParseError[];
  };
}

export const healthKeys = {
  all: ['health'] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: healthKeys.all,
    queryFn: () => apiFetch<HealthData>('/health'),
    // useFileWatcher invalidates all queries on YAML file events, so the
    // banner clears as soon as a malformed file is fixed. The 30s poll is
    // a fallback in case SSE drops out.
    refetchInterval: 30_000,
    staleTime: 5_000,
  });
}
