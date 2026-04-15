import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExpectations } from '@/hooks/useExpectations';
import { useIntention } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { EXPECTATION_STATUS_LABELS } from '@/lib/phaseColors';
import Breadcrumbs from '@/components/Breadcrumbs';
import NewBadge from '@/components/NewBadge';
import EmptyState from '@/components/EmptyState';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';
import { ClipboardCheck } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function ExpectationListPage() {
  useDocumentTitle('Expectations');
  const { intentionId } = useParams<{ intentionId: string }>();
  const navigate = useNavigate();
  const { data: intention } = useIntention(intentionId!);
  const { data: product } = useProduct(intention?.product_id ?? '');
  const { data: expectations, isLoading, error } = useExpectations(intentionId!);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');

  const filtered = useMemo(() => {
    let items = expectations ?? [];
    if (search) items = items.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== '__all__') items = items.filter(e => e.status === statusFilter);
    return items;
  }, [expectations, search, statusFilter]);

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load expectations: {error.message}</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        ...(intention && product ? [
          { label: product.name, href: `/products/${intention.product_id}` },
          { label: 'Intentions', href: `/products/${intention.product_id}/intentions` },
          { label: intention.title, href: `/intentions/${intentionId}` },
        ] : []),
        { label: 'Expectations' },
      ]} />
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Expectations</h1>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search expectations..."
        filters={[
          {
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Ready', value: 'Ready' },
              { label: 'Specced', value: 'Specced' },
              { label: 'Validated', value: 'Validated' },
              { label: 'Done', value: 'Done' },
            ],
          },
        ]}
      />

      {!expectations || expectations.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="No expectations found"
          description="Add YAML files to docs/expectations/ to capture testable outcomes and edge cases."
          actionLabel="Refresh"
          onAction={() => window.location.reload()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Edge Cases</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No expectations found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((exp) => (
                <TableRow
                  key={exp.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/expectations/${exp.id}`)}
                >
                  <TableCell className="font-semibold">
                    <span className="text-xs text-muted-foreground font-mono mr-1.5">{exp.id}</span>
                    {exp.title}
                    <NewBadge createdAt={exp.created_at} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{EXPECTATION_STATUS_LABELS[exp.status] ?? exp.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-sm">
                    <span className="line-clamp-1">{exp.description}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {exp.edge_cases.length} {exp.edge_cases.length === 1 ? 'case' : 'cases'}
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
