import { Link, useParams } from 'react-router-dom';
import { useSpecs } from '@/hooks/useSpecs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SpecPhase, Complexity } from '@shared/types';

const phaseVariant: Record<SpecPhase, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Draft: 'secondary',
  Ready: 'outline',
  InProgress: 'default',
  Review: 'default',
  Validating: 'default',
  Done: 'secondary',
};

export default function SpecListPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data: specs, isLoading, error } = useSpecs(productId!);

  if (isLoading) return <div className="text-muted-foreground">Loading specs...</div>;
  if (error) return <div className="text-destructive">Failed to load specs: {error.message}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Specs</h1>
        <Button asChild>
          <Link to={`/products/${productId}/specs/new`}>New Spec</Link>
        </Button>
      </div>

      {!specs || specs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No specs yet.</p>
            <Button asChild variant="outline">
              <Link to={`/products/${productId}/specs/new`}>Create your first spec</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {specs.map((spec) => (
            <Link key={spec.id} to={`/specs/${spec.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">{spec.title}</CardTitle>
                  <Badge variant={phaseVariant[spec.phase as SpecPhase]}>
                    {spec.phase}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{spec.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline">{spec.complexity}</Badge>
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
