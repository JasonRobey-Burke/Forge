import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useIntention, useDeleteIntention } from '@/hooks/useIntentions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Priority } from '@shared/types';

const priorityVariant: Record<Priority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Critical: 'destructive',
  High: 'default',
  Medium: 'secondary',
  Low: 'outline',
};

export default function IntentionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: intention, isLoading, error } = useIntention(id!);
  const deleteIntention = useDeleteIntention();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !intention) return <div className="text-destructive">Intention not found.</div>;

  function handleDelete() {
    deleteIntention.mutate(
      { id: id!, product_id: intention!.product_id },
      {
        onSuccess: () => navigate(`/products/${intention!.product_id}/intentions`),
        onError: (err) => {
          setDeleteOpen(false);
          alert(err.message);
        },
      },
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{intention.title}</h1>
          <Badge variant={priorityVariant[intention.priority as Priority]}>
            {intention.priority}
          </Badge>
          <Badge variant="outline">{intention.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/intentions/${intention.id}/edit`}>Edit</Link>
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {intention.title}?</DialogTitle>
                <DialogDescription>
                  This will archive the intention. It cannot be deleted if it has active expectations.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteIntention.isPending}>
                  {deleteIntention.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{intention.description}</p>
          </CardContent>
        </Card>

        {intention.dependencies && intention.dependencies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {intention.dependencies.map((dep: { id: string; title: string }) => (
                  <li key={dep.id}>
                    <Link to={`/intentions/${dep.id}`} className="text-sm text-primary hover:underline">
                      {dep.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Expectations</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to={`/intentions/${intention.id}/expectations`}>View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage expectations linked to this intention.
            </p>
          </CardContent>
        </Card>

        <Separator />

        <div className="text-xs text-muted-foreground flex gap-4">
          <span>Created: {new Date(intention.created_at).toLocaleString()}</span>
          <span>Updated: {new Date(intention.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
