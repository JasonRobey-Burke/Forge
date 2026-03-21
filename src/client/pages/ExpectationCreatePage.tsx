import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateExpectation } from '@/hooks/useExpectations';
import ExpectationForm from '@/components/ExpectationForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ExpectationCreatePage() {
  useDocumentTitle('New Expectation');
  const { intentionId } = useParams<{ intentionId: string }>();
  const navigate = useNavigate();
  const createExpectation = useCreateExpectation();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Expectation</h1>
      <ExpectationForm
        intentionId={intentionId!}
        onSubmit={(values) => {
          createExpectation.mutate(values, {
            onSuccess: (expectation) => {
              toast.success('Expectation created');
              navigate(`/expectations/${expectation.id}`);
            },
          });
        }}
        isSubmitting={createExpectation.isPending}
        submitLabel="Create Expectation"
      />
    </div>
  );
}
