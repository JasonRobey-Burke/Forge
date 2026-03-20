import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useTransitionSpec } from '@/hooks/usePhaseTransition';
import { checkWipLimit } from '@shared/lib/wipCheck';
import PhaseColumn from '@/components/PhaseColumn';
import SpecCard from '@/components/SpecCard';
import WipOverrideDialog from '@/components/WipOverrideDialog';
import GateOverrideDialog from '@/components/GateOverrideDialog';
import type { Spec } from '@shared/types';
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
}

export default function FlowBoard({ specs, wipLimits, productId }: FlowBoardProps) {
  const navigate = useNavigate();
  const transitionSpec = useTransitionSpec();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const [activeSpec, setActiveSpec] = useState<Spec | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    spec: Spec;
    toPhase: string;
  } | null>(null);
  const [wipDialogOpen, setWipDialogOpen] = useState(false);
  const [gateDialogOpen, setGateDialogOpen] = useState(false);
  const [gateName, setGateName] = useState('');

  const specsByPhase = Object.fromEntries(
    PHASES.map((phase) => [phase, specs.filter((s) => s.phase === phase)])
  );

  function doTransition(spec: Spec, toPhase: string, overrideReason?: string) {
    transitionSpec.mutate(
      { specId: spec.id, toPhase, overrideReason },
      {
        onError: (error: Error) => {
          const apiError = error as ApiError;
          if (
            apiError.code === 'CHECKLIST_INCOMPLETE' ||
            apiError.code === 'PEER_REVIEW_REQUIRED'
          ) {
            setPendingMove({ spec, toPhase });
            setGateName(apiError.code);
            setGateDialogOpen(true);
          } else if (apiError.code === 'WIP_LIMIT_EXCEEDED') {
            setPendingMove({ spec, toPhase });
            setWipDialogOpen(true);
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

    const spec = active.data.current?.spec as Spec;
    const toPhase = over.id as string;
    if (spec.phase === toPhase) return;

    // Client-side WIP limit check for instant UX
    const targetCount = specsByPhase[toPhase]?.length ?? 0;
    const wipResult = checkWipLimit(toPhase, targetCount, wipLimits);
    if (!wipResult.allowed) {
      setPendingMove({ spec, toPhase });
      setWipDialogOpen(true);
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
      >
        <div className="grid grid-cols-6 gap-3">
          {PHASES.map((phase) => (
            <PhaseColumn
              key={phase}
              phase={phase}
              specs={specsByPhase[phase] ?? []}
              limit={getWipLimit(phase, wipLimits)}
              onCardClick={(id) => navigate(`/specs/${id}`)}
            />
          ))}
        </div>
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
        currentCount={specsByPhase[pendingMove?.toPhase ?? '']?.length ?? 0}
        limit={getWipLimit(pendingMove?.toPhase ?? '', wipLimits)}
        isPending={transitionSpec.isPending}
        onConfirm={(reason) => {
          if (pendingMove) {
            doTransition(
              pendingMove.spec,
              pendingMove.toPhase,
              reason || 'WIP limit override'
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
          if (pendingMove) {
            doTransition(
              pendingMove.spec,
              pendingMove.toPhase,
              reason || undefined
            );
          }
          setGateDialogOpen(false);
          setPendingMove(null);
        }}
      />
    </>
  );
}
