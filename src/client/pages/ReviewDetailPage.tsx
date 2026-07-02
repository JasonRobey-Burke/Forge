import { useParams, Link } from 'react-router-dom';
import { useReview } from '@/hooks/useReviews';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import MarkdownRenderer from '@/components/MarkdownRenderer';

/** Extract the spec id from an IDD suffix-convention review filename. */
function specIdFromReviewName(name: string): string | null {
  const match = name.match(/^(SPEC-[A-Za-z0-9]+)-/);
  return match ? match[1] : null;
}

export default function ReviewDetailPage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name ?? '');
  const { data: review, isLoading, error } = useReview(decodedName);
  useDocumentTitle(decodedName || 'Review');

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !review) return <div className="text-destructive">Review not found.</div>;

  const specId = specIdFromReviewName(decodedName);

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Reviews', href: '/reviews' },
        { label: review.name },
      ]} />

      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-semibold">{review.name}</h1>
        {specId && (
          <Link to={`/specs/${specId}`}>
            <Badge variant="secondary" className="cursor-pointer hover:bg-muted font-mono">{specId}</Badge>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <MarkdownRenderer content={review.content} />
        </CardContent>
      </Card>
    </div>
  );
}
