import { useParams, Link } from 'react-router-dom';
import { useSpecs } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import FlowBoard from '@/components/FlowBoard';

export default function FlowBoardPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data: product, isLoading: productLoading } = useProduct(productId!);
  const { data: specs, isLoading: specsLoading } = useSpecs(productId!);

  if (productLoading || specsLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!product || !specs) return <div className="text-destructive">Error loading board.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{product.name} — Flow Board</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/products/${productId}`}>Back to Product</Link>
        </Button>
      </div>
      <FlowBoard specs={specs} wipLimits={product.wip_limits} productId={productId!} />
    </div>
  );
}
