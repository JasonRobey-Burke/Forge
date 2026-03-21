import { useMatch } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';

export function useCurrentProduct() {
  // Match any route under /products/:id (including /products/:id/edit, /products/:id/specs, etc.)
  const productMatch = useMatch('/products/:id/*');

  const productId = productMatch?.params.id ?? null;
  const isProductRoute = productId !== null && productId !== 'new';

  const { data: product } = useProduct(isProductRoute ? productId! : '');

  return {
    productId: isProductRoute ? productId : null,
    productName: product?.name ?? null,
    isProductRoute,
  };
}
