import { Link, useParams } from 'react-router-dom';
import { useIntentions } from '@/hooks/useIntentions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Priority } from '@shared/types';

const priorityVariant: Record<Priority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Critical: 'destructive',
  High: 'default',
  Medium: 'secondary',
  Low: 'outline',
};

export default function IntentionListPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data: intentions, isLoading, error } = useIntentions(productId!);

  if (isLoading) return <div className="text-muted-foreground">Loading intentions...</div>;
  if (error) return <div className="text-destructive">Failed to load intentions: {error.message}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Intentions</h1>
        <Button asChild>
          <Link to={`/products/${productId}/intentions/new`}>New Intention</Link>
        </Button>
      </div>

      {!intentions || intentions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No intentions yet.</p>
            <Button asChild variant="outline">
              <Link to={`/products/${productId}/intentions/new`}>Create your first intention</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {intentions.map((intention) => (
            <Link key={intention.id} to={`/intentions/${intention.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">{intention.title}</CardTitle>
                  <Badge variant={priorityVariant[intention.priority as Priority]}>
                    {intention.priority}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{intention.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline">{intention.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
