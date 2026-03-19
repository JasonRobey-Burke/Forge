import { useParams, useNavigate } from 'react-router-dom';
import { useCreateIntention } from '@/hooks/useIntentions';
import IntentionForm from '@/components/IntentionForm';

export default function IntentionCreatePage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const createIntention = useCreateIntention();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Intention</h1>
      <IntentionForm
        productId={productId!}
        onSubmit={(values) => {
          createIntention.mutate(values, {
            onSuccess: (intention) => navigate(`/intentions/${intention.id}`),
          });
        }}
        isSubmitting={createIntention.isPending}
        submitLabel="Create Intention"
      />
    </div>
  );
}
