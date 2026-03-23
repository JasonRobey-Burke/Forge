import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useExpectations } from '@/hooks/useExpectations';
import { useIntention } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Expectations</h1>
        <Button asChild>
          <Link to={`/intentions/${intentionId}/expectations/new`}>New Expectation</Link>
        </Button>
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No expectations yet.</p>
          <Button asChild variant="outline">
            <Link to={`/intentions/${intentionId}/expectations/new`}>Create your first expectation</Link>
          </Button>
        </div>
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
                  <TableCell className="font-semibold">{exp.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{exp.status}</Badge>
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
