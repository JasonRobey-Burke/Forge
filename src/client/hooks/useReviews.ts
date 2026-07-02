import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ReviewSummary {
  name: string;
  size: number;
}

interface ReviewDetail {
  name: string;
  content: string;
}

/** All review markdown files in docs/reviews/. */
export function useReviews() {
  return useQuery<ReviewSummary[]>({
    queryKey: ['reviews'],
    queryFn: () => apiFetch<ReviewSummary[]>('/docs/reviews'),
  });
}

/** A single review file by basename (without .md). */
export function useReview(name: string) {
  return useQuery<ReviewDetail>({
    queryKey: ['reviews', name],
    queryFn: () => apiFetch<ReviewDetail>(`/docs/reviews/${encodeURIComponent(name)}`),
    enabled: !!name,
    retry: false,
  });
}

/** The tech-review report for a spec (suffix convention: <spec-id>-review). */
export function useSpecReview(specId: string) {
  return useReview(specId ? `${specId}-review` : '');
}

export type ReviewKind = 'gap-check' | 'execution' | 'review' | 'deep-review' | 'other';

export interface SpecReviewFile extends ReviewSummary {
  kind: ReviewKind;
}

/** Classify a review filename that belongs to a spec (IDD suffix conventions). */
export function classifyReviewName(name: string, specId: string): ReviewKind | null {
  if (!name.startsWith(`${specId}-`)) return null;
  const suffix = name.slice(specId.length + 1);
  if (suffix === 'gap-check') return 'gap-check';
  if (suffix === 'review') return 'review';
  if (suffix === 'deep-review') return 'deep-review';
  if (/^\d{8}T\d{6}Z-execution$/.test(suffix) || suffix === 'execution') return 'execution';
  return 'other';
}

/** Every review file associated with a spec, classified by kind. */
export function useSpecReviewFiles(specId: string): { data: SpecReviewFile[] | undefined; isLoading: boolean } {
  const { data, isLoading } = useReviews();
  if (!specId || !data) return { data: undefined, isLoading };
  const files = data
    .map((r) => {
      const kind = classifyReviewName(r.name, specId);
      return kind ? { ...r, kind } : null;
    })
    .filter((r): r is SpecReviewFile => r !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { data: files, isLoading };
}
