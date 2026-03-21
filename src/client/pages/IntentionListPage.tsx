import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useIntentions } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Priority } from '@shared/types';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';

const priorityVariant: Record<Priority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Critical: 'destructive',
  High: 'default',
  Medium: 'secondary',
  Low: 'outline',
};

export default function IntentionListPage() {
  useDocumentTitle('Intentions');
  const { productId } = useParams<{ productId: string }>();
  const { data: product } = useProduct(productId!);
  const { data: intentions, isLoading, error } = useIntentions(productId!);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('__all__');

  const filtered = useMemo(() => {
    let items = intentions ?? [];
    if (search) items = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));
    if (priorityFilter !== '__all__') items = items.filter(i => i.priority === priorityFilter);
    return items;
  }, [intentions, search, priorityFilter]);

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load intentions: {error.message}</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${productId}` },
        { label: 'Intentions' },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Intentions</h1>
        <Button asChild>
          <Link to={`/products/${productId}/intentions/new`}>New Intention</Link>
        </Button>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search intentions..."
        filters={[
          {
            label: 'Priority',
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { label: 'Critical', value: 'Critical' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' },
            ],
          },
        ]}
      />

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
          {filtered.map((intention) => (
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
