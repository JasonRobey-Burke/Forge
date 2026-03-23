import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useIntentions } from '@/hooks/useIntentions';
import { useSpecs } from '@/hooks/useSpecs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/lib/phaseColors';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import IntentionProgress from '@/components/IntentionProgress';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProduct(id!);
  useDocumentTitle(product?.name ?? 'Product');
  const deleteProduct = useDeleteProduct();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: intentions } = useIntentions(id!);
  const { data: specs } = useSpecs(id!);
  const intentionCount = intentions?.length ?? 0;
  const specCount = specs?.length ?? 0;

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (error || !product) {
    return <div className="text-destructive">Product not found.</div>;
  }

  function handleDelete() {
    deleteProduct.mutate(id!, {
      onSuccess: () => {
        toast.success('Product deleted');
        navigate('/products');
      },
    });
  }

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product.name },
      ]} />

      {/* Hero */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <StatusBadge status={product.status} />
        </div>
        <p className="text-muted-foreground">{product.problem_statement}</p>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b">
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${product.id}/intentions`}>
            Intentions ({intentionCount})
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${product.id}/specs`}>
            Specs ({specCount})
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${product.id}/board`}>
            Flow Board
          </Link>
        </Button>
        <div className="flex-1" />
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${product.id}/edit`}>Edit</Link>
        </Button>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              Delete
            </Button>
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

      {/* 2-column content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Vision</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{product.vision}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Target Audience</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{product.target_audience}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Context</CardTitle></CardHeader>
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
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Intention Progress</CardTitle></CardHeader>
            <CardContent>
              <IntentionProgress intentions={intentions ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">WIP Limits</CardTitle></CardHeader>
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

          <div className="text-xs text-muted-foreground flex gap-4">
            <span>Created: {new Date(product.created_at).toLocaleString()}</span>
            <span>Updated: {new Date(product.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
