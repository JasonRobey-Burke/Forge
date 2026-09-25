type Spec = BaseSpec & {source: import('@shared/types/source').SourceMeta};
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { PHASE_LABELS } from '@/lib/phaseColors';
import { PhaseBadge } from '@/lib/phaseColors';
import { useTransitionSpec } from '@/hooks/usePhaseTransition';
import { useStaleSpecIds } from '@/hooks/useStaleness';
import { checkWipLimit } from '@shared/lib/wipCheck';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PhaseColumn from '@/components/PhaseColumn';
import SpecCard from '@/components/SpecCard';
import WipOverrideDialog from '@/components/WipOverrideDialog';
import GateOverrideDialog from '@/components/GateOverrideDialog';
import type { Spec as BaseSpec } from '@shared/types';
import type { WipLimits } from '@shared/types/product';
import type { ApiError } from '@/lib/api';

const PHASES = ['Draft', 'Ready', 'InProgress', 'Review', 'Validating', 'Done'] as const;

function getWipLimit(phase: string, wipLimits: WipLimits): number {
  const map: Record<string, number> = {
    Draft: wipLimits.draft,
    Ready: wipLimits.ready,
    InProgress: wipLimits.in_progress,
    Review: wipLimits.review,
    Validating: wipLimits.validating,
    Done: 0,
  };
  return map[phase] ?? 0;
}

interface FlowBoardProps {
  specs: Spec[];
  wipLimits: WipLimits;
  productId: string;
  wholeProductCounts?:Record<string,number>;
  outcomes?:Record<string,{id:string;title:string}[]>;
  gateReasons?:Record<string,{message:string;href:string;label:string}>;
}

