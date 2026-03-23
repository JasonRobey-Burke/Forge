import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useExpectation, useDeleteExpectation, useUpdateExpectation } from '@/hooks/useExpectations';
import { useIntention } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
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
import { ExpectationFormFields } from '@/components/ExpectationForm';
import { ExpectationStatus } from '@shared/types/enums';

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(Object.values(ExpectationStatus) as [string, ...string[]]),
  edge_cases: z.array(z.object({ value: z.string() })).min(2, 'At least 2 edge cases required'),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function ExpectationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expectation, isLoading, error } = useExpectation(id!);
  const { data: intention } = useIntention(expectation?.intention_id ?? '');
  const { data: product } = useProduct(intention?.product_id ?? '');
  useDocumentTitle(expectation?.title ?? 'Expectation');
  const deleteExpectation = useDeleteExpectation();
  const updateExpectation = useUpdateExpectation();
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  function handleDelete() {
    deleteExpectation.mutate(
      { id: id!, intention_id: expectation!.intention_id },
      {
        onSuccess: () => {
          toast.success('Expectation deleted');
          navigate(`/intentions/${expectation!.intention_id}/expectations`);
        },
      },
    );
  }

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
      <div className="flex items-center justify-between mb-6">
        {editing ? (
          <div className="flex-1 mr-4" />
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{expectation.title}</h1>
            <Badge variant="outline">{expectation.status}</Badge>
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
            <>
              <Button variant="outline" onClick={handleEdit}>Edit</Button>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete {expectation.title}?</DialogTitle>
                    <DialogDescription>
                      This will archive the expectation.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteExpectation.isPending}>
                      {deleteExpectation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{expectation.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edge Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {expectation.edge_cases.map((ec, i) => (
                  <li key={i} className="text-sm">{ec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Separator />

          <div className="text-xs text-muted-foreground flex gap-4">
            <span>Created: {new Date(expectation.created_at).toLocaleString()}</span>
            <span>Updated: {new Date(expectation.updated_at).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
