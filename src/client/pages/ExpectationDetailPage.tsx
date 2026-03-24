import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useExpectation, useExpectations, useUpdateExpectation } from '@/hooks/useExpectations';
import { useIntention } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpectationFormFields } from '@/components/ExpectationForm';
import { ExpectationStatus } from '@shared/types/enums';
import { EXPECTATION_STATUS_LABELS } from '@/lib/phaseColors';
import CopyCommand from '@/components/CopyCommand';
import PrevNextNav from '@/components/PrevNextNav';

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(Object.values(ExpectationStatus) as [string, ...string[]]),
  edge_cases: z.array(z.object({ value: z.string() })).min(2, 'At least 2 edge cases required'),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function ExpectationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: expectation, isLoading, error } = useExpectation(id!);
  const { data: intention } = useIntention(expectation?.intention_id ?? '');
  const { data: product } = useProduct(intention?.product_id ?? '');
  const { data: siblings } = useExpectations(expectation?.intention_id ?? '');
  useDocumentTitle(expectation?.title ?? 'Expectation');
  const updateExpectation = useUpdateExpectation();
  const [editing, setEditing] = useState(false);

  const form = useForm<EditFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      title: expectation?.title ?? '',
      description: expectation?.description ?? '',
      status: (expectation?.status ?? 'Draft') as string,
      edge_cases: expectation?.edge_cases?.map((v) => ({ value: v })) ?? [{ value: '' }, { value: '' }],
    },
  });

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !expectation) return <div className="text-destructive">Expectation not found.</div>;

  function handleEdit() {
    const edgeCases = expectation!.edge_cases.map((v) => ({ value: v }));
    form.reset({
      title: expectation!.title,
      description: expectation!.description,
      status: expectation!.status as string,
      edge_cases: edgeCases.length < 2
        ? [...edgeCases, ...Array(2 - edgeCases.length).fill({ value: '' })]
        : edgeCases,
    });
    setEditing(true);
  }

  function handleCancel() {
    form.reset();
    setEditing(false);
  }

  function handleSave(values: EditFormValues) {
    updateExpectation.mutate(
      {
        id: id!,
        intention_id: expectation!.intention_id,
        title: values.title,
        description: values.description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: values.status as any,
        edge_cases: values.edge_cases.map((ec) => ec.value).filter(Boolean),
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

  const formattedCreated = new Date(expectation.created_at).toLocaleDateString();
  const formattedUpdated = new Date(expectation.updated_at).toLocaleDateString();

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${intention?.product_id}` },
        { label: 'Intentions', href: `/products/${intention?.product_id}/intentions` },
        { label: intention?.title ?? '...', href: `/intentions/${expectation.intention_id}` },
        { label: 'Expectations', href: `/intentions/${expectation.intention_id}/expectations` },
        { label: expectation.title },
      ]} />
      <div className="flex items-center justify-between mb-4">
        {editing ? (
          <div className="flex-1 mr-4" />
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              <span className="text-sm text-muted-foreground font-mono mr-2">{expectation.id}</span>
              {expectation.title}
            </h1>
            <Badge variant="outline">{EXPECTATION_STATUS_LABELS[expectation.status] ?? expectation.status}</Badge>
          </div>
        )}
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="default"
                onClick={form.handleSubmit(handleSave)}
                disabled={updateExpectation.isPending}
              >
                {updateExpectation.isPending ? 'Saving...' : 'Save'}
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

      {editing ? (
        <FormProvider {...form}>
          <form className="space-y-6">
            <ExpectationFormFields control={form.control} formState={form.formState} />
          </form>
        </FormProvider>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{expectation.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Edge Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1 list-decimal list-inside">
                {expectation.edge_cases.map((ec, i) => (
                  <li key={i} className="text-sm">{ec}</li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <CopyCommand
            label="Write a spec for this expectation in Claude Code:"
            command={`/idd-framework:write-spec ${expectation.id}`}
          />

          <p className="text-xs text-muted-foreground">
            Created {formattedCreated} · Updated {formattedUpdated}
          </p>

          {siblings && (() => {
            const idx = siblings.findIndex(s => s.id === expectation.id);
            const prev = idx > 0 ? siblings[idx - 1] : null;
            const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;
            return (
              <PrevNextNav
                prev={prev ? { id: prev.id, title: prev.title } : null}
                next={next ? { id: next.id, title: next.title } : null}
                buildUrl={(sibId) => `/expectations/${sibId}`}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
