import { useNavigate } from 'react-router-dom';
import { useCreateProduct } from '@/hooks/useProducts';
import ProductForm from '@/components/ProductForm';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Product</h1>
      <ProductForm
        onSubmit={(values) => {
          createProduct.mutate(values, {
            onSuccess: (product) => navigate(`/products/${product.id}`),
          });
        }}
        isSubmitting={createProduct.isPending}
        submitLabel="Create Product"
      />
    </div>
  );
}
