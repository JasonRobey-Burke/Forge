import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateProduct } from '@/hooks/useProducts';
import ProductForm from '@/components/ProductForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ProductCreatePage() {
  useDocumentTitle('New Product');
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">New Product</h1>
      <ProductForm
        onSubmit={(values) => {
          createProduct.mutate(values, {
            onSuccess: (product) => {
              toast.success('Product created');
              navigate(`/products/${product.id}`);
            },
          });
        }}
        isSubmitting={createProduct.isPending}
        submitLabel="Create Product"
      />
    </div>
  );
}
