import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useIntentions } from '@/hooks/useIntentions';
import { useSpecs } from '@/hooks/useSpecs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { PRODUCT_STATUS_LABELS, INTENTION_STATUS_LABELS } from '@/lib/phaseColors';
import InlineStatusSelect from '@/components/InlineStatusSelect';
import InlineField from '@/components/InlineField';
import StickyEditBar from '@/components/StickyEditBar';
import ContextEditor from '@/components/ContextEditor';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import IntentionProgress from '@/components/IntentionProgress';
import CopyCommand from '@/components/CopyCommand';
import NewBadge from '@/components/NewBadge';
import AdditionalFields from '@/components/AdditionalFields';
import YamlEditor from '@/components/YamlEditor';
import { productToFormValues, productToApiValues } from '@/components/ProductForm';
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

  const { data: product, isLoading, error } = useProduct(id!);
  useDocumentTitle(product?.name ?? 'Product');
  const updateProduct = useUpdateProduct();
  const [editing, setEditing] = useState(false);
  const [editingYaml, setEditingYaml] = useState(false);
  const { data: intentions } = useIntentions(id!);
  const { data: specs } = useSpecs(id!);
  const intentionCount = intentions?.length ?? 0;
  const specCount = specs?.length ?? 0;

  const actionBarRef = useRef<HTMLDivElement>(null);

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

      <FormProvider {...form}>
        {/* Hero */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-muted-foreground font-mono">{product.id}</span>
            {editing ? (
              <InlineField editing={editing}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} className="text-xl font-semibold h-auto py-1 border-0 shadow-none bg-transparent p-0 focus-visible:ring-0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </InlineField>
            ) : (
              <h1 className="text-xl font-semibold">{product.name}</h1>
            )}
            {product.owner && <Badge variant="outline" className="text-xs">{product.owner}</Badge>}
            {product.version && <Badge variant="outline" className="text-xs">v{product.version}</Badge>}
            <InlineStatusSelect
              value={product.status}
              labels={PRODUCT_STATUS_LABELS}
              disabled={updateProduct.isPending}
              onChange={(newStatus) => {
                updateProduct.mutate(
                  { id: id!, status: newStatus as any },
                  { onSuccess: () => toast.success(`Status changed to ${PRODUCT_STATUS_LABELS[newStatus] ?? newStatus}`) },
                );
              }}
            />
          </div>
          {editing ? (
            <InlineField editing={editing}>
              <FormField
                control={form.control}
                name="problem_statement"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea {...field} className="text-muted-foreground border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </InlineField>
          ) : (
            <p className="text-muted-foreground">{product.problem_statement}</p>
          )}
        </div>

        {/* Action bar */}
        <div ref={actionBarRef} className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b">
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
              <Button variant="ghost" size="sm" onClick={() => setEditingYaml(true)}>Edit YAML</Button>
            </>
          )}
        </div>

        {editingYaml && (
          <div className="mb-6">
            <YamlEditor type="products" id={id!} onClose={() => setEditingYaml(false)} />
          </div>
        )}

        {/* 2-column content grid */}
        {!editingYaml && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column — always visible, inline editable */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Vision</p>
              <InlineField editing={editing}>
                {editing ? (
                  <FormField control={form.control} name="vision" render={({ field }) => (
                    <FormItem>
                      <FormControl><Textarea {...field} className="border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <p className="text-sm">{product.vision}</p>
                )}
              </InlineField>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Target Audience</p>
              <InlineField editing={editing}>
                {editing ? (
                  <FormField control={form.control} name="target_audience" render={({ field }) => (
                    <FormItem>
                      <FormControl><Textarea {...field} className="border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <p className="text-sm">{product.target_audience}</p>
                )}
              </InlineField>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Context</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {editing ? (
                  <ContextEditor />
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>

            {!editing && <AdditionalFields extras={product.extras} />}
          </div>

          {/* Right column — always visible */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Intention Progress</CardTitle></CardHeader>
              <CardContent>
                <IntentionProgress intentions={intentions ?? []} />
                {(!intentions || intentions.length === 0) && (
                  <CopyCommand
                    label="Define intentions in Claude Code:"
                    command={`/idd-framework:define-intentions ${product.id}`}
                  />
                )}
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
                          <span className="text-muted-foreground font-mono mr-1">{intention.id}</span>
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
                        <Badge variant="outline" className="text-xs">{INTENTION_STATUS_LABELS[intention.status] ?? intention.status}</Badge>
                        <NewBadge createdAt={intention.created_at} />
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
                  <CopyCommand
                    label="Add new intentions in Claude Code:"
                    command={`/idd-framework:define-intentions ${product.id}`}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">WIP Limits</CardTitle></CardHeader>
              <CardContent>
                <InlineField editing={editing}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {(['draft', 'ready', 'in_progress', 'review', 'validating'] as const).map((key) => (
                      <div key={key} className="text-center p-2 rounded-md bg-muted">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                        {editing ? (
                          <FormField control={form.control} name={`wip_limits.${key}`} render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" min={0} {...field} className="text-lg font-semibold text-center border-0 shadow-none bg-transparent p-0 h-auto focus-visible:ring-0" />
                              </FormControl>
                            </FormItem>
                          )} />
                        ) : (
                          <p className="text-lg font-semibold">{product.wip_limits[key]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </InlineField>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Created {new Date(product.created_at).toLocaleDateString()} · Updated {new Date(product.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>}

        <StickyEditBar
          editing={editing}
          actionBarRef={actionBarRef}
          onSave={form.handleSubmit(handleSave)}
          onCancel={handleCancel}
          isPending={updateProduct.isPending}
        />
      </FormProvider>
    </div>
  );
}
