import { useParams, useNavigate } from 'react-router-dom';
import { useSpec, useUpdateSpec } from '@/hooks/useSpecs';
import SpecForm from '@/components/SpecForm';

export default function SpecEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spec, isLoading, error } = useSpec(id!);
  const updateSpec = useUpdateSpec();

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !spec) return <div className="text-destructive">Spec not found.</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit {spec.title}</h1>
      <SpecForm
        productId={spec.product_id}
        defaultValues={spec}
        onSubmit={({ product_id: _, ...rest }) => {
          updateSpec.mutate(
            { id: id!, product_id: spec.product_id, ...rest },
            { onSuccess: () => navigate(`/specs/${id}`) },
          );
        }}
        isSubmitting={updateSpec.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
