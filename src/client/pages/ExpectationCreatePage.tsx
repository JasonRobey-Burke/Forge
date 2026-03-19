import { useParams, useNavigate } from 'react-router-dom';
import { useCreateExpectation } from '@/hooks/useExpectations';
import ExpectationForm from '@/components/ExpectationForm';

export default function ExpectationCreatePage() {
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
            onSuccess: (expectation) => navigate(`/expectations/${expectation.id}`),
          });
        }}
        isSubmitting={createExpectation.isPending}
        submitLabel="Create Expectation"
      />
    </div>
  );
}
