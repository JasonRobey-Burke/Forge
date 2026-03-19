import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSpec, useDeleteSpec, useSpecExpectations } from '@/hooks/useSpecs';
import { useTransitionSpec } from '@/hooks/usePhaseTransition';
import { evaluateChecklist } from '@shared/checklist/evaluator';
import type { ChecklistExpectation } from '@shared/checklist/types';
import CompletenessChecklist from '@/components/CompletenessChecklist';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SpecPhase as SpecPhaseEnum } from '@shared/types/enums';

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
  const transitionSpec = useTransitionSpec();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (error || !spec) return <div className="text-destructive">Spec not found.</div>;

  // Build ChecklistExpectation[] from linked expectations data
  const checklistExpectations: ChecklistExpectation[] = (linkedExpectations ?? []).map((e) => ({
    id: e.id,
    description: e.description ?? '',
    edge_cases: e.edge_cases ?? [],
  }));

  const checklistResult = evaluateChecklist(spec, checklistExpectations);

  function handleDelete() {
    deleteSpec.mutate(
      { id: id!, product_id: spec!.product_id },
      { onSuccess: () => navigate(`/products/${spec!.product_id}/specs`) },
    );
  }

  function handleTransitionToReady() {
    if (checklistResult.ready) {
      transitionSpec.mutate({ specId: id!, toPhase: 'Ready' });
    } else {
      setOverrideOpen(true);
    }
  }

  function handleOverrideTransition() {
    transitionSpec.mutate(
      { specId: id!, toPhase: 'Ready', overrideReason },
      { onSuccess: () => { setOverrideOpen(false); setOverrideReason(''); } },
    );
  }

  function handleGeneralTransition() {
    if (!selectedPhase) return;
    transitionSpec.mutate({ specId: id!, toPhase: selectedPhase });
  }

  const otherPhases = Object.values(SpecPhaseEnum).filter((p) => p !== 'Draft' && p !== spec.phase);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Main content */}
      <div>
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

        {/* Phase transition controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {spec.phase === 'Draft' && (
            <>
              <Button
                variant={checklistResult.ready ? 'default' : 'outline'}
                onClick={handleTransitionToReady}
                disabled={transitionSpec.isPending}
              >
                Transition to Ready
              </Button>

              {/* Override dialog (shown when checklist fails) */}
              <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Checklist Incomplete</DialogTitle>
                    <DialogDescription>
                      {checklistResult.total - checklistResult.passed} item{checklistResult.total - checklistResult.passed !== 1 ? 's' : ''} are not yet met. You can override and provide a reason.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <ul className="text-sm space-y-1">
                      {checklistResult.items.filter((i) => !i.passed).map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="text-red-500 font-bold shrink-0">✗</span>
                          <span>{item.criterion}</span>
                        </li>
                      ))}
                    </ul>
                    <Textarea
                      placeholder="Override reason (optional)"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleOverrideTransition}
                      disabled={transitionSpec.isPending}
                    >
                      {transitionSpec.isPending ? 'Transitioning...' : 'Override and Transition'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {spec.phase !== 'Draft' && otherPhases.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {otherPhases.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleGeneralTransition}
                disabled={!selectedPhase || transitionSpec.isPending}
              >
                {transitionSpec.isPending ? 'Transitioning...' : 'Transition'}
              </Button>
            </div>
          )}

          {transitionSpec.isError && (
            <p className="text-sm text-destructive">
              Transition failed. {(transitionSpec.error as Error)?.message}
            </p>
          )}
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

      {/* Checklist sidebar */}
      <div className="lg:sticky lg:top-6 self-start">
        <CompletenessChecklist spec={spec} expectations={checklistExpectations} />
      </div>
    </div>
  );
}
