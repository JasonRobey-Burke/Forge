import { Link } from 'react-router-dom';
import { usePlans } from '@/hooks/usePlans';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Breadcrumbs from '@/components/Breadcrumbs';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';
import { FileText } from 'lucide-react';

export default function PlansListPage() {
  const { data: plans, isLoading, error } = usePlans();
  useDocumentTitle('Plans');

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load plans.</div>;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Plans' }]} />
      <h1 className="text-xl font-semibold mb-4">Plans</h1>

      {!plans || plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No plans found. Plans are markdown files in <code>docs/superpowers/plans/</code>.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Link key={plan.name} to={`/plans/${encodeURIComponent(plan.name)}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{plan.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-xs">
                    {(plan.size / 1024).toFixed(1)} KB
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
