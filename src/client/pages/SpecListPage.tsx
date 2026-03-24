import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpecs } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import Breadcrumbs from '@/components/Breadcrumbs';
import { PhaseBadge, PHASE_LABELS } from '@/lib/phaseColors';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function SpecListPage() {
  useDocumentTitle('Specs');
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product } = useProduct(productId!);
  const { data: specs, isLoading, error } = useSpecs(productId!);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('__all__');
  const [complexityFilter, setComplexityFilter] = useState('__all__');

  const filtered = useMemo(() => {
    let items = specs ?? [];
    if (search) items = items.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
    if (phaseFilter !== '__all__') items = items.filter(s => s.phase === phaseFilter);
    if (complexityFilter !== '__all__') items = items.filter(s => s.complexity === complexityFilter);
    return items;
  }, [specs, search, phaseFilter, complexityFilter]);

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load specs: {error.message}</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${productId}` },
        { label: 'Specs' },
      ]} />
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Specs</h1>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search specs..."
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

      {!specs || specs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No specs found. Add YAML files to the docs/specs/ directory.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead>Complexity</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No specs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((spec) => (
                <TableRow
                  key={spec.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/specs/${spec.id}`)}
                >
                  <TableCell className="font-semibold">
                    <span className="text-xs text-muted-foreground font-mono mr-1.5">{spec.id}</span>
                    {spec.title}
                  </TableCell>
                  <TableCell>
                    <PhaseBadge phase={spec.phase} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{spec.complexity}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-sm">
                    <span className="line-clamp-1">{spec.description}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
