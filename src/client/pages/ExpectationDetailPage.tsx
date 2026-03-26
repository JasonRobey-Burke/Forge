import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import type { Control, FormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useExpectation, useExpectations, useUpdateExpectation } from '@/hooks/useExpectations';
import { useIntention } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { ExpectationStatus } from '@shared/types/enums';
import { Badge } from '@/components/ui/badge';
import { EXPECTATION_STATUS_LABELS } from '@/lib/phaseColors';
import CopyCommand from '@/components/CopyCommand';
import PrevNextNav from '@/components/PrevNextNav';
import InlineStatusSelect from '@/components/InlineStatusSelect';
import InlineField from '@/components/InlineField';
import StickyEditBar from '@/components/StickyEditBar';
import AdditionalFields from '@/components/AdditionalFields';
import YamlEditor from '@/components/YamlEditor';

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  status: z.string(),
  edge_cases: z.array(z.object({ value: z.string() })).min(2, 'At least 2 edge cases required'),
});

type EditFormValues = z.infer<typeof editSchema>;

function EdgeCaseEditor({ control, formState }: { control: Control<any>; formState: FormState<any> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'edge_cases' });
  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input {...control.register(`edge_cases.${index}.value`)} placeholder={`Edge case ${index + 1}`} />
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length <= 2}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}>
        + Add Edge Case
      </Button>
      {formState.errors.edge_cases && (
        <p className="text-sm text-destructive">
          {(formState.errors.edge_cases as { message?: string }).message}
        </p>
      )}
    </div>
  );
}

export default function ExpectationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: expectation, isLoading, error } = useExpectation(id!);
  const { data: intention } = useIntention(expectation?.intention_id ?? '');
  const { data: product } = useProduct(intention?.product_id ?? '');
  const { data: siblings } = useExpectations(expectation?.intention_id ?? '');
  useDocumentTitle(expectation?.title ?? 'Expectation');
  const updateExpectation = useUpdateExpectation();
  const [editing, setEditing] = useState(false);
  const [editingYaml, setEditingYaml] = useState(false);
  const actionBarRef = useRef<HTMLDivElement>(null);

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

      <FormProvider {...form}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 mr-4">
            <span className="text-sm text-muted-foreground font-mono">{expectation.id}</span>
            {editing ? (
              <InlineField editing={editing} className="flex-1">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} className="text-xl font-semibold h-auto py-1 border-0 shadow-none bg-transparent p-0 focus-visible:ring-0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </InlineField>
            ) : (
              <h1 className="text-xl font-semibold">{expectation.title}</h1>
            )}
            {expectation.owner && <Badge variant="outline" className="text-xs">{expectation.owner}</Badge>}
            <InlineStatusSelect
              value={expectation.status}
              labels={EXPECTATION_STATUS_LABELS}
              disabled={updateExpectation.isPending}
              onChange={(newStatus) => {
                updateExpectation.mutate(
                  { id: id!, intention_id: expectation.intention_id, status: newStatus as any },
                  { onSuccess: () => toast.success(`Status changed to ${EXPECTATION_STATUS_LABELS[newStatus] ?? newStatus}`) },
                );
              }}
            />
          </div>
          <div ref={actionBarRef} className="flex gap-2">
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
              <>
                <Button variant="ghost" size="sm" onClick={handleEdit}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingYaml(true)}>Edit YAML</Button>
              </>
            )}
          </div>
        </div>

        {editingYaml && (
          <div className="mb-6">
            <YamlEditor type="expectations" id={id!} onClose={() => setEditingYaml(false)} />
          </div>
        )}

        {!editingYaml && <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <InlineField editing={editing}>
                {editing ? (
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea {...field} className="border-0 shadow-none bg-transparent p-0 resize-none focus-visible:ring-0" rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <p className="text-sm">{expectation.description}</p>
                )}
              </InlineField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Edge Cases</CardTitle></CardHeader>
            <CardContent>
              <InlineField editing={editing}>
                {editing ? (
                  <EdgeCaseEditor control={form.control} formState={form.formState} />
                ) : (
                  <ol className="space-y-1 list-decimal list-inside">
                    {expectation.edge_cases.map((ec, i) => (
                      <li key={i} className="text-sm">{ec}</li>
                    ))}
                  </ol>
                )}
              </InlineField>
            </CardContent>
          </Card>

          {!editing && <AdditionalFields extras={expectation.extras} />}

          <CopyCommand
            label="Write a spec for this expectation in Claude Code:"
            command={`/idd-framework:write-spec ${expectation.id}`}
          />

          <p className="text-xs text-muted-foreground">
            Created {formattedCreated} · Updated {formattedUpdated}
          </p>
        </div>}

        <StickyEditBar
          editing={editing}
          actionBarRef={actionBarRef}
          onSave={form.handleSubmit(handleSave)}
          onCancel={handleCancel}
          isPending={updateExpectation.isPending}
        />
      </FormProvider>
    </div>
  );
}
