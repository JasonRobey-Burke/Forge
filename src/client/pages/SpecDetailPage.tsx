import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useSpec, useDeleteSpec, useSpecExpectations } from '@/hooks/useSpecs';
import { useProduct } from '@/hooks/useProducts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SpecPhase as SpecPhaseEnum } from '@shared/types/enums';
import { downloadYaml } from '@/lib/exportYaml';
import { downloadMarkdown, specToMarkdown } from '@/lib/exportMarkdown';
import { estimateTokens } from '@/lib/tokenEstimate';
import { PhaseBadge, PHASE_LABELS } from '@/lib/phaseColors';
import { ArrowRight, ArrowLeft, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';

export default function SpecDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spec, isLoading, error } = useSpec(id!);
  const { data: linkedExpectations } = useSpecExpectations(id!);
  const { data: product } = useProduct(spec?.product_id ?? '');
  useDocumentTitle(spec?.title ?? 'Spec');
  const deleteSpec = useDeleteSpec();
  const transitionSpec = useTransitionSpec();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !spec) return <div className="text-destructive">Spec not found.</div>;

  // Build ChecklistExpectation[] from linked expectations data
  const checklistExpectations: ChecklistExpectation[] = (linkedExpectations ?? []).map((e) => ({
    id: e.id,
    description: e.description ?? '',
    edge_cases: e.edge_cases ?? [],
  }));

  const checklistResult = evaluateChecklist(spec, checklistExpectations);

  const exportData = {
    spec,
    expectations: (linkedExpectations ?? []).map((e) => ({
      title: e.title,
      description: e.description ?? '',
      edge_cases: e.edge_cases ?? [],
    })),
  };
  const tokenCount = estimateTokens(specToMarkdown(exportData));

  function handleDelete() {
    deleteSpec.mutate(
      { id: id!, product_id: spec!.product_id },
      { onSuccess: () => { toast.success('Spec deleted'); navigate(`/products/${spec!.product_id}/specs`); } },
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
      { specId: id!, toPhase: 'Ready', overrideReason: overrideReason.trim() || undefined },
      { onSuccess: () => { setOverrideOpen(false); setOverrideReason(''); } },
    );
  }

  function handleTransitionTo(phase: string) {
    setTransitioning(true);
    transitionSpec.mutate(
      { specId: id!, toPhase: phase },
      { onSettled: () => setTransitioning(false) },
    );
  }

  const PHASES = Object.values(SpecPhaseEnum);
  const currentIndex = PHASES.indexOf(spec.phase);
  const nextPhase = currentIndex < PHASES.length - 1 ? PHASES[currentIndex + 1] : null;
  const prevPhase = currentIndex > 0 ? PHASES[currentIndex - 1] : null;
  const adjacentPhases = [nextPhase, prevPhase].filter(Boolean);
  const otherPhases = PHASES.filter((p) => p !== spec.phase && !adjacentPhases.includes(p));

  return (
    <>
    <Breadcrumbs items={[
      { label: 'Products', href: '/products' },
      { label: product?.name ?? '...', href: `/products/${spec.product_id}` },
      { label: 'Specs', href: `/products/${spec.product_id}/specs` },
      { label: spec.title },
    ]} />
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Main content */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{spec.title}</h1>
            <PhaseBadge phase={spec.phase} />
            <Badge variant="outline">{spec.complexity}</Badge>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to={`/specs/${spec.id}/edit`}>Edit</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadYaml(exportData)}>
                  Export YAML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadMarkdown(exportData)}>
                  Export Markdown
                  {tokenCount > 8000 && (
                    <Badge variant="destructive" className="ml-2 text-xs">&gt;8K tokens</Badge>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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

          {spec.phase !== 'Draft' && (
            <div className="flex items-center gap-2 flex-wrap">
              {nextPhase && (
                <Button
                  onClick={() => handleTransitionTo(nextPhase)}
                  disabled={transitioning}
                >
                  Move to {PHASE_LABELS[nextPhase] ?? nextPhase}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              {prevPhase && (
                <Button
                  variant="outline"
                  onClick={() => handleTransitionTo(prevPhase)}
                  disabled={transitioning}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to {PHASE_LABELS[prevPhase] ?? prevPhase}
                </Button>
              )}
              {otherPhases.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={transitioning}>
                      More...
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {otherPhases.map((p) => (
                      <DropdownMenuItem key={p} onClick={() => handleTransitionTo(p)}>
                        Move to {PHASE_LABELS[p] ?? p}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
        <CompletenessChecklist spec={spec} expectations={checklistExpectations} result={checklistResult} />
      </div>
    </div>
    </>
  );
}
