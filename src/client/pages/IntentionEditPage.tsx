import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useIntention, useUpdateIntention } from '@/hooks/useIntentions';
import IntentionForm from '@/components/IntentionForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function IntentionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: intention, isLoading, error } = useIntention(id!);
  useDocumentTitle('Edit Intention');
  const updateIntention = useUpdateIntention();

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !intention) return <div className="text-destructive">Intention not found.</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit {intention.title}</h1>
      <IntentionForm
        productId={intention.product_id}
        defaultValues={intention}
        onSubmit={({ product_id: _, ...rest }) => {
          updateIntention.mutate(
            { id: id!, product_id: intention.product_id, ...rest },
            { onSuccess: () => { toast.success('Intention updated'); navigate(`/intentions/${id}`); } },
          );
        }}
        isSubmitting={updateIntention.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
