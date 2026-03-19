import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useCreateSpec } from '@/hooks/useSpecs';
import SpecForm from '@/components/SpecForm';

export default function SpecCreatePage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(productId!);
  const createSpec = useCreateSpec();

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;

  // Pre-populate with product's context for context inheritance
  const defaultValues = product ? { context: product.context } : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Spec</h1>
      <SpecForm
        productId={productId!}
        defaultValues={defaultValues}
        onSubmit={(values) => {
          createSpec.mutate(values, {
            onSuccess: (spec) => navigate(`/specs/${spec.id}`),
          });
        }}
        isSubmitting={createSpec.isPending}
        submitLabel="Create Spec"
      />
    </div>
  );
}
