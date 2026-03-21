import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useExpectations } from '@/hooks/useExpectations';
import { useIntention } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';

export default function ExpectationListPage() {
  useDocumentTitle('Expectations');
  const { intentionId } = useParams<{ intentionId: string }>();
  const { data: intention } = useIntention(intentionId!);
  const { data: product } = useProduct(intention?.product_id ?? '');
  const { data: expectations, isLoading, error } = useExpectations(intentionId!);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');

  const filtered = useMemo(() => {
    let items = expectations ?? [];
    if (search) items = items.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== '__all__') items = items.filter(e => e.status === statusFilter);
    return items;
  }, [expectations, search, statusFilter]);

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load expectations: {error.message}</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        ...(intention && product ? [
          { label: product.name, href: `/products/${intention.product_id}` },
          { label: 'Intentions', href: `/products/${intention.product_id}/intentions` },
          { label: intention.title, href: `/intentions/${intentionId}` },
        ] : []),
        { label: 'Expectations' },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Expectations</h1>
        <Button asChild>
          <Link to={`/intentions/${intentionId}/expectations/new`}>New Expectation</Link>
        </Button>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search expectations..."
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Ready', value: 'Ready' },
              { label: 'Specced', value: 'Specced' },
              { label: 'Validated', value: 'Validated' },
              { label: 'Done', value: 'Done' },
            ],
          },
        ]}
      />

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
          {filtered.map((exp) => (
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
