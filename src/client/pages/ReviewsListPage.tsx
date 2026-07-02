import { Link } from 'react-router-dom';
import { useReviews } from '@/hooks/useReviews';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';
import { FileSearch, FileCog, FileCheck, FileText } from 'lucide-react';

function reviewIcon(name: string) {
  if (name.endsWith('-gap-check')) return { Icon: FileSearch, label: 'Gap-Check' };
  if (name.endsWith('-execution')) return { Icon: FileCog, label: 'Execution' };
  if (name.endsWith('-review') || name.endsWith('-deep-review')) return { Icon: FileCheck, label: 'Review' };
  return { Icon: FileText, label: 'Report' };
}

export default function ReviewsListPage() {
  const { data: reviews, isLoading, error } = useReviews();
  useDocumentTitle('Reviews');

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load reviews.</div>;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Reviews' }]} />
      <h1 className="text-xl font-semibold mb-4">Reviews</h1>

      {!reviews || reviews.length === 0 ? (
        <EmptyState
          icon={<FileSearch className="h-5 w-5" />}
          title="No reviews found"
          description="Gap-check reports, execution reports, and validation reviews written to docs/reviews/ appear here."
          actionLabel="Refresh"
          onAction={() => window.location.reload()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => {
            const { Icon, label } = reviewIcon(review.name);
            return (
              <Link key={review.name} to={`/reviews/${encodeURIComponent(review.name)}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{review.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{label}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {(review.size / 1024).toFixed(1)} KB
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