export default function FlowBoard({ specs, wipLimits, productId, wholeProductCounts, outcomes, gateReasons }: FlowBoardProps) {
  const transitionSpec = useTransitionSpec();
  const { data: staleIds } = useStaleSpecIds(productId);
  const staleSet = new Set(staleIds ?? []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const [activeSpec, setActiveSpec] = useState<Spec | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    spec: Spec;
    toPhase: string;
  } | null>(null);
  const [wipDialogOpen, setWipDialogOpen] = useState(false);
  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [gateName, setGateName] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [previewSpec, setPreviewSpec] = useState<Spec | null>(null);

  const specsByPhase = Object.fromEntries(
    PHASES.map((phase) => [phase, specs.filter((s) => s.phase === phase)])
  );

  const phaseCount=(phase:string)=>wholeProductCounts?.[phase]??specsByPhase[phase]?.length??0;

  function doTransition(spec: Spec, toPhase: string, overrideReason?: string) {
    transitionSpec.mutate(
      { specId: spec.id, toPhase, overrideReason, revision: spec.source.revision },
      {
        onSuccess: () => {
          const message = `Moved to ${PHASE_LABELS[toPhase] ?? toPhase}`;
          toast.success(message);
          setLiveAnnouncement(`${spec.title} ${message.toLowerCase()}`);
        },
        onError: (error: Error) => {
          const apiError = error as ApiError;
          if (
            apiError.code === 'CHECKLIST_INCOMPLETE' ||
            apiError.code === 'PEER_REVIEW_REQUIRED' ||
            apiError.code === 'GAP_CHECK_REQUIRED' ||
            apiError.code === 'GAP_CHECK_BLOCKED' ||
            apiError.code === 'GAP_CHECK_WARNINGS_UNACKNOWLEDGED'
          ) {
            setPendingMove({ spec, toPhase });
            setGateName(apiError.code);
            setGateDialogOpen(true);
            setLiveAnnouncement(`Cannot move ${spec.title} to ${PHASE_LABELS[toPhase] ?? toPhase} until gate requirements are satisfied`);
          } else if (apiError.code === 'WIP_LIMIT_EXCEEDED') {
            setPendingMove({ spec, toPhase });
            setWipDialogOpen(true);
            setLiveAnnouncement(`Cannot move ${spec.title}. WIP limit reached for ${PHASE_LABELS[toPhase] ?? toPhase}`);
          } else {
            toast.error(apiError.message);
            setLiveAnnouncement(`Transition failed for ${spec.title}: ${apiError.message}`);
          }
        },
      }
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveSpec(event.active.data.current?.spec ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSpec(null);
    const { active, over } = event;
    if (!over) return;

    const spec = activeSpec ?? active.data.current?.spec as Spec;
    const toPhase = over.id as string;
    if (spec.phase === toPhase) return;

    // Client-side WIP limit check for instant UX
    const targetCount = phaseCount(toPhase);
    const wipResult = checkWipLimit(toPhase, targetCount, wipLimits);
    if (!wipResult.allowed) {
      setPendingMove({ spec, toPhase });
      setWipDialogOpen(true);
      setLiveAnnouncement(`Cannot move ${spec.title}. WIP limit reached for ${PHASE_LABELS[toPhase] ?? toPhase}`);
      return;
    }

    doTransition(spec, toPhase);
  }

  function handleMoveToPhase(spec: Spec, toPhase: string) {
    if (spec.phase === toPhase) return;

    const targetCount = phaseCount(toPhase);
    const wipResult = checkWipLimit(toPhase, targetCount, wipLimits);
    if (!wipResult.allowed) {
      setPendingMove({ spec, toPhase });
      setWipDialogOpen(true);
      setLiveAnnouncement(`Cannot move ${spec.title}. WIP limit reached for ${PHASE_LABELS[toPhase] ?? toPhase}`);
      return;
    }

    doTransition(spec, toPhase);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: {
            onDragStart({ active }) {
              return `Picked up ${active.data.current?.spec?.title ?? 'spec'}`;
            },
            onDragOver({ active: _active, over }) {
              if (over) {
                return `Over ${PHASE_LABELS[over.id as string] ?? over.id}`;
              }
              return 'Not over a droppable area';
            },
            onDragEnd({ active: _active, over }) {
              if (over) {
                return `Dropped in ${PHASE_LABELS[over.id as string] ?? over.id}`;
              }
              return 'Dropped outside a droppable area';
            },
            onDragCancel() {
              return 'Drag cancelled';
            },
          },
        }}
      >
        <div className="hidden md:block pb-2">
          <div className="grid min-w-0 grid-cols-3 gap-3 xl:grid-cols-6">
            {PHASES.map((phase) => (
              <PhaseColumn
                key={phase}
                phase={phase}
                totalCount={phaseCount(phase)}
                outcomes={outcomes}
                gateReasons={gateReasons}
                specs={specsByPhase[phase] ?? []}
                limit={getWipLimit(phase, wipLimits)}
                onCardClick={(id) => {
                  const selected = specs.find((s) => s.id === id) ?? null;
                  setPreviewSpec(selected);
                }}
                staleSpecIds={staleSet}
                onMoveToPhase={handleMoveToPhase}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {PHASES.map((phase) => (
            <section key={phase} className="rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">{PHASE_LABELS[phase] ?? phase}</span>
                <Badge variant="secondary" className="text-xs">
                  {getWipLimit(phase,wipLimits)>0?`${phaseCount(phase)}/${getWipLimit(phase,wipLimits)}`:phaseCount(phase)}
                </Badge>
              </div>
              <div className="space-y-2 p-2">
                {(specsByPhase[phase] ?? []).length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">No specs in this phase</p>
                ) : (
                  (specsByPhase[phase] ?? []).map((spec) => (
                    <SpecCard
                      key={spec.id}
                      spec={spec}
                      outcomes={outcomes?.[spec.id]}
                      gate={gateReasons?.[spec.id]}
                      onClick={() => setPreviewSpec(spec)}
                      stale={staleSet.has(spec.id)}
                      onMoveToPhase={handleMoveToPhase}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">{liveAnnouncement}</p>

        {previewSpec && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setPreviewSpec(null)} />
            <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l bg-background p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Spec Preview</h2>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewSpec(null)}>
                  Close
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{previewSpec.id}</span>
                    {previewSpec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PhaseBadge phase={previewSpec.phase} />
                    <Badge variant="outline">{previewSpec.complexity}</Badge>
                    {previewSpec.owner && <Badge variant="outline">{previewSpec.owner}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{previewSpec.description}</p>
                  <Button asChild><Link to={`/specs/${previewSpec.id}`}>Open Full Spec</Link></Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}

        <DragOverlay>
          {activeSpec ? (
            <div className="opacity-80 w-[200px]">
              <SpecCard spec={activeSpec} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <WipOverrideDialog
        open={wipDialogOpen}
        onOpenChange={setWipDialogOpen}
        phase={pendingMove?.toPhase ?? ''}
        currentCount={phaseCount(pendingMove?.toPhase??'')}
        limit={getWipLimit(pendingMove?.toPhase ?? '', wipLimits)}
        isPending={transitionSpec.isPending}
        onConfirm={(reason) => {
          if(!reason.trim()){toast.error('Enter a reason before overriding this gate.');return;}
          if (pendingMove) {
            doTransition(
              pendingMove.spec,
              pendingMove.toPhase,
              reason.trim()
            );
          }
          setWipDialogOpen(false);
          setPendingMove(null);
        }}
      />

      <GateOverrideDialog
        open={gateDialogOpen}
        onOpenChange={setGateDialogOpen}
        spec={pendingMove?.spec ?? ({} as Spec)}
        gateName={gateName}
        isPending={transitionSpec.isPending}
        onConfirm={(reason) => {
          if(!reason.trim()){toast.error('Enter a reason before overriding this gate.');return;}
          if (pendingMove) {
            doTransition(
              pendingMove.spec,
              pendingMove.toPhase,
              reason.trim()
            );
          }
          setGateDialogOpen(false);
          setPendingMove(null);
        }}
      />
    </>
  );
}
