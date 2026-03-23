import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import ProductForm from '@/components/ProductForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProduct(id!);
  const updateProduct = useUpdateProduct();
  useDocumentTitle(product?.name ? `Edit ${product.name}` : 'Edit Product');

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (error || !product) {
    return <div className="text-destructive">Product not found.</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Edit {product.name}</h1>
      <ProductForm
        defaultValues={product}
        onSubmit={(values) => {
          updateProduct.mutate({ id: id!, ...values }, {
            onSuccess: () => {
              toast.success('Product updated');
              navigate(`/products/${id}`);
            },
          });
        }}
        isSubmitting={updateProduct.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
