import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProduct, useDeleteProduct } from '@/hooks/useProducts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ProductStatus } from '@shared/types';

const statusVariant: Record<ProductStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Active: 'default',
  Discovery: 'secondary',
  Maintenance: 'outline',
  Sunset: 'destructive',
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProduct(id!);
  const deleteProduct = useDeleteProduct();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (error || !product) {
    return <div className="text-destructive">Product not found.</div>;
  }

  function handleDelete() {
    deleteProduct.mutate(id!, {
      onSuccess: () => navigate('/products'),
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <Badge variant={statusVariant[product.status as ProductStatus]}>
            {product.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/products/${product.id}/edit`}>Edit</Link>
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {product.name}?</DialogTitle>
                <DialogDescription>
                  This will archive the product. It will no longer appear in lists.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
                  {deleteProduct.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Problem Statement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{product.problem_statement}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vision</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{product.vision}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{product.target_audience}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.context.stack.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Stack</p>
                <div className="flex flex-wrap gap-1">
                  {product.context.stack.map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
            {product.context.patterns.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Patterns</p>
                <div className="flex flex-wrap gap-1">
                  {product.context.patterns.map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
            {product.context.conventions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Conventions</p>
                <div className="flex flex-wrap gap-1">
                  {product.context.conventions.map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
            {product.context.auth && (
              <div>
                <p className="text-sm font-medium mb-1">Auth</p>
                <p className="text-sm text-muted-foreground">{product.context.auth}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">WIP Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(product.wip_limits).map(([key, value]) => (
                <div key={key} className="text-center p-2 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                  <p className="text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Intentions</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to={`/products/${product.id}/intentions`}>View Intentions</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage the intentions that define this product's purpose.
            </p>
          </CardContent>
        </Card>

        <Separator />

        <div className="text-xs text-muted-foreground flex gap-4">
          <span>Created: {new Date(product.created_at).toLocaleString()}</span>
          <span>Updated: {new Date(product.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
