import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useIntention, useIntentions, useUpdateIntention } from '@/hooks/useIntentions';
import { useExpectations } from '@/hooks/useExpectations';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import CopyCommand from '@/components/CopyCommand';
import NewBadge from '@/components/NewBadge';
import PrevNextNav from '@/components/PrevNextNav';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import { IntentionFormFields } from '@/components/IntentionForm';
import { Priority, IntentionStatus } from '@shared/types/enums';
import { INTENTION_STATUS_LABELS, EXPECTATION_STATUS_LABELS } from '@/lib/phaseColors';
import type { Priority as PriorityType } from '@shared/types';

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(Object.values(Priority) as [string, ...string[]]),
  status: z.enum(Object.values(IntentionStatus) as [string, ...string[]]),
});

type EditFormValues = z.infer<typeof editSchema>;

const priorityVariant: Record<PriorityType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Critical: 'destructive',
  High: 'default',
  Medium: 'secondary',
  Low: 'outline',
};

export default function IntentionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: intention, isLoading, error } = useIntention(id!);
  const { data: product } = useProduct(intention?.product_id ?? '');
  const { data: expectations } = useExpectations(id!);
  const { data: siblings } = useIntentions(intention?.product_id ?? '');
  useDocumentTitle(intention?.title ?? 'Intention');
  const updateIntention = useUpdateIntention();
  const [editing, setEditing] = useState(false);

  const form = useForm<EditFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      title: intention?.title ?? '',
      description: intention?.description ?? '',
      priority: (intention?.priority ?? 'Medium') as string,
      status: (intention?.status ?? 'Draft') as string,
    },
  });

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !intention) return <div className="text-destructive">Intention not found.</div>;

  function handleEdit() {
    form.reset({
      title: intention!.title,
      description: intention!.description,
      priority: intention!.priority as string,
      status: intention!.status as string,
    });
    setEditing(true);
  }

  function handleCancel() {
    form.reset();
    setEditing(false);
  }

  function handleSave(values: EditFormValues) {
    updateIntention.mutate(
      {
        id: id!,
        product_id: intention!.product_id,
        title: values.title,
        description: values.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        priority: values.priority as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: values.status as any,
      },
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

  const formattedCreated = new Date(intention.created_at).toLocaleDateString();
  const formattedUpdated = new Date(intention.updated_at).toLocaleDateString();

  return (
    <div className="max-w-4xl">
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${intention.product_id}` },
        { label: 'Intentions', href: `/products/${intention.product_id}/intentions` },
        { label: intention.title },
      ]} />

      {siblings && (() => {
        const idx = siblings.findIndex(s => s.id === intention.id);
        const prev = idx > 0 ? siblings[idx - 1] : null;
        const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;
        return (
          <PrevNextNav
            prev={prev ? { id: prev.id, title: prev.title } : null}
            next={next ? { id: next.id, title: next.title } : null}
            buildUrl={(sibId) => `/intentions/${sibId}`}
          />
        );
      })()}

      <div className="flex items-center justify-between mb-4">
        {editing ? (
          <div className="flex-1 mr-4">
            {/* Title/priority/status shown inline in form below */}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              <span className="text-sm text-muted-foreground font-mono mr-2">{intention.id}</span>
              {intention.title}
            </h1>
            <Badge variant={priorityVariant[intention.priority as PriorityType]}>
              {intention.priority}
            </Badge>
            <Badge variant="outline">{INTENTION_STATUS_LABELS[intention.status] ?? intention.status}</Badge>
          </div>
        )}
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="default"
                onClick={form.handleSubmit(handleSave)}
                disabled={updateIntention.isPending}
              >
                {updateIntention.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleEdit}>Edit</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Description (editable in edit mode) */}
        <div className="space-y-4">
          {editing ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Edit Details</CardTitle>
              </CardHeader>
              <CardContent>
                <FormProvider {...form}>
                  <div className="space-y-4">
                    <IntentionFormFields control={form.control} formState={form.formState} />
                  </div>
                </FormProvider>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{intention.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Dependencies + Expectations (always visible) */}
        <div className="space-y-4">
          {intention.dependencies && intention.dependencies.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dependencies</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {intention.dependencies.map((dep: { id: string; title: string; status?: string }) => (
                    <li key={dep.id} className="flex items-center gap-2 flex-wrap">
                      <Link to={`/intentions/${dep.id}`} className="text-sm text-primary hover:underline">
                        <span className="text-muted-foreground font-mono mr-1">{dep.id}</span>
                        {dep.title}
                      </Link>
                      {dep.status && (
                        <Badge variant="outline" className="text-xs">{INTENTION_STATUS_LABELS[dep.status] ?? dep.status}</Badge>
                      )}
                      {dep.status === 'Deferred' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          Deferred
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expectations</CardTitle>
            </CardHeader>
            <CardContent>
              {expectations && expectations.length > 0 ? (
                <ul className="space-y-1.5">
                  {expectations.map((exp) => (
                    <li key={exp.id} className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/expectations/${exp.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        <span className="text-muted-foreground font-mono mr-1">{exp.id}</span>
                        {exp.title}
                      </Link>
                      <Badge variant="outline" className="text-xs">{EXPECTATION_STATUS_LABELS[exp.status] ?? exp.status}</Badge>
                      <NewBadge createdAt={exp.created_at} />
                      <span className="text-xs text-muted-foreground">
                        {exp.edge_cases.length} edge case{exp.edge_cases.length !== 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No expectations yet.</p>
              )}
              <CopyCommand
                label="Add new expectations in Claude Code:"
                command={`/idd-framework:define-expectations ${intention.id}`}
              />
            </CardContent>
          </Card>
        </div>

        {/* Footer timestamps spanning both columns */}
        <div className="lg:col-span-2 text-xs text-muted-foreground">
          Created {formattedCreated} · Updated {formattedUpdated}
        </div>

      </div>
    </div>
  );
}
