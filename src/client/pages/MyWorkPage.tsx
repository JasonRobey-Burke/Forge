import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Breadcrumbs from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProducts } from '@/hooks/useProducts';
import { useSessionState } from '@/hooks/useSessionState';
import { apiFetch } from '@/lib/api';
import { PhaseBadge } from '@/lib/phaseColors';
import type { Product, Spec } from '@shared/types';
import { UserCheck } from 'lucide-react';

type SpecWithProduct = Spec & { productName: string };

export default function MyWorkPage() {
  useDocumentTitle('My Work');
  const { data: products, isLoading: productsLoading, error: productsError } = useProducts();
  const [ownerFilter, setOwnerFilter] = useSessionState('forge:mywork:owner', '');
  const [search, setSearch] = useSessionState('forge:mywork:search', '');

  const specQueries = useQueries({
    queries: (products ?? []).map((product: Product) => ({
      queryKey: ['specs', product.id],
      queryFn: () => apiFetch<Spec[]>(`/specs?product_id=${product.id}`),
      enabled: !!product.id,
    })),
  });

  const specsLoading = specQueries.some((q) => q.isLoading);
  const specsError = specQueries.find((q) => q.error)?.error as Error | undefined;

  const allSpecs = useMemo(() => {
    if (!products) return [] as SpecWithProduct[];
    const productNameById = new Map(products.map((p) => [p.id, p.name]));
    return specQueries
      .flatMap((q) => (q.data ?? []))
      .map((spec) => ({
        ...spec,
        productName: productNameById.get(spec.product_id) ?? spec.product_id,
      }));
  }, [products, specQueries]);

  const filtered = useMemo(() => {
    let items = allSpecs;
    if (ownerFilter.trim()) {
      const term = ownerFilter.trim().toLowerCase();
      items = items.filter((s) => (s.owner ?? '').toLowerCase() === term);
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      items = items.filter((s) => s.title.toLowerCase().includes(term) || s.id.toLowerCase().includes(term));
    }
    return items;
  }, [allSpecs, ownerFilter, search]);

  if (productsLoading || specsLoading) return <CardGridSkeleton />;
  if (productsError) return <div className="text-destructive">Failed to load products: {productsError.message}</div>;
  if (specsError) return <div className="text-destructive">Failed to load specs: {specsError.message}</div>;

  const assignedCount = allSpecs.filter((s) => !!s.owner?.trim()).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'My Work' }]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">My Work</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Assigned specs: {assignedCount}</Badge>
          <Badge variant="outline">Matches: {filtered.length}</Badge>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          placeholder="Filter by owner (exact name)"
          className="max-w-xs"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by spec id or title"
          className="max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="h-5 w-5" />}
          title="No matching assigned specs"
          description="Assign a spec owner in spec edit, then use this view to focus on owned work."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Spec</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((spec) => (
              <TableRow key={spec.id}>
                <TableCell className="font-semibold">
                  <Link to={`/specs/${spec.id}`} className="hover:underline">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{spec.id}</span>
                    {spec.title}
                  </Link>
                </TableCell>
                <TableCell>{spec.productName}</TableCell>
                <TableCell><PhaseBadge phase={spec.phase} /></TableCell>
                <TableCell>{spec.owner ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
