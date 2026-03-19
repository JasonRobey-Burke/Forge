import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSpec, useDeleteSpec, useSpecExpectations } from '@/hooks/useSpecs';
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
import type { SpecPhase } from '@shared/types';

const phaseVariant: Record<SpecPhase, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Draft: 'secondary',
  Ready: 'outline',
  InProgress: 'default',
  Review: 'default',
  Validating: 'default',
  Done: 'secondary',
};

export default function SpecDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spec, isLoading, error } = useSpec(id!);
  const { data: linkedExpectations } = useSpecExpectations(id!);
  const deleteSpec = useDeleteSpec();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !spec) return <div className="text-destructive">Spec not found.</div>;

  function handleDelete() {
    deleteSpec.mutate(
      { id: id!, product_id: spec!.product_id },
      { onSuccess: () => navigate(`/products/${spec!.product_id}/specs`) },
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{spec.title}</h1>
          <Badge variant={phaseVariant[spec.phase as SpecPhase]}>{spec.phase}</Badge>
          <Badge variant="outline">{spec.complexity}</Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/specs/${spec.id}/edit`}>Edit</Link>
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {spec.title}?</DialogTitle>
                <DialogDescription>This will archive the spec.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteSpec.isPending}>
                  {deleteSpec.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{spec.description}</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Context</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {spec.context.stack.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Stack</p>
                <div className="flex flex-wrap gap-1">
                  {spec.context.stack.map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
            {spec.context.patterns.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Patterns</p>
                <div className="flex flex-wrap gap-1">
                  {spec.context.patterns.map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
            {spec.context.conventions.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Conventions</p>
                <div className="flex flex-wrap gap-1">
                  {spec.context.conventions.map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
            {spec.context.auth && (
              <div>
                <p className="text-sm font-medium mb-1">Auth</p>
                <p className="text-sm text-muted-foreground">{spec.context.auth}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {spec.boundaries.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Boundaries</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {spec.boundaries.map((b, i) => <li key={i} className="text-sm">{b}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {spec.deliverables.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Deliverables</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {spec.deliverables.map((d, i) => <li key={i} className="text-sm">{d}</li>)}
              </ul>
            </CardContent>
          </Card>
        )}

        {(spec.validation_automated.length > 0 || spec.validation_human.length > 0) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Validation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {spec.validation_automated.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Automated</p>
                  <ul className="list-disc list-inside space-y-1">
                    {spec.validation_automated.map((v, i) => <li key={i} className="text-sm">{v}</li>)}
                  </ul>
                </div>
              )}
              {spec.validation_human.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Human</p>
                  <ul className="list-disc list-inside space-y-1">
                    {spec.validation_human.map((v, i) => <li key={i} className="text-sm">{v}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {linkedExpectations && linkedExpectations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Linked Expectations</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {linkedExpectations.map((exp) => (
                  <li key={exp.id}>
                    <Link to={`/expectations/${exp.id}`} className="text-sm text-primary hover:underline">
                      {exp.title}
                    </Link>
                    <Badge variant="outline" className="ml-2">{exp.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="text-xs text-muted-foreground">
          {spec.peer_reviewed && <Badge variant="secondary" className="mr-2">Peer Reviewed</Badge>}
        </div>

        <Separator />

        <div className="text-xs text-muted-foreground flex gap-4">
          <span>Created: {new Date(spec.created_at).toLocaleString()}</span>
          <span>Updated: {new Date(spec.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
