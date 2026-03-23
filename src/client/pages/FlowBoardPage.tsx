import { useParams, Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useSpecs } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import FlowBoard from '@/components/FlowBoard';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import FlowBoardSkeleton from '@/components/skeletons/FlowBoardSkeleton';
import { Button } from '@/components/ui/button';

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{product.name} — Flow Board</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${productId}/edit`}>
            <Settings className="h-4 w-4 mr-1" />
            WIP Settings
          </Link>
        </Button>
      </div>
      <FlowBoard specs={specs} wipLimits={product.wip_limits} productId={productId!} />
    </div>
  );
}
