import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntentions } from '@/hooks/useIntentions';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Intention } from '@shared/types';
import type { Priority } from '@shared/types';
import { INTENTION_STATUS_LABELS } from '@/lib/phaseColors';
import EmptyState from '@/components/EmptyState';
import ListToolbar from '@/components/ListToolbar';
import CardGridSkeleton from '@/components/skeletons/CardGridSkeleton';
import { ArrowUpDown, ArrowUp, ArrowDown, Compass } from 'lucide-react';
import NewBadge from '@/components/NewBadge';
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

const priorityRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const statusRank: Record<string, number> = { Draft: 0, Defined: 1, InProgress: 2, Fulfilled: 3, Deferred: 4 };

type SortKey = 'title' | 'priority' | 'status' | 'description';
type SortDir = 'asc' | 'desc';

export default function IntentionListPage() {
  useDocumentTitle('Intentions');
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { data: product } = useProduct(productId!);
  const { data: intentions, isLoading, error } = useIntentions(productId!);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('__all__');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let items = intentions ?? [];
    if (search) items = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));
    if (priorityFilter !== '__all__') items = items.filter(i => i.priority === priorityFilter);
    if (statusFilter !== '__all__') items = items.filter(i => i.status === statusFilter);

    if (sortKey) {
      items = [...items].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'priority') {
          cmp = (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99);
        } else if (sortKey === 'status') {
          cmp = (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99);
        } else {
          cmp = (a[sortKey as keyof Intention] as string ?? '').localeCompare(b[sortKey as keyof Intention] as string ?? '');
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return items;
  }, [intentions, search, priorityFilter, statusFilter, sortKey, sortDir]);

  if (isLoading) return <CardGridSkeleton />;
  if (error) return <div className="text-destructive">Failed to load intentions: {error.message}</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${productId}` },
        { label: 'Intentions' },
      ]} />
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Intentions</h1>
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
          {
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Draft', value: 'Draft' },
              { label: 'Defined', value: 'Defined' },
              { label: 'In Progress', value: 'InProgress' },
              { label: 'Fulfilled', value: 'Fulfilled' },
              { label: 'Deferred', value: 'Deferred' },
            ],
          },
        ]}
      />

      {!intentions || intentions.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="No intentions found"
          description="Add YAML files to docs/intentions/ to define what this product should accomplish."
          actionLabel="Refresh"
          onAction={() => window.location.reload()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {(['title', 'priority', 'status', 'description'] as const).map((key) => {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                const SortIcon = sortKey === key ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <TableHead
                    key={key}
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort(key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <SortIcon className={`h-3.5 w-3.5 ${sortKey === key ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                    </span>
                  </TableHead>
                );
              })}
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
                  <TableCell className="font-semibold">
                    <span className="text-xs text-muted-foreground font-mono mr-1.5">{intention.id}</span>
                    {intention.title}
                    <NewBadge createdAt={intention.created_at} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[intention.priority as Priority]}>
                      {intention.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{INTENTION_STATUS_LABELS[intention.status] ?? intention.status}</Badge>
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
