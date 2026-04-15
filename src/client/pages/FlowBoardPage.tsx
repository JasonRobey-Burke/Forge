import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useSpecs } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import FlowBoard from '@/components/FlowBoard';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSessionState } from '@/hooks/useSessionState';
import { PHASE_LABELS } from '@/lib/phaseColors';
import FlowBoardSkeleton from '@/components/skeletons/FlowBoardSkeleton';
import ListToolbar from '@/components/ListToolbar';
import { Button } from '@/components/ui/button';

export default function FlowBoardPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data: product, isLoading: productLoading } = useProduct(productId!);
  const { data: specs, isLoading: specsLoading } = useSpecs(productId!);
  useDocumentTitle(product?.name ? `${product.name} — Flow Board` : 'Flow Board');
  const storagePrefix = `forge:board:${productId ?? 'unknown'}`;
  const [search, setSearch] = useSessionState(`${storagePrefix}:search`, '');
  const [phaseFilter, setPhaseFilter] = useSessionState(`${storagePrefix}:phaseFilter`, '__all__');
  const [complexityFilter, setComplexityFilter] = useSessionState(`${storagePrefix}:complexityFilter`, '__all__');

  const filteredSpecs = useMemo(() => {
    let items = specs ?? [];
    if (search) items = items.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
    if (phaseFilter !== '__all__') items = items.filter((s) => s.phase === phaseFilter);
    if (complexityFilter !== '__all__') items = items.filter((s) => s.complexity === complexityFilter);
    return items;
  }, [specs, search, phaseFilter, complexityFilter]);

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

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search board specs..."
        filters={[
          {
            label: 'Phase',
            value: phaseFilter,
            onChange: setPhaseFilter,
            options: Object.entries(PHASE_LABELS).map(([value, label]) => ({ label, value })),
          },
          {
            label: 'Complexity',
            value: complexityFilter,
            onChange: setComplexityFilter,
            options: [
              { label: 'Low', value: 'Low' },
              { label: 'Medium', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
        ]}
      />

      <FlowBoard specs={filteredSpecs} wipLimits={product.wip_limits} productId={productId!} />
    </div>
  );
}
