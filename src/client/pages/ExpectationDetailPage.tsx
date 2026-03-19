import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useExpectation, useDeleteExpectation } from '@/hooks/useExpectations';
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

export default function ExpectationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expectation, isLoading, error } = useExpectation(id!);
  const deleteExpectation = useDeleteExpectation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !expectation) return <div className="text-destructive">Expectation not found.</div>;

  function handleDelete() {
    deleteExpectation.mutate(
      { id: id!, intention_id: expectation!.intention_id },
      {
        onSuccess: () => navigate(`/intentions/${expectation!.intention_id}/expectations`),
      },
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{expectation.title}</h1>
          <Badge variant="outline">{expectation.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/expectations/${expectation.id}/edit`}>Edit</Link>
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {expectation.title}?</DialogTitle>
                <DialogDescription>
                  This will archive the expectation.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteExpectation.isPending}>
                  {deleteExpectation.isPending ? 'Deleting...' : 'Delete'}
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
            <p className="text-sm">{expectation.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edge Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {expectation.edge_cases.map((ec, i) => (
                <li key={i} className="text-sm">{ec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Separator />

        <div className="text-xs text-muted-foreground flex gap-4">
          <span>Created: {new Date(expectation.created_at).toLocaleString()}</span>
          <span>Updated: {new Date(expectation.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
