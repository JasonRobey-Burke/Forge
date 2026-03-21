import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSpec, useUpdateSpec, useSpecExpectations } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import SpecForm from '@/components/SpecForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ChecklistExpectation } from '@shared/checklist/types';

export default function SpecEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spec, isLoading, error } = useSpec(id!);
  const { data: linkedExpectations } = useSpecExpectations(id!);
  const updateSpec = useUpdateSpec();
  const { data: product } = useProduct(spec?.product_id ?? '');
  useDocumentTitle('Edit Spec');

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !spec) return <div className="text-destructive">Spec not found.</div>;

  const checklistExpectations: ChecklistExpectation[] = (linkedExpectations ?? []).map((e) => ({
    id: e.id,
    description: e.description ?? '',
    edge_cases: e.edge_cases ?? [],
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit {spec.title}</h1>
      <SpecForm
        productId={spec.product_id}
        productContext={product?.context}
        defaultValues={spec}
        defaultSpec={spec}
        checklistExpectations={checklistExpectations}
        linkedExpectations={linkedExpectations ?? []}
        onSubmit={({ product_id: _, ...rest }) => {
          updateSpec.mutate(
            { id: id!, product_id: spec.product_id, ...rest },
            { onSuccess: () => { toast.success('Spec updated'); navigate(`/specs/${id}`); } },
          );
        }}
        isSubmitting={updateSpec.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
