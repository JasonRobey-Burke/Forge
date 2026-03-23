import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateIntention } from '@/hooks/useIntentions';
import IntentionForm from '@/components/IntentionForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function IntentionCreatePage() {
  useDocumentTitle('New Intention');
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const createIntention = useCreateIntention();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">New Intention</h1>
      <IntentionForm
        productId={productId!}
        onSubmit={(values) => {
          createIntention.mutate(values, {
            onSuccess: (intention) => {
              toast.success('Intention created');
              navigate(`/intentions/${intention.id}`);
            },
          });
        }}
        isSubmitting={createIntention.isPending}
        submitLabel="Create Intention"
      />
    </div>
  );
}
