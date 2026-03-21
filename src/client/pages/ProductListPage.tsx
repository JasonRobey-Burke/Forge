import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/phaseColors';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';

export default function ProductListPage() {
  useDocumentTitle('Products');
  const { data: products, isLoading, error } = useProducts();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');

  const filtered = useMemo(() => {
    let items = products ?? [];
    if (search) items = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== '__all__') items = items.filter(p => p.status === statusFilter);
    return items;
  }, [products, search, statusFilter]);

  if (isLoading) {
    return <CardGridSkeleton />;
  }

  if (error) {
    return <div className="text-destructive">Failed to load products: {error.message}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild>
          <Link to="/products/new">New Product</Link>
        </Button>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search products..."
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Active', value: 'Active' },
              { label: 'Discovery', value: 'Discovery' },
              { label: 'Maintenance', value: 'Maintenance' },
              { label: 'Sunset', value: 'Sunset' },
            ],
          },
        ]}
      />

      {!products || products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No products yet.</p>
            <Button asChild variant="outline">
              <Link to="/products/new">Create your first product</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <StatusBadge status={product.status} />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.problem_statement}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Created {new Date(product.created_at).toLocaleDateString()}
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
