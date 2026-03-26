import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface ReviewDetail {
  name: string;
  content: string;
}

export function useSpecReview(specId: string) {
  const reviewName = `${specId}-review`;
  return useQuery<ReviewDetail>({
    queryKey: ['reviews', reviewName],
    queryFn: () => apiFetch<ReviewDetail>(`/docs/reviews/${encodeURIComponent(reviewName)}`),
    enabled: !!specId,
    retry: false,
  });
}
