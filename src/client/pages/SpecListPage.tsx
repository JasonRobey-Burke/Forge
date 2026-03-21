import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSpecs } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import { PhaseBadge, PHASE_LABELS } from '@/lib/phaseColors';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';

export default function SpecListPage() {
  useDocumentTitle('Specs');
  const { productId } = useParams<{ productId: string }>();
  const { data: product } = useProduct(productId!);
  const { data: specs, isLoading, error } = useSpecs(productId!);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('__all__');
  const [complexityFilter, setComplexityFilter] = useState('__all__');

  const filtered = useMemo(() => {
    let items = specs ?? [];
    if (search) items = items.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
    if (phaseFilter !== '__all__') items = items.filter(s => s.phase === phaseFilter);
    if (complexityFilter !== '__all__') items = items.filter(s => s.complexity === complexityFilter);
    return items;
  }, [specs, search, phaseFilter, complexityFilter]);

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load specs: {error.message}</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${productId}` },
        { label: 'Specs' },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Specs</h1>
        <Button asChild>
          <Link to={`/products/${productId}/specs/new`}>New Spec</Link>
        </Button>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search specs..."
        filters={[
          {
            label: 'Phase',
            value: phaseFilter,
            onChange: setPhaseFilter,
            options: Object.entries(PHASE_LABELS).map(([value, label]) => ({ label, value })),
          },
          {
            label: 'Complexity',
            value: complexityFilter,
            onChange: setComplexityFilter,
            options: [
              { label: 'Low', value: 'Low' },
              { label: 'Medium', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
        ]}
      />

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
          {filtered.map((spec) => (
            <Link key={spec.id} to={`/specs/${spec.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">{spec.title}</CardTitle>
                  <PhaseBadge phase={spec.phase} />
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
