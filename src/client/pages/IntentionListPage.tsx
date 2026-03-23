import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useIntentions } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Priority } from '@shared/types';
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

const priorityVariant: Record<Priority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Critical: 'destructive',
  High: 'default',
  Medium: 'secondary',
  Low: 'outline',
};

export default function IntentionListPage() {
  useDocumentTitle('Intentions');
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product } = useProduct(productId!);
  const { data: intentions, isLoading, error } = useIntentions(productId!);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('__all__');

  const filtered = useMemo(() => {
    let items = intentions ?? [];
    if (search) items = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));
    if (priorityFilter !== '__all__') items = items.filter(i => i.priority === priorityFilter);
    return items;
  }, [intentions, search, priorityFilter]);

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load intentions: {error.message}</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${productId}` },
        { label: 'Intentions' },
      ]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Intentions</h1>
        <Button asChild>
          <Link to={`/products/${productId}/intentions/new`}>New Intention</Link>
        </Button>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search intentions..."
        filters={[
          {
            label: 'Priority',
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { label: 'Critical', value: 'Critical' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' },
            ],
          },
        ]}
      />

      {!intentions || intentions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No intentions yet.</p>
          <Button asChild variant="outline">
            <Link to={`/products/${productId}/intentions/new`}>Create your first intention</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No intentions found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((intention) => (
                <TableRow
                  key={intention.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/intentions/${intention.id}`)}
                >
                  <TableCell className="font-semibold">{intention.title}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[intention.priority as Priority]}>
                      {intention.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{intention.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-sm">
                    <span className="line-clamp-1">{intention.description}</span>
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
