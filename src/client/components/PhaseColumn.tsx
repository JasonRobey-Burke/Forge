import { useDroppable } from '@dnd-kit/core';
import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SpecCard from '@/components/SpecCard';
import { PHASE_LABELS, PHASE_COLORS } from '@/lib/phaseColors';
import type { Spec } from '@shared/types';

interface PhaseColumnProps {
  phase: string;
  specs: Spec[];
  limit: number;
  onCardClick?: (specId: string) => void;
  staleSpecIds?: Set<string>;
  onMoveToPhase?: (spec: Spec, phase: string) => void;
}

export default function PhaseColumn({ phase, specs, limit, onCardClick, staleSpecIds, onMoveToPhase }: PhaseColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });
  const count = specs.length;
  const atLimit = limit > 0 && count >= limit;

  return (
    <div
      ref={setNodeRef}
      data-phase={phase}
      className={`flex flex-col rounded-lg border bg-muted/30 min-w-[200px] ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className={`h-1 rounded-t-lg ${PHASE_COLORS[phase]?.dot ?? 'bg-slate-400'}`} />
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">{PHASE_LABELS[phase] ?? phase}</span>
        <Badge variant={atLimit ? 'destructive' : 'secondary'} className="text-xs">
          {limit > 0 ? `${count}/${limit}` : count}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-200px)]">
        {specs.length === 0 ? (
          <div className="rounded-md border border-dashed border-muted-foreground/40 bg-background/50 px-3 py-5 text-center">
            <Inbox className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium">No specs in this phase</p>
            <p className="mt-1 text-xs text-muted-foreground">Drag specs here or use Move to...</p>
          </div>
        ) : (
          specs.map((spec) => (
            <SpecCard
              key={spec.id}
              spec={spec}
              onClick={() => onCardClick?.(spec.id)}
              stale={staleSpecIds?.has(spec.id)}
              onMoveToPhase={onMoveToPhase}
            />
          ))
        )}
      </div>
    </div>
  );
}
