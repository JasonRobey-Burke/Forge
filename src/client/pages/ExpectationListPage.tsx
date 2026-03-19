import { Link, useParams } from 'react-router-dom';
import { useExpectations } from '@/hooks/useExpectations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ExpectationListPage() {
  const { intentionId } = useParams<{ intentionId: string }>();
  const { data: expectations, isLoading, error } = useExpectations(intentionId!);

  if (isLoading) return <div className="text-muted-foreground">Loading expectations...</div>;
  if (error) return <div className="text-destructive">Failed to load expectations: {error.message}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Expectations</h1>
        <Button asChild>
          <Link to={`/intentions/${intentionId}/expectations/new`}>New Expectation</Link>
        </Button>
      </div>

      {!expectations || expectations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No expectations yet.</p>
            <Button asChild variant="outline">
              <Link to={`/intentions/${intentionId}/expectations/new`}>Create your first expectation</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {expectations.map((exp) => (
            <Link key={exp.id} to={`/expectations/${exp.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">{exp.title}</CardTitle>
                  <Badge variant="outline">{exp.status}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{exp.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {exp.edge_cases.length} edge case{exp.edge_cases.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
