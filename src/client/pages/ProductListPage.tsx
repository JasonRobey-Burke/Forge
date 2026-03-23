import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/lib/phaseColors';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function ProductListPage() {
  useDocumentTitle('Products');
  const navigate = useNavigate();
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
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Products</h1>
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No products yet.</p>
          <Button asChild variant="outline">
            <Link to="/products/new">Create your first product</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Problem Statement</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <TableCell className="font-semibold">{product.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-sm">
                    <span className="line-clamp-1">{product.problem_statement}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(product.updated_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
