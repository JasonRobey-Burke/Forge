import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useExpectation, useUpdateExpectation } from '@/hooks/useExpectations';
import ExpectationForm from '@/components/ExpectationForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ExpectationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expectation, isLoading, error } = useExpectation(id!);
  const updateExpectation = useUpdateExpectation();
  useDocumentTitle('Edit Expectation');

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !expectation) return <div className="text-destructive">Expectation not found.</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Edit {expectation.title}</h1>
      <ExpectationForm
        intentionId={expectation.intention_id}
        defaultValues={expectation}
        onSubmit={({ intention_id: _, ...rest }) => {
          updateExpectation.mutate(
            { id: id!, intention_id: expectation.intention_id, ...rest },
            { onSuccess: () => { toast.success('Expectation updated'); navigate(`/expectations/${id}`); } },
          );
        }}
        isSubmitting={updateExpectation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
