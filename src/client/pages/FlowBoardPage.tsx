import { useParams } from 'react-router-dom';
import { useSpecs } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import FlowBoard from '@/components/FlowBoard';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import FlowBoardSkeleton from '@/components/skeletons/FlowBoardSkeleton';

export default function FlowBoardPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data: product, isLoading: productLoading } = useProduct(productId!);
  const { data: specs, isLoading: specsLoading } = useSpecs(productId!);
  useDocumentTitle(product?.name ? `${product.name} — Flow Board` : 'Flow Board');

  if (productLoading || specsLoading) return <FlowBoardSkeleton />;
  if (!product || !specs) return <div className="text-destructive">Error loading board.</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product.name, href: `/products/${productId}` },
        { label: 'Flow Board' },
      ]} />
      <h1 className="text-2xl font-bold mb-4">{product.name} — Flow Board</h1>
      <FlowBoard specs={specs} wipLimits={product.wip_limits} productId={productId!} />
    </div>
  );
}
