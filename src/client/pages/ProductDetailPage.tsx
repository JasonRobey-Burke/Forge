import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useProduct, useDeleteProduct, useUpdateProduct } from '@/hooks/useProducts';
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
} from '@/components/ui/dialog';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/lib/phaseColors';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import IntentionProgress from '@/components/IntentionProgress';
import { ProductFormFields, productToFormValues, productToApiValues } from '@/components/ProductForm';
import { ProductStatus } from '@shared/types/enums';
import type { CreateProductInput } from '@shared/types';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  problem_statement: z.string().min(1, 'Problem statement is required'),
  vision: z.string().min(1, 'Vision is required'),
  target_audience: z.string().min(1, 'Target audience is required'),
  status: z.enum(Object.values(ProductStatus) as [string, ...string[]]),
  context: z.object({
    stack: z.array(z.object({ value: z.string() })),
    patterns: z.array(z.object({ value: z.string() })),
    conventions: z.array(z.object({ value: z.string() })),
    auth: z.string(),
  }),
  wip_limits: z.object({
    draft: z.coerce.number().int().min(0),
    ready: z.coerce.number().int().min(0),
    in_progress: z.coerce.number().int().min(0),
    review: z.coerce.number().int().min(0),
    validating: z.coerce.number().int().min(0),
  }),
});

type EditFormValues = z.infer<typeof formSchema>;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProduct(id!);
  useDocumentTitle(product?.name ?? 'Product');
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { data: intentions } = useIntentions(id!);
  const { data: specs } = useSpecs(id!);
  const intentionCount = intentions?.length ?? 0;
  const specCount = specs?.length ?? 0;

  const form = useForm<EditFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: productToFormValues(product as Partial<CreateProductInput> | undefined),
  });

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

  function handleEdit() {
    form.reset(productToFormValues(product as Partial<CreateProductInput>));
    setEditing(true);
  }

  function handleCancel() {
    form.reset();
    setEditing(false);
  }

  function handleSave(values: EditFormValues) {
    const apiValues = productToApiValues(values);
    updateProduct.mutate(
      { id: id!, ...apiValues },
      {
        onSuccess: () => {
          toast.success('Changes saved');
          setEditing(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
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
          <h1 className="text-xl font-semibold">{product.name}</h1>
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
        {editing ? (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={form.handleSubmit(handleSave)}
              disabled={updateProduct.isPending}
            >
              {updateProduct.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={handleEdit}>Edit</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
          </>
        )}
      </div>

      {editing ? (
        <FormProvider {...form}>
          <form className="space-y-6 max-w-2xl">
            <ProductFormFields control={form.control} formState={form.formState} />
          </form>
        </FormProvider>
      ) : (
        /* 2-column content grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Vision</p>
              <p className="text-sm">{product.vision}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Target Audience</p>
              <p className="text-sm">{product.target_audience}</p>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Context</CardTitle></CardHeader>
              <CardContent className="space-y-3">
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
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Intention Progress</CardTitle></CardHeader>
              <CardContent>
                <IntentionProgress intentions={intentions ?? []} />
              </CardContent>
            </Card>

            {intentions && intentions.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Intentions</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {intentions.slice(0, 5).map((intention) => (
                      <li key={intention.id} className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/intentions/${intention.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {intention.title}
                        </Link>
                        <Badge
                          variant={
                            intention.priority === 'Critical' ? 'destructive' :
                            intention.priority === 'High' ? 'default' :
                            intention.priority === 'Medium' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {intention.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{intention.status}</Badge>
                      </li>
                    ))}
                  </ul>
                  {intentions.length > 5 && (
                    <div className="mt-2">
                      <Link
                        to={`/products/${product.id}/intentions`}
                        className="text-sm text-primary hover:underline"
                      >
                        View all {intentions.length} intentions
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">WIP Limits</CardTitle></CardHeader>
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

            <p className="text-xs text-muted-foreground">
              Created {new Date(product.created_at).toLocaleDateString()} · Updated {new Date(product.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
